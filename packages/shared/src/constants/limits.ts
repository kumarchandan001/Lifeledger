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
    storageLimitGb: 1,
    storageLimitBytes: 1 * 1024 * 1024 * 1024,
    maxDocuments: 50,
    maxFamilyMembers: 1,
    ocrCreditsMonthly: 10,
    aiQueriesMonthly: 5,
    maxShareLinks: 3,
  },
  PREMIUM: {
    storageLimitGb: 25,
    storageLimitBytes: 25 * 1024 * 1024 * 1024,
    maxDocuments: -1, // unlimited
    maxFamilyMembers: 1,
    ocrCreditsMonthly: 100,
    aiQueriesMonthly: 50,
    maxShareLinks: -1,
  },
  FAMILY: {
    storageLimitGb: 100,
    storageLimitBytes: 100 * 1024 * 1024 * 1024,
    maxDocuments: -1,
    maxFamilyMembers: 6,
    ocrCreditsMonthly: 300,
    aiQueriesMonthly: 150,
    maxShareLinks: -1,
  },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
