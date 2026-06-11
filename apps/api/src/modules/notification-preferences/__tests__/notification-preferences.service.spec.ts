import { Test, TestingModule } from '@nestjs/testing';
import { NotificationPreferencesService } from '../notification-preferences.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('NotificationPreferencesService', () => {
  let service: NotificationPreferencesService;

  const mockPrisma: any = {
    notificationPreference: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const defaultPreferences = {
    id: 'pref-uuid',
    userId: 'user-uuid',
    notify90Days: true,
    notify60Days: true,
    notify30Days: true,
    notify7Days: true,
    emailEnabled: true,
    inAppEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationPreferencesService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<NotificationPreferencesService>(NotificationPreferencesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrCreate', () => {
    it('should return existing preferences if they exist', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(defaultPreferences);

      const result = await service.getOrCreate('user-uuid');

      expect(result).toEqual(defaultPreferences);
      expect(mockPrisma.notificationPreference.create).not.toHaveBeenCalled();
    });

    it('should create default preferences if none exist', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.notificationPreference.create.mockResolvedValue(defaultPreferences);

      const result = await service.getOrCreate('user-uuid');

      expect(result).toEqual(defaultPreferences);
      expect(mockPrisma.notificationPreference.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-uuid',
          notify90Days: true,
          notify60Days: true,
          notify30Days: true,
          notify7Days: true,
          emailEnabled: true,
          inAppEnabled: true,
        }),
      });
    });

    it('should be idempotent — multiple calls return same result', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(defaultPreferences);

      const result1 = await service.getOrCreate('user-uuid');
      const result2 = await service.getOrCreate('user-uuid');

      expect(result1).toEqual(result2);
    });
  });

  describe('update', () => {
    it('should partially update preferences', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(defaultPreferences);

      const updatedPrefs = { ...defaultPreferences, notify90Days: false };
      mockPrisma.notificationPreference.update.mockResolvedValue(updatedPrefs);

      const result = await service.update('user-uuid', { notify90Days: false });

      expect(result.notify90Days).toBe(false);
      expect(mockPrisma.notificationPreference.update).toHaveBeenCalledWith({
        where: { userId: 'user-uuid' },
        data: { notify90Days: false },
      });
    });

    it('should only update provided fields', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(defaultPreferences);

      const updatedPrefs = { ...defaultPreferences, emailEnabled: false };
      mockPrisma.notificationPreference.update.mockResolvedValue(updatedPrefs);

      await service.update('user-uuid', { emailEnabled: false });

      expect(mockPrisma.notificationPreference.update).toHaveBeenCalledWith({
        where: { userId: 'user-uuid' },
        data: { emailEnabled: false },
      });
    });

    it('should create defaults before updating if preferences do not exist', async () => {
      mockPrisma.notificationPreference.findUnique
        .mockResolvedValueOnce(null) // getOrCreate check
        .mockResolvedValueOnce(defaultPreferences); // unused but safe

      mockPrisma.notificationPreference.create.mockResolvedValue(defaultPreferences);

      const updatedPrefs = { ...defaultPreferences, notify7Days: false };
      mockPrisma.notificationPreference.update.mockResolvedValue(updatedPrefs);

      await service.update('user-uuid', { notify7Days: false });

      expect(mockPrisma.notificationPreference.create).toHaveBeenCalled();
      expect(mockPrisma.notificationPreference.update).toHaveBeenCalled();
    });
  });
});
