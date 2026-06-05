// ═══════════════════════════════════════════════════
// Auth Types
// ═══════════════════════════════════════════════════

export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';
export type AuthProvider = 'email' | 'google' | 'phone';

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: UserRole;
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

export interface RegisterResponse {
  user: AuthUser;
  message: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  role: UserRole;
  onboardingCompleted: boolean;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

export interface SessionInfo {
  id: string;
  deviceName: string | null;
  ipAddress: string;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface MfaSetupResponse {
  secret: string;
  qrCodeUrl: string;
}
