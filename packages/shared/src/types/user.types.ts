// ═══════════════════════════════════════════════════
// User Types
// ═══════════════════════════════════════════════════

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' | 'DELETED';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
  fullName: string;
  avatarUrl: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  mfaEnabled: boolean;
  status: UserStatus;
  onboardingCompleted: boolean;
  preferredLanguage: string;
  timezone: string;
  isAdmin: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  preferredLanguage: string;
  timezone: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: Gender;
  preferredLanguage?: string;
  timezone?: string;
}

export interface StorageUsage {
  usedBytes: number;
  limitBytes: number;
  usedPercentage: number;
  documentCount: number;
  documentLimit: number;
}
