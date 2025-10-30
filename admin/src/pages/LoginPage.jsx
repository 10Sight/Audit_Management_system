import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Lock, ShieldCheck, Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLoginMutation } from "@/store/api";

const schema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean().optional().default(false),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const { setUser } = useAuth();
  const [login, { isLoading: loginLoading }] = useLoginMutation();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "", remember: false },
    mode: "onBlur",
  });

  const loading = loginLoading || form.formState.isSubmitting;

  const onSubmit = async (values) => {
    setError(null);
    try {
      const result = await login({ username: values.username, password: values.password }).unwrap();
      const role = result?.data?.employee?.role;
      if (!role) throw new Error("Invalid login response");
      setUser(result.data.employee);
      if (role === "superadmin") navigate("/superadmin/dashboard", { replace: true });
      else if (role === "admin") navigate("/admin/dashboard", { replace: true });
      else if (role === "employee") navigate("/employee/inspections", { replace: true });
      else throw new Error("Invalid role received from server");
    } catch (err) {
      setError(err?.message || "Login failed");
    }
  };

  const brandTitle = useMemo(() => "Audit Management System", []);

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-gradient-to-br from-blue-50 via-indigo-50 to-sky-50 relative overflow-hidden">
      {/* Decorative gradients */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-20 size-[28rem] rounded-full bg-blue-200/60 blur-3xl animate-blob" />
        <div className="absolute -bottom-40 -left-20 size-[28rem] rounded-full bg-indigo-200/60 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 size-[26rem] rounded-full bg-sky-200/60 blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Left panel - brand/marketing */}
      <div className="relative hidden lg:flex items-center justify-center p-12">
        <div className="relative z-10 max-w-md">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-blue-200 bg-white/70 px-4 py-2 shadow-sm backdrop-blur">
            <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
              <ShieldCheck className="size-5" />
            </div>
            <span className="text-sm font-medium text-slate-700">Secure by design</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            {brandTitle}
          </h1>
          <p className="mt-4 text-slate-600">
            Streamlined inspections, real-time insights, and role-based access
            to keep your quality operations moving.
          </p>
          <ul className="mt-8 space-y-3 text-slate-700">
            <li className="flex items-start gap-3">
              <span className="mt-1 size-2 rounded-full bg-blue-500" />
              Granular role access for Admins and Employees
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 size-2 rounded-full bg-indigo-500" />
              Real-time notifications and dashboards
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 size-2 rounded-full bg-sky-500" />
              Secure authentication and audit trails
            </li>
          </ul>
        </div>
      </div>

      {/* Right panel - auth card */}
      <div className="relative flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          <Card className="relative z-10 border-0 bg-white/80 backdrop-blur-md shadow-2xl ring-1 ring-blue-100/60">
            <CardHeader className="pb-2 text-center">
              <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg ring-4 ring-blue-100">
                <ShieldCheck className="size-7" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
              <CardDescription className="text-balance">
                Sign in to access your inspection portal
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="flex items-center gap-2 text-sm">
                    <User className="size-4 text-muted-foreground" /> Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    autoComplete="username"
                    disabled={loading}
                    {...form.register("username")}
                    aria-invalid={!!form.formState.errors.username}
                    className="h-11"
                  />
                  {form.formState.errors.username && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.username.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2 text-sm">
                    <Lock className="size-4 text-muted-foreground" /> Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      disabled={loading}
                      {...form.register("password")}
                      aria-invalid={!!form.formState.errors.password}
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground select-none">
                      <Checkbox
                        checked={form.watch("remember")}
                        onCheckedChange={(v) => form.setValue("remember", Boolean(v))}
                        aria-label="Remember me"
                      />
                      Remember me
                    </label>
                    <a href="#" className="text-sm text-primary hover:underline">
                      Forgot password?
                    </a>
                  </div>
                </div>

                {/* Submit */}
                <Button type="submit" size="lg" disabled={loading} className="h-11 w-full text-base font-medium">
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/80 border-t-transparent" />
                      Signing in...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <LogIn className="size-4" />
                      Sign in
                    </span>
                  )}
                </Button>

                {error && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3" role="alert" aria-live="polite">
                    <p className="flex items-center justify-center gap-2 text-center text-sm font-medium text-destructive">
                      <ShieldCheck className="size-4" /> {error}
                    </p>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm text-muted-foreground">Secure access to automobile parts inspection system</p>
        </div>
      </div>
    </div>
  );
}
