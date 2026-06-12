// ═══════════════════════════════════════════════════
// Sprint 8: Digital Legacy & Future Planning — Shared Types
// ═══════════════════════════════════════════════════

// ─── Enum Type Unions ───

export type BeneficiaryRelationship =
  | 'SPOUSE'
  | 'PARENT'
  | 'CHILD'
  | 'SIBLING'
  | 'EXECUTOR'
  | 'LAWYER'
  | 'FRIEND'
  | 'OTHER';

export type BeneficiaryStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | 'REMOVED';

export type LegacyPlanType = 'FAMILY' | 'FINANCIAL' | 'BUSINESS' | 'PERSONAL' | 'CUSTOM';

export type LegacyDocumentCategory =
  | 'FAMILY'
  | 'INSURANCE'
  | 'PROPERTY'
  | 'MEDICAL'
  | 'FINANCIAL'
  | 'BUSINESS'
  | 'PERSONAL'
  | 'NOTES';

export type LegacyInstructionCategory =
  | 'FAMILY'
  | 'FINANCIAL'
  | 'MEDICAL'
  | 'PROPERTY'
  | 'BUSINESS'
  | 'PERSONAL';

export type PersonalMessageType = 'LETTER' | 'NOTE' | 'FUTURE_MESSAGE' | 'FAMILY_MESSAGE';

export type LegacyDigitalAssetType =
  | 'BANK_ACCOUNT'
  | 'INSURANCE_POLICY'
  | 'INVESTMENT'
  | 'PROPERTY'
  | 'BUSINESS_ASSET'
  | 'ONLINE_ACCOUNT'
  | 'SUBSCRIPTION'
  | 'EMAIL'
  | 'SOCIAL_MEDIA'
  | 'DOMAIN'
  | 'OTHER';

export type LegacyAccessRequestStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED';

export type LegacySessionDuration = 'DAYS_7' | 'DAYS_30' | 'DAYS_90';

// ─── DTOs ───

export interface BeneficiaryDto {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  relationship: BeneficiaryRelationship;
  status: BeneficiaryStatus;
  notes?: string | null;
  linkedUserId?: string | null;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LegacyPlanDto {
  id: string;
  userId: string;
  name: string;
  type: LegacyPlanType;
  description?: string | null;
  accessRules: Record<string, unknown>;
  isActive: boolean;
  beneficiaries?: LegacyPlanBeneficiaryDto[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LegacyPlanBeneficiaryDto {
  id: string;
  planId: string;
  beneficiaryId: string;
  accessScope: Record<string, unknown>;
  beneficiary?: BeneficiaryDto;
  createdAt: Date;
}

export interface LegacyVaultDocumentDto {
  id: string;
  userId: string;
  legacyVaultId: string;
  documentId: string;
  category: LegacyDocumentCategory;
  notes?: string | null;
  document?: {
    id: string;
    title: string;
    fileName: string;
    categoryId: string;
  };
  createdAt: Date;
}

export interface LegacyInstructionDto {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: LegacyInstructionCategory;
  attachments: unknown[];
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonalMessageDto {
  id: string;
  userId: string;
  type: PersonalMessageType;
  title: string;
  content: string;
  recipientName?: string | null;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DigitalAssetDto {
  id: string;
  userId: string;
  assetType: LegacyDigitalAssetType;
  serviceName: string;
  accountRef?: string | null;
  institutionName?: string | null;
  notes?: string | null;
  metadata: Record<string, unknown>;
  assignedBeneficiaryId?: string | null;
  assignedBeneficiary?: BeneficiaryDto;
  createdAt: Date;
  updatedAt: Date;
}

export interface LegacyAccessRequestDto {
  id: string;
  ownerId: string;
  beneficiaryId: string;
  reason: string;
  status: LegacyAccessRequestStatus;
  reviewNotes?: string | null;
  expiresAt: Date;
  resolvedAt?: Date | null;
  beneficiary?: BeneficiaryDto;
  grant?: LegacyAccessGrantDto;
  createdAt: Date;
  updatedAt: Date;
}

export interface LegacyAccessGrantDto {
  id: string;
  requestId: string;
  duration: LegacySessionDuration;
  accessScope: {
    planIds?: string[];
    documentIds?: string[];
    instructionIds?: string[];
  };
  grantedAt: Date;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface LegacyActivityDto {
  id: string;
  userId: string;
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface LegacyReadinessScoreDto {
  score: number;
  maxScore: number;
  breakdown: {
    beneficiaries: number;
    plans: number;
    vault: number;
    instructions: number;
    messages: number;
    assets: number;
  };
  suggestions: LegacyReadinessSuggestion[];
  missingItems: LegacyMissingItem[];
  generatedAt: Date;
}

export interface LegacyReadinessSuggestion {
  category: string;
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface LegacyMissingItem {
  category: string;
  itemType: string;
  reason: string;
}

export interface LegacyDashboardStatsDto {
  beneficiaryCount: number;
  planCount: number;
  vaultDocumentCount: number;
  instructionCount: number;
  messageCount: number;
  assetCount: number;
  pendingRequests: number;
  readinessScore: number;
}
