export const ADMIN_ROLES = [
  "super_admin",
  "admin_facturation",
  "admin_support",
  "admin_readonly",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_PERMISSIONS = {
  "subscription.view": [
    "super_admin",
    "admin_facturation",
    "admin_support",
    "admin_readonly",
  ],
  "subscription.create_manual": ["super_admin", "admin_facturation"],
  "subscription.extend": ["super_admin", "admin_facturation", "admin_support"],
  "subscription.suspend": ["super_admin", "admin_facturation"],
  "subscription.reactivate": ["super_admin", "admin_facturation", "admin_support"],
  "payment.view": [
    "super_admin",
    "admin_facturation",
    "admin_support",
    "admin_readonly",
  ],
  "payment.validate_virement": [
    "super_admin",
    "admin_facturation",
    "admin_support",
  ],
  "payment.mark_paid": ["super_admin", "admin_facturation"],
  "quota.view": [
    "super_admin",
    "admin_facturation",
    "admin_support",
    "admin_readonly",
  ],
  "quota.adjust": ["super_admin", "admin_facturation", "admin_support"],
  "pack.grant": ["super_admin", "admin_facturation", "admin_support"],
  "audit.view": ["super_admin", "admin_facturation", "admin_readonly"],
  "beta_application.decide": ["super_admin", "admin_support"],
  "etudiant_validation.decide": ["super_admin", "admin_support"],
  "lead_grand_cabinet.traiter": ["super_admin", "admin_support"],
} as const;

export type AdminPermission = keyof typeof ADMIN_PERMISSIONS;

export function canAdmin(
  role: string,
  action: AdminPermission
): boolean {
  return (ADMIN_PERMISSIONS[action] as readonly string[]).includes(role);
}
