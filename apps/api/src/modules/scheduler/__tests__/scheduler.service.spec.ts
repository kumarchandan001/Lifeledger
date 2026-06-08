import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerService } from '../scheduler.service';
import { ExpiryService } from '../../expiry/expiry.service';
import { NotificationsService } from '../../notifications/notifications.service';

describe('SchedulerService', () => {
  let service: SchedulerService;

  const mockExpiryService = {
    scanAllDocumentsForExpiry: jest.fn(),
  };

  const mockNotificationsService = {
    archiveOldNotifications: jest.fn(),
    deleteArchivedNotifications: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        { provide: ExpiryService, useValue: mockExpiryService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<SchedulerService>(SchedulerService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleDailyExpiryScan', () => {
    it('should invoke the expiry scanner', async () => {
      mockExpiryService.scanAllDocumentsForExpiry.mockResolvedValue({
        scanned: 100,
        notified: 5,
        statusUpdated: 3,
      });

      await service.handleDailyExpiryScan();

      expect(mockExpiryService.scanAllDocumentsForExpiry).toHaveBeenCalledTimes(1);
    });

    it('should not throw even if scanner fails', async () => {
      mockExpiryService.scanAllDocumentsForExpiry.mockRejectedValue(
        new Error('Database connection error'),
      );

      await expect(service.handleDailyExpiryScan()).resolves.not.toThrow();
    });
  });

  describe('handleWeeklyCleanup', () => {
    it('should archive and delete old notifications', async () => {
      mockNotificationsService.archiveOldNotifications.mockResolvedValue(10);
      mockNotificationsService.deleteArchivedNotifications.mockResolvedValue(5);

      await service.handleWeeklyCleanup();

      expect(mockNotificationsService.archiveOldNotifications).toHaveBeenCalledWith(90);
      expect(mockNotificationsService.deleteArchivedNotifications).toHaveBeenCalledWith(180);
    });

    it('should not throw even if cleanup fails', async () => {
      mockNotificationsService.archiveOldNotifications.mockRejectedValue(
        new Error('Cleanup failed'),
      );

      await expect(service.handleWeeklyCleanup()).resolves.not.toThrow();
    });
  });
});
