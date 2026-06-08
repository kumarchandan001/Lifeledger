import { Test, TestingModule } from '@nestjs/testing';
import { ExpiryService } from '../expiry.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationPreferencesService } from '../../notification-preferences/notification-preferences.service';
import { MailService } from '../../mail/mail.service';
import { DocumentStatus, NotificationType } from '@lifeledger/database';

describe('ExpiryService', () => {
  let service: ExpiryService;

  const mockPrisma: any = {
    document: {
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    notification: {
      count: jest.fn(),
    },
  };

  const mockNotificationsService = {
    create: jest.fn(),
    isDuplicate: jest.fn(),
  };

  const mockPreferencesService = {
    getOrCreate: jest.fn(),
  };

  const mockMailService = {
    sendExpiryWarningEmail: jest.fn(),
    sendDocumentExpiredEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpiryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: NotificationPreferencesService, useValue: mockPreferencesService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<ExpiryService>(ExpiryService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('scanAllDocumentsForExpiry', () => {
    it('should scan documents and generate notifications for matching milestones', async () => {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      mockPrisma.document.findMany.mockResolvedValue([
        {
          id: 'doc-1',
          userId: 'user-1',
          title: 'Passport',
          expiryDate: thirtyDaysFromNow,
          status: DocumentStatus.ACTIVE,
          category: { name: 'Identity', icon: '🪪' },
          user: { id: 'user-1', email: 'test@test.com', fullName: 'Test User' },
        },
      ]);

      mockPreferencesService.getOrCreate.mockResolvedValue({
        notify90Days: true,
        notify60Days: true,
        notify30Days: true,
        notify7Days: true,
        emailEnabled: true,
        inAppEnabled: true,
      });

      mockNotificationsService.isDuplicate.mockResolvedValue(false);
      mockPrisma.document.update.mockResolvedValue({});
      mockNotificationsService.create.mockResolvedValue({});
      mockMailService.sendExpiryWarningEmail.mockResolvedValue(undefined);

      const result = await service.scanAllDocumentsForExpiry();

      expect(result.scanned).toBe(1);
      expect(result.notified).toBe(1);
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: NotificationType.EXPIRY_WARNING,
        }),
      );
      expect(mockMailService.sendExpiryWarningEmail).toHaveBeenCalled();
    });

    it('should skip notification if already sent (duplicate)', async () => {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      mockPrisma.document.findMany.mockResolvedValue([
        {
          id: 'doc-1',
          userId: 'user-1',
          title: 'Passport',
          expiryDate: thirtyDaysFromNow,
          status: DocumentStatus.ACTIVE,
          category: { name: 'Identity', icon: '🪪' },
          user: { id: 'user-1', email: 'test@test.com', fullName: 'Test User' },
        },
      ]);

      mockPreferencesService.getOrCreate.mockResolvedValue({
        notify30Days: true,
        inAppEnabled: true,
        emailEnabled: true,
      });

      mockNotificationsService.isDuplicate.mockResolvedValue(true);
      mockPrisma.document.update.mockResolvedValue({});

      const result = await service.scanAllDocumentsForExpiry();

      expect(result.notified).toBe(0);
      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });

    it('should skip notification if milestone is disabled in preferences', async () => {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      mockPrisma.document.findMany.mockResolvedValue([
        {
          id: 'doc-1',
          userId: 'user-1',
          title: 'Passport',
          expiryDate: thirtyDaysFromNow,
          status: DocumentStatus.ACTIVE,
          category: { name: 'Identity', icon: '🪪' },
          user: { id: 'user-1', email: 'test@test.com', fullName: 'Test User' },
        },
      ]);

      mockPreferencesService.getOrCreate.mockResolvedValue({
        notify30Days: false, // Disabled!
        inAppEnabled: true,
        emailEnabled: true,
      });

      mockPrisma.document.update.mockResolvedValue({});

      const result = await service.scanAllDocumentsForExpiry();

      expect(result.notified).toBe(0);
      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });

    it('should send DOCUMENT_EXPIRED notification for expired documents', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      mockPrisma.document.findMany.mockResolvedValue([
        {
          id: 'doc-1',
          userId: 'user-1',
          title: 'License',
          expiryDate: expiredDate,
          status: DocumentStatus.ACTIVE,
          category: { name: 'Identity', icon: '🪪' },
          user: { id: 'user-1', email: 'test@test.com', fullName: 'Test User' },
        },
      ]);

      mockPreferencesService.getOrCreate.mockResolvedValue({
        notify7Days: true,
        inAppEnabled: true,
        emailEnabled: true,
      });

      mockNotificationsService.isDuplicate.mockResolvedValue(false);
      mockPrisma.document.update.mockResolvedValue({});
      mockNotificationsService.create.mockResolvedValue({});
      mockMailService.sendDocumentExpiredEmail.mockResolvedValue(undefined);

      const result = await service.scanAllDocumentsForExpiry();

      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.DOCUMENT_EXPIRED,
        }),
      );
      expect(mockMailService.sendDocumentExpiredEmail).toHaveBeenCalled();
    });

    it('should update document status from ACTIVE to EXPIRING_SOON', async () => {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      mockPrisma.document.findMany.mockResolvedValue([
        {
          id: 'doc-1',
          userId: 'user-1',
          title: 'Passport',
          expiryDate: thirtyDaysFromNow,
          status: DocumentStatus.ACTIVE,
          category: { name: 'Identity', icon: '🪪' },
          user: { id: 'user-1', email: 'test@test.com', fullName: 'Test User' },
        },
      ]);

      mockPreferencesService.getOrCreate.mockResolvedValue({
        notify30Days: true,
        inAppEnabled: true,
        emailEnabled: false,
      });
      mockNotificationsService.isDuplicate.mockResolvedValue(false);
      mockPrisma.document.update.mockResolvedValue({});
      mockNotificationsService.create.mockResolvedValue({});

      await service.scanAllDocumentsForExpiry();

      expect(mockPrisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: { status: DocumentStatus.EXPIRING_SOON },
      });
    });

    it('should handle empty document list gracefully', async () => {
      mockPrisma.document.findMany.mockResolvedValue([]);

      const result = await service.scanAllDocumentsForExpiry();

      expect(result).toEqual({ scanned: 0, notified: 0, statusUpdated: 0 });
    });
  });

  describe('getExpiringDocuments', () => {
    it('should return documents expiring within specified days', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);

      mockPrisma.document.findMany.mockResolvedValue([
        {
          id: 'doc-1',
          title: 'Passport',
          expiryDate: futureDate,
          category: { name: 'Identity', icon: '🪪' },
        },
      ]);

      const result = await service.getExpiringDocuments('user-1', 90);

      expect(result).toHaveLength(1);
      expect(result[0]!.title).toBe('Passport');
      expect(result[0]!.daysRemaining).toBeGreaterThan(0);
    });
  });

  describe('getExpiredDocuments', () => {
    it('should return recently expired documents', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      mockPrisma.document.findMany.mockResolvedValue([
        {
          id: 'doc-1',
          title: 'License',
          expiryDate: pastDate,
          category: { name: 'Identity', icon: '🪪' },
        },
      ]);

      const result = await service.getExpiredDocuments('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]!.title).toBe('License');
    });
  });

  describe('getSummary', () => {
    it('should return notification and expiry summary', async () => {
      mockPrisma.notification.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3); // unread
      mockPrisma.document.count.mockResolvedValue(2); // expiring this month

      const result = await service.getSummary('user-1');

      expect(result).toEqual({
        totalNotifications: 10,
        unreadNotifications: 3,
        expiringThisMonth: 2,
      });
    });
  });
});
