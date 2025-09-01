import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

export default function EditEmployeePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState({
    fullName: "",
    emailId: "",
    phoneNumber: "",
    department: "",
    role: "",
    employeeId: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const { data } = await axios.get(
          `https://audit-management-system-server.onrender.com/api/v1/auth/employee/${id}`,
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEmployee((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(
        `https://audit-management-system-server.onrender.com/api/v1/auth/employee/${id}`,
        employee,
        { withCredentials: true }
      );
      alert("Employee updated successfully!");
      navigate(`/admin/employee/${id}`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update employee");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-700 p-6 text-center">Loading...</div>;
  if (error) return <div className="text-red-500 p-6 text-center">{error}</div>;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8 space-y-6 border border-gray-300">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Edit Profile</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm sm:text-base text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              name="fullName"
              value={employee.fullName}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-md bg-gray-100 text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm sm:text-base text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="emailId"
              value={employee.emailId}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-md bg-gray-100 text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm sm:text-base text-gray-700 mb-1">Phone Number</label>
            <input
              type="text"
              name="phoneNumber"
              value={employee.phoneNumber}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-md bg-gray-100 text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm sm:text-base text-gray-700 mb-1">Department</label>
            <input
              type="text"
              name="department"
              value={employee.department}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-md bg-gray-100 text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm sm:text-base text-gray-700 mb-1">Role</label>
            <select
              name="role"
              value={employee.role}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-md bg-gray-100 text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              required
            >
              <option value="">Select Role</option>
              <option value="admin">Admin</option>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
            </select>
          </div>

          {/* Employee ID */}
          <div>
            <label className="block text-sm sm:text-base text-gray-700 mb-1">Employee ID</label>
            <input
              type="text"
              name="employeeId"
              value={employee.employeeId}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-md bg-gray-100 text-gray-900 border border-gray-300"
              disabled
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto px-4 py-2 rounded-md bg-gray-500 hover:bg-gray-600 text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
