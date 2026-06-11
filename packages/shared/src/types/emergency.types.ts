export type TrustedRelationship =
  | 'Spouse'
  | 'Parent'
  | 'Child'
  | 'Sibling'
  | 'Lawyer'
  | 'Doctor'
  | 'Executor'
  | 'Friend'
  | 'Other';

export type EmergencyRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'ESCALATED';

export interface TrustedContactDto {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  relationship: TrustedRelationship | string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmergencyVaultDocumentDto {
  id: string;
  userId: string;
  documentId: string;
  createdAt: Date;
}

export interface EmergencyAccessRequestDto {
  id: string;
  requesterId?: string | null;
  trustedContactId: string;
  reason: string;
  status: EmergencyRequestStatus;
  waitingPeriod: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  trustedContact?: TrustedContactDto;
}

export interface EmergencyAccessGrantDto {
  id: string;
  requestId: string;
  grantedAt: Date;
  expiresAt: Date;
  accessScope: {
    categories?: string[];
    documentIds?: string[];
  };
  createdAt: Date;
}

export interface EmergencyActivityDto {
  id: string;
  userId: string;
  actorId?: string | null;
  action: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface EmergencySettingsDto {
  emergencyWaitingPeriod: number;
}
