"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calculator,
  Download,
  MapPin,
  Package,
  User,
  AlertTriangle,
  CheckCircle,
  Truck,
  FileText,
  Loader2,
} from "lucide-react";
import { OrderStatus } from "@prisma/client";
import { useI18n } from "@/lib/i18n/context";

interface OrderItem {
  description?: string;
  quantity?: number;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  sku?: string;
}

interface Quotation {
  id: string;
  providerId: number;
  providerName: string;
  serviceType: string | null;
  basePrice: number;
  ruralSurcharge: number;
  gst: number;
  totalPrice: number;
  isSelected: boolean;
}

interface Shipment {
  id: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  consignmentNumber: string | null;
  providerName: string;
  finalPrice: number | null;
}

interface Order {
  id: string;
  cartonCloudId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  deliveryStreet: string | null;
  deliverySuburb: string | null;
  deliveryCity: string | null;
  deliveryPostcode: string | null;
  deliveryCountry: string;
  isRural: boolean;
  status: OrderStatus;
  itemsJson: OrderItem[];
  quotations: Quotation[];
  shipment: Shipment | null;
  validationErrors: string[];
  createdAt: string;
  updatedAt: string;
}

interface SenderAddress {
  name: string;
  company: string;
  street: string;
  suburb: string;
  city: string;
  postcode: string;
  country: string;
  phone: string;
  email: string;
}

