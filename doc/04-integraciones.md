# Integraciones Externas

## Carton Cloud API

### Autenticación
- **Tipo**: OAuth2 Client Credentials
- **Token URL**: `{CARTON_BASE_URL}/oauth/token`
- **Token Expiry**: Cacheado con margen de 5 minutos

### Variables de Entorno
```env
CARTON_BASE_URL=https://api.cartoncloud.com
CARTON_CLIENT_ID=your-client-id
CARTON_CLIENT_SECRET=your-client-secret
CARTON_TENANT_UUID=your-tenant-uuid
CARTON_CUSTOMER_UUID=your-customer-uuid
CARTON_WAREHOUSE_UUID=your-warehouse-uuid  # opcional
```

### Endpoints Utilizados

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/oauth/token` | Obtener access token |
| GET | `/api/v1/orders` | Listar órdenes |
| GET | `/api/v1/orders/{id}` | Detalle de orden |
| PATCH | `/api/v1/orders/{id}` | Actualizar orden (tracking) |

### Headers
```
Authorization: Bearer {access_token}
Content-Type: application/json
X-Tenant-UUID: {tenant_uuid}
```

### Estructura de Orden (Carton Cloud)
```typescript
interface CartonCloudOrder {
  id: string;
  orderNumber?: string;
  reference?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  deliveryAddress?: {
    street?: string;
    suburb?: string;
    city?: string;
    postcode?: string;
    country?: string;
  };
  items?: Array<{
    description?: string;
    quantity?: number;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
  }>;
}
```

---

## Courier IT API

### Autenticación
- **Tipo**: Basic Auth
- **Header**: `Authorization: Basic base64(username:password)`

### Variables de Entorno
```env
COURIERIT_BASE_URL=https://courierit1.net.nz
COURIERIT_USERNAME=your-username
COURIERIT_PASSWORD=your-password
DEFAULT_SIGNATURE_REQUIRED=false
DEFAULT_SERVICE_TYPE=Parcel
```

### Proveedores

| ID | Nombre | Descripción |
|----|--------|-------------|
| 1 | Fastway | Courier económico |
| 2 | NZ Post | Servicio postal nacional |

### Endpoints

#### POST `/api/calculate` - Cotización
```json
// Request
{
  "providerId": 1,
  "pickupPostcode": "2013",
  "deliveryPostcode": "1010",
  "items": [
    { "weight": 2.5, "length": 30, "width": 20, "height": 15 }
  ],
  "isRural": false
}

// Response
{
  "success": true,
  "basePrice": 8.50,
  "ruralSurcharge": 0,
  "gst": 1.28,
  "totalPrice": 9.78,
  "serviceType": "Parcel",
  "estimatedDays": 2
}
```

#### POST `/api/sendparcel` - Crear Envío
```json
// Request
{
  "providerId": 1,
  "reference": "ORD-001",
  "sender": {
    "name": "NZ Warehouse",
    "street": "123 Warehouse St",
    "suburb": "Industrial Area",
    "city": "Auckland",
    "postcode": "2013",
    "country": "NZ",
    "phone": "+64 9 123 4567"
  },
  "recipient": {
    "name": "John Smith",
    "street": "456 Queen St",
    "suburb": "CBD",
    "city": "Auckland",
    "postcode": "1010",
    "country": "NZ"
  },
  "items": [
    { "weight": 2.5, "description": "Electronics" }
  ],
  "signatureRequired": false,
  "serviceType": "Parcel"
}

// Response
{
  "success": true,
  "consignmentNumber": "CON123456",
  "trackingNumber": "FW123456789",
  "trackingUrl": "https://fastway.co.nz/track/FW123456789",
  "labelUrl": "/api/downloadlabel?consignment=CON123456"
}
```

#### GET `/api/downloadlabel` - Descargar Etiqueta
```
GET /api/downloadlabel?consignment=CON123456
Authorization: Basic ...

Response: application/pdf (binary)
```

#### POST `/api/checkrural` - Verificar Rural
```json
// Request
{ "postcode": "3200" }

// Response
{ "isRural": true }
```

---

## Manejo de Errores

### Carton Cloud
```typescript
// Error de autenticación
if (!response.ok) {
  // Token expirado: limpiar cache y reintentar
  accessToken = null;
  tokenExpiry = null;
}
```

### Courier IT
```typescript
// Error de cotización: intentar con el siguiente proveedor
try {
  const quote = await calculateQuote(PROVIDERS.FASTWAY, ...);
} catch {
  // Fastway falló, intentar NZ Post
  const quote = await calculateQuote(PROVIDERS.NZ_POST, ...);
}
```

---

## Limitaciones y Consideraciones

### Carton Cloud
- Rate limiting: Consultar documentación oficial
- Token expiry: ~1 hora (cacheado con 5 min margen)
- Paginación: Máximo 100 items por request

### Courier IT
- Peso máximo por bulto: **35kg**
- Dimensiones: Validar según proveedor
- Rural surcharge: Aplica a ciertos postcodes
- Labels: Formato A4 o etiqueta térmica

### Validaciones Pre-envío
```typescript
function validateOrderForShipping(order) {
  const errors = [];
  
  if (!order.deliveryAddress?.street) errors.push("Street required");
  if (!order.deliveryAddress?.postcode) errors.push("Postcode required");
  
  order.items?.forEach((item, i) => {
    if (!item.weight) errors.push(`Item ${i+1}: weight required`);
    if (item.weight > 35) errors.push(`Item ${i+1}: exceeds 35kg`);
  });
  
  return { isValid: errors.length === 0, errors };
}
```
