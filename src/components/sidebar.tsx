"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Package,
  ClipboardList,
  Truck,
  Settings,
  BarChart3,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface SidebarProps {
  mobile?: boolean;
}

export function Sidebar({ mobile }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  const navigation = [
    {
      name: t("orders"),
      href: "/orders",
      icon: ClipboardList,
      description: t("ordersDescription"),
    },
    {
      name: t("shipments"),
      href: "/shipments",
      icon: Truck,
      description: t("shipmentsDescription"),
    },
    {
      name: t("analytics"),
      href: "/analytics",
      icon: BarChart3,
      description: t("analyticsDescription"),
      disabled: true,
    },
    {
      name: t("settings"),
      href: "/settings",
      icon: Settings,
      description: t("settingsDescription"),
      disabled: true,
    },
  ];

  return (
    <aside
      className={cn(
        "flex flex-col bg-white border-r",
        mobile ? "h-full" : "fixed left-0 top-16 bottom-0 w-64 hidden lg:flex"
      )}
    >
      <nav className="flex-1 p-4 space-y-1">
        {mobile && (
          <div className="flex items-center gap-3 px-3 py-4 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900">
              <Package className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-lg">NZ Warehouse</span>
          </div>
        )}
        
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          
          return (
            <Link
              key={item.href}
              href={item.disabled ? "#" : item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                item.disabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={(e) => item.disabled && e.preventDefault()}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="block truncate">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="px-3 py-3 bg-slate-50 rounded-lg">
          <p className="text-xs font-medium text-slate-600 mb-1">
            {t("integrationStatus")}
          </p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-500">{t("apisConnected")}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
