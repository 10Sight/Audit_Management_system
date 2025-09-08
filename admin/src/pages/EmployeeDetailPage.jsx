import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Edit, Trash2, User } from "lucide-react";

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const { data } = await axios.get(
          `https://api.audiotmanagementsystem.org//api/v1/auth/employee/${id}`,
          { withCredentials: true }
        );
        setEmployee(data.data.employee);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to fetch employee details");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchEmployee();
  }, [id]);

  const handleEdit = () => navigate(`/admin/employee/edit/${id}`);
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this employee?")) return;

    try {
      await axios.delete(`https://api.audiotmanagementsystem.org//api/v1/auth/employee/${id}`, {
        withCredentials: true,
      });
      alert("Employee deleted successfully!");
      navigate("/admin/employees");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete employee");
    }
  };

  if (loading) return <div className="text-gray-700 p-6 text-center">Loading...</div>;
  if (error) return <div className="text-red-500 p-6 text-center">{error}</div>;
  if (!employee)
    return <div className="text-gray-500 p-6 text-center">Employee not found</div>;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8 space-y-6 border border-gray-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 w-full sm:w-auto">
            <div className="bg-purple-600 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shadow">
              <User className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
                {employee.fullName}
              </h1>
              <p className="text-gray-600 text-sm sm:text-base truncate">
                {employee.emailId}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={handleEdit}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition text-white shadow-sm"
            >
              <Edit className="w-4 h-4 sm:w-5 sm:h-5" /> Edit
            </button>
            <button
              onClick={handleDelete}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md transition text-white shadow-sm"
            >
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" /> Delete
            </button>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
          <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm sm:text-base font-medium capitalize">
            {employee.role}
          </span>
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm sm:text-base font-medium capitalize">
            {employee.department}
          </span>
        </div>

        {/* Info Section */}
        <div className="bg-gray-100 rounded-xl p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-gray-700">
          <p>
            <span className="font-semibold text-gray-900">Employee ID:</span>{" "}
            {employee.employeeId}
          </p>
          <p>
            <span className="font-semibold text-gray-900">Phone:</span>{" "}
            {employee.phoneNumber || "N/A"}
          </p>
          <p>
            <span className="font-semibold text-gray-900">Email:</span>{" "}
            {employee.emailId}
          </p>
          <p>
            <span className="font-semibold text-gray-900">Joined:</span>{" "}
            {new Date(employee.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
