// ═══════════════════════════════════════════════════
// RBAC Constants
// ═══════════════════════════════════════════════════

export const Permissions = {
  // Document
  DOCUMENT_CREATE: 'document:create',
  DOCUMENT_READ: 'document:read',
  DOCUMENT_UPDATE: 'document:update',
  DOCUMENT_DELETE: 'document:delete',
  DOCUMENT_SHARE: 'document:share',
  DOCUMENT_DOWNLOAD: 'document:download',

  // Family
  FAMILY_CREATE: 'family:create',
  FAMILY_MANAGE: 'family:manage',
  FAMILY_INVITE: 'family:invite',
  FAMILY_VIEW: 'family:view',

  // Emergency
  EMERGENCY_MANAGE: 'emergency:manage',
  EMERGENCY_ACCESS: 'emergency:access',

  // Admin
  ADMIN_USERS: 'admin:users',
  ADMIN_SYSTEM: 'admin:system',
  ADMIN_BILLING: 'admin:billing',
  ADMIN_AUDIT: 'admin:audit',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

export const RolePermissions: Record<string, Permission[]> = {
  OWNER: [
    Permissions.DOCUMENT_CREATE,
    Permissions.DOCUMENT_READ,
    Permissions.DOCUMENT_UPDATE,
    Permissions.DOCUMENT_DELETE,
    Permissions.DOCUMENT_SHARE,
    Permissions.DOCUMENT_DOWNLOAD,
    Permissions.FAMILY_CREATE,
    Permissions.FAMILY_MANAGE,
    Permissions.FAMILY_INVITE,
    Permissions.FAMILY_VIEW,
    Permissions.EMERGENCY_MANAGE,
  ],
  FAMILY_ADMIN: [
    Permissions.DOCUMENT_CREATE,
    Permissions.DOCUMENT_READ,
    Permissions.DOCUMENT_UPDATE,
    Permissions.DOCUMENT_DELETE,
    Permissions.FAMILY_MANAGE,
    Permissions.FAMILY_INVITE,
    Permissions.FAMILY_VIEW,
  ],
  FAMILY_MEMBER: [
    Permissions.DOCUMENT_CREATE,
    Permissions.DOCUMENT_READ,
    Permissions.DOCUMENT_UPDATE,
    Permissions.DOCUMENT_DELETE,
    Permissions.FAMILY_VIEW,
  ],
  FAMILY_CHILD: [Permissions.DOCUMENT_READ, Permissions.FAMILY_VIEW],
  FAMILY_VIEWER: [Permissions.DOCUMENT_READ, Permissions.FAMILY_VIEW],
  ADMIN: [
    Permissions.ADMIN_USERS,
    Permissions.ADMIN_SYSTEM,
    Permissions.ADMIN_BILLING,
    Permissions.ADMIN_AUDIT,
  ],
};

export type FamilyRole = 'ADMIN' | 'MEMBER' | 'CHILD' | 'VIEWER';
