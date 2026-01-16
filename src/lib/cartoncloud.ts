/**
 * Carton Cloud API Integration
 * 
 * Handles OAuth2 authentication and order fetching from Carton Cloud
 */

import { z } from "zod";

// Environment variables
const config = {
  baseUrl: process.env.CARTON_BASE_URL || "",
  clientId: process.env.CARTON_CLIENT_ID || "",
  clientSecret: process.env.CARTON_CLIENT_SECRET || "",
  tenantUuid: process.env.CARTON_TENANT_UUID || "",
  customerUuid: process.env.CARTON_CUSTOMER_UUID || "",
  warehouseUuid: process.env.CARTON_WAREHOUSE_UUID || "",
};

// Token cache
let accessToken: string | null = null;
let tokenExpiry: Date | null = null;

// Schemas
const OrderItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().optional(),
  weight: z.number().optional(),
  length: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  sku: z.string().optional(),
});

const OrderAddressSchema = z.object({
  street: z.string().optional(),
  street2: z.string().optional(),
  suburb: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().optional(),
});

const CartonCloudOrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string().optional(),
  reference: z.string().optional(),
  customer: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
  }).optional(),
  deliveryAddress: OrderAddressSchema.optional(),
  items: z.array(OrderItemSchema).optional(),
  status: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type CartonCloudOrder = z.infer<typeof CartonCloudOrderSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;

/**
 * Get OAuth2 access token from Carton Cloud
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (accessToken && tokenExpiry && new Date() < tokenExpiry) {
    return accessToken;
  }

  const tokenUrl = `${config.baseUrl}/oauth/token`;
  
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Carton Cloud access token: ${error}`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  // Set expiry 5 minutes before actual expiry for safety
  tokenExpiry = new Date(Date.now() + (data.expires_in - 300) * 1000);

  return accessToken!;
}

/**
 * Make authenticated request to Carton Cloud API
 */
async function cartonRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();
  
  const response = await fetch(`${config.baseUrl}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Tenant-UUID": config.tenantUuid,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Carton Cloud API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Fetch orders from Carton Cloud
 */
export async function fetchOrders(params?: {
  page?: number;
  perPage?: number;
  status?: string;
  search?: string;
}): Promise<{ orders: CartonCloudOrder[]; total: number; page: number; perPage: number }> {
  const queryParams = new URLSearchParams();
  
  if (params?.page) queryParams.set("page", params.page.toString());
  if (params?.perPage) queryParams.set("per_page", params.perPage.toString());
  if (params?.status) queryParams.set("status", params.status);
  if (params?.search) queryParams.set("search", params.search);
  if (config.customerUuid) queryParams.set("customer_uuid", config.customerUuid);
  
  const endpoint = `/api/v1/orders?${queryParams.toString()}`;
  
  const response = await cartonRequest<{
    data: unknown[];
    meta?: { total?: number; current_page?: number; per_page?: number };
  }>(endpoint);

  const orders = response.data.map((order) => {
    try {
      return CartonCloudOrderSchema.parse(order);
    } catch {
      // Return a minimal order object if parsing fails
      const raw = order as Record<string, unknown>;
      return {
        id: String(raw.id || ""),
        orderNumber: String(raw.orderNumber || raw.reference || ""),
        customer: {
          name: String((raw.customer as Record<string, unknown>)?.name || ""),
        },
      } as CartonCloudOrder;
    }
  });

  return {
    orders,
    total: response.meta?.total || orders.length,
    page: response.meta?.current_page || params?.page || 1,
    perPage: response.meta?.per_page || params?.perPage || 20,
  };
}

/**
 * Fetch a single order by ID
 */
export async function fetchOrder(orderId: string): Promise<CartonCloudOrder> {
  const endpoint = `/api/v1/orders/${orderId}`;
  const response = await cartonRequest<{ data: unknown }>(endpoint);
  return CartonCloudOrderSchema.parse(response.data);
}

/**
 * Update order in Carton Cloud (for tracking info)
 */
export async function updateOrder(
  orderId: string,
  data: {
    trackingNumber?: string;
    trackingUrl?: string;
    status?: string;
  }
): Promise<CartonCloudOrder> {
  const endpoint = `/api/v1/orders/${orderId}`;
  const response = await cartonRequest<{ data: unknown }>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return CartonCloudOrderSchema.parse(response.data);
}

/**
 * Validate if an order has all required data for shipping
 */
export function validateOrderForShipping(order: CartonCloudOrder): {
  isValid: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];

  if (!order.deliveryAddress?.street) missingFields.push("Delivery street");
  if (!order.deliveryAddress?.suburb) missingFields.push("Delivery suburb");
  if (!order.deliveryAddress?.city) missingFields.push("Delivery city");
  if (!order.deliveryAddress?.postcode) missingFields.push("Delivery postcode");

  if (!order.items || order.items.length === 0) {
    missingFields.push("Order items");
  } else {
    order.items.forEach((item, index) => {
      if (!item.weight || item.weight <= 0) {
        missingFields.push(`Item ${index + 1} weight`);
      }
      if (item.weight && item.weight > 35) {
        missingFields.push(`Item ${index + 1} exceeds 35kg limit`);
      }
    });
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}
