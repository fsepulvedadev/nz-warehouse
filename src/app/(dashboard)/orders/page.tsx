"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  RefreshCw,
  Eye,
  Calculator,
  Download,
  ChevronLeft,
  ChevronRight,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  MapPin,
} from "lucide-react";
import { OrderStatus } from "@prisma/client";
import { useI18n } from "@/lib/i18n/context";
import { TranslationKey } from "@/lib/i18n/translations";

interface Order {
  id: string;
  cartonCloudId: string;
  orderNumber: string;
  customerName: string;
  deliveryCity: string | null;
  deliveryPostcode: string | null;
  status: OrderStatus;
  isRural: boolean;
  createdAt: string;
  quotations: { totalPrice: number; providerName: string }[];
  shipment: { trackingNumber: string | null } | null;
  validationErrors?: string[];
}

interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

const statusConfigMap: Record<OrderStatus, { labelKey: TranslationKey; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING_DATA: { labelKey: "pendingData", icon: AlertCircle, variant: "outline" },
  READY_TO_QUOTE: { labelKey: "readyToQuote", icon: Clock, variant: "secondary" },
  QUOTED: { labelKey: "quoted", icon: Calculator, variant: "default" },
  LABEL_CREATED: { labelKey: "labelCreated", icon: CheckCircle, variant: "default" },
  ERROR: { labelKey: "error", icon: XCircle, variant: "destructive" },
};

