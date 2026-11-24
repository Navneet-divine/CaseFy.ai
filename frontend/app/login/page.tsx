"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { FileText, Mail, Lock, Eye, EyeOff, ShieldCheck, Sparkles, Scale, ArrowRight } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import { GoogleLogin } from "@react-oauth/google";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    if (!formData.password) {
      setError("Password is required");
      return;
    }

    try {
      setIsLoading(true);
      const res = await axios.post(
        `${API_URL}/users/login`,
        { email: formData.email, password: formData.password },
        { withCredentials: true },
      );

      if (res.status === 200) {
        localStorage.setItem("casefy_session", "true");
        window.location.href = "/dashboard";
      } else {
        setError(res.data?.error || "Login failed");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setIsLoading(true);
      setError("");
      const res = await axios.post(
        `${API_URL}/users/google`,
        { credential: credentialResponse.credential },
        { withCredentials: true }
      );
      if (res.status === 200) {
        localStorage.setItem("casefy_session", "true");
        window.location.href = "/dashboard";
      } else {
        setError(res.data?.error || "Google sign-in failed");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Google sign-in failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setIsLoading(true);
      const res = await axios.post(
        `${API_URL}/users/login`,
        { email: "demo@example.com", password: "demo123" },
        { withCredentials: true },
      );
      if (res.status === 200) {
        localStorage.setItem("casefy_session", "true");
        window.location.href = "/dashboard";
      }
      else setError(res.data?.error || "Demo login failed");
    } catch (err: any) {
      setError(
        err?.response?.data?.error || err?.message || "Demo login failed",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthGuard protectedRoute={false}>
      <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-background">
        {/* Left Side: Modern Visual Showcase (Desktop) */}
        <div className="relative hidden lg:flex flex-col justify-between p-12 bg-zinc-950 border-r border-border overflow-hidden">
          {/* Ambient Lighting & Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity filter contrast-125"
            style={{
              backgroundImage: `url('/auth-showcase.jpg')`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header Branding */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/25">
              <FileText className="size-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-foreground">Casefy.ai</span>
              <span className="block text-xs text-muted-foreground">Legal AI Platform</span>
            </div>
          </div>

          {/* Center Showcase Card */}
          <div className="relative z-10 space-y-6 max-w-lg my-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary backdrop-blur-md">
              <Sparkles className="size-3.5" />
              Next-Gen Legal Discovery
            </div>
            <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
              Transforming legal briefs & evidence into actionable intelligence.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Accelerate litigation preparation, cross-examine dense case filings in seconds, and chat with your legal repositories using autonomous AI agents.
            </p>

            {/* Testimonial Quote */}
            <div className="p-5 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl space-y-3 shadow-xl">
              <p className="text-xs italic text-foreground/90 leading-relaxed">
                &ldquo;Casefy reduced our cross-case document search from days to mere seconds. It is the single most valuable intelligence tool for modern litigation.&rdquo;
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                <span className="font-semibold text-foreground">Senior Litigation Partner</span>
                <span>Tier-1 Law Firm</span>
              </div>
            </div>
          </div>

          {/* Footer Highlights */}
          <div className="relative z-10 flex items-center justify-between text-xs text-muted-foreground pt-6 border-t border-border/40">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-500" />
              <span>SOC2 & Enterprise Grade Security</span>
            </div>
            <div className="flex items-center gap-2">
              <Scale className="size-4 text-primary" />
              <span>Precision Legal RAG</span>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Form */}
        <div className="flex flex-col items-center justify-center p-6 sm:p-12 lg:p-16 w-full">
          <div className="w-full max-w-md space-y-6">
            {/* Mobile Branding */}
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left gap-2 mb-2">
              <div className="lg:hidden size-11 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-md mb-2">
                <FileText className="size-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Welcome back
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your credentials or continue with Google to access your cases
              </p>
            </div>

            {/* Form Card */}
            <Card className="p-6 sm:p-8 border-border bg-card/60 backdrop-blur-xl shadow-xl">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Mail className="size-3.5 text-muted-foreground" />
                    Email Address
                  </label>
                  <Input
                    type="email"
                    name="email"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="h-11 bg-background/50 border-border focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <Lock className="size-3.5 text-muted-foreground" />
                      Password
                    </label>
                    <Link href="/forgot" className="text-xs text-primary hover:underline font-medium">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="••••••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={isLoading}
                      className="h-11 bg-background/50 border-border pr-10 focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive font-medium animate-in fade-in duration-200">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md transition-all"
                >
                  {isLoading ? "Signing in..." : "Sign in to account"}
                </Button>

                {/* Demo Account Button */}
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  onClick={handleDemoLogin}
                  className="w-full h-11 border-border bg-background/40 hover:bg-accent font-medium text-xs"
                >
                  Try Demo Account
                </Button>

                {/* Divider */}
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground font-medium">
                      Or continue with
                    </span>
                  </div>
                </div>

                {/* Google Sign-In Button (Full Width) */}
                <div className="w-full flex justify-center [&>div]:w-full [&>div>iframe]:!w-full [&_iframe]:!w-full">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError("Google Sign-In was unsuccessful")}
                    theme="outline"
                    shape="rectangular"
                    size="large"
                    text="signin_with"
                    width="100%"
                  />
                </div>

                {/* Signup Link */}
                <p className="text-center text-xs text-muted-foreground pt-2">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="text-primary hover:underline font-semibold inline-flex items-center gap-1">
                    Sign up now <ArrowRight className="size-3" />
                  </Link>
                </p>
              </form>
            </Card>

            {/* Footer Attribution */}
            <p className="text-center text-[11px] text-muted-foreground">
              By accessing Casefy.ai, you agree to our Terms of Service &amp; Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
