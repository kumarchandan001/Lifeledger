import { z } from 'zod';

// ─── Beneficiary ───

export const createBeneficiarySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(20).optional().nullable(),
  relationship: z.enum([
    'SPOUSE',
    'PARENT',
    'CHILD',
    'SIBLING',
    'EXECUTOR',
    'LAWYER',
    'FRIEND',
    'OTHER',
  ]),
  notes: z.string().max(2000).optional().nullable(),
  priority: z.number().int().min(1).max(10).optional().default(1),
});

export const updateBeneficiarySchema = createBeneficiarySchema.partial();

// ─── Legacy Plan ───

export const createLegacyPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required').max(255),
  type: z.enum(['FAMILY', 'FINANCIAL', 'BUSINESS', 'PERSONAL', 'CUSTOM']),
  description: z.string().max(5000).optional().nullable(),
  accessRules: z.record(z.unknown()).optional().default({}),
});

export const updateLegacyPlanSchema = createLegacyPlanSchema.partial();

export const assignPlanBeneficiarySchema = z.object({
  beneficiaryId: z.string().uuid('Invalid beneficiary ID'),
  accessScope: z.record(z.unknown()).optional().default({}),
});

// ─── Legacy Vault Document ───

export const addLegacyVaultDocumentSchema = z.object({
  documentId: z.string().uuid('Invalid document ID'),
  category: z.enum([
    'FAMILY',
    'INSURANCE',
    'PROPERTY',
    'MEDICAL',
    'FINANCIAL',
    'BUSINESS',
    'PERSONAL',
    'NOTES',
  ]),
  notes: z.string().max(2000).optional().nullable(),
});

// ─── Legacy Instruction ───

export const createLegacyInstructionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  content: z.string().min(1, 'Content is required'),
  category: z.enum(['FAMILY', 'FINANCIAL', 'MEDICAL', 'PROPERTY', 'BUSINESS', 'PERSONAL']),
  attachments: z.array(z.record(z.unknown())).optional().default([]),
});

export const updateLegacyInstructionSchema = createLegacyInstructionSchema.partial();

// ─── Personal Message ───

export const createPersonalMessageSchema = z.object({
  type: z.enum(['LETTER', 'NOTE', 'FUTURE_MESSAGE', 'FAMILY_MESSAGE']),
  title: z.string().min(1, 'Title is required').max(255),
  content: z.string().min(1, 'Content is required'),
  recipientName: z.string().max(255).optional().nullable(),
  isPrivate: z.boolean().optional().default(true),
});

export const updatePersonalMessageSchema = createPersonalMessageSchema.partial();

// ─── Digital Asset ───

export const registerDigitalAssetSchema = z.object({
  assetType: z.enum([
    'BANK_ACCOUNT',
    'INSURANCE_POLICY',
    'INVESTMENT',
    'PROPERTY',
    'BUSINESS_ASSET',
    'ONLINE_ACCOUNT',
    'SUBSCRIPTION',
    'EMAIL',
    'SOCIAL_MEDIA',
    'DOMAIN',
    'OTHER',
  ]),
  serviceName: z.string().min(1, 'Service name is required').max(255),
  accountRef: z.string().max(255).optional().nullable(),
  institutionName: z.string().max(255).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  metadata: z.record(z.unknown()).optional().default({}),
  assignedBeneficiaryId: z.string().uuid().optional().nullable(),
});

export const updateDigitalAssetSchema = registerDigitalAssetSchema.partial();

// ─── Legacy Access Request ───

export const createLegacyAccessRequestSchema = z.object({
  beneficiaryId: z.string().uuid('Invalid beneficiary ID'),
  ownerEmail: z.string().email('Invalid owner email'),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(2000),
});

export const resolveLegacyAccessRequestSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNotes: z.string().max(2000).optional(),
  sessionDuration: z.enum(['DAYS_7', 'DAYS_30', 'DAYS_90']).optional().default('DAYS_30'),
  accessScope: z
    .object({
      planIds: z.array(z.string().uuid()).optional(),
      documentIds: z.array(z.string().uuid()).optional(),
      instructionIds: z.array(z.string().uuid()).optional(),
    })
    .optional(),
});
