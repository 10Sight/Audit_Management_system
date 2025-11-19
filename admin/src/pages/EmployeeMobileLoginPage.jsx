import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, ShieldCheck, KeyRound, ArrowLeft, LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useInitiateMobileLoginMutation, useVerifyMobileLoginOtpMutation } from "@/store/api";

const phoneSchema = z.object({
  phoneNumber: z
    .string()
    .trim()
    .min(8, "Enter a valid mobile number")
    .max(20, "Enter a valid mobile number"),
});

const otpSchema = z.object({
  otp: z
    .string()
    .trim()
    .length(6, "OTP must be 6 digits"),
});

export default function EmployeeMobileLoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [step, setStep] = useState(1); // 1: phone, 2: otp
  const [employeeId, setEmployeeId] = useState(null);
  const [maskedPhone, setMaskedPhone] = useState("");
  const [error, setError] = useState(null);

  const [initiateMobileLogin, { isLoading: initiating }] = useInitiateMobileLoginMutation();
  const [verifyMobileLoginOtp, { isLoading: verifying }] = useVerifyMobileLoginOtpMutation();

  const phoneForm = useForm({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phoneNumber: "" },
    mode: "onBlur",
  });

  const otpForm = useForm({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
    mode: "onBlur",
  });

  const loading = initiating || verifying;

  const handlePhoneSubmit = async (values) => {
    setError(null);
    try {
      const res = await initiateMobileLogin({ phoneNumber: values.phoneNumber }).unwrap();
      const data = res?.data;
      if (!data?.employeeId) throw new Error("Invalid response from server");
      setEmployeeId(data.employeeId);
      setMaskedPhone(data.maskedPhone || values.phoneNumber);
      setStep(2);
    } catch (err) {
      setError(err?.data?.message || err?.message || "Failed to send OTP");
    }
  };

  const handleOtpSubmit = async (values) => {
    setError(null);
    try {
      const res = await verifyMobileLoginOtp({ employeeId, otp: values.otp }).unwrap();
      const employee = res?.data?.employee;
      if (!employee) throw new Error("Invalid login response");

      // Only allow employees to proceed via this flow
      if (employee.role !== "employee") {
        throw new Error("Only employees can login with mobile OTP");
      }

      setUser(employee);
      navigate("/employee/inspections", { replace: true });
    } catch (err) {
      setError(err?.data?.message || err?.message || "OTP verification failed");
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setError(null);
      otpForm.reset();
    } else {
      navigate("/login");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/marelli-motherson.webp')" }}
    >
      <div className="w-full max-w-md px-4 sm:px-6 md:px-8">
        <Card className="relative z-10 border bg-white/95 shadow-2xl backdrop-blur-sm">
          <CardHeader className="pb-2 text-center">
            <img src="/motherson+marelli.png" className="max-h-14 max-w-14 mx-auto" />
            <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg ring-4 ring-blue-100">
              <ShieldCheck className="size-7" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Employee mobile login
            </CardTitle>
            <CardDescription className="text-balance">
              {step === 1
                ? "Enter your registered mobile number to receive an OTP"
                : `Enter the 6-digit OTP sent to ${maskedPhone}`}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {step === 1 ? (
              <form onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)} noValidate className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="flex items-center gap-2 text-sm">
                    <Phone className="size-4 text-muted-foreground" /> Mobile number
                  </Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="Enter your mobile number"
                    disabled={loading}
                    {...phoneForm.register("phoneNumber")}
                    aria-invalid={!!phoneForm.formState.errors.phoneNumber}
                    className="h-11"
                  />
                  {phoneForm.formState.errors.phoneNumber && (
                    <p className="text-sm text-destructive">
                      {phoneForm.formState.errors.phoneNumber.message}
                    </p>
                  )}
                </div>

                <Button type="submit" size="lg" disabled={loading} className="h-11 w-full text-base font-medium">
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/80 border-t-transparent" />
                      Sending OTP...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <KeyRound className="size-4" />
                      Send OTP
                    </span>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} noValidate className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="flex items-center gap-2 text-sm">
                    <KeyRound className="size-4 text-muted-foreground" /> 6-digit OTP
                  </Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter OTP"
                    disabled={loading}
                    {...otpForm.register("otp")}
                    aria-invalid={!!otpForm.formState.errors.otp}
                    className="h-11 tracking-widest text-center text-lg"
                  />
                  {otpForm.formState.errors.otp && (
                    <p className="text-sm text-destructive">
                      {otpForm.formState.errors.otp.message}
                    </p>
                  )}
                </div>

                <Button type="submit" size="lg" disabled={loading} className="h-11 w-full text-base font-medium">
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/80 border-t-transparent" />
                      Verifying...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <LogIn className="size-4" />
                      Login
                    </span>
                  )}
                </Button>
              </form>
            )}

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3" role="alert" aria-live="polite">
                <p className="flex items-center justify-center gap-2 text-center text-sm font-medium text-destructive">
                  <ShieldCheck className="size-4" /> {error}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
