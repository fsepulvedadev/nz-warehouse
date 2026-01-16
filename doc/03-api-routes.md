# API Routes

## Autenticación

### POST `/api/auth/[...nextauth]`
Handler de NextAuth.js para login/logout.

### POST `/api/auth/register`
Registro de nuevos usuarios.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "OPERATOR"  // opcional, default: OPERATOR
}
```

**Response:**
```json
{
  "user": {
    "id": "clx...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "OPERATOR"
  }
}
```

---

## Carton Cloud

### GET `/api/carton/orders`
Lista órdenes desde Carton Cloud y las sincroniza con la BD local.

**Query params:**
- `page` - Número de página (default: 1)
- `perPage` - Items por página (default: 20)
- `status` - Filtro por estado
- `search` - Búsqueda por número, cliente o postcode

**Response:**
```json
{
  "orders": [
    {
      "id": "clx...",
      "cartonCloudId": "cc-123",
      "orderNumber": "ORD-001",
      "customerName": "John Smith",
      "status": "READY_TO_QUOTE",
      "quotations": [],
      "shipment": null,
      "validationErrors": []
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### GET `/api/carton/orders/[orderId]`
Obtiene detalle de una orden específica.

**Response:**
```json
{
  "id": "clx...",
  "cartonCloudId": "cc-123",
  "orderNumber": "ORD-001",
  "customerName": "John Smith",
  "customerEmail": "john@example.com",
  "deliveryStreet": "123 Queen St",
  "deliveryCity": "Auckland",
  "deliveryPostcode": "1010",
  "status": "READY_TO_QUOTE",
  "itemsJson": [
    { "description": "Box", "weight": 2.5 }
  ],
  "quotations": [],
  "shipment": null,
  "validationErrors": []
}
```

---

## Courier IT

### POST `/api/courier/quote`
Obtiene cotizaciones de todos los proveedores.

**Request:**
```json
{
  "orderId": "clx...",
  "pickupPostcode": "2013"  // opcional, default: warehouse
}
```

**Response:**
```json
{
  "isRural": false,
  "quotations": [
    {
      "id": "clx...",
      "providerId": 1,
      "providerName": "Fastway",
      "basePrice": 8.50,
      "ruralSurcharge": 0,
      "gst": 1.28,
      "totalPrice": 9.78
    },
    {
      "id": "clx...",
      "providerId": 2,
      "providerName": "NZ Post",
      "basePrice": 12.00,
      "ruralSurcharge": 0,
      "gst": 1.80,
      "totalPrice": 13.80
    }
  ]
}
```

### POST `/api/courier/ship`
Crea un envío con el proveedor seleccionado.

**Request:**
```json
{
  "orderId": "clx...",
  "quotationId": "clx...",
  "senderAddress": {
    "name": "NZ Warehouse",
    "company": "NZ Warehouse Ltd",
    "street": "123 Warehouse St",
    "suburb": "Industrial Area",
    "city": "Auckland",
    "postcode": "2013",
    "country": "NZ",
    "phone": "+64 9 123 4567",
    "email": "shipping@nzwarehouse.co.nz"
  }
}
```

**Response:**
```json
{
  "success": true,
  "shipment": {
    "id": "clx...",
    "trackingNumber": "FW123456789",
    "trackingUrl": "https://fastway.co.nz/track/FW123456789",
    "consignmentNumber": "CON123456",
    "finalPrice": 9.78
  }
}
```

### GET `/api/courier/label/[shipmentId]`
Descarga la etiqueta PDF del envío.

**Response:** `application/pdf`

---

## Shipments

### GET `/api/shipments`
Lista todos los envíos generados.

**Response:**
```json
{
  "shipments": [
    {
      "id": "clx...",
      "orderId": "clx...",
      "providerName": "Fastway",
      "trackingNumber": "FW123456789",
      "finalPrice": 9.78,
      "createdAt": "2024-01-15T10:30:00Z",
      "order": {
        "orderNumber": "ORD-001",
        "customerName": "John Smith",
        "deliveryCity": "Auckland"
      }
    }
  ]
}
```

---

## Códigos de Error

| Código | Descripción |
|--------|-------------|
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - No autenticado |
| 404 | Not Found - Recurso no existe |
| 409 | Conflict - Shipment ya existe |
| 500 | Internal Server Error |

## Headers Requeridos

```
Authorization: Bearer <session_token>
Content-Type: application/json
```

La autenticación se maneja automáticamente con cookies de sesión de NextAuth.
