import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { useForm } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import Joi from "joi";
import api from "@/utils/axios";

export default function AddEmployeePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const schema = Joi.object({
    fullName: Joi.string()
      .required()
      .messages({ "string.empty": "Full Name is required" }),
    emailId: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        "string.empty": "Email is required",
        "string.email": "Invalid email format",
      }),
    department: Joi.string()
      .required()
      .messages({ "string.empty": "Department is required" }),
    employeeId: Joi.string()
      .required()
      .messages({ "string.empty": "Employee ID is required" }),
    phoneNumber: Joi.string()
      .pattern(/^\d{10}$/)
      .required()
      .messages({
        "string.empty": "Phone Number is required",
        "string.pattern.base": "Phone Number must be 10 digits",
      }),
    password: Joi.string().min(6).required().messages({
      "string.empty": "Password is required",
      "string.min": "Password must be at least 6 characters",
    }),
    role: Joi.string().valid("employee", "admin", "hr").required().messages({
      "any.only": "Role must be selected",
      "string.empty": "Role is required",
    }),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: joiResolver(schema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await api.post(
        "/api/v1/auth/register",
        data
      );

      toast.success(res.data.message || "Employee registered successfully!");
      navigate("/admin/employees");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to register employee"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 flex flex-col items-center">
      <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900 text-center tracking-wide">
        Add New Employee
      </h2>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white border border-gray-300 shadow-md rounded-xl p-6 sm:p-8 w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-5"
      >
        {/* Full Name */}
        <div className="flex flex-col">
          <label className="mb-1 text-gray-700 font-medium">Full Name</label>
          <input
            {...register("fullName")}
            placeholder="Enter full name"
            className="p-3 rounded-md bg-white text-gray-900 border border-gray-300 focus:border-red-600 focus:ring-1 focus:ring-red-600 transition"
          />
          {errors.fullName && (
            <p className="text-red-500 text-sm mt-1">
              {errors.fullName.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="flex flex-col">
          <label className="mb-1 text-gray-700 font-medium">Email</label>
          <input
            {...register("emailId")}
            type="email"
            placeholder="Enter email"
            className="p-3 rounded-md bg-white text-gray-900 border border-gray-300 focus:border-red-600 focus:ring-1 focus:ring-red-600 transition"
          />
          {errors.emailId && (
            <p className="text-red-500 text-sm mt-1">
              {errors.emailId.message}
            </p>
          )}
        </div>

        {/* Department */}
        <div className="flex flex-col">
          <label className="mb-1 text-gray-700 font-medium">Department</label>
          <input
            {...register("department")}
            placeholder="Enter department"
            className="p-3 rounded-md bg-white text-gray-900 border border-gray-300 focus:border-red-600 focus:ring-1 focus:ring-red-600 transition"
          />
          {errors.department && (
            <p className="text-red-500 text-sm mt-1">
              {errors.department.message}
            </p>
          )}
        </div>

        {/* Employee ID */}
        <div className="flex flex-col">
          <label className="mb-1 text-gray-700 font-medium">Employee ID</label>
          <input
            {...register("employeeId")}
            placeholder="Enter employee ID"
            className="p-3 rounded-md bg-white text-gray-900 border border-gray-300 focus:border-red-600 focus:ring-1 focus:ring-red-600 transition"
          />
          {errors.employeeId && (
            <p className="text-red-500 text-sm mt-1">
              {errors.employeeId.message}
            </p>
          )}
        </div>

        {/* Phone Number */}
        <div className="flex flex-col">
          <label className="mb-1 text-gray-700 font-medium">Phone Number</label>
          <input
            {...register("phoneNumber")}
            placeholder="Enter phone number"
            className="p-3 rounded-md bg-white text-gray-900 border border-gray-300 focus:border-red-600 focus:ring-1 focus:ring-red-600 transition"
          />
          {errors.phoneNumber && (
            <p className="text-red-500 text-sm mt-1">
              {errors.phoneNumber.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="flex flex-col">
          <label className="mb-1 text-gray-700 font-medium">Password</label>
          <input
            {...register("password")}
            type="password"
            placeholder="Enter password"
            className="p-3 rounded-md bg-white text-gray-900 border border-gray-300 focus:border-red-600 focus:ring-1 focus:ring-red-600 transition"
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Role */}
        <div className="flex flex-col">
          <label className="mb-1 text-gray-700 font-medium">Role</label>
          <select
            {...register("role")}
            className="p-3 rounded-md bg-white text-gray-900 border border-gray-300 focus:border-red-600 focus:ring-1 focus:ring-red-600 transition"
          >
            <option value="">Select Role</option>
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
            <option value="hr">HR</option>
          </select>
          {errors.role && (
            <p className="text-red-500 text-sm mt-1">{errors.role.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <div className="sm:col-span-2">
          <button
            type="submit"
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md transition"
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="light"
      />
    </div>
  );
}
