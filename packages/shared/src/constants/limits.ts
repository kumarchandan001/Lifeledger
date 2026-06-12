// ═══════════════════════════════════════════════════
// Plan Limits & File Constraints
// ═══════════════════════════════════════════════════

export const FILE_LIMITS = {
  MAX_FILE_SIZE_BYTES: 25 * 1024 * 1024, // 25 MB
  MAX_FILE_SIZE_LABEL: '25 MB',
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/heic',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  ] as const,
  ALLOWED_EXTENSIONS: ['.pdf', '.jpg', '.jpeg', '.png', '.heic', '.webp', '.docx', '.xlsx'],
} as const;

export const PLAN_LIMITS = {
  FREE: {
    storageLimitGb: 5,
    storageLimitBytes: 5 * 1024 * 1024 * 1024,
    maxDocuments: 100,
    maxFamilyMembers: 1,
    maxLegacyPlans: 1,
    ocrCreditsMonthly: 50,
    aiCreditsMonthly: 50,
    maxShareLinks: 3,
  },
  PREMIUM: {
    storageLimitGb: 100,
    storageLimitBytes: 100 * 1024 * 1024 * 1024,
    maxDocuments: -1, // unlimited
    maxFamilyMembers: 1,
    maxLegacyPlans: -1, // unlimited
    ocrCreditsMonthly: 500,
    aiCreditsMonthly: 500,
    maxShareLinks: -1,
  },
  FAMILY: {
    storageLimitGb: 500,
    storageLimitBytes: 500 * 1024 * 1024 * 1024,
    maxDocuments: -1,
    maxFamilyMembers: 10,
    maxLegacyPlans: -1,
    ocrCreditsMonthly: 1000,
    aiCreditsMonthly: 1000,
    maxShareLinks: -1,
  },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;

export const TRIAL_DURATION_DAYS = 14;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
