/**
 * Courier IT API Integration
 * 
 * Handles quotation, shipment creation, and label download
 */

import { z } from "zod";

// Environment configuration
const config = {
  baseUrl: process.env.COURIERIT_BASE_URL || "https://courierit1.net.nz",
  username: process.env.COURIERIT_USERNAME || "",
  password: process.env.COURIERIT_PASSWORD || "",
  signatureRequired: process.env.DEFAULT_SIGNATURE_REQUIRED === "true",
  defaultServiceType: process.env.DEFAULT_SERVICE_TYPE || "Parcel",
};

// Provider IDs
export const PROVIDERS = {
  FASTWAY: 1,
  NZ_POST: 2,
} as const;

export const PROVIDER_NAMES: Record<number, string> = {
  [PROVIDERS.FASTWAY]: "Fastway",
  [PROVIDERS.NZ_POST]: "NZ Post",
};

// Request/Response schemas
const ParcelItemSchema = z.object({
  weight: z.number().min(0.1).max(35),
  length: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  description: z.string().optional(),
});

const AddressSchema = z.object({
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
});

const QuoteRequestSchema = z.object({
  pickupPostcode: z.string(),
  deliveryPostcode: z.string(),
  items: z.array(ParcelItemSchema).min(1),
  isRural: z.boolean().optional(),
});

const ShipmentRequestSchema = z.object({
  providerId: z.number(),
  reference: z.string(),
  sender: AddressSchema,
  recipient: AddressSchema,
  items: z.array(ParcelItemSchema).min(1),
  signatureRequired: z.boolean().optional(),
  serviceType: z.string().optional(),
});

const ShipmentResponseSchema = z.object({
  success: z.boolean(),
  consignmentNumber: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().optional(),
  labelUrl: z.string().optional(),
  error: z.string().optional(),
});

// Types
export type ParcelItem = z.infer<typeof ParcelItemSchema>;
export type Address = z.infer<typeof AddressSchema>;
export type QuoteRequest = z.infer<typeof QuoteRequestSchema>;
export type QuoteResponseItem = z.infer<typeof QuoteResponseItemSchema>;
export type ShipmentRequest = z.infer<typeof ShipmentRequestSchema>;
export type ShipmentResponse = z.infer<typeof ShipmentResponseSchema>;

/**
 * Get Basic Auth header
 */
function getAuthHeader(): string {
  const credentials = Buffer.from(`${config.username}:${config.password}`).toString("base64");
  return `Basic ${credentials}`;
}

/**
 * Make authenticated request to Courier IT API
 */
async function courierRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${config.baseUrl}${endpoint}`, {
    ...options,
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Courier IT API error: ${response.status} - ${error}`);
  }

  // Handle empty responses or blob responses
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/pdf")) {
    return response as unknown as T;
  }

  const text = await response.text();
  if (!text) return {} as T;
  
  return JSON.parse(text);
}

/**
 * Calculate shipping quotes for all providers
 */
export async function calculateQuotes(
  request: QuoteRequest
): Promise<QuoteResponseItem[]> {
  const validated = QuoteRequestSchema.parse(request);
  
  const quotes: QuoteResponseItem[] = [];
  
  // Get quotes from both providers
  for (const providerId of [PROVIDERS.FASTWAY, PROVIDERS.NZ_POST]) {
    try {
      const response = await courierRequest<{
        success?: boolean;
        price?: number;
        basePrice?: number;
        ruralSurcharge?: number;
        gst?: number;
        totalPrice?: number;
        serviceType?: string;
        estimatedDays?: number;
        error?: string;
      }>("/api/calculate", {
        method: "POST",
        body: JSON.stringify({
          providerId,
          pickupPostcode: validated.pickupPostcode,
          deliveryPostcode: validated.deliveryPostcode,
          items: validated.items,
          isRural: validated.isRural || false,
        }),
      });

      if (response.success !== false && response.totalPrice) {
        quotes.push({
          providerId,
          providerName: PROVIDER_NAMES[providerId],
          serviceType: response.serviceType || config.defaultServiceType,
          basePrice: response.basePrice || response.price || 0,
          ruralSurcharge: response.ruralSurcharge || 0,
          gst: response.gst || 0,
          totalPrice: response.totalPrice,
          estimatedDays: response.estimatedDays,
        });
      }
    } catch (error) {
      console.error(`Failed to get quote from provider ${providerId}:`, error);
      // Continue with other providers
    }
  }

  // Sort by total price (cheapest first)
  return quotes.sort((a, b) => a.totalPrice - b.totalPrice);
}

/**
 * Create a shipment with selected provider
 */
export async function createShipment(
  request: ShipmentRequest
): Promise<ShipmentResponse> {
  const validated = ShipmentRequestSchema.parse(request);
  
  const response = await courierRequest<{
    success?: boolean;
    consignmentNumber?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    labelUrl?: string;
    error?: string;
  }>("/api/sendparcel", {
    method: "POST",
    body: JSON.stringify({
      ...validated,
      signatureRequired: validated.signatureRequired ?? config.signatureRequired,
      serviceType: validated.serviceType || config.defaultServiceType,
    }),
  });

  return ShipmentResponseSchema.parse({
    success: response.success !== false,
    consignmentNumber: response.consignmentNumber,
    trackingNumber: response.trackingNumber,
    trackingUrl: response.trackingUrl,
    labelUrl: response.labelUrl,
    error: response.error,
  });
}

/**
 * Download shipping label as PDF
 */
export async function downloadLabel(
  consignmentNumber: string
): Promise<ArrayBuffer> {
  const response = await fetch(
    `${config.baseUrl}/api/downloadlabel?consignment=${consignmentNumber}`,
    {
      headers: {
        Authorization: getAuthHeader(),
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to download label: ${response.status}`);
  }

  return response.arrayBuffer();
}

/**
 * Check if a postcode is rural
 */
export async function checkRuralPostcode(postcode: string): Promise<boolean> {
  try {
    const response = await courierRequest<{ isRural?: boolean }>("/api/checkrural", {
      method: "POST",
      body: JSON.stringify({ postcode }),
    });
    return response.isRural || false;
  } catch {
    // Default to false if API call fails
    return false;
  }
}

/**
 * Validate shipment request data
 */
export function validateShipmentData(request: Partial<ShipmentRequest>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!request.providerId) errors.push("Provider is required");
  if (!request.reference) errors.push("Reference is required");
  
  if (!request.sender) {
    errors.push("Sender address is required");
  } else {
    if (!request.sender.name) errors.push("Sender name is required");
    if (!request.sender.street) errors.push("Sender street is required");
    if (!request.sender.suburb) errors.push("Sender suburb is required");
    if (!request.sender.city) errors.push("Sender city is required");
    if (!request.sender.postcode) errors.push("Sender postcode is required");
  }

  if (!request.recipient) {
    errors.push("Recipient address is required");
  } else {
    if (!request.recipient.name) errors.push("Recipient name is required");
    if (!request.recipient.street) errors.push("Recipient street is required");
    if (!request.recipient.suburb) errors.push("Recipient suburb is required");
    if (!request.recipient.city) errors.push("Recipient city is required");
    if (!request.recipient.postcode) errors.push("Recipient postcode is required");
  }

  if (!request.items || request.items.length === 0) {
    errors.push("At least one item is required");
  } else {
    request.items.forEach((item, index) => {
      if (!item.weight || item.weight <= 0) {
        errors.push(`Item ${index + 1}: Weight is required`);
      }
      if (item.weight && item.weight > 35) {
        errors.push(`Item ${index + 1}: Weight exceeds 35kg limit`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
