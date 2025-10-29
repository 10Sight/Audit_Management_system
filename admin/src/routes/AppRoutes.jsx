import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import OptimizedLoader from "@/components/ui/OptimizedLoader";

// Layouts
const AdminLayout = lazy(() => import("../Layout/AdminLayout"));
const EmployeeLayout = lazy(() => import("../Layout/EmployeeLayout"));

// Pages
const LoginPage = lazy(() => import("../pages/LoginPage"));
const AdminDashboard = lazy(() => import("../pages/AdminDashboard"));
const EmployeesPage = lazy(() => import("../pages/EmployeesPage"));
const AddEmployeePage = lazy(() => import("../pages/AddEmployee"));
const EmployeeDetailPage = lazy(() => import("../pages/EmployeeDetailPage"));
const AdminCreateTemplatePage = lazy(() => import("@/pages/AdminCreateTemplatePage"));
const EmployeeFillInspectionPage = lazy(() => import("@/pages/EmployeeFillInspectionPage"));
const AuditsPage = lazy(() => import("@/pages/AuditPage"));
const DepartmentPage = lazy(() => import("@/pages/DepartmentPage"));
const DepartmentDetailPage = lazy(() => import("@/pages/DepartmentDetailPage"));
const AuditDetailPage = lazy(() => import("@/pages/AuditDetailPage"));
const AdminManageQuestionsPage = lazy(() => import("@/pages/AdminManageQuestionsPage"));
const EmployeeDashboard = lazy(() => import("@/pages/EmployeeDashboard"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const AdminEditAuditPage = lazy(() => import("@/pages/AdminAuditPage"));
const EditEmployeePage = lazy(() => import("@/pages/EditEmployeePage"));
const EmployeeAuditResult = lazy(() => import("@/pages/EmployeeAuditResult"));
const LinesPage = lazy(() => import("@/pages/LinesPage"));
const MachinesPage = lazy(() => import("@/pages/MachinesPage"));
const ProcessesPage = lazy(() => import("@/pages/ProcessesPage"));

export default function AppRoutes() {
  return (
    <Suspense fallback={<OptimizedLoader />}>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Admin Routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="add-employee" element={<AddEmployeePage />} />
          <Route path="employee/:id" element={<EmployeeDetailPage />} />
          <Route path="audits" element={<AuditsPage />} />
          <Route path="questions" element={<AdminManageQuestionsPage />} />
          <Route path="audits/:id" element={<AuditDetailPage />} />
          <Route path="audits/create" element={<AdminCreateTemplatePage />} />
          <Route path="departments" element={<DepartmentPage />} />
          <Route path="departments/:id" element={<DepartmentDetailPage />} />
          <Route path="lines" element={<LinesPage />} />
          <Route path="machines" element={<MachinesPage />} />
          <Route path="processes" element={<ProcessesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="audits/edit/:id" element={<AdminEditAuditPage />} />
          <Route path="employee/edit/:id" element={<EditEmployeePage />} />
        </Route>

        {/* Employee Routes */}
        <Route
          path="/employee/*"
          element={
            <ProtectedRoute allowedRoles={["employee"]}>
              <EmployeeLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<EmployeeFillInspectionPage />} />
          <Route path="inspections" element={<EmployeeFillInspectionPage />} />
          <Route path="dashboard" element={<EmployeeDashboard />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="results/:auditId" element={<EmployeeAuditResult />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}
