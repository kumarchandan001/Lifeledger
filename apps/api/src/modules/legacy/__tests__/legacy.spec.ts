import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { AiService } from '../../ai/ai.service';

import { BeneficiaryService } from '../beneficiary.service';
import { LegacyPlanService } from '../legacy-plan.service';
import { LegacyVaultService } from '../legacy-vault.service';
import { LegacyInstructionService } from '../legacy-instruction.service';
import { PersonalMessageService } from '../personal-message.service';
import { DigitalAssetService } from '../digital-asset.service';
import { LegacyAccessService } from '../legacy-access.service';
import { LegacyActivityService } from '../legacy-activity.service';
import { LegacyAnalyticsService } from '../legacy-analytics.service';

describe('Legacy Platform Services', () => {
  let moduleRef: TestingModule;
  let beneficiaryService: BeneficiaryService;
  let planService: LegacyPlanService;
  let vaultService: LegacyVaultService;
  let instructionService: LegacyInstructionService;
  let messageService: PersonalMessageService;
  let assetService: DigitalAssetService;
  let accessService: LegacyAccessService;
  let activityService: LegacyActivityService;
  let analyticsService: LegacyAnalyticsService;

  const userId = '00000000-0000-0000-0000-000000000001';

  const mockPrisma = {
    beneficiary: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    legacyPlan: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    legacyPlanBeneficiary: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    legacyVault: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    legacyVaultDocument: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    legacyInstruction: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    personalMessage: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    digitalAsset: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    legacyAccessRequest: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    legacyAccessGrant: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    legacyActivity: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    legacyReadinessReport: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    document: { findUnique: jest.fn() },
    familyMembership: { findMany: jest.fn().mockResolvedValue([]) },
    trustedContact: { findMany: jest.fn().mockResolvedValue([]) },
  };

  const mockNotifications = {
    create: jest.fn(),
  };

  const mockAi = {
    isAvailable: jest.fn().mockReturnValue(false),
    generateLegacyReadinessScore: jest.fn().mockResolvedValue({ suggestions: [], missingItems: [] }),
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        BeneficiaryService,
        LegacyPlanService,
        LegacyVaultService,
        LegacyInstructionService,
        PersonalMessageService,
        DigitalAssetService,
        LegacyAccessService,
        LegacyActivityService,
        LegacyAnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: AiService, useValue: mockAi },
      ],
    }).compile();

    beneficiaryService = moduleRef.get(BeneficiaryService);
    planService = moduleRef.get(LegacyPlanService);
    vaultService = moduleRef.get(LegacyVaultService);
    instructionService = moduleRef.get(LegacyInstructionService);
    messageService = moduleRef.get(PersonalMessageService);
    assetService = moduleRef.get(DigitalAssetService);
    accessService = moduleRef.get(LegacyAccessService);
    activityService = moduleRef.get(LegacyActivityService);
    analyticsService = moduleRef.get(LegacyAnalyticsService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════
  // BENEFICIARY SERVICE
  // ═══════════════════════════════════════════════════

  describe('BeneficiaryService', () => {
    it('should create a beneficiary', async () => {
      mockPrisma.beneficiary.findUnique.mockResolvedValue(null);
      mockPrisma.beneficiary.create.mockResolvedValue({
        id: 'b-1', userId, name: 'John', email: 'john@test.com', relationship: 'SPOUSE', priority: 1,
      });

      const result = await beneficiaryService.create(userId, {
        name: 'John', email: 'john@test.com', relationship: 'SPOUSE',
      });

      expect(result.name).toBe('John');
      expect(mockPrisma.beneficiary.create).toHaveBeenCalled();
    });

    it('should reject duplicate email', async () => {
      mockPrisma.beneficiary.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        beneficiaryService.create(userId, { name: 'John', email: 'john@test.com', relationship: 'SPOUSE' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should return 404 for non-existent beneficiary', async () => {
      mockPrisma.beneficiary.findUnique.mockResolvedValue(null);

      await expect(beneficiaryService.findOne(userId, 'non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should prevent cross-user access', async () => {
      mockPrisma.beneficiary.findUnique.mockResolvedValue({
        id: 'b-1', userId: 'other-user', name: 'Test',
      });

      await expect(beneficiaryService.findOne(userId, 'b-1')).rejects.toThrow(NotFoundException);
    });

    it('should soft-delete beneficiary', async () => {
      mockPrisma.beneficiary.findUnique.mockResolvedValue({ id: 'b-1', userId, name: 'John' });
      mockPrisma.beneficiary.update.mockResolvedValue({});

      const result = await beneficiaryService.remove(userId, 'b-1');
      expect(result.success).toBe(true);
      expect(mockPrisma.beneficiary.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'REMOVED' } }),
      );
    });
  });

  // ═══════════════════════════════════════════════════
  // LEGACY PLAN SERVICE
  // ═══════════════════════════════════════════════════

  describe('LegacyPlanService', () => {
    it('should create a plan', async () => {
      mockPrisma.legacyPlan.create.mockResolvedValue({
        id: 'p-1', userId, name: 'Family Plan', type: 'FAMILY',
      });

      const result = await planService.create(userId, { name: 'Family Plan', type: 'FAMILY' });
      expect(result.name).toBe('Family Plan');
    });

    it('should prevent accessing another users plan', async () => {
      mockPrisma.legacyPlan.findUnique.mockResolvedValue({
        id: 'p-1', userId: 'other-user',
      });

      await expect(planService.findOne(userId, 'p-1')).rejects.toThrow(NotFoundException);
    });

    it('should assign beneficiary to plan', async () => {
      mockPrisma.legacyPlan.findUnique.mockResolvedValue({ id: 'p-1', userId });
      mockPrisma.beneficiary.findUnique.mockResolvedValue({ id: 'b-1', userId, name: 'John' });
      mockPrisma.legacyPlanBeneficiary.create.mockResolvedValue({
        id: 'pb-1', planId: 'p-1', beneficiaryId: 'b-1', beneficiary: { name: 'John' },
      });

      const result = await planService.assignBeneficiary(userId, 'p-1', { beneficiaryId: 'b-1' });
      expect(result.beneficiaryId || result.beneficiary).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════
  // LEGACY VAULT SERVICE
  // ═══════════════════════════════════════════════════

  describe('LegacyVaultService', () => {
    it('should auto-create vault and add document', async () => {
      mockPrisma.legacyVault.findUnique.mockResolvedValue(null);
      mockPrisma.legacyVault.create.mockResolvedValue({ id: 'v-1', userId, isActive: true });
      mockPrisma.document.findUnique.mockResolvedValue({ id: 'd-1', userId, title: 'Insurance' });
      mockPrisma.legacyVaultDocument.findUnique.mockResolvedValue(null);
      mockPrisma.legacyVaultDocument.create.mockResolvedValue({
        id: 'vd-1', documentId: 'd-1', category: 'INSURANCE',
        document: { id: 'd-1', title: 'Insurance', fileName: 'ins.pdf', categoryId: 'c-1' },
      });

      const result = await vaultService.addDocument(userId, {
        documentId: 'd-1', category: 'INSURANCE',
      });

      expect(result.documentId).toBe('d-1');
      expect(mockPrisma.legacyVault.create).toHaveBeenCalled();
    });

    it('should reject duplicate document in vault', async () => {
      mockPrisma.legacyVault.findUnique.mockResolvedValue({ id: 'v-1', userId });
      mockPrisma.document.findUnique.mockResolvedValue({ id: 'd-1', userId });
      mockPrisma.legacyVaultDocument.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        vaultService.addDocument(userId, { documentId: 'd-1', category: 'INSURANCE' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ═══════════════════════════════════════════════════
  // INSTRUCTION SERVICE
  // ═══════════════════════════════════════════════════

  describe('LegacyInstructionService', () => {
    it('should create an instruction', async () => {
      mockPrisma.legacyInstruction.create.mockResolvedValue({
        id: 'i-1', userId, title: 'Financial', content: 'Details', category: 'FINANCIAL', version: 1,
      });

      const result = await instructionService.create(userId, {
        title: 'Financial', content: 'Details', category: 'FINANCIAL',
      });
      expect(result.title).toBe('Financial');
    });

    it('should increment version on content update', async () => {
      mockPrisma.legacyInstruction.findUnique.mockResolvedValue({
        id: 'i-1', userId, content: 'Old content', version: 1,
      });
      mockPrisma.legacyInstruction.update.mockResolvedValue({
        id: 'i-1', version: 2, content: 'New content',
      });

      const result = await instructionService.update(userId, 'i-1', { content: 'New content' });
      expect(mockPrisma.legacyInstruction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ version: 2 }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════
  // PERSONAL MESSAGE SERVICE
  // ═══════════════════════════════════════════════════

  describe('PersonalMessageService', () => {
    it('should create a message', async () => {
      mockPrisma.personalMessage.create.mockResolvedValue({
        id: 'm-1', userId, type: 'LETTER', title: 'To My Family', content: 'Dear...',
      });

      const result = await messageService.create(userId, {
        type: 'LETTER', title: 'To My Family', content: 'Dear...',
      });
      expect(result.title).toBe('To My Family');
    });

    it('should prevent accessing another users message', async () => {
      mockPrisma.personalMessage.findUnique.mockResolvedValue({
        id: 'm-1', userId: 'other-user',
      });

      await expect(messageService.findOne(userId, 'm-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════
  // DIGITAL ASSET SERVICE
  // ═══════════════════════════════════════════════════

  describe('DigitalAssetService', () => {
    it('should register an asset', async () => {
      mockPrisma.digitalAsset.create.mockResolvedValue({
        id: 'a-1', userId, assetType: 'BANK_ACCOUNT', serviceName: 'SBI',
        assignedBeneficiary: null,
      });

      const result = await assetService.register(userId, {
        assetType: 'BANK_ACCOUNT', serviceName: 'SBI',
      });
      expect(result.serviceName).toBe('SBI');
    });

    it('should validate beneficiary ownership on assignment', async () => {
      mockPrisma.beneficiary.findUnique.mockResolvedValue({
        id: 'b-1', userId: 'other-user',
      });

      await expect(
        assetService.register(userId, {
          assetType: 'BANK_ACCOUNT', serviceName: 'SBI', assignedBeneficiaryId: 'b-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════
  // LEGACY ACCESS SERVICE
  // ═══════════════════════════════════════════════════

  describe('LegacyAccessService', () => {
    it('should create an access request', async () => {
      mockPrisma.beneficiary.findUnique.mockResolvedValue({ id: 'b-1', userId, name: 'John' });
      mockPrisma.legacyAccessRequest.findFirst.mockResolvedValue(null);
      mockPrisma.legacyAccessRequest.create.mockResolvedValue({
        id: 'r-1', ownerId: userId, beneficiaryId: 'b-1', status: 'PENDING',
        beneficiary: { name: 'John' },
      });

      const result = await accessService.createRequest(userId, 'b-1', 'Need access');
      expect(result.status).toBe('PENDING');
    });

    it('should reject duplicate pending request', async () => {
      mockPrisma.beneficiary.findUnique.mockResolvedValue({ id: 'b-1', userId });
      mockPrisma.legacyAccessRequest.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        accessService.createRequest(userId, 'b-1', 'Need access'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should approve a request and create a grant', async () => {
      mockPrisma.legacyAccessRequest.findUnique.mockResolvedValue({
        id: 'r-1', ownerId: userId, status: 'PENDING',
        beneficiary: { name: 'John', email: 'john@test.com' },
      });
      mockPrisma.legacyAccessRequest.update.mockResolvedValue({
        id: 'r-1', status: 'APPROVED',
      });
      mockPrisma.legacyAccessGrant.create.mockResolvedValue({
        id: 'g-1', requestId: 'r-1', duration: 'DAYS_30',
      });

      const result = await accessService.resolve('r-1', userId, {
        status: 'APPROVED', sessionDuration: 'DAYS_30',
      });
      expect(result.status).toBe('APPROVED');
      expect(mockPrisma.legacyAccessGrant.create).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════
  // ANALYTICS SERVICE
  // ═══════════════════════════════════════════════════

  describe('LegacyAnalyticsService', () => {
    it('should return dashboard stats', async () => {
      const result = await analyticsService.getDashboardStats(userId);
      expect(result).toHaveProperty('beneficiaryCount');
      expect(result).toHaveProperty('readinessScore');
      expect(typeof result.readinessScore).toBe('number');
    });
  });

  // ═══════════════════════════════════════════════════
  // ACTIVITY SERVICE
  // ═══════════════════════════════════════════════════

  describe('LegacyActivityService', () => {
    it('should log an activity', async () => {
      mockPrisma.legacyActivity.create.mockResolvedValue({ id: 'act-1' });

      const result = await activityService.logActivity(
        userId, 'BENEFICIARY_ADDED', 'beneficiary', 'b-1',
      );
      expect(mockPrisma.legacyActivity.create).toHaveBeenCalled();
    });

    it('should return paginated activity feed', async () => {
      mockPrisma.legacyActivity.findMany.mockResolvedValue([]);
      mockPrisma.legacyActivity.count.mockResolvedValue(0);

      const result = await activityService.getActivityFeed(userId, 10, 0);
      expect(result).toHaveProperty('activities');
      expect(result).toHaveProperty('total');
    });
  });
});
