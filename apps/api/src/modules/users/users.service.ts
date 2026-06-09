import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import type { User } from '@lifeledger/database';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    fullName: string;
    phone?: string;
  }): Promise<User> {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    if (data.phone) {
      const existingPhone = await this.prisma.user.findFirst({
        where: { phone: data.phone },
      });
      if (existingPhone) {
        throw new ConflictException('An account with this phone number already exists');
      }
    }

    return this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        fullName: data.fullName,
        phone: data.phone ?? null,
      },
    });
  }

  async createFromGoogle(data: {
    email: string;
    fullName: string;
    googleId: string;
    avatarUrl?: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        fullName: data.fullName,
        googleId: data.googleId,
        avatarUrl: data.avatarUrl ?? null,
        emailVerified: true,
        authProvider: 'google',
        passwordHash: null,
      },
    });
  }

  async verifyEmail(email: string): Promise<void> {
    await this.prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { emailVerified: true },
    });
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });
  }

  async incrementFailedLogins(userId: string): Promise<number> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 } },
    });
    return user.failedLoginAttempts;
  }

  async lockAccount(userId: string, lockoutMinutes = 15): Promise<void> {
    const lockoutExpiry = new Date(Date.now() + lockoutMinutes * 60 * 1000);
    await this.prisma.user.update({
      where: { id: userId },
      data: { lockoutExpiresAt: lockoutExpiry },
    });
    this.logger.warn(`Account ${userId} locked until ${lockoutExpiry.toISOString()}`);
  }

  async resetFailedLogins(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockoutExpiresAt: null,
      },
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  isAccountLocked(user: User): boolean {
    if (!user.lockoutExpiresAt) return false;
    return new Date() < user.lockoutExpiresAt;
  }
}
