import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { UsersPage } from "@/features/admin/users/UsersPage";
import { PermissionsPage } from "@/features/admin/roles/PermissionsPage";
import { BranchesPage } from "@/features/admin/branches/BranchesPage";
import { SettingsPage } from "@/features/admin/settings/SettingsPage";
import { AuditLogsPage } from "@/features/admin/audit/AuditLogsPage";
import { DepartmentsPage } from "@/features/masters/DepartmentsPage";
import { CitiesPage } from "@/features/masters/CitiesPage";
import { PatientCategoriesPage } from "@/features/masters/PatientCategoriesPage";
import { DoctorCategoriesPage } from "@/features/masters/DoctorCategoriesPage";
import { DoctorsPage } from "@/features/masters/DoctorsPage";
import { DoctorRatesPage } from "@/features/masters/DoctorRatesPage";
import { InvestigationsPage } from "@/features/masters/InvestigationsPage";
import { InvestigationChargesPage } from "@/features/masters/InvestigationChargesPage";
import { OtherChargesPage } from "@/features/masters/OtherChargesPage";
import { EmailTemplatesPage } from "@/features/masters/EmailTemplatesPage";
import { ReportTemplatesPage } from "@/features/masters/ReportTemplatesPage";
import { PatientsListPage } from "@/features/patients/PatientsListPage";
import { PatientProfilePage } from "@/features/patients/PatientProfilePage";
import { CasesListPage } from "@/features/patients/CasesListPage";
import { CaseRegistrationWizard } from "@/features/patients/CaseRegistrationWizard";
import { InvoicesListPage } from "@/features/billing/InvoicesListPage";
import { CaseRegisterPage } from "@/features/registers/CaseRegisterPage";
import { BankRegisterPage } from "@/features/registers/BankRegisterPage";
import { ExpenseRegisterPage } from "@/features/registers/ExpenseRegisterPage";
import { PettyCashPage } from "@/features/registers/PettyCashPage";
import { DateWiseRegisterPage } from "@/features/registers/DateWiseRegisterPage";
import { ChargesReportPage } from "@/features/reports/ChargesReportPage";
import { OtherChargesReportPage } from "@/features/reports/OtherChargesReportPage";
import { ClinicalReportsListPage } from "@/features/reports/ClinicalReportsListPage";
import { PatientReportEditorPage } from "@/features/reports/PatientReportEditorPage";
import { ReferringDoctorReportPage } from "@/features/reports/ReferringDoctorReportPage";
import { ReportingDoctorReportPage } from "@/features/reports/ReportingDoctorReportPage";
import { InternalChatPage } from "@/features/communication/InternalChatPage";
import { EmailLogsPage } from "@/features/communication/EmailLogsPage";
import { BackupsPage } from "@/features/admin/backups/BackupsPage";

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Authenticated Application Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Phase 3: Patient & Case Workflow Routes */}
          <Route element={<ProtectedRoute requiredPermission="patient_registration:view" />}>
            <Route path="/cases" element={<CasesListPage />} />
            <Route path="/patients" element={<PatientsListPage />} />
            <Route path="/patients/:id" element={<PatientProfilePage />} />
          </Route>

          <Route element={<ProtectedRoute requiredPermission="patient_registration:add" />}>
            <Route path="/cases/new" element={<CaseRegistrationWizard />} />
            <Route path="/patients/new" element={<Navigate to="/cases/new" replace />} />
          </Route>

          {/* Phase 4: Billing & Financial Invoices */}
          <Route element={<ProtectedRoute requiredPermission="financial_registers:view" />}>
            <Route path="/billing" element={<InvoicesListPage />} />
            <Route path="/billing/invoices" element={<InvoicesListPage />} />
            <Route path="/billing/payments" element={<InvoicesListPage />} />
          </Route>

          {/* Phase 4: Financial Registers */}
          <Route element={<ProtectedRoute requiredPermission="financial_registers:view" />}>
            <Route path="/registers/case" element={<CaseRegisterPage />} />
            <Route path="/registers/bank" element={<BankRegisterPage />} />
            <Route path="/registers/expense" element={<ExpenseRegisterPage />} />
            <Route path="/registers/petty-cash" element={<PettyCashPage />} />
            <Route path="/registers/date-wise" element={<DateWiseRegisterPage />} />
          </Route>

          {/* Phase 4 & Phase 5: Financial, Charges & Doctor Reports */}
          <Route element={<ProtectedRoute requiredPermission="charges_report:view" />}>
            <Route path="/reports/charges" element={<ChargesReportPage />} />
            <Route path="/reports/referring-doctor" element={<ReferringDoctorReportPage />} />
            <Route path="/reports/reporting-doctor" element={<ReportingDoctorReportPage />} />
          </Route>

          <Route element={<ProtectedRoute requiredPermission="other_charges_report:view" />}>
            <Route path="/reports/other-charges" element={<OtherChargesReportPage />} />
          </Route>

          {/* Phase 5: Clinical Reports & Diagnostic Verification Workflow */}
          <Route element={<ProtectedRoute requiredPermission="patient_report:view" />}>
            <Route path="/reports/clinical" element={<ClinicalReportsListPage />} />
            <Route path="/reports/editor/:id" element={<PatientReportEditorPage />} />
          </Route>

          {/* Phase 6: Communication, Internal Chat & Email Transmission */}
          <Route element={<ProtectedRoute requiredPermission="chat:view" />}>
            <Route path="/communication/chat" element={<InternalChatPage />} />
          </Route>

          <Route element={<ProtectedRoute requiredPermission="send_email:view" />}>
            <Route path="/communication/emails" element={<EmailLogsPage />} />
          </Route>

          {/* Admin Routes with Permission Checks */}
          <Route element={<ProtectedRoute requiredPermission="user_master:view" />}>
            <Route path="/admin/users" element={<UsersPage />} />
          </Route>

          <Route element={<ProtectedRoute requiredPermission="user_right:view" />}>
            <Route path="/admin/permissions" element={<PermissionsPage />} />
          </Route>

          <Route element={<ProtectedRoute requiredPermission="branch_master:view" />}>
            <Route path="/admin/branches" element={<BranchesPage />} />
          </Route>

          <Route element={<ProtectedRoute requiredPermission="general_settings:view" />}>
            <Route path="/admin/settings" element={<SettingsPage />} />
            <Route path="/admin/backups" element={<BackupsPage />} />
          </Route>

          <Route element={<ProtectedRoute requiredPermission="audit_logs:view" />}>
            <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
          </Route>

          {/* Master Data Routes */}
          <Route element={<ProtectedRoute requiredPermission="department_master:view" />}>
            <Route path="/masters/departments" element={<DepartmentsPage />} />
          </Route>

          <Route element={<ProtectedRoute requiredPermission="city_master:view" />}>
            <Route path="/masters/cities" element={<CitiesPage />} />
          </Route>

          <Route element={<ProtectedRoute requiredPermission="patient_category_master:view" />}>
            <Route path="/masters/patient-categories" element={<PatientCategoriesPage />} />
          </Route>

          <Route element={<ProtectedRoute requiredPermission="doctor_category_master:view" />}>
            <Route path="/masters/doctor-categories" element={<DoctorCategoriesPage />} />
          </Route>

          <Route element={<ProtectedRoute requiredPermission="doctor_master:view" />}>
            <Route path="/masters/doctors" element={<DoctorsPage />} />
            <Route path="/masters/doctor-rates" element={<DoctorRatesPage />} />
          </Route>

          <Route element={<ProtectedRoute requiredPermission="investigation_master:view" />}>
            <Route path="/masters/investigations" element={<InvestigationsPage />} />
            <Route path="/masters/investigation-charges" element={<InvestigationChargesPage />} />
          </Route>

          <Route element={<ProtectedRoute requiredPermission="other_charges_master:view" />}>
            <Route path="/masters/other-charges" element={<OtherChargesPage />} />
          </Route>

          <Route element={<ProtectedRoute requiredPermission="template_master:view" />}>
            <Route path="/masters/email-templates" element={<EmailTemplatesPage />} />
            <Route path="/masters/report-templates" element={<ReportTemplatesPage />} />
          </Route>
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