const DEFAULT_SENDER: SenderAddress = {
  name: "NZ Warehouse",
  company: "NZ Warehouse Ltd",
  street: "123 Warehouse St",
  suburb: "Industrial Area",
  city: "Auckland",
  postcode: "2013",
  country: "NZ",
  phone: "+64 9 123 4567",
  email: "shipping@nzwarehouse.co.nz",
};

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isShipping, setIsShipping] = useState(false);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [showShipDialog, setShowShipDialog] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(
    null
  );
  const [senderAddress, setSenderAddress] =
    useState<SenderAddress>(DEFAULT_SENDER);

  const statusLabels: Record<OrderStatus, string> = {
    PENDING_DATA: t("pendingData").toUpperCase(),
    READY_TO_QUOTE: t("readyToQuote").toUpperCase(),
    QUOTED: t("quoted").toUpperCase(),
    LABEL_CREATED: t("labelCreated").toUpperCase(),
    ERROR: t("error").toUpperCase(),
  };

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    if (searchParams.get("action") === "quote") {
      setShowQuoteDialog(true);
    }
  }, [searchParams]);

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/carton/orders/${orderId}`);
      if (!response.ok) throw new Error("Error fetching order");
      const data = await response.json();
      setOrder(data);
    } catch (error) {
      console.error("Error fetching order:", error);
      toast.error(t("failedToLoadOrderDetails"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuote = async () => {
    if (!order) return;

    setIsQuoting(true);
    try {
      const response = await fetch("/api/courier/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          pickupPostcode: senderAddress.postcode,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t("failedToGetQuotes"));
      }

      const data = await response.json();
      toast.success(t("quotesReceived"), {
        description: `${data.quotations.length} ${t("providersAvailable")}`,
      });

      await fetchOrder();
      setShowQuoteDialog(false);
    } catch (error) {
      toast.error(t("failedToGetQuotes"), {
        description:
          error instanceof Error ? error.message : t("pleaseTryAgain"),
      });
    } finally {
      setIsQuoting(false);
    }
  };

  const handleSelectProvider = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setShowShipDialog(true);
  };

  const handleCreateShipment = async () => {
    if (!order || !selectedQuotation) return;

    setIsShipping(true);
    try {
      const response = await fetch("/api/courier/ship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          quotationId: selectedQuotation.id,
          senderAddress,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t("failedToCreateShipment"));
      }

      toast.success(t("shipmentCreatedSuccess"), {
        description: t("labelReadyToDownload"),
      });

      await fetchOrder();
      setShowShipDialog(false);
    } catch (error) {
      toast.error(t("failedToCreateShipment"), {
        description:
          error instanceof Error ? error.message : t("pleaseTryAgain"),
      });
    } finally {
      setIsShipping(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Package className="h-12 w-12 text-slate-300" />
        <h2 className="mt-4 text-lg font-medium">{t("orderNotFound")}</h2>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/orders")}
        >
          {t("backToOrders")}
        </Button>
      </div>
    );
  }

  const items = Array.isArray(order.itemsJson) ? order.itemsJson : [];
  const canQuote =
    order.status === "READY_TO_QUOTE" || order.status === "QUOTED";
  const canShip = order.status === "QUOTED" && order.quotations.length > 0;
  const hasShipment = order.status === "LABEL_CREATED" && order.shipment;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/orders")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("backToOrders")}
        </Button>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          {canQuote && (
            <Button onClick={() => setShowQuoteDialog(true)}>
              <Calculator className="h-4 w-4 mr-2" />
              {t("getQuote")}
            </Button>
          )}
          {hasShipment && order.shipment && (
            <Button variant="outline" asChild>
              <a
                href={`/api/courier/label/${order.shipment.id}`}
                target="_blank"
              >
                <Download className="h-4 w-4 mr-2" />
                {t("downloadLabel")}
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Order Header Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">
                {t("orderNumber").replace("#", "")} #{order.orderNumber || order.cartonCloudId.slice(0, 8)}
              </CardTitle>
              <CardDescription className="mt-1">
                {t("cartonCloudId")}: {order.cartonCloudId}
              </CardDescription>
            </div>
            <Badge
              variant={
                order.status === "LABEL_CREATED"
                  ? "default"
                  : order.status === "ERROR"
                  ? "destructive"
                  : "secondary"
              }
              className="text-sm px-3 py-1"
            >
              {statusLabels[order.status]}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Validation Errors */}
      {order.validationErrors && order.validationErrors.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-amber-800 flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5" />
              {t("missingInformation")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="list-disc list-inside space-y-1 text-sm text-amber-700">
              {order.validationErrors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Delivery */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                {t("customerAndDelivery")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-2">
                    {t("customer")}
                  </h4>
                  <p className="font-medium">{order.customerName}</p>
                  {order.customerEmail && (
                    <p className="text-sm text-slate-600">
                      {order.customerEmail}
                    </p>
                  )}
                  {order.customerPhone && (
                    <p className="text-sm text-slate-600">
                      {order.customerPhone}
                    </p>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {t("deliveryAddress")}
                  </h4>
                  <p className="font-medium">{order.deliveryStreet || "—"}</p>
                  <p className="text-sm text-slate-600">
                    {[order.deliverySuburb, order.deliveryCity]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  <p className="text-sm text-slate-600">
                    {order.deliveryPostcode} {order.deliveryCountry}
                  </p>
                  {order.isRural && (
                    <Badge variant="outline" className="mt-2">
                      {t("ruralDelivery")}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                {t("items")} ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("description")}</TableHead>
                    <TableHead className="text-right">{t("qty")}</TableHead>
                    <TableHead className="text-right">{t("weight")}</TableHead>
                    <TableHead className="text-right">
                      {t("dimensions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-slate-500 py-8"
                      >
                        {t("noItemsFound")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          {item.description || item.sku || `Item ${i + 1}`}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity || 1}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.weight ? item.weight.toFixed(2) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-slate-500">
                          {item.length && item.width && item.height
                            ? `${item.length} × ${item.width} × ${item.height}`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quotations */}
          {order.quotations.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  {t("availableQuotes")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.quotations.map((quote) => (
                  <div
                    key={quote.id}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      quote.isSelected
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{quote.providerName}</span>
                      {quote.isSelected && (
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                      )}
                    </div>
                    <div className="text-2xl font-bold text-slate-900">
                      ${quote.totalPrice.toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {t("base")}: ${quote.basePrice.toFixed(2)}
                      {quote.ruralSurcharge > 0 &&
                        ` + ${t("rural")}: $${quote.ruralSurcharge.toFixed(2)}`}
                      {quote.gst > 0 && ` + GST: $${quote.gst.toFixed(2)}`}
                    </div>
                    {canShip && !quote.isSelected && (
                      <Button
                        size="sm"
                        className="w-full mt-3"
                        onClick={() => handleSelectProvider(quote)}
                      >
                        {t("selectAndShip")}
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Shipment */}
          {hasShipment && order.shipment && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-emerald-800">
                  <Truck className="h-4 w-4" />
                  {t("shipmentCreated")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-emerald-700">{t("provider")}</p>
                  <p className="font-medium">{order.shipment.providerName}</p>
                </div>
                {order.shipment.trackingNumber && (
                  <div>
                    <p className="text-sm text-emerald-700">{t("trackingNumber")}</p>
                    <p className="font-mono text-sm">
                      {order.shipment.trackingNumber}
                    </p>
                  </div>
                )}
                {order.shipment.consignmentNumber && (
                  <div>
                    <p className="text-sm text-emerald-700">{t("consignmentNumber")}</p>
                    <p className="font-mono text-sm">
                      {order.shipment.consignmentNumber}
                    </p>
                  </div>
                )}
                {order.shipment.finalPrice && (
                  <div>
                    <p className="text-sm text-emerald-700">{t("finalCost")}</p>
                    <p className="font-bold text-lg">
                      ${order.shipment.finalPrice.toFixed(2)}
                    </p>
                  </div>
                )}
                <Separator />
                <Button variant="outline" className="w-full" asChild>
                  <a
                    href={`/api/courier/label/${order.shipment.id}`}
                    target="_blank"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {t("downloadLabelPdf")}
                  </a>
                </Button>
                {order.shipment.trackingUrl && (
                  <Button variant="outline" className="w-full" asChild>
                    <a
                      href={order.shipment.trackingUrl}
                      target="_blank"
                      rel="noopener"
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      {t("trackShipment")}
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Quote Dialog */}
      <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("getQuoteTitle")}</DialogTitle>
            <DialogDescription>
              {t("getQuoteDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("originPostcode")}</Label>
                <Input
                  value={senderAddress.postcode}
                  onChange={(e) =>
                    setSenderAddress((prev) => ({
                      ...prev,
                      postcode: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>{t("destinationPostcode")}</Label>
                <Input value={order.deliveryPostcode || ""} disabled />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium mb-2">{t("itemsToShip")}:</p>
              <ul className="text-sm text-slate-600 space-y-1">
                {items.map((item, i) => (
                  <li key={i}>
                    • {item.description || `Item ${i + 1}`} -{" "}
                    {item.weight || "?"}kg
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuoteDialog(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleQuote} disabled={isQuoting}>
              {isQuoting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("gettingQuotes")}
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  {t("getQuotes")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ship Dialog */}
      <Dialog open={showShipDialog} onOpenChange={setShowShipDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("createShipment")}</DialogTitle>
            <DialogDescription>
              {t("createShipmentDescription")}{" "}
              {selectedQuotation?.providerName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedQuotation && (
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {selectedQuotation.providerName}
                    </p>
                    <p className="text-sm text-emerald-700">
                      {selectedQuotation.serviceType}
                    </p>
                  </div>
                  <div className="text-2xl font-bold text-emerald-700">
                    ${selectedQuotation.totalPrice.toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <h4 className="font-medium">{t("senderAddress")}</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t("name")}</Label>
                  <Input
                    value={senderAddress.name}
                    onChange={(e) =>
                      setSenderAddress((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("company")}</Label>
                  <Input
                    value={senderAddress.company}
                    onChange={(e) =>
                      setSenderAddress((prev) => ({
                        ...prev,
                        company: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">{t("street")}</Label>
                <Input
                  value={senderAddress.street}
                  onChange={(e) =>
                    setSenderAddress((prev) => ({
                      ...prev,
                      street: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">{t("suburb")}</Label>
                  <Input
                    value={senderAddress.suburb}
                    onChange={(e) =>
                      setSenderAddress((prev) => ({
                        ...prev,
                        suburb: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("city")}</Label>
                  <Input
                    value={senderAddress.city}
                    onChange={(e) =>
                      setSenderAddress((prev) => ({
                        ...prev,
                        city: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("postcode")}</Label>
                  <Input
                    value={senderAddress.postcode}
                    onChange={(e) =>
                      setSenderAddress((prev) => ({
                        ...prev,
                        postcode: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t("phone")}</Label>
                  <Input
                    value={senderAddress.phone}
                    onChange={(e) =>
                      setSenderAddress((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("email")}</Label>
                  <Input
                    value={senderAddress.email}
                    onChange={(e) =>
                      setSenderAddress((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShipDialog(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleCreateShipment} disabled={isShipping}>
              {isShipping ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("creatingShipment")}
                </>
              ) : (
                <>
                  <Truck className="h-4 w-4 mr-2" />
                  {t("createShipment")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
