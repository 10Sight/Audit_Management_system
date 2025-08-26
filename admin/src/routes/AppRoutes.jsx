import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import AdminLayout from "../Layout/AdminLayout";
import EmployeeLayout from "../Layout/EmployeeLayout";

import LoginPage from "../pages/LoginPage";
import AdminDashboard from "../pages/AdminDashboard";
import EmployeesPage from "../pages/EmployeesPage";
import AddEmployeePage from "../pages/AddEmployee";
import EmployeeDetailPage from "../pages/EmployeeDetailPage";

import ProtectedRoute from "./ProtectedRoute";
// import AuditsPage from "../pages/AuditPage";
// import InspectionDetailPage from "@/pages/AuditDetailPage";
import AdminCreateTemplatePage from "@/pages/AdminCreateTemplatePage";
import EmployeeFillInspectionPage from "@/pages/EmployeeFillInspectionPage";
import AuditsPage from "@/pages/AuditPage";
import DepartmentPage from "@/pages/DepartmentPage";
import AuditDetailPage from "@/pages/AuditDetailPage";
import AdminManageQuestionsPage from "@/pages/AdminManageQuestionsPage";
import EmployeeDashboard from "@/pages/EmployeeDashboard";
import SettingsPage from "@/pages/SettingsPage";
import AdminEditAuditPage from "@/pages/AdminAuditPage";
import EditEmployeePage from "@/pages/EditEmployeePage";

export default function AppRoutes() {
  return (
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
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
