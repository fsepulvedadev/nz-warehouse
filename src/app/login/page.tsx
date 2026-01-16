"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Package, Truck, ArrowRight } from "lucide-react";
import { LanguageSelector } from "@/components/language-selector";
import { useI18n } from "@/lib/i18n/context";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(t("invalidCredentials"), {
          description: t("invalidCredentialsDesc"),
        });
      } else {
        toast.success(t("welcomeBack"), {
          description: t("redirecting"),
        });
        router.push("/orders");
        router.refresh();
      }
    } catch {
      toast.error(t("somethingWentWrong"), {
        description: t("tryAgainLater"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        
        {/* Floating elements */}
        <div className="absolute top-20 left-20 animate-pulse">
          <div className="w-20 h-20 rounded-2xl bg-amber-500/20 backdrop-blur-sm flex items-center justify-center">
            <Package className="w-10 h-10 text-amber-400" />
          </div>
        </div>
        <div className="absolute bottom-32 right-20 animate-pulse delay-1000">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 backdrop-blur-sm flex items-center justify-center">
            <Truck className="w-8 h-8 text-emerald-400" />
          </div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="mb-8">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 rounded-full backdrop-blur-sm">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm text-white/80 font-medium">{t("shippingIntegrationPortal")}</span>
            </div>
          </div>
          
          <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
            NZ Warehouse
            <span className="block text-3xl font-normal text-slate-400 mt-2">
              {t("shippingManagement")}
            </span>
          </h1>
          
          <p className="text-lg text-slate-400 max-w-md leading-relaxed">
            {t("loginBrandingDesc")}
          </p>
          
          <div className="mt-12 flex items-center gap-6 text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                <Package className="w-5 h-5 text-slate-400" />
              </div>
              <span className="text-sm">Carton Cloud</span>
            </div>
            <ArrowRight className="w-5 h-5" />
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                <Truck className="w-5 h-5 text-slate-400" />
              </div>
              <span className="text-sm">Courier IT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 relative">
        {/* Language selector */}
        <div className="absolute top-4 right-4">
          <LanguageSelector />
        </div>
        
        <div className="w-full max-w-md">
          {/* Mobile branding */}
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-3xl font-bold text-slate-900">NZ Warehouse</h1>
            <p className="text-slate-600 mt-2">{t("appDescription")}</p>
          </div>
          
          <Card className="border-0 shadow-xl shadow-slate-200/50">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-semibold tracking-tight">
                {t("welcome")}
              </CardTitle>
              <CardDescription className="text-slate-500">
                {t("loginDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                    {t("email")}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 px-4 bg-white border-slate-200 focus:border-slate-900 focus:ring-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                    {t("password")}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 px-4 bg-white border-slate-200 focus:border-slate-900 focus:ring-slate-900"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium transition-all duration-200"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{t("signingIn")}</span>
                    </div>
                  ) : (
                    <span>{t("signIn")}</span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <p className="mt-8 text-center text-sm text-slate-500">
            {t("poweredBy")}
          </p>
        </div>
      </div>
    </div>
  );
}
