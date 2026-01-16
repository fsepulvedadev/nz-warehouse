# Flujos de Negocio

## Diagrama General

```
  Carton Cloud              NZ Warehouse Portal              Courier IT
       │                            │                            │
       │    Sincronizar órdenes     │                            │
       │◄───────────────────────────│                            │
       │                            │                            │
       │     Validar datos          │                            │
       │                     ┌──────┴──────┐                     │
       │                     │  Completos? │                     │
       │                     └──────┬──────┘                     │
       │                      Sí /      \ No                     │
       │                        /        \                       │
       │              READY_TO_QUOTE   PENDING_DATA              │
       │                        │                                │
       │                 Cotizar │                               │
       │                        ├───────────────────────────────►│
       │                        │◄───────────────────────────────│
       │                        │   Fastway quote                │
       │                        ├───────────────────────────────►│
       │                        │◄───────────────────────────────│
       │                        │   NZ Post quote                │
       │                        │                                │
       │               QUOTED   │                                │
       │                        │                                │
       │          Seleccionar   │                                │
       │           proveedor    │                                │
       │                        ├───────────────────────────────►│
       │                        │◄───────────────────────────────│
       │                        │   Crear envío                  │
       │                        ├───────────────────────────────►│
       │                        │◄───────────────────────────────│
       │                        │   Descargar label              │
       │                        │                                │
       │           LABEL_CREATED│                                │
       │                        │                                │
       │  (Futuro: sync tracking)                                │
       │◄───────────────────────│                                │
```

## Estados de Orden

### PENDING_DATA
**Descripción**: La orden no tiene todos los datos requeridos para cotizar.

**Datos faltantes comunes**:
- Dirección incompleta (calle, ciudad, postcode)
- Items sin peso
- Peso excede 35kg

**Acción**: El usuario debe completar los datos en Carton Cloud o manualmente.

---

### READY_TO_QUOTE
**Descripción**: La orden tiene todos los datos necesarios y está lista para cotizar.

**Requisitos**:
- Dirección de entrega completa
- Al menos un item con peso válido (0.1 - 35kg)

**Acción**: El operador puede solicitar cotizaciones.

---

### QUOTED
**Descripción**: Se han obtenido cotizaciones de uno o más proveedores.

**Información disponible**:
- Lista de cotizaciones ordenadas por precio
- Desglose: precio base + rural surcharge + GST
- Vigencia: 24 horas

**Acción**: El operador selecciona un proveedor y crea el envío.

---

### LABEL_CREATED
**Descripción**: El envío ha sido creado y la etiqueta está disponible.

**Información disponible**:
- Número de tracking
- URL de seguimiento
- Número de consignación
- Etiqueta PDF

**Acción**: Descargar etiqueta, imprimir y pegar en el paquete.

---

### ERROR
**Descripción**: Ocurrió un error en algún paso del proceso.

**Causas comunes**:
- Error de API de Courier IT
- Datos inválidos
- Cotización expirada

**Acción**: Revisar logs de error, corregir y reintentar.

---

## Flujo de Cotización

```typescript
// 1. Verificar datos de la orden
const validation = validateOrderForShipping(order);
if (!validation.isValid) {
  throw new Error(`Missing: ${validation.missingFields.join(", ")}`);
}

// 2. Verificar si es zona rural
const isRural = await checkRuralPostcode(order.deliveryPostcode);

// 3. Obtener cotizaciones de ambos proveedores
const quotes = await calculateQuotes({
  pickupPostcode: "2013",  // Warehouse
  deliveryPostcode: order.deliveryPostcode,
  items: order.items,
  isRural,
});

// 4. Ordenar por precio
quotes.sort((a, b) => a.totalPrice - b.totalPrice);

// 5. Guardar en base de datos
for (const quote of quotes) {
  await prisma.quotation.create({ data: quote });
}

// 6. Actualizar estado
await prisma.order.update({
  where: { id: order.id },
  data: { status: "QUOTED" },
});
```

## Flujo de Envío

```typescript
// 1. Verificar que no exista envío previo (idempotencia)
if (order.shipment) {
  throw new Error("Shipment already exists");
}

// 2. Verificar cotización válida
const quotation = order.quotations.find(q => q.id === quotationId);
if (!quotation || (quotation.expiresAt && new Date() > quotation.expiresAt)) {
  throw new Error("Invalid or expired quotation");
}

// 3. Crear envío en Courier IT
const result = await createShipment({
  providerId: quotation.providerId,
  reference: order.orderNumber,
  sender: senderAddress,
  recipient: recipientAddress,
  items: order.items,
});

// 4. Descargar etiqueta
const labelPdf = await downloadLabel(result.consignmentNumber);

// 5. Guardar todo
await prisma.shipment.create({
  data: {
    orderId: order.id,
    trackingNumber: result.trackingNumber,
    consignmentNumber: result.consignmentNumber,
    labelData: labelPdf,
    finalPrice: quotation.totalPrice,
  },
});

// 6. Actualizar estado
await prisma.order.update({
  where: { id: order.id },
  data: { status: "LABEL_CREATED" },
});
```

## Reglas de Negocio

### Peso máximo
- **35kg por bulto**
- Si un bulto excede, la orden queda en PENDING_DATA

### Rural Surcharge
- Aplica a postcodes rurales
- Se consulta a Courier IT via `/api/checkrural`
- Se suma al precio base

### Vigencia de cotizaciones
- **24 horas** desde que se obtienen
- Si expira, se debe re-cotizar antes de crear envío

### Idempotencia
- **Un envío por orden**
- Si ya existe shipment, retorna error 409 Conflict
- Override explícito no implementado (futuro)

### Proveedores
| ID | Nombre | Típico uso |
|----|--------|------------|
| 1 | Fastway | Entregas urbanas, económico |
| 2 | NZ Post | Cobertura nacional, rural |

## Manejo de Errores

### Error en cotización
```typescript
try {
  await calculateQuotes(request);
} catch (error) {
  await prisma.errorLog.create({
    data: {
      orderId,
      action: "quote",
      message: error.message,
    },
  });
  // No cambiar estado a ERROR, permitir reintentar
}
```

### Error en envío
```typescript
try {
  await createShipment(request);
} catch (error) {
  await prisma.errorLog.create({
    data: {
      orderId,
      action: "ship",
      message: error.message,
    },
  });
  
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "ERROR" },
  });
}
```

## Futuras Mejoras

1. **Sync de tracking a Carton Cloud**
   - Webhook cuando Courier IT actualiza estado
   - PATCH a `/api/v1/orders/{id}` con tracking info

2. **Adjuntar etiqueta a Carton Cloud**
   - Upload de documento vía API
   - Asociar al order como attachment

3. **Recotización automática**
   - Job que detecta cotizaciones próximas a expirar
   - Notificación al operador

4. **Bulk operations**
   - Cotizar múltiples órdenes a la vez
   - Crear envíos en lote