export default function OrdersPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    perPage: 20,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        perPage: pagination.perPage.toString(),
      });
      
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const response = await fetch(`/api/carton/orders?${params}`);
      
      if (!response.ok) {
        throw new Error("Error fetching orders");
      }

      const data = await response.json();
      setOrders(data.orders);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error(t("failedToLoadOrders"), {
        description: t("checkConnection"),
      });
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.perPage, search, statusFilter, t]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchOrders();
  };

  const handleQuote = async (orderId: string) => {
    router.push(`/orders/${orderId}?action=quote`);
  };

  const StatusBadge = ({ status }: { status: OrderStatus }) => {
    const config = statusConfigMap[status];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        <span className="hidden sm:inline">{t(config.labelKey)}</span>
      </Badge>
    );
  };

  // Mobile Order Card Component
  const OrderCard = ({ order }: { order: Order }) => {
    const config = statusConfigMap[order.status];
    const Icon = config.icon;
    
    return (
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => router.push(`/orders/${order.id}`)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-slate-900 truncate">
                  {order.orderNumber || order.cartonCloudId.slice(0, 8)}
                </span>
                <Badge variant={config.variant} className="gap-1 shrink-0">
                  <Icon className="h-3 w-3" />
                  <span className="text-xs">{t(config.labelKey)}</span>
                </Badge>
              </div>
              <p className="text-sm text-slate-600 truncate">{order.customerName}</p>
              <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                <MapPin className="h-3 w-3" />
                <span>{order.deliveryCity || "—"}</span>
                {order.deliveryPostcode && (
                  <span className="text-slate-400">({order.deliveryPostcode})</span>
                )}
                {order.isRural && (
                  <Badge variant="outline" className="ml-1 text-xs py-0">Rural</Badge>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              {order.quotations.length > 0 ? (
                <span className="text-emerald-600 font-bold">
                  ${order.quotations[0].totalPrice.toFixed(2)}
                </span>
              ) : (
                <span className="text-slate-400 text-sm">—</span>
              )}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm" className="flex-1" onClick={() => router.push(`/orders/${order.id}`)}>
              <Eye className="h-4 w-4 mr-1" />
              {t("view")}
            </Button>
            {(order.status === "READY_TO_QUOTE" || order.status === "QUOTED") && (
              <Button variant="outline" size="sm" className="flex-1" onClick={() => handleQuote(order.id)}>
                <Calculator className="h-4 w-4 mr-1" />
                {t("quote")}
              </Button>
            )}
            {order.shipment && (
              <Button variant="outline" size="sm" asChild>
                <a href={`/api/courier/label/${order.shipment}`} target="_blank">
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t("ordersTitle")}</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            {t("ordersSubtitle")}
          </p>
        </div>
        <Button onClick={fetchOrders} disabled={isLoading} size="sm" className="w-full sm:w-auto">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          {t("syncOrders")}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 sm:gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="flex-1 sm:w-48">
                  <SelectValue placeholder={t("filterByStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allStatuses")}</SelectItem>
                  <SelectItem value="PENDING_DATA">{t("pendingData")}</SelectItem>
                  <SelectItem value="READY_TO_QUOTE">{t("readyToQuote")}</SelectItem>
                  <SelectItem value="QUOTED">{t("quoted")}</SelectItem>
                  <SelectItem value="LABEL_CREATED">{t("labelCreated")}</SelectItem>
                  <SelectItem value="ERROR">{t("error")}</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" className="shrink-0">{t("search")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Stats - Scrollable on mobile */}
      <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-5 sm:gap-4 sm:overflow-visible sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
        {Object.entries(statusConfigMap).map(([status, config]) => {
          const count = orders.filter((o) => o.status === status).length;
          const Icon = config.icon;
          
          return (
            <Card 
              key={status} 
              className="cursor-pointer hover:border-slate-300 transition-colors shrink-0 w-32 sm:w-auto"
              onClick={() => setStatusFilter(status)}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`p-1.5 sm:p-2 rounded-lg ${
                    status === "LABEL_CREATED" ? "bg-emerald-100 text-emerald-600" :
                    status === "ERROR" ? "bg-red-100 text-red-600" :
                    status === "QUOTED" ? "bg-blue-100 text-blue-600" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                  <div>
                    <p className="text-lg sm:text-2xl font-bold">{count}</p>
                    <p className="text-xs text-slate-500 whitespace-nowrap">{t(config.labelKey)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Orders - Mobile Cards / Desktop Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Package className="h-4 w-4 sm:h-5 sm:w-5" />
            {t("orderList")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile: Cards view */}
          <div className="block md:hidden p-3 space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-32 mb-2" />
                    <Skeleton className="h-3 w-20" />
                  </CardContent>
                </Card>
              ))
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center gap-2 text-slate-500 py-8">
                <Package className="h-8 w-8" />
                <p>{t("noOrdersFound")}</p>
                <p className="text-sm">{t("noOrdersFoundDesc")}</p>
              </div>
            ) : (
              orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))
            )}
          </div>

          {/* Desktop: Table view */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("orderNumber")}</TableHead>
                  <TableHead>{t("customer")}</TableHead>
                  <TableHead>{t("destination")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("quote")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-500">
                        <Package className="h-8 w-8" />
                        <p>{t("noOrdersFound")}</p>
                        <p className="text-sm">{t("noOrdersFoundDesc")}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id} className="cursor-pointer hover:bg-slate-50"
                      onClick={() => router.push(`/orders/${order.id}`)}>
                      <TableCell className="font-medium">
                        {order.orderNumber || order.cartonCloudId.slice(0, 8)}
                      </TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span>{order.deliveryCity || "—"}</span>
                          {order.deliveryPostcode && (
                            <span className="text-slate-400">({order.deliveryPostcode})</span>
                          )}
                          {order.isRural && (
                            <Badge variant="outline" className="ml-1 text-xs">Rural</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell>
                        {order.quotations.length > 0 ? (
                          <span className="text-emerald-600 font-medium">
                            ${order.quotations[0].totalPrice.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/orders/${order.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(order.status === "READY_TO_QUOTE" || order.status === "QUOTED") && (
                            <Button variant="ghost" size="sm" onClick={() => handleQuote(order.id)}>
                              <Calculator className="h-4 w-4" />
                            </Button>
                          )}
                          {order.shipment && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={`/api/courier/label/${order.shipment}`} target="_blank">
                                <Download className="h-4 w-4" />
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

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 sm:px-4 py-3 border-t">
              <p className="text-xs sm:text-sm text-slate-500 order-2 sm:order-1">
                {((pagination.page - 1) * pagination.perPage) + 1}-{Math.min(pagination.page * pagination.perPage, pagination.total)} {t("of")} {pagination.total}
              </p>
              <div className="flex items-center gap-2 order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-2 min-w-[80px] text-center">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
