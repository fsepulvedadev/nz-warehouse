"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Search,
  Download,
  ExternalLink,
  Truck,
  Package,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useI18n } from "@/lib/i18n/context";

interface Shipment {
  id: string;
  orderId: string;
  providerId: number;
  providerName: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  consignmentNumber: string | null;
  finalPrice: number | null;
  labelDownloaded: boolean;
  syncedToCarton: boolean;
  createdAt: string;
  order: {
    orderNumber: string;
    customerName: string;
    deliveryCity: string | null;
    deliveryPostcode: string | null;
  };
}

export default function ShipmentsPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchShipments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/shipments");
      if (!response.ok) throw new Error("Error fetching shipments");
      const data = await response.json();
      setShipments(data.shipments || []);
    } catch (error) {
      console.error("Error fetching shipments:", error);
      toast.error(t("failedToLoadShipments"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredShipments = shipments.filter((shipment) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      shipment.order.orderNumber.toLowerCase().includes(searchLower) ||
      shipment.order.customerName.toLowerCase().includes(searchLower) ||
      shipment.trackingNumber?.toLowerCase().includes(searchLower) ||
      shipment.consignmentNumber?.toLowerCase().includes(searchLower)
    );
  });

  const totalCost = shipments.reduce((sum, s) => sum + (s.finalPrice || 0), 0);
  const dateLocale = locale === "es" ? es : enUS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("shipmentsTitle")}</h1>
          <p className="text-slate-600 mt-1">
            {t("shipmentsSubtitle")}
          </p>
        </div>
        <Button variant="outline" onClick={fetchShipments} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          {t("refresh")}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{shipments.length}</p>
                <p className="text-xs text-slate-500">{t("totalShipments")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
                <p className="text-xs text-slate-500">{t("totalCost")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {shipments.filter((s) => s.providerName === "Fastway").length}
                </p>
                <p className="text-xs text-slate-500">Fastway</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 text-red-600">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {shipments.filter((s) => s.providerName === "NZ Post").length}
                </p>
                <p className="text-xs text-slate-500">NZ Post</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={t("searchShipmentsPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Shipments Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {t("shipmentList")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("order")}</TableHead>
                  <TableHead>{t("customer")}</TableHead>
                  <TableHead>{t("provider")}</TableHead>
                  <TableHead>{t("tracking")}</TableHead>
                  <TableHead className="text-right">{t("cost")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredShipments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-500">
                        <Truck className="h-8 w-8" />
                        <p>{t("noShipmentsFound")}</p>
                        <p className="text-sm">{t("noShipmentsFoundDesc")}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredShipments.map((shipment) => (
                    <TableRow key={shipment.id}>
                      <TableCell>
                        <button
                          className="font-medium text-blue-600 hover:underline"
                          onClick={() => router.push(`/orders/${shipment.orderId}`)}
                        >
                          {shipment.order.orderNumber || shipment.orderId.slice(0, 8)}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{shipment.order.customerName}</p>
                          <p className="text-xs text-slate-500">
                            {shipment.order.deliveryCity} {shipment.order.deliveryPostcode}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={shipment.providerName === "Fastway" ? "default" : "secondary"}
                        >
                          {shipment.providerName}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {shipment.trackingNumber ? (
                          <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                            {shipment.trackingNumber}
                          </code>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {shipment.finalPrice
                          ? `$${shipment.finalPrice.toFixed(2)}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {format(new Date(shipment.createdAt), "dd MMM yyyy", { locale: dateLocale })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" asChild>
                            <a href={`/api/courier/label/${shipment.id}`} target="_blank">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          {shipment.trackingUrl && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={shipment.trackingUrl} target="_blank" rel="noopener">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
