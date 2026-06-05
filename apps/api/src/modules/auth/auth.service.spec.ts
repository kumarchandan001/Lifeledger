import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let config: ConfigService;
  let mailService: MailService;
  let auditService: AuditService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashedpassword',
    fullName: 'Test User',
    phone: null,
    avatarUrl: null,
    emailVerified: false,
    role: 'USER' as any,
    status: 'ACTIVE',
    onboardingCompleted: false,
    failedLoginAttempts: 0,
    lockoutExpiresAt: null,
    authProvider: 'email',
    googleId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
  };

  const mockPrisma = {
    verificationToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    passwordResetToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    userSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  };

  const mockUsersService = {
    hashPassword: jest.fn(),
    comparePassword: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findByGoogleId: jest.fn(),
    create: jest.fn(),
    createFromGoogle: jest.fn(),
    verifyEmail: jest.fn(),
    updatePassword: jest.fn(),
    incrementFailedLogins: jest.fn(),
    lockAccount: jest.fn(),
    resetFailedLogins: jest.fn(),
    updateLastLogin: jest.fn(),
    isAccountLocked: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfig = {
    get: jest.fn((key: string, defaultValue?: any) => {
      if (key === 'JWT_ACCESS_SECRET') return 'access-secret';
      if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
      if (key === 'JWT_ACCESS_EXPIRY') return '15m';
      if (key === 'JWT_REFRESH_EXPIRY') return '7d';
      return defaultValue;
    }),
  };

  const mockMailService = {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfig },
        { provide: MailService, useValue: mockMailService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    config = module.get<ConfigService>(ConfigService);
    mailService = module.get<MailService>(MailService);
    auditService = module.get<AuditService>(AuditService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user and send verification email', async () => {
      mockUsersService.hashPassword.mockResolvedValue('hashedpassword');
      mockUsersService.create.mockResolvedValue(mockUser);
      mockPrisma.verificationToken.create.mockResolvedValue({ id: 'token-id' });

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
      });

      expect(mockUsersService.hashPassword).toHaveBeenCalledWith('password123');
      expect(mockUsersService.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        fullName: 'Test User',
        phone: undefined,
      });
      expect(mockPrisma.verificationToken.create).toHaveBeenCalled();
      expect(mockMailService.sendVerificationEmail).toHaveBeenCalledWith('test@example.com', expect.any(String));
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AUTH_REGISTER' }),
      );
      expect(result.user.email).toBe('test@example.com');
    });
  });

  describe('login', () => {
    it('should login successfully and return access and refresh tokens', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUsersService.isAccountLocked.mockReturnValue(false);
      mockUsersService.comparePassword.mockResolvedValue(true);
      mockUsersService.resetFailedLogins.mockResolvedValue(undefined);
      mockUsersService.updateLastLogin.mockResolvedValue(undefined);
      
      mockPrisma.userSession.create.mockResolvedValue({ id: 'session-id', expiresAt: new Date() });
      mockJwtService.sign.mockReturnValue('signed-token');

      const result = await service.login('test@example.com', 'password123');

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUsersService.comparePassword).toHaveBeenCalledWith('password123', 'hashedpassword');
      expect(mockUsersService.resetFailedLogins).toHaveBeenCalledWith(mockUser.id);
      expect(mockPrisma.userSession.create).toHaveBeenCalled();
      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
    });

    it('should throw ForbiddenException if account is locked', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUsersService.isAccountLocked.mockReturnValue(true);

      await expect(service.login('test@example.com', 'password123')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should handle failed password and lock account after max attempts', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUsersService.isAccountLocked.mockReturnValue(false);
      mockUsersService.comparePassword.mockResolvedValue(false);
      mockUsersService.incrementFailedLogins.mockResolvedValue(5);
      mockUsersService.lockAccount.mockResolvedValue(undefined);

      await expect(service.login('test@example.com', 'password123')).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockUsersService.lockAccount).toHaveBeenCalledWith(mockUser.id, 15);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AUTH_LOCKOUT' }),
      );
    });
  });

  describe('refreshTokens', () => {
    it('should rotate token if refresh token is valid', async () => {
      const mockSession = {
        id: 'session-id',
        userId: 'user-123',
        refreshTokenHash: 'hashed-old-token',
        expiresAt: new Date(Date.now() + 10000),
        ipAddress: '127.0.0.1',
      };
      mockPrisma.userSession.findUnique.mockResolvedValue(mockSession);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('new-access-token');
      mockPrisma.userSession.update.mockResolvedValue(mockSession);

      const result = await service.refreshTokens('user-123', 'session-id', 'old-token');

      expect(mockPrisma.userSession.findUnique).toHaveBeenCalledWith({ where: { id: 'session-id' } });
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBeDefined();
    });

    it('should delete session and throw on reuse (replay attack)', async () => {
      const mockSession = {
        id: 'session-id',
        userId: 'user-123',
        refreshTokenHash: 'hashed-different-token',
        expiresAt: new Date(Date.now() + 10000),
      };
      mockPrisma.userSession.findUnique.mockResolvedValue(mockSession);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.refreshTokens('user-123', 'session-id', 'old-token'),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.userSession.delete).toHaveBeenCalledWith({ where: { id: 'session-id' } });
    });
  });
});
