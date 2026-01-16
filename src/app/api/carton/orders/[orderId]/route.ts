import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchOrder, validateOrderForShipping } from "@/lib/cartoncloud";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;

    // First check local database
    let order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        quotations: {
          orderBy: { totalPrice: "asc" },
        },
        shipment: true,
        errorLogs: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    // If not found by ID, try by Carton Cloud ID
    if (!order) {
      order = await prisma.order.findUnique({
        where: { cartonCloudId: orderId },
        include: {
          quotations: {
            orderBy: { totalPrice: "asc" },
          },
          shipment: true,
          errorLogs: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      });
    }

    // If still not found, fetch from Carton Cloud and create
    if (!order) {
      const cartonOrder = await fetchOrder(orderId);
      const validation = validateOrderForShipping(cartonOrder);

      order = await prisma.order.create({
        data: {
          cartonCloudId: cartonOrder.id,
          orderNumber: cartonOrder.orderNumber || cartonOrder.reference || "",
          customerName: cartonOrder.customer?.name || "Unknown",
          customerEmail: cartonOrder.customer?.email,
          customerPhone: cartonOrder.customer?.phone,
          deliveryStreet: cartonOrder.deliveryAddress?.street,
          deliverySuburb: cartonOrder.deliveryAddress?.suburb,
          deliveryCity: cartonOrder.deliveryAddress?.city,
          deliveryPostcode: cartonOrder.deliveryAddress?.postcode,
          deliveryCountry: cartonOrder.deliveryAddress?.country || "NZ",
          itemsJson: cartonOrder.items || [],
          cartonCloudData: cartonOrder as object,
          status: validation.isValid ? "READY_TO_QUOTE" : "PENDING_DATA",
        },
        include: {
          quotations: true,
          shipment: true,
          errorLogs: true,
        },
      });

      return NextResponse.json({
        ...order,
        validationErrors: validation.missingFields,
      });
    }

    // Parse items and check validation
    const cartonData = order.cartonCloudData as {
      items?: unknown[];
      deliveryAddress?: {
        street?: string;
        suburb?: string;
        city?: string;
        postcode?: string;
      };
    };
    const validation = validateOrderForShipping({
      id: order.cartonCloudId,
      items: (cartonData?.items || order.itemsJson) as {
        weight?: number;
        length?: number;
        width?: number;
        height?: number;
        description?: string;
      }[],
      deliveryAddress: {
        street: order.deliveryStreet || undefined,
        suburb: order.deliverySuburb || undefined,
        city: order.deliveryCity || undefined,
        postcode: order.deliveryPostcode || undefined,
      },
    });

    return NextResponse.json({
      ...order,
      validationErrors: validation.missingFields,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}
