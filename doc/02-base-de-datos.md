# Base de Datos

## Diagrama ER

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    User     │     │    Order    │     │  Quotation  │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id          │     │ id          │◄────│ orderId     │
│ email       │     │ cartonCloud │     │ providerId  │
│ password    │     │ orderNumber │     │ providerName│
│ role        │     │ customerName│     │ totalPrice  │
│ ...         │     │ status      │     │ isSelected  │
└─────────────┘     │ itemsJson   │     └─────────────┘
                    │ ...         │
                    └──────┬──────┘
                           │
                           │ 1:1
                           ▼
                    ┌─────────────┐
                    │  Shipment   │
                    ├─────────────┤
                    │ orderId     │
                    │ trackingNum │
                    │ labelData   │
                    │ finalPrice  │
                    └─────────────┘
```

## Modelos Prisma

### User (Autenticación)
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String?
  name          String?
  role          UserRole  @default(OPERATOR)
  // ... campos de NextAuth
}

enum UserRole {
  ADMIN
  OPERATOR
}
```

### Order (Órdenes)
```prisma
model Order {
  id                String      @id @default(cuid())
  cartonCloudId     String      @unique
  orderNumber       String
  customerName      String
  customerEmail     String?
  customerPhone     String?
  
  // Dirección de entrega
  deliveryStreet    String?
  deliverySuburb    String?
  deliveryCity      String?
  deliveryPostcode  String?
  deliveryCountry   String      @default("NZ")
  isRural           Boolean     @default(false)
  
  // Estado del flujo
  status            OrderStatus @default(PENDING_DATA)
  
  // Items serializados
  itemsJson         Json?
  cartonCloudData   Json?       // Cache completo
  
  // Relaciones
  quotations        Quotation[]
  shipment          Shipment?
  errorLogs         ErrorLog[]
}

enum OrderStatus {
  PENDING_DATA     // Faltan datos
  READY_TO_QUOTE   // Lista para cotizar
  QUOTED           // Cotizada
  LABEL_CREATED    // Envío generado
  ERROR            // Error
}
```

### Quotation (Cotizaciones)
```prisma
model Quotation {
  id              String   @id @default(cuid())
  orderId         String
  order           Order    @relation(...)
  
  providerId      Int      // 1=Fastway, 2=NZ Post
  providerName    String
  serviceType     String?
  
  basePrice       Float
  ruralSurcharge  Float    @default(0)
  gst             Float    @default(0)
  totalPrice      Float
  
  isSelected      Boolean  @default(false)
  expiresAt       DateTime?
  responseData    Json?
}
```

### Shipment (Envíos)
```prisma
model Shipment {
  id                String   @id @default(cuid())
  orderId           String   @unique
  order             Order    @relation(...)
  
  providerId        Int
  providerName      String
  
  trackingNumber    String?
  trackingUrl       String?
  consignmentNumber String?
  
  labelUrl          String?
  labelData         Bytes?   // PDF binario
  labelFileName     String?
  
  finalPrice        Float?
  courierItResponse Json?
  
  labelDownloaded   Boolean  @default(false)
  syncedToCarton    Boolean  @default(false)
}
```

### ErrorLog (Registro de errores)
```prisma
model ErrorLog {
  id          String   @id @default(cuid())
  orderId     String?
  order       Order?   @relation(...)
  
  action      String   // 'quote', 'ship', 'label'
  errorCode   String?
  message     String
  details     Json?
  
  createdAt   DateTime @default(now())
}
```

## Comandos Prisma

```bash
# Generar cliente TypeScript
npx prisma generate

# Sincronizar schema con BD (desarrollo)
npx prisma db push

# Crear migración (producción)
npx prisma migrate dev --name init

# Ver datos en GUI
npx prisma studio

# Cargar datos de prueba
npx prisma db seed
```

## Índices y Relaciones

- `Order.cartonCloudId` - Unique para evitar duplicados
- `Quotation.orderId` - Index para búsquedas rápidas
- `Shipment.orderId` - Unique (1 shipment por order)
- `ErrorLog.orderId` - Index para filtrar por orden
- `ErrorLog.action` - Index para filtrar por tipo

## Migraciones

Las migraciones se manejan con Prisma Migrate:

```bash
# Desarrollo: push directo
npx prisma db push

# Producción: migraciones versionadas
npx prisma migrate deploy
```

## Seed de Datos

El archivo `prisma/seed.ts` crea:

1. **Usuario Admin**: `admin@nzwarehouse.co.nz` / `admin123`
2. **Usuario Operator**: `operator@nzwarehouse.co.nz` / `operator123`
3. **Órdenes de ejemplo** para testing

```bash
npx prisma db seed
```
