export interface BranchInfo {
  id: string;
  branch_code: string;
  name: string;
  country: string;
  state: string;
  city: string;
  address?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  is_default?: boolean;
}

export interface UserRoleInfo {
  id: string;
  name: string;
  slug: string;
}

export interface CurrentUser {
  id: string;
  organization_id: string;
  organization_name: string;
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  is_superadmin: boolean;
  roles: string[];
  permissions: string[];
  active_branch_id?: string;
  active_branch_name?: string;
  allowed_branches: BranchInfo[];
}

export interface UserDetail {
  id: string;
  organization_id: string;
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  is_email_verified: boolean;
  is_superadmin: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  roles: UserRoleInfo[];
  branches: BranchInfo[];
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  code: string;
  description?: string;
}

export interface RoleDetail {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_system: boolean;
  permissions: Permission[];
}

export interface GeneralSettings {
  app_name: string;
  logo_url?: string;
  favicon_url?: string;
  currency_code: string;
  currency_symbol: string;
  timezone: string;
  date_format: string;
}

export interface AuditLogItem {
  id: string;
  organization_id: string;
  branch_id?: string;
  user_id?: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  ip_address?: string;
  changes_json?: string;
  created_at: string;
}

