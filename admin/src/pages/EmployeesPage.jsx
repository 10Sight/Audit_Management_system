// EmployeesPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { FiDownload, FiPlus, FiArrowLeft, FiArrowRight } from "react-icons/fi";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data } = await axios.get(
          `http://localhost:5000/api/v1/auth/get-employee?page=${page}&limit=${limit}`,
          { withCredentials: true }
        );
        setEmployees(data.data?.employees || []);
        setTotal(data.data?.total || 0);
      } catch (error) {
        console.error("Error fetching employees:", error);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, [page, limit]);

  const downloadExcel = () => {
    if (!employees.length) return;

    const data = employees.map((emp) => ({
      "Full Name": emp.fullName,
      Email: emp.emailId,
      "Employee ID": emp.employeeId,
      Department: emp.department,
      Phone: emp.phoneNumber,
      Role: emp.role,
      Created: new Date(emp.createdAt).toLocaleDateString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `employees_page_${page}.xlsx`);
  };

  if (loading)
    return <div className="p-6 text-white text-center">Loading employees...</div>;

  return (
    <div className="p-4 sm:p-6 text-white min-h-screen space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-center sm:text-left">
          Employees
        </h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={downloadExcel}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition flex items-center justify-center gap-2"
          >
            <FiDownload /> Download Excel
          </button>
          <button
            onClick={() => navigate("/admin/add-employee")}
            className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition flex items-center justify-center gap-2"
          >
            <FiPlus /> Add Employee
          </button>
        </div>
      </div>

      {/* Table (Desktop) */}
      <div className="hidden sm:block overflow-x-auto border border-neutral-800 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900 text-gray-300">
            <tr>
              <th className="px-3 sm:px-4 py-2 text-left">Full Name</th>
              <th className="px-3 sm:px-4 py-2 text-left">Email</th>
              <th className="px-3 sm:px-4 py-2 text-left">Employee ID</th>
              <th className="px-3 sm:px-4 py-2 text-left">Department</th>
              <th className="px-3 sm:px-4 py-2 text-left">Phone</th>
              <th className="px-3 sm:px-4 py-2 text-left">Role</th>
              <th className="px-3 sm:px-4 py-2 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {employees.length > 0 ? (
              employees.map((emp) => (
                <tr
                  key={emp._id}
                  className="border-t border-neutral-800 hover:bg-neutral-900/50 cursor-pointer transition"
                  onClick={() => navigate(`/admin/employee/${emp._id}`)}
                >
                  <td className="px-3 sm:px-4 py-2">{emp.fullName}</td>
                  <td className="px-3 sm:px-4 py-2">{emp.emailId}</td>
                  <td className="px-3 sm:px-4 py-2">{emp.employeeId}</td>
                  <td className="px-3 sm:px-4 py-2">{emp.department}</td>
                  <td className="px-3 sm:px-4 py-2">{emp.phoneNumber}</td>
                  <td className="px-3 sm:px-4 py-2 capitalize">{emp.role}</td>
                  <td className="px-3 sm:px-4 py-2">
                    {new Date(emp.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center px-4 py-6 text-gray-400">
                  No employees found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-4">
        {employees.length > 0 ? (
          employees.map((emp) => (
            <div
              key={emp._id}
              className="border border-neutral-800 rounded-lg p-4 bg-neutral-900 cursor-pointer hover:bg-neutral-800 transition"
              onClick={() => navigate(`/admin/employee/${emp._id}`)}
            >
              <p className="font-semibold text-lg truncate">{emp.fullName}</p>
              <p className="text-gray-400 text-sm truncate">{emp.emailId}</p>
              <p className="mt-2 text-sm">
                <span className="font-medium">ID:</span> {emp.employeeId}
              </p>
              <p className="text-sm">
                <span className="font-medium">Dept:</span> {emp.department}
              </p>
              <p className="text-sm">
                <span className="font-medium">Phone:</span> {emp.phoneNumber}
              </p>
              <p className="text-sm">
                <span className="font-medium">Role:</span> {emp.role}
              </p>
              <p className="text-sm text-gray-400">
                {new Date(emp.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-400">No employees found</p>
        )}
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-3">
        <button
          disabled={page === 1}
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          className="w-full sm:w-auto bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 px-4 py-2 rounded-lg flex items-center gap-2 justify-center"
        >
          <FiArrowLeft /> Prev
        </button>

        <span className="text-gray-400 text-sm sm:text-base">
          Page {page} of {Math.ceil(total / limit) || 1}
        </span>

        <button
          disabled={page >= Math.ceil(total / limit)}
          onClick={() => setPage((prev) => prev + 1)}
          className="w-full sm:w-auto bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 px-4 py-2 rounded-lg flex items-center gap-2 justify-center"
        >
          Next <FiArrowRight />
        </button>
      </div>
    </div>
  );
}
