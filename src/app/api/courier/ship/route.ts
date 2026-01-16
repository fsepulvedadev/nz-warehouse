import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createShipment, downloadLabel } from "@/lib/courierit";
import { z } from "zod";

const ShipRequestSchema = z.object({
  orderId: z.string(),
  quotationId: z.string(),
  senderAddress: z.object({
    name: z.string(),
    company: z.string().optional(),
    street: z.string(),
    street2: z.string().optional(),
    suburb: z.string(),
    city: z.string(),
    postcode: z.string(),
    country: z.string().default("NZ"),
    phone: z.string().optional(),
    email: z.string().optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, quotationId, senderAddress } = ShipRequestSchema.parse(body);

    // Get order with quotation
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        quotations: true,
        shipment: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check for existing shipment (idempotency)
    if (order.shipment) {
      return NextResponse.json(
        { 
          error: "Shipment already exists for this order",
          shipment: order.shipment,
        },
        { status: 409 }
      );
    }

    // Get selected quotation
    const quotation = order.quotations.find((q) => q.id === quotationId);
    if (!quotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      );
    }

    // Check quotation expiry
    if (quotation.expiresAt && new Date() > quotation.expiresAt) {
      return NextResponse.json(
        { error: "Quotation has expired, please re-quote" },
        { status: 400 }
      );
    }

    // Parse items
    const items = (order.itemsJson as { weight?: number; length?: number; width?: number; height?: number; description?: string }[]) || [];

    // Create shipment with Courier IT
    const shipmentResult = await createShipment({
      providerId: quotation.providerId,
      reference: order.orderNumber,
      sender: senderAddress,
      recipient: {
        name: order.customerName,
        street: order.deliveryStreet || "",
        suburb: order.deliverySuburb || "",
        city: order.deliveryCity || "",
        postcode: order.deliveryPostcode || "",
        country: order.deliveryCountry,
        phone: order.customerPhone || undefined,
        email: order.customerEmail || undefined,
      },
      items: items.map((item) => ({
        weight: item.weight || 1,
        length: item.length,
        width: item.width,
        height: item.height,
        description: item.description,
      })),
      serviceType: quotation.serviceType || undefined,
    });

    if (!shipmentResult.success) {
      // Log error
      await prisma.errorLog.create({
        data: {
          orderId,
          action: "ship",
          message: shipmentResult.error || "Failed to create shipment",
          details: shipmentResult as object,
        },
      });

      await prisma.order.update({
        where: { id: orderId },
        data: { status: "ERROR" },
      });

      return NextResponse.json(
        { error: shipmentResult.error || "Failed to create shipment" },
        { status: 400 }
      );
    }

    // Download label if available
    let labelData: Buffer | null = null;
    if (shipmentResult.consignmentNumber) {
      try {
        const labelBuffer = await downloadLabel(shipmentResult.consignmentNumber);
        labelData = Buffer.from(labelBuffer);
      } catch (error) {
        console.error("Failed to download label:", error);
        // Continue without label - can be downloaded later
      }
    }

    // Save shipment to database
    const shipment = await prisma.shipment.create({
      data: {
        orderId,
        providerId: quotation.providerId,
        providerName: quotation.providerName,
        trackingNumber: shipmentResult.trackingNumber,
        trackingUrl: shipmentResult.trackingUrl,
        consignmentNumber: shipmentResult.consignmentNumber,
        labelUrl: shipmentResult.labelUrl,
        labelData,
        labelFileName: shipmentResult.consignmentNumber
          ? `label-${shipmentResult.consignmentNumber}.pdf`
          : undefined,
        finalPrice: quotation.totalPrice,
        courierItResponse: shipmentResult as object,
        labelDownloaded: labelData !== null,
      },
    });

    // Mark quotation as selected
    await prisma.quotation.update({
      where: { id: quotationId },
      data: { isSelected: true },
    });

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "LABEL_CREATED" },
    });

    return NextResponse.json({
      success: true,
      shipment,
    });
  } catch (error) {
    console.error("Error creating shipment:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create shipment" },
      { status: 500 }
    );
  }
}
