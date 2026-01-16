import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateQuotes, checkRuralPostcode } from "@/lib/courierit";
import { z } from "zod";

const QuoteRequestSchema = z.object({
  orderId: z.string(),
  pickupPostcode: z.string().default("2013"), // Default warehouse postcode
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, pickupPostcode } = QuoteRequestSchema.parse(body);

    // Get order from database
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.deliveryPostcode) {
      return NextResponse.json(
        { error: "Order missing delivery postcode" },
        { status: 400 }
      );
    }

    // Check if delivery is rural
    const isRural = await checkRuralPostcode(order.deliveryPostcode);

    // Update order with rural status
    await prisma.order.update({
      where: { id: orderId },
      data: { isRural },
    });

    // Parse items from order
    const items = (order.itemsJson as { weight?: number; length?: number; width?: number; height?: number }[]) || [];
    
    if (items.length === 0) {
      return NextResponse.json(
        { error: "Order has no items" },
        { status: 400 }
      );
    }

    // Get quotes from Courier IT
    const quotes = await calculateQuotes({
      pickupPostcode,
      deliveryPostcode: order.deliveryPostcode,
      items: items.map((item) => ({
        weight: item.weight || 1,
        length: item.length,
        width: item.width,
        height: item.height,
      })),
      isRural,
    });

    if (quotes.length === 0) {
      // Log error
      await prisma.errorLog.create({
        data: {
          orderId,
          action: "quote",
          message: "No quotes available from any provider",
        },
      });

      return NextResponse.json(
        { error: "No quotes available" },
        { status: 400 }
      );
    }

    // Clear previous quotations and save new ones
    await prisma.quotation.deleteMany({
      where: { orderId },
    });

    const savedQuotations = await Promise.all(
      quotes.map((quote) =>
        prisma.quotation.create({
          data: {
            orderId,
            providerId: quote.providerId,
            providerName: quote.providerName,
            serviceType: quote.serviceType,
            basePrice: quote.basePrice,
            ruralSurcharge: quote.ruralSurcharge || 0,
            gst: quote.gst || 0,
            totalPrice: quote.totalPrice,
            responseData: quote as object,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          },
        })
      )
    );

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "QUOTED" },
    });

    return NextResponse.json({
      isRural,
      quotations: savedQuotations,
    });
  } catch (error) {
    console.error("Error calculating quotes:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to calculate quotes" },
      { status: 500 }
    );
  }
}
