// ═══════════════════════════════════════════════════
// Auth Types
// ═══════════════════════════════════════════════════

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface JwtPayload {
  sub: string; // userId
  email: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string; // userId
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  mfaEnabled: boolean;
  isAdmin: boolean;
  onboardingCompleted: boolean;
}

export interface MfaSetupResponse {
  secret: string;
  qrCodeUrl: string;
}

export type AuthProvider = 'email' | 'google' | 'phone';
