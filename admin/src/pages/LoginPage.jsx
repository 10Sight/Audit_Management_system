import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import SimpleDynamicForm from "@/components/ui/SimpleDynamicForm";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { User, Lock, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLoginMutation } from "@/store/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { setUser } = useAuth();
  const [login, { isLoading: loginLoading }] = useLoginMutation();

  const loginFields = [
    {
      label: "Username",
      type: "text",
      name: "username",
      placeholder: "Enter your username",
      icon: <User className="text-gray-500" size={20} />,
      required: true,
    },
    {
      label: "Password",
      type: "password",
      name: "password",
      placeholder: "Enter your password",
      icon: <Lock className="text-gray-500" size={20} />,
      required: true,
    },
  ];

  const handleLogin = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const result = await login({ username: data.username, password: data.password }).unwrap();
      const role = result?.data?.employee?.role;
      if (!role) throw new Error("Invalid login response");
      setUser(result.data.employee);
      if (role === "admin") navigate("/admin/dashboard", { replace: true });
      else if (role === "employee") navigate("/employee/inspections", { replace: true });
      else throw new Error("Invalid role received from server");
    } catch (err) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-sky-50 px-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-1/2 transform -translate-x-1/2 w-80 h-80 bg-sky-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-md ring-1 ring-blue-100/50 relative z-10">
          <CardHeader className="space-y-1 text-center pb-2">
            <div className="flex justify-center mb-2">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full shadow-lg ring-4 ring-blue-100">
                <ShieldCheck className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to access your automobile parts inspection panel
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <SimpleDynamicForm 
              fields={loginFields} 
              onSubmit={handleLogin}
              submitText={"Sign In"}
              className="space-y-4"
              loading={loading || loginLoading}
            />

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-destructive text-sm font-medium text-center flex items-center justify-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  {error}
                </p>
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Authenticating your credentials...
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Secure access to automobile parts inspection system
        </p>
      </div>
    </div>
  );
}
