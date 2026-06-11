import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@lifeledger/database';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import type { User } from '@lifeledger/database';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
const RESET_TOKEN_EXPIRY_MINUTES = 15;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
  ) {}

  // ─── Register ───
  async register(
    data: { email: string; password: string; fullName: string; phone?: string },
    ip?: string,
    userAgent?: string,
  ) {
    const passwordHash = await this.usersService.hashPassword(data.password);

    const user = await this.usersService.create({
      email: data.email,
      passwordHash,
      fullName: data.fullName,
      phone: data.phone,
    });

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.verificationToken.create({
      data: {
        email: user.email,
        token,
        expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000),
      },
    });

    // Send verification email
    await this.mailService.sendVerificationEmail(user.email, token);

    // Audit
    await this.auditService.log({
      userId: user.id,
      action: AuditAction.AUTH_REGISTER,
      resourceType: 'user',
      resourceId: user.id,
      ipAddress: ip,
      userAgent,
    });

    return {
      user: this.sanitizeUser(user),
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  // ─── Login ───
  async login(
    email: string,
    password: string,
    ip?: string,
    userAgent?: string,
    deviceName?: string,
  ) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check lockout
    if (this.usersService.isAccountLocked(user)) {
      throw new ForbiddenException('Account is temporarily locked. Please try again later.');
    }

    // Check password
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'This account uses social login. Please sign in with Google.',
      );
    }

    const isPasswordValid = await this.usersService.comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      const attempts = await this.usersService.incrementFailedLogins(user.id);

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        await this.usersService.lockAccount(user.id, LOCKOUT_MINUTES);
        await this.auditService.log({
          userId: user.id,
          action: AuditAction.AUTH_LOCKOUT,
          resourceType: 'user',
          resourceId: user.id,
          details: { reason: 'Max failed login attempts exceeded', attempts },
          ipAddress: ip,
          userAgent,
        });
        throw new ForbiddenException(
          'Too many failed login attempts. Account locked for 15 minutes.',
        );
      }

      await this.auditService.log({
        userId: user.id,
        action: AuditAction.AUTH_LOGIN_FAILED,
        resourceType: 'user',
        resourceId: user.id,
        details: { attempts },
        ipAddress: ip,
        userAgent,
      });

      throw new UnauthorizedException('Invalid email or password');
    }

    // Check user status
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Your account has been suspended or deactivated.');
    }

    // Reset failed attempts on successful login
    await this.usersService.resetFailedLogins(user.id);
    await this.usersService.updateLastLogin(user.id);

    // Generate tokens & create session
    const { accessToken, refreshToken, sessionId } = await this.generateTokenPair(
      user,
      ip,
      userAgent,
      deviceName,
    );

    // Audit
    await this.auditService.log({
      userId: user.id,
      action: AuditAction.AUTH_LOGIN,
      resourceType: 'user',
      resourceId: user.id,
      ipAddress: ip,
      userAgent,
    });

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  // ─── Refresh ───
  async refreshTokens(
    userId: string,
    sessionId: string,
    oldRefreshToken: string,
    ip?: string,
    userAgent?: string,
  ) {
    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new UnauthorizedException('Invalid session');
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      await this.prisma.userSession.delete({ where: { id: sessionId } });
      throw new UnauthorizedException('Session has expired');
    }

    // Compare refresh token hash
    const isTokenValid = await bcrypt.compare(oldRefreshToken, session.refreshTokenHash);
    if (!isTokenValid) {
      // Potential token reuse attack — revoke entire session
      this.logger.warn(`Possible refresh token replay attack for session ${sessionId}`);
      await this.prisma.userSession.delete({ where: { id: sessionId } });
      throw new UnauthorizedException('Token reuse detected. Session revoked.');
    }

    const user = await this.usersService.findById(userId);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Rotate: generate new token pair, update session hash
    const accessToken = this.generateAccessToken(user);
    const newRefreshToken = crypto.randomBytes(48).toString('hex');
    const newRefreshHash = await bcrypt.hash(newRefreshToken, 10);

    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash: newRefreshHash,
        lastActiveAt: new Date(),
        ipAddress: ip ?? session.ipAddress,
      },
    });

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.AUTH_TOKEN_REFRESH,
      resourceType: 'session',
      resourceId: sessionId,
      ipAddress: ip,
      userAgent,
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  // ─── Logout ───
  async logout(sessionId: string, userId: string, ip?: string, userAgent?: string) {
    await this.prisma.userSession.deleteMany({
      where: { id: sessionId, userId },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.AUTH_LOGOUT,
      resourceType: 'session',
      resourceId: sessionId,
      ipAddress: ip,
      userAgent,
    });
  }

  // ─── Verify Email ───
  async verifyEmail(token: string, ip?: string, userAgent?: string) {
    const record = await this.prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (new Date() > record.expiresAt) {
      await this.prisma.verificationToken.delete({ where: { id: record.id } });
      throw new BadRequestException('Verification token has expired. Please request a new one.');
    }

    await this.usersService.verifyEmail(record.email);

    // Delete all verification tokens for this email
    await this.prisma.verificationToken.deleteMany({
      where: { email: record.email },
    });

    const user = await this.usersService.findByEmail(record.email);

    await this.auditService.log({
      userId: user?.id,
      action: AuditAction.AUTH_EMAIL_VERIFIED,
      resourceType: 'user',
      resourceId: user?.id,
      ipAddress: ip,
      userAgent,
    });

    return { message: 'Email verified successfully' };
  }

  // ─── Forgot Password ───
  async forgotPassword(email: string, ip?: string, userAgent?: string) {
    const user = await this.usersService.findByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) {
      return {
        message: 'If an account with that email exists, a password reset link has been sent.',
      };
    }

    // Delete any existing reset tokens
    await this.prisma.passwordResetToken.deleteMany({
      where: { email: user.email },
    });

    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        email: user.email,
        token,
        expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000),
      },
    });

    await this.mailService.sendPasswordResetEmail(user.email, token);

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.AUTH_PASSWORD_RESET_REQUEST,
      resourceType: 'user',
      resourceId: user.id,
      ipAddress: ip,
      userAgent,
    });

    return {
      message: 'If an account with that email exists, a password reset link has been sent.',
    };
  }

  // ─── Reset Password ───
  async resetPassword(token: string, newPassword: string, ip?: string, userAgent?: string) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (new Date() > record.expiresAt) {
      await this.prisma.passwordResetToken.delete({ where: { id: record.id } });
      throw new BadRequestException('Reset token has expired. Please request a new one.');
    }

    const user = await this.usersService.findByEmail(record.email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const newHash = await this.usersService.hashPassword(newPassword);
    await this.usersService.updatePassword(user.id, newHash);

    // Delete all reset tokens for this email
    await this.prisma.passwordResetToken.deleteMany({
      where: { email: record.email },
    });

    // Revoke all sessions (force re-login)
    await this.prisma.userSession.deleteMany({
      where: { userId: user.id },
    });

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.AUTH_PASSWORD_RESET_SUCCESS,
      resourceType: 'user',
      resourceId: user.id,
      ipAddress: ip,
      userAgent,
    });

    return {
      message: 'Password has been reset successfully. Please log in with your new password.',
    };
  }

  // ─── Sessions ───
  async getActiveSessions(userId: string, currentSessionId?: string) {
    const sessions = await this.prisma.userSession.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true,
        deviceName: true,
        ipAddress: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });

    return sessions.map((s) => ({
      ...s,
      lastActiveAt: s.lastActiveAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
      isCurrent: s.id === currentSessionId,
    }));
  }

  async revokeSession(sessionId: string, userId: string, ip?: string, userAgent?: string) {
    const session = await this.prisma.userSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    await this.prisma.userSession.delete({ where: { id: sessionId } });

    await this.auditService.log({
      userId,
      action: AuditAction.AUTH_SESSION_REVOKED,
      resourceType: 'session',
      resourceId: sessionId,
      ipAddress: ip,
      userAgent,
    });

    return { message: 'Session revoked successfully' };
  }

  // ─── Google OAuth ───
  async handleGoogleLogin(
    profile: {
      googleId: string;
      email: string;
      fullName: string;
      avatarUrl?: string;
    },
    ip?: string,
    userAgent?: string,
    deviceName?: string,
  ) {
    let user = await this.usersService.findByGoogleId(profile.googleId);

    if (!user) {
      // Check if a user with this email exists (link accounts)
      const existingUser = await this.usersService.findByEmail(profile.email);
      if (existingUser) {
        // Link Google ID to existing account
        user = await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            googleId: profile.googleId,
            emailVerified: true,
            avatarUrl: existingUser.avatarUrl ?? profile.avatarUrl ?? null,
          },
        });
      } else {
        user = await this.usersService.createFromGoogle(profile);
      }
    }

    await this.usersService.updateLastLogin(user.id);

    const { accessToken, refreshToken } = await this.generateTokenPair(
      user,
      ip,
      userAgent,
      deviceName,
    );

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.AUTH_GOOGLE_LOGIN,
      resourceType: 'user',
      resourceId: user.id,
      ipAddress: ip,
      userAgent,
    });

    return { user: this.sanitizeUser(user), accessToken, refreshToken };
  }

  // ─── Helpers ───
  private async generateTokenPair(
    user: User,
    ip?: string,
    userAgent?: string,
    deviceName?: string,
  ) {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = crypto.randomBytes(48).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    const refreshExpiry = this.config.get<string>('JWT_REFRESH_EXPIRY', '7d');
    const expiresAt = new Date(Date.now() + this.parseDuration(refreshExpiry));

    const session = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        deviceName: deviceName ?? this.parseDeviceName(userAgent),
        ipAddress: ip ?? '0.0.0.0',
        expiresAt,
      },
    });

    // Sign a JWT containing the session ID for the refresh token
    const signedRefreshToken = this.jwtService.sign(
      { sub: user.id, sessionId: session.id },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiry as any,
      },
    );

    return {
      accessToken,
      refreshToken: signedRefreshToken,
      sessionId: session.id,
      rawRefreshToken: refreshToken,
    };
  }

  private generateAccessToken(user: User): string {
    return this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRY', '15m') as any,
      },
    );
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      role: user.role,
      onboardingCompleted: user.onboardingCompleted,
    };
  }

  private parseDeviceName(userAgent?: string): string | null {
    if (!userAgent) return null;
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('Linux')) return 'Linux PC';
    return 'Unknown Device';
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days
    const value = parseInt(match[1]!, 10);
    const unit = match[2]!;
    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }
}
