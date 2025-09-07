import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DynamicForm from "@/components/ui/DynamicForm";
import { User, Lock, Building2, UserCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [departmentDisabled, setDepartmentDisabled] = useState(false);

  const { setUser } = useAuth();

  const handleRoleChange = (roleValue) => {
    setDepartmentDisabled(roleValue === "admin");
  };

  const loginFields = [
    {
      label: "Username",
      type: "text",
      name: "employeeId",
      placeholder: "Enter your Username",
      icon: <User className="text-gray-500" size={20} />,
    },
    {
      label: "Role",
      type: "select",
      name: "role",
      options: ["admin", "employee"],
      required: true,
      icon: <UserCheck className="text-gray-500" size={20} />,
      onChange: handleRoleChange,
    },
    {
      label: "Department",
      type: "select",
      name: "department",
      options: ["IT", "HR", "Finance", "Sales", "Production"],
      disabled: departmentDisabled,
      required: !departmentDisabled,
      icon: <Building2 className="text-gray-500" size={20} />,
    },
    {
      label: "Password",
      type: "password",
      name: "password",
      placeholder: "Enter your password",
      icon: <Lock className="text-gray-500" size={20} />,
    },
  ];

  const handleLogin = async (data) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("http://14793.78.231:5000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.message || "Login failed");

      const role = result.data?.employee?.role;
      if (!role) throw new Error("Invalid login response");

      // Store user in global context
      setUser(result.data.employee);

      // Navigate based on role
      if (role === "admin") navigate("/admin/dashboard", { replace: true });
      else if (role === "employee") navigate("/employee/inspections", { replace: true });
      else throw new Error("Invalid role received from server");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-900 px-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-300"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold mb-2 tracking-tight text-gray-900">
            Login
          </h2>
          <p className="text-gray-600 text-sm">
            Enter your details to access your panel
          </p>
        </motion.div>

        <div className="mt-6 space-y-4">
          <DynamicForm fields={loginFields} onSubmit={handleLogin} />
        </div>

        {error && (
          <p className="text-red-500 mt-4 text-center font-medium">
            ⚠️ {error}
          </p>
        )}
        {loading && (
          <p className="text-gray-500 mt-4 text-center font-medium">
            ⏳ Logging in...
          </p>
        )}
      </motion.div>
    </div>
  );
}
