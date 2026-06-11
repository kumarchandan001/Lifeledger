import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { RequestStatus, NotificationType } from '@lifeledger/database';

import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { AiService } from '../../ai/ai.service';
import { StorageService } from '../../storage/storage.service';

import { TrustedContactsService } from '../trusted-contacts.service';
import { EmergencyVaultService } from '../emergency-vault.service';
import { EmergencyRequestsService } from '../emergency-requests.service';
import { EmergencyAccessService } from '../emergency-access.service';
import { EmergencyActivityService } from '../emergency-activity.service';
import { EscalationService } from '../escalation.service';

describe('Emergency Platform Services', () => {
  let moduleRef: TestingModule;
  let contactsService: TrustedContactsService;
  let vaultService: EmergencyVaultService;
  let requestsService: EmergencyRequestsService;
  let accessService: EmergencyAccessService;
  let activityService: EmergencyActivityService;
  let escalationService: EscalationService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    trustedContact: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    document: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
    subCategory: {
      findMany: jest.fn(),
    },
    emergencyVaultDocument: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    emergencyAccessRequest: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    emergencyAccessGrant: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    emergencyActivity: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockMail = {
    sendTrustedContactAdditionEmail: jest.fn(),
    sendEmergencyRequestEmail: jest.fn(),
    sendRequestConfirmationEmail: jest.fn(),
    sendRequestApprovedEmail: jest.fn(),
    sendRequestRejectedEmail: jest.fn(),
    sendSessionStartedEmail: jest.fn(),
    sendEscalationNoticeEmail: jest.fn(),
    sendEscalationRequesterNoticeEmail: jest.fn(),
    sendWaitingPeriodReminderEmail: jest.fn(),
  };

  const mockNotifications = {
    create: jest.fn(),
  };

  const mockAi = {
    suggestVaultDocuments: jest.fn(),
    identifyMissingDocuments: jest.fn(),
  };

  const mockStorage = {
    generateDownloadUrl: jest.fn((key) => Promise.resolve(`http://signed-url/${key}`)),
  };

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        TrustedContactsService,
        EmergencyVaultService,
        EmergencyRequestsService,
        EmergencyAccessService,
        EmergencyActivityService,
        EscalationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMail },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: AiService, useValue: mockAi },
        { provide: StorageService, useValue: mockStorage },
      ],
    }).compile();

    contactsService = moduleRef.get<TrustedContactsService>(TrustedContactsService);
    vaultService = moduleRef.get<EmergencyVaultService>(EmergencyVaultService);
    requestsService = moduleRef.get<EmergencyRequestsService>(EmergencyRequestsService);
    accessService = moduleRef.get<EmergencyAccessService>(EmergencyAccessService);
    activityService = moduleRef.get<EmergencyActivityService>(EmergencyActivityService);
    escalationService = moduleRef.get<EscalationService>(EscalationService);

    jest.clearAllMocks();
  });

  describe('TrustedContactsService', () => {
    it('should create a trusted contact and notify them', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', fullName: 'Alice' });
      mockPrisma.trustedContact.findFirst.mockResolvedValue(null);
      mockPrisma.trustedContact.create.mockResolvedValue({
        id: 'contact-1',
        name: 'Bob',
        email: 'bob@example.com',
        relationship: 'Spouse',
      });
      mockPrisma.emergencyActivity.create.mockResolvedValue({});

      const result = await contactsService.create('user-1', {
        name: 'Bob',
        email: 'bob@example.com',
        relationship: 'Spouse',
      });

      expect(result.name).toBe('Bob');
      expect(mockPrisma.trustedContact.create).toHaveBeenCalled();
      expect(mockNotifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.EMERGENCY,
          title: 'Trusted Contact Added',
        }),
      );
      expect(mockMail.sendTrustedContactAdditionEmail).toHaveBeenCalled();
    });

    it('should prevent adding duplicate email contacts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrisma.trustedContact.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        contactsService.create('user-1', {
          name: 'Bob',
          email: 'bob@example.com',
          relationship: 'Spouse',
        }),
      ).rejects.toThrow();
    });
  });

  describe('EmergencyVaultService', () => {
    it('should add a document to the vault if owned by user', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({ id: 'doc-1', userId: 'user-1', title: 'Will' });
      mockPrisma.emergencyVaultDocument.findUnique.mockResolvedValue(null);
      mockPrisma.emergencyVaultDocument.create.mockResolvedValue({ id: 'vd-1' });

      const result = await vaultService.addDocument('user-1', 'doc-1');
      expect(result).toBeDefined();
      expect(mockPrisma.emergencyVaultDocument.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', documentId: 'doc-1' },
      });
    });

    it('should block adding documents owned by other users', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({ id: 'doc-1', userId: 'other-user' });

      await expect(
        vaultService.addDocument('user-1', 'doc-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('EmergencyRequestsService', () => {
    it('should create an access request for designated contact', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'owner-1', email: 'owner@example.com', emergencyWaitingPeriod: 7 });
      mockPrisma.trustedContact.findFirst.mockResolvedValue({ id: 'contact-1' });
      mockPrisma.emergencyAccessRequest.create.mockResolvedValue({
        id: 'request-1',
        waitingPeriod: 7,
        status: RequestStatus.PENDING,
      });

      const result = await requestsService.create({
        ownerEmail: 'owner@example.com',
        requesterEmail: 'bob@example.com',
        requesterName: 'Bob',
        reason: 'Incacipated in ICU',
      });

      expect(result.status).toBe(RequestStatus.PENDING);
      expect(mockNotifications.create).toHaveBeenCalled();
      expect(mockMail.sendEmergencyRequestEmail).toHaveBeenCalled();
      expect(mockMail.sendRequestConfirmationEmail).toHaveBeenCalled();
    });

    it('should deny request if requester is not a trusted contact', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'owner-1' });
      mockPrisma.trustedContact.findFirst.mockResolvedValue(null);

      await expect(
        requestsService.create({
          ownerEmail: 'owner@example.com',
          requesterEmail: 'stranger@example.com',
          requesterName: 'Stranger',
          reason: 'Hack attempt',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should resolve a request as APPROVED and create a grant', async () => {
      const mockReq = {
        id: 'request-1',
        status: RequestStatus.PENDING,
        trustedContact: {
          userId: 'owner-1',
          name: 'Bob',
          email: 'bob@example.com',
          user: { fullName: 'Alice' },
        },
      };
      mockPrisma.emergencyAccessRequest.findUnique.mockResolvedValue(mockReq);
      mockPrisma.emergencyAccessRequest.update.mockResolvedValue({ id: 'request-1', status: RequestStatus.APPROVED });
      mockPrisma.emergencyAccessGrant.create.mockResolvedValue({ id: 'grant-1' });

      const result = await requestsService.resolve('request-1', 'owner-1', {
        status: 'APPROVED',
        sessionDuration: '72h',
        accessScope: { categories: ['medical'] },
      });

      expect(result.status).toBe(RequestStatus.APPROVED);
      expect(mockPrisma.emergencyAccessGrant.create).toHaveBeenCalled();
      expect(mockMail.sendRequestApprovedEmail).toHaveBeenCalled();
    });
  });

  describe('EmergencyAccessService', () => {
    it('should start session if grant is valid and active', async () => {
      const mockGrant = {
        id: 'grant-1',
        requestId: 'request-1',
        expiresAt: new Date(Date.now() + 60000),
        request: {
          status: RequestStatus.APPROVED,
          trustedContact: {
            userId: 'owner-1',
            name: 'Bob',
            user: { email: 'owner@example.com', fullName: 'Alice' },
          },
        },
      };
      mockPrisma.emergencyAccessGrant.findUnique.mockResolvedValue(mockGrant);

      const result = await accessService.startSession('grant-1');
      expect(result.ownerName).toBe('Alice');
      expect(mockMail.sendSessionStartedEmail).toHaveBeenCalled();
    });

    it('should prevent access if session has expired', async () => {
      const mockGrant = {
        id: 'grant-1',
        expiresAt: new Date(Date.now() - 60000), // in the past
      };
      mockPrisma.emergencyAccessGrant.findUnique.mockResolvedValue(mockGrant);

      await expect(
        accessService.startSession('grant-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('EscalationService', () => {
    it('should escalate pending requests past waiting period', async () => {
      const expiredRequests = [{ id: 'req-expired', status: RequestStatus.PENDING }];
      mockPrisma.emergencyAccessRequest.findMany.mockResolvedValue(expiredRequests);
      
      mockPrisma.emergencyAccessRequest.findUnique.mockResolvedValue({
        id: 'req-expired',
        status: RequestStatus.PENDING,
        trustedContact: {
          email: 'bob@example.com',
          name: 'Bob',
          user: { id: 'owner-1', email: 'owner@example.com', fullName: 'Alice' },
        },
      });

      await escalationService.processEscalationAndReminders();

      expect(mockPrisma.emergencyAccessRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'req-expired' },
          data: { status: RequestStatus.ESCALATED },
        }),
      );
      expect(mockMail.sendEscalationNoticeEmail).toHaveBeenCalled();
      expect(mockMail.sendEscalationRequesterNoticeEmail).toHaveBeenCalled();
    });
  });
});
