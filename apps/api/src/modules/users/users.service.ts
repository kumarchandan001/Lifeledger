import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import * as bcrypt from 'bcrypt';
import type { User } from '@lifeledger/database';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

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

  async exportUserData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        documents: {
          include: {
            metadata: true,
            versions: true,
            tags: true,
            ocrResult: true,
            aiAnalysis: true,
          },
        },
        sessions: true,
        familyMemberships: {
          include: {
            family: true,
          },
        },
        trustedContacts: true,
        beneficiaries: true,
        legacyPlans: true,
        personalMessages: true,
        digitalAssets: true,
        legacyInstructions: true,
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Sanitize sensitive fields
    const { passwordHash, mfaSecret, ...safeUser } = user as any;
    return safeUser;
  }

  async deleteUserData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 1. Retrieve all user documents to delete files in Cloudinary
    const documents = await this.prisma.document.findMany({
      where: { userId },
    });

    for (const doc of documents) {
      try {
        await this.storageService.deleteObject(doc.fileUrl);
      } catch (err) {
        this.logger.error(`GDPR: Failed to delete file ${doc.fileUrl} from storage`, err);
      }
    }

    // 2. Perform cascade deletion in proper transaction order
    await this.prisma.$transaction(async (tx: any) => {
      // Delete document dependencies
      await tx.processingJob.deleteMany({ where: { userId } });
      await tx.documentTag.deleteMany({ where: { createdBy: userId } });
      await tx.shareLink.deleteMany({ where: { createdBy: userId } });
      await tx.documentVersion.deleteMany({ where: { document: { userId } } });
      await tx.documentMetadata.deleteMany({ where: { document: { userId } } });
      await tx.oCRResult.deleteMany({ where: { document: { userId } } });
      await tx.aIAnalysis.deleteMany({ where: { document: { userId } } });
      await tx.legacyVaultDocument.deleteMany({ where: { userId } });
      await tx.legacyVault.deleteMany({ where: { userId } });
      await tx.emergencyVaultDocument.deleteMany({ where: { userId } });
      await tx.document.deleteMany({ where: { userId } });

      // Delete family & relations
      await tx.familyMembership.deleteMany({ where: { userId } });
      await tx.family.deleteMany({ where: { createdBy: userId } });

      // Delete emergency & legacy relations
      await tx.trustedContact.deleteMany({ where: { userId } });
      await tx.beneficiary.deleteMany({ where: { userId } });
      await tx.legacyPlan.deleteMany({ where: { userId } });
      await tx.legacyInstruction.deleteMany({ where: { userId } });
      await tx.personalMessage.deleteMany({ where: { userId } });
      await tx.digitalAsset.deleteMany({ where: { userId } });
      await tx.legacyAccessRequest.deleteMany({ where: { ownerId: userId } });
      await tx.legacyActivity.deleteMany({ where: { userId } });

      // Delete billing records
      await tx.payment.deleteMany({ where: { subscription: { userId } } });
      await tx.invoice.deleteMany({ where: { userId } });
      await tx.billingActivity.deleteMany({ where: { userId } });
      await tx.paymentMethod.deleteMany({ where: { userId } });
      await tx.usageRecord.deleteMany({ where: { userId } });
      await tx.subscription.deleteMany({ where: { userId } });

      // Delete system records
      await tx.notification.deleteMany({ where: { userId } });
      await tx.notificationPreference.deleteMany({ where: { userId } });
      await tx.auditLog.deleteMany({ where: { userId } });
      // Delete support tickets associated with the user
      await tx.supportTicket.deleteMany({ where: { userId } });
      await tx.userSession.deleteMany({ where: { userId } });

      // Finally delete user
      await tx.user.delete({ where: { id: userId } });
    });

    this.logger.log(`GDPR: User ${userId} and all associated data permanently deleted.`);
    return { success: true, message: 'All personal data has been permanently deleted.' };
  }
}
