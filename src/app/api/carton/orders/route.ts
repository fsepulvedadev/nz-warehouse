import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchOrders, validateOrderForShipping } from "@/lib/cartoncloud";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";

// Check if Carton Cloud is configured
const isCartonCloudConfigured = () => {
  return !!(
    process.env.CARTON_BASE_URL &&
    process.env.CARTON_CLIENT_ID &&
    process.env.CARTON_CLIENT_SECRET
  );
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("perPage") || "20");
    const statusFilter = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    // If Carton Cloud is not configured, return local orders only
    if (!isCartonCloudConfigured()) {
      console.log("[Orders] Carton Cloud not configured, using local data");
      
      const where: {
        status?: OrderStatus;
        OR?: Array<{
          orderNumber?: { contains: string; mode: "insensitive" };
          customerName?: { contains: string; mode: "insensitive" };
          deliveryPostcode?: { contains: string };
        }>;
      } = {};
      
      if (statusFilter && statusFilter !== "all") {
        where.status = statusFilter as OrderStatus;
      }
      
      if (search) {
        where.OR = [
          { orderNumber: { contains: search, mode: "insensitive" } },
          { customerName: { contains: search, mode: "insensitive" } },
          { deliveryPostcode: { contains: search } },
        ];
      }

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            quotations: {
              orderBy: { totalPrice: "asc" },
            },
            shipment: true,
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * perPage,
          take: perPage,
        }),
        prisma.order.count({ where }),
      ]);

      const ordersWithValidation = orders.map((order) => {
        const validation = validateOrderForShipping({
          id: order.cartonCloudId,
          deliveryAddress: {
            street: order.deliveryStreet || undefined,
            suburb: order.deliverySuburb || undefined,
            city: order.deliveryCity || undefined,
            postcode: order.deliveryPostcode || undefined,
          },
          items: (order.itemsJson as Array<{ weight?: number }>) || [],
        });

        return {
          ...order,
          validationErrors: validation.missingFields,
        };
      });

      return NextResponse.json({
        orders: ordersWithValidation,
        pagination: {
          page,
          perPage,
          total,
          totalPages: Math.ceil(total / perPage),
        },
      });
    }

    // Fetch orders from Carton Cloud
    const { orders: cartonOrders, total } = await fetchOrders({
      page,
      perPage,
      status: statusFilter,
      search,
    });

    // Sync orders to local database
    const syncedOrders = await Promise.all(
      cartonOrders.map(async (cartonOrder) => {
        const validation = validateOrderForShipping(cartonOrder);
        const orderStatus: OrderStatus = validation.isValid
          ? "READY_TO_QUOTE"
          : "PENDING_DATA";

        // Upsert order in database
        const order = await prisma.order.upsert({
          where: { cartonCloudId: cartonOrder.id },
          update: {
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
            syncedAt: new Date(),
          },
          create: {
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
            status: orderStatus,
          },
          include: {
            quotations: {
              orderBy: { totalPrice: "asc" },
            },
            shipment: true,
          },
        });

        return {
          ...order,
          validationErrors: validation.missingFields,
        };
      })
    );

    return NextResponse.json({
      orders: syncedOrders,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
