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

export interface DepartmentItem {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CityItem {
  id: string;
  name: string;
  state: string;
  country: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PatientCategoryItem {
  id: string;
  organization_id: string;
  name: string;
  discount_percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DoctorCategoryItem {
  id: string;
  organization_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DoctorItem {
  id: string;
  organization_id: string;
  category_id?: string;
  department_id?: string;
  category_name?: string;
  department_name?: string;
  full_name: string;
  qualification?: string;
  phone?: string;
  email?: string;
  doctor_type: "referring" | "reporting" | "both";
  commission_rate: number;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DoctorInvestigationRateItem {
  id: string;
  doctor_id: string;
  investigation_id: string;
  doctor_name?: string;
  investigation_name?: string;
  investigation_code?: string;
  rate_type: "referral" | "reporting";
  regular_fixed: number;
  regular_percentage: number;
  emergency_fixed: number;
  emergency_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface InvestigationCategoryItem {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvestigationItem {
  id: string;
  organization_id: string;
  category_id?: string;
  department_id?: string;
  category_name?: string;
  department_name?: string;
  template_name?: string;
  code: string;
  name: string;
  description?: string;
  default_price: number;
  emergency_price: number;
  turnaround_hours: number;
  template_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvestigationBranchPriceItem {
  id: string;
  investigation_id: string;
  branch_id: string;
  investigation_name?: string;
  investigation_code?: string;
  branch_name?: string;
  price: number;
  emergency_price: number;
  created_at: string;
  updated_at: string;
}

export interface OtherChargeTypeItem {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  default_amount: number;
  is_taxable: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplateItem {
  id: string;
  organization_id: string;
  name: string;
  subject: string;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportTemplateItem {
  id: string;
  organization_id: string;
  name: string;
  department_id?: string;
  department_name?: string;
  schema_json?: string;
  default_text?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

