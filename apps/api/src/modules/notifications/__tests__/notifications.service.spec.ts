import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { NotificationStatus, NotificationType } from '@lifeledger/database';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockPrisma: any = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a notification with UNREAD status', async () => {
      const mockNotification = {
        id: 'notif-uuid',
        userId: 'user-uuid',
        type: NotificationType.EXPIRY_WARNING,
        title: 'Test Title',
        message: 'Test Message',
        metadata: {},
        status: NotificationStatus.UNREAD,
        createdAt: new Date(),
      };

      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      const result = await service.create({
        userId: 'user-uuid',
        type: NotificationType.EXPIRY_WARNING,
        title: 'Test Title',
        message: 'Test Message',
      });

      expect(result.status).toBe(NotificationStatus.UNREAD);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-uuid',
          type: NotificationType.EXPIRY_WARNING,
          status: NotificationStatus.UNREAD,
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated notifications', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      const result = await service.findAll('user-uuid', {
        page: 1,
        limit: 20,
        sortOrder: 'desc',
      });

      expect(result).toEqual({
        notifications: [],
        total: 0,
        page: 1,
        limit: 20,
      });
    });

    it('should filter by status when provided', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.findAll('user-uuid', {
        page: 1,
        limit: 20,
        status: 'UNREAD',
        sortOrder: 'desc',
      });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'UNREAD' }),
        }),
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      mockPrisma.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('user-uuid');

      expect(result).toEqual({ count: 5 });
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-uuid',
          status: NotificationStatus.UNREAD,
        },
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue({
        id: 'notif-uuid',
        userId: 'user-uuid',
        status: NotificationStatus.UNREAD,
      });
      mockPrisma.notification.update.mockResolvedValue({
        id: 'notif-uuid',
        status: NotificationStatus.READ,
        readAt: new Date(),
      });

      const result = await service.markAsRead('notif-uuid', 'user-uuid');

      expect(result.status).toBe(NotificationStatus.READ);
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-uuid' },
        data: expect.objectContaining({
          status: NotificationStatus.READ,
        }),
      });
    });

    it('should throw NotFoundException if notification does not exist', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead('invalid-uuid', 'user-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if notification belongs to different user', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead('notif-uuid', 'other-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllAsRead('user-uuid');

      expect(result).toEqual({ updated: 3 });
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-uuid',
          status: NotificationStatus.UNREAD,
        },
        data: expect.objectContaining({
          status: NotificationStatus.READ,
        }),
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification owned by the user', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue({
        id: 'notif-uuid',
        userId: 'user-uuid',
      });
      mockPrisma.notification.delete.mockResolvedValue({});

      const result = await service.deleteNotification('notif-uuid', 'user-uuid');

      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException for non-existent notification', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);

      await expect(service.deleteNotification('invalid-uuid', 'user-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('isDuplicate', () => {
    it('should return true if same document and milestone exists', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue({
        id: 'notif-uuid',
        metadata: { documentId: 'doc-uuid', milestone: 30 },
      });

      const result = await service.isDuplicate(
        'user-uuid',
        NotificationType.EXPIRY_WARNING,
        'doc-uuid',
        30,
      );

      expect(result).toBe(true);
    });

    it('should return false if no matching notification exists', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);

      const result = await service.isDuplicate(
        'user-uuid',
        NotificationType.EXPIRY_WARNING,
        'doc-uuid',
        30,
      );

      expect(result).toBe(false);
    });

    it('should return false if different milestone', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue({
        id: 'notif-uuid',
        metadata: { documentId: 'doc-uuid', milestone: 90 },
      });

      const result = await service.isDuplicate(
        'user-uuid',
        NotificationType.EXPIRY_WARNING,
        'doc-uuid',
        30,
      );

      expect(result).toBe(false);
    });
  });

  describe('archiveOldNotifications', () => {
    it('should archive read notifications older than threshold', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 10 });

      const result = await service.archiveOldNotifications(90);

      expect(result).toBe(10);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: NotificationStatus.READ,
        }),
        data: expect.objectContaining({
          status: NotificationStatus.ARCHIVED,
        }),
      });
    });
  });
});
