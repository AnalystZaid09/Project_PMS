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

export type UserItem = UserDetail;

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

// ------------------------------------------------------------------------------
// Phase 3: Patient & Case Types
// ------------------------------------------------------------------------------

export interface PatientItem {
  id: string;
  organization_id: string;
  branch_id: string;
  patient_uhid: string;
  first_name: string;
  last_name: string;
  dob?: string;
  age?: number;
  gender: string;
  blood_group?: string;
  national_id?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  emergency_contact?: string;
  category_id?: string;
  category_name?: string;
  branch_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DuplicateMatch {
  id: string;
  patient_uhid: string;
  full_name: string;
  phone: string;
  gender: string;
  dob?: string;
  age?: number;
  city?: string;
  match_reasons: string[];
}

export interface DuplicateCheckResult {
  has_duplicates: boolean;
  possible_matches: DuplicateMatch[];
}

export interface CaseItemDetail {
  id: string;
  case_id: string;
  investigation_id: string;
  investigation_code?: string;
  investigation_name?: string;
  quantity: number;
  price: number;
  discount_amount: number;
  tax_amount: number;
  final_price: number;
  status: string;
  created_at: string;
}

export interface CaseOtherChargeDetail {
  id: string;
  case_id: string;
  charge_type_id: string;
  charge_name: string;
  amount: number;
  created_at: string;
}

export interface CaseListItem {
  id: string;
  case_number: string;
  patient_id: string;
  patient_uhid: string;
  patient_name: string;
  exam_date: string;
  status: string;
  priority: string;
  case_category: string;
  referring_doctor_name?: string;
  reporting_doctor_name?: string;
  investigations_summary: string;
  items_count: number;
  total_charges: number;
  discount_total: number;
  net_amount: number;
  has_report: boolean;
}

export interface CaseDetail {
  id: string;
  organization_id: string;
  branch_id: string;
  branch_name?: string;
  case_number: string;
  patient_id: string;
  patient_uhid: string;
  patient_name: string;
  patient_phone: string;
  patient_gender: string;
  patient_age?: number;
  referring_doctor_id?: string;
  referring_doctor_name?: string;
  reporting_doctor_id?: string;
  reporting_doctor_name?: string;
  radiologist_name?: string;
  pathologist_name?: string;
  physician_name?: string;
  other_doctor_name?: string;
  department_id?: string;
  department_name?: string;
  visit_datetime: string;
  status: string;
  priority: string;
  case_category: string;
  symptoms?: string;
  clinical_notes?: string;
  total_charges: number;
  discount_total: number;
  tax_total: number;
  net_amount: number;
  items: CaseItemDetail[];
  other_charges: CaseOtherChargeDetail[];
  created_at: string;
  updated_at: string;
}

export interface TimelineEventItem {
  id: string;
  event_type: string;
  title: string;
  description: string;
  timestamp: string;
  actor_name?: string;
}

export interface PatientProfile {
  patient: PatientItem;
  cases: CaseListItem[];
  timeline: TimelineEventItem[];
  total_visits: number;
  total_billed: number;
}

export interface CaseStats {
  total_cases: number;
  today_cases: number;
  emergency_cases: number;
  pending_reports: number;
  completed_cases: number;
  today_revenue: number;
}

// ------------------------------------------------------------------------------
// Phase 4: Billing & Financial Registers Types
// ------------------------------------------------------------------------------

export interface InvoiceItem {
  id: string;
  item_type: string;
  code?: string;
  name: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  final_price: number;
}

export interface PaymentRecord {
  id: string;
  invoice_id: string;
  receipt_number: string;
  amount: number;
  payment_mode: string;
  reference_number?: string;
  is_refund: boolean;
  notes?: string;
  collected_by_name?: string;
  created_at: string;
}

export interface InvoiceDetail {
  id: string;
  organization_id: string;
  branch_id: string;
  branch_name?: string;
  case_id: string;
  case_number: string;
  patient_id: string;
  patient_uhid: string;
  patient_name: string;
  patient_phone: string;
  patient_category_name?: string;
  invoice_number: string;
  subtotal: number;
  discount_total: number;
  discount_reason?: string;
  tax_total: number;
  grand_total: number;
  paid_amount: number;
  outstanding_balance: number;
  payment_status: "unpaid" | "partially_paid" | "paid" | "refunded" | "cancelled";
  notes?: string;
  items: InvoiceItem[];
  payments: PaymentRecord[];
  created_at: string;
  updated_at: string;
}

export interface BillingSummaryStats {
  total_invoices: number;
  paid_count: number;
  unpaid_count: number;
  partial_count: number;
  total_billed: number;
  total_collected: number;
  total_due: number;
}

export interface FinancialRegisterRow {
  id: string;
  register_type: string;
  serial_no?: number;
  transaction_date: string;
  cheque_no?: string;
  particulars?: string;
  amount: number;
  direction: "credit" | "debit";
  debit_or_credit: string;
  regular_or_emergency?: string;
  payment_mode?: string;
  by_cash_or_cheque?: string;
  due_or_paid?: string;
  patient_name?: string;
  case_number?: string;
  receipt_number?: string;
  remark?: string;
  created_at: string;
}

export interface RegisterSummaryData {
  items: FinancialRegisterRow[];
  count: number;
  sum_amount: number;
  credit_total: number;
  debit_total: number;
}

export interface DateWiseRegisterRow {
  date: string;
  daily_total: number;
  start_at?: string;
  receipt_no_end?: string;
  case_count: number;
}

export interface DateWiseRegisterData {
  items: DateWiseRegisterRow[];
  count: number;
  sum_total: number;
}

export interface ChargesReportRow {
  id: string;
  case_number: string;
  date: string;
  patient_name: string;
  patient_uhid: string;
  department_name?: string;
  faculty_name?: string;
  doctor_name?: string;
  investigation_code: string;
  investigation_name: string;
  amount: number;
  category: string;
}

export interface OtherChargesReportRow {
  id: string;
  case_number: string;
  date: string;
  patient_name: string;
  patient_uhid: string;
  charge_category: string;
  charge_name: string;
  amount: number;
}




// ------------------------------------------------------------------------------
// Phase 5: Clinical Reports & Verification Types
// ------------------------------------------------------------------------------

export interface ReportAttachmentItem {
  id: string;
  report_id: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  file_data?: string;
  caption?: string;
  created_at: string;
}

export interface ReportVersionItem {
  id: string;
  report_id: string;
  version_number: number;
  report_name?: string;
  report_heading?: string;
  findings_text?: string;
  impression?: string;
  recommendation?: string;
  rendered_html?: string;
  amendment_reason?: string;
  created_by_name?: string;
  created_at: string;
}

export interface ClinicalReportListItem {
  id: string;
  report_number: string;
  case_id: string;
  case_number: string;
  case_item_id: string;
  patient_id: string;
  patient_uhid: string;
  patient_name: string;
  patient_age?: number;
  patient_gender: string;
  patient_phone?: string;
  investigation_id: string;
  investigation_code: string;
  investigation_name: string;
  department_name?: string;
  report_name?: string;
  report_heading?: string;
  status: "draft" | "submitted" | "verified" | "finalized" | "amended";
  current_version: number;
  reporting_doctor_name?: string;
  verified_by_name?: string;
  verified_at?: string;
  finalized_by_name?: string;
  finalized_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ClinicalReportDetail {
  id: string;
  report_number: string;
  case_id: string;
  case_number: string;
  case_item_id: string;
  patient_id: string;
  patient_uhid: string;
  patient_name: string;
  patient_age?: number;
  patient_gender: string;
  patient_phone?: string;
  patient_city?: string;
  patient_email?: string;
  patient_symptoms?: string;
  referring_doctor_name?: string;
  reporting_doctor_name?: string;
  branch_name?: string;
  branch_address?: string;
  investigation_id: string;
  investigation_code: string;
  investigation_name: string;
  department_name?: string;
  template_id?: string;
  template_name?: string;
  report_name?: string;
  report_heading?: string;
  status: "draft" | "submitted" | "verified" | "finalized" | "amended";
  current_version: number;
  findings_text?: string;
  impression?: string;
  recommendation?: string;
  verification_remarks?: string;
  digital_signature: boolean;
  verified_by_name?: string;
  verified_at?: string;
  finalized_by_name?: string;
  finalized_at?: string;
  versions: ReportVersionItem[];
  attachments: ReportAttachmentItem[];
  created_at: string;
  updated_at: string;
}

export interface ClinicalReportsStats {
  total_reports: number;
  draft_count: number;
  submitted_count: number;
  verified_count: number;
  finalized_count: number;
  amended_count: number;
}

export interface ReferringDoctorReportRow {
  id: string;
  date: string;
  case_number: string;
  patient_uhid: string;
  patient_name: string;
  doctor_id: string;
  doctor_name: string;
  doctor_category?: string;
  department_name?: string;
  investigation_code: string;
  investigation_name: string;
  charge_amount: number;
  commission_rate: number;
  commission_type: "percentage" | "fixed";
  commission_amount: number;
}

export interface ReferringDoctorReportData {
  items: ReferringDoctorReportRow[];
  total_cases: number;
  total_charges: number;
  total_commission: number;
}

export interface ReportingDoctorReportRow {
  id: string;
  date: string;
  case_number: string;
  patient_uhid: string;
  patient_name: string;
  doctor_id: string;
  doctor_name: string;
  doctor_category?: string;
  department_name?: string;
  investigation_code: string;
  investigation_name: string;
  charge_amount: number;
  rate_amount: number;
  report_status: string;
}

export interface ReportingDoctorReportData {
  items: ReportingDoctorReportRow[];
  total_cases: number;
  total_charges: number;
  total_fees: number;
}

// ------------------------------------------------------------------------------
// Phase 6: Analytics, Communication, Notifications & Enhanced Audit
// ------------------------------------------------------------------------------

export interface DashboardKpiSummary {
  total_patients: number;
  today_cases: number;
  week_cases: number;
  month_cases: number;
  emergency_cases: number;
  draft_reports: number;
  pending_verification_reports: number;
  finalized_reports: number;
  today_revenue: number;
  month_revenue: number;
  total_revenue: number;
  outstanding_dues: number;
}

export interface RevenueTrendItem {
  date: string;
  revenue: number;
  collections: number;
}

export interface DepartmentDistributionItem {
  department_id: string;
  department_name: string;
  case_count: number;
  revenue: number;
}

export interface PriorityBreakdownItem {
  priority: string;
  count: number;
}

export interface TopInvestigationItem {
  investigation_id: string;
  investigation_code: string;
  investigation_name: string;
  count: number;
  total_billed: number;
}

export interface EmergencyQueueItem {
  id: string;
  case_number: string;
  patient_uhid: string;
  patient_name: string;
  priority: string;
  status: string;
  visit_datetime: string;
  department_name?: string;
}

export interface PendingVerificationQueueItem {
  id: string;
  report_number: string;
  case_number: string;
  patient_name: string;
  investigation_name: string;
  status: string;
  submitted_at: string;
}

export interface DashboardAnalyticsData {
  kpis: DashboardKpiSummary;
  revenue_trends: RevenueTrendItem[];
  department_distribution: DepartmentDistributionItem[];
  priority_breakdown: PriorityBreakdownItem[];
  top_investigations: TopInvestigationItem[];
  emergency_queue: EmergencyQueueItem[];
  pending_verifications: PendingVerificationQueueItem[];
}

export interface ChatChannelItem {
  id: string;
  name: string;
  display_name: string;
  description: string;
  unread_count: number;
  last_message?: string;
  last_message_at?: string;
}

export interface ChatUserItem {
  id: string;
  full_name: string;
  username: string;
  role: string;
  is_online: boolean;
  unread_count: number;
}

export interface ChatMessageItem {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  recipient_id?: string;
  recipient_name?: string;
  channel?: string;
  content: string;
  case_id?: string;
  case_number?: string;
  report_id?: string;
  report_number?: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  notification_type: "info" | "warning" | "urgent" | "clinical" | "billing";
  link_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsListResponse {
  unread_count: number;
  items: NotificationItem[];
}

export interface EmailLogItem {
  id: string;
  recipient_email: string;
  recipient_name?: string;
  subject: string;
  body: string;
  sender_name?: string;
  status: string;
  case_id?: string;
  case_number?: string;
  report_id?: string;
  report_number?: string;
  created_at: string;
}

export interface AuditLogStats {
  total_logs: number;
  login_events: number;
  clinical_events: number;
  financial_events: number;
  master_events: number;
}

