import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Edit, Trash2, User } from "lucide-react"; // icons

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
          `http://localhost:5000/api/v1/auth/employee/${id}`,
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

  const handleEdit = () => {
    navigate(`/admin/employee/edit/${id}`);
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this employee?")) return;

    try {
      await axios.delete(`http://localhost:5000/api/v1/auth/employee/${id}`, {
        withCredentials: true,
      });
      alert("Employee deleted successfully!");
      navigate("/admin/employees");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete employee");
    }
  };

  if (loading) return <div className="text-white p-6 text-center">Loading...</div>;
  if (error) return <div className="text-red-500 p-6 text-center">{error}</div>;
  if (!employee) return <div className="text-gray-400 p-6 text-center">Employee not found</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-neutral-900 rounded-2xl shadow-lg p-8 space-y-6 border border-neutral-800">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-purple-700 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{employee.fullName}</h1>
              <p className="text-gray-400">{employee.emailId}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition text-white"
            >
              <Edit className="w-4 h-4" /> Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md transition text-white"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          <span className="bg-purple-600 px-3 py-1 rounded-full text-sm font-medium">
            {employee.role}
          </span>
          <span className="bg-green-600 px-3 py-1 rounded-full text-sm font-medium">
            {employee.department}
          </span>
        </div>

        {/* Info Section */}
        <div className="bg-neutral-800 rounded-xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-gray-200">
          <p><span className="font-semibold text-white">Employee ID:</span> {employee.employeeId}</p>
          <p><span className="font-semibold text-white">Phone:</span> {employee.phoneNumber}</p>
          <p><span className="font-semibold text-white">Email:</span> {employee.emailId}</p>
          <p><span className="font-semibold text-white">Joined:</span> {new Date(employee.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
