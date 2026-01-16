# Requerimientos – Portal de Integración Carton Cloud → Courier IT

## 0. Objetivo del sistema

Construir un **portal web** que permita:

1. Leer órdenes desde **Carton Cloud** vía API.
2. Cotizar envíos usando **Courier IT**.
3. Comparar proveedores (Fastway / NZ Post) por precio.
4. Generar el envío seleccionado y obtener **etiquetas PDF**.
5. Guardar el resultado y, en una fase posterior, actualizar Carton Cloud con tracking y documentos.

---

## 1. Alcance funcional (MVP)

### 1.1 Autenticación

- Login simple (usuario/contraseña) o NextAuth.
- Roles mínimos:
  - `admin`
  - `operator`
- Rutas protegidas (no acceso sin sesión).

---

### 1.2 Lista de órdenes (Carton Cloud)

- Listado paginado y filtrable.
- Filtros:
  - Estado: `Sin cotizar`, `Cotizado`, `Etiqueta generada`, `Error`.
  - Búsqueda por:
    - Número de orden
    - Cliente
    - Postcode
- Acciones por fila:
  - Ver detalle
  - Cotizar
  - Ver envío / Descargar etiqueta

---

### 1.3 Detalle de orden

- Mostrar:
  - Datos del destinatario
  - Dirección completa
  - Ítems / bultos
  - Estado del envío
- Acciones:
  - Cotizar envío
  - Generar etiqueta (si ya hay cotización)
  - Descargar etiqueta (si existe)

---

### 1.4 Cotización con Courier IT

- Backend:
  - Endpoint que construye request a `/calculate`.
  - Normaliza respuesta (proveedor, precio, impuestos).
- Frontend:
  - Modal con tabla comparativa de proveedores.
  - Botón “Elegir proveedor”.
- Reglas:
  - Manejar `isRural`.
  - Mostrar costos totales claramente.

---

### 1.5 Generación de envío

- Backend:
  - Llamada a `/sendparcel` con proveedor seleccionado.
  - Descarga etiquetas vía `/downloadlabel`.
  - Persistencia de resultado.
- Frontend:
  - Confirmación visual.
  - Link directo a PDF de etiqueta.

---

### 1.6 Persistencia e idempotencia

- Guardar en base de datos:
  - Orden (referencia o cache)
  - Cotizaciones
  - Envío generado
  - Etiquetas
- Evitar duplicados:
  - No permitir generar más de un envío por orden sin override explícito.

---

## 2. Integraciones y credenciales

### 2.1 Carton Cloud

- Autenticación: OAuth2 – Client Credentials.
- Variables requeridas:
  - `CARTON_BASE_URL`
  - `CARTON_CLIENT_ID`
  - `CARTON_CLIENT_SECRET`
  - `CARTON_TENANT_UUID`
  - `CARTON_CUSTOMER_UUID`
  - `CARTON_WAREHOUSE_UUID` (opcional)

---

### 2.2 Courier IT

- Autenticación: Basic Auth.
- Variables requeridas:
  - `COURIERIT_BASE_URL=https://courierit1.net.nz`
  - `COURIERIT_USERNAME`
  - `COURIERIT_PASSWORD`
- Proveedores soportados:
  - `1 = Fastway`
  - `2 = NZ Post`
- Configuración:
  - `signatureRequired` configurable
  - `serviceType` configurable (default Parcel)

---

## 3. Reglas de negocio

- Validaciones previas:
  - Dirección completa obligatoria
  - Peso y dimensiones por bulto
  - Máx. 35kg por bulto
- Manejo de errores:
  - Mensajes claros (campo faltante, formato inválido).
- Estados de orden:
  - `PENDING_DATA`
  - `READY_TO_QUOTE`
  - `QUOTED`
  - `LABEL_CREATED`
  - `ERROR`

---

## 4. Requerimientos no funcionales

- Seguridad:
  - Credenciales solo en backend.
  - Logs sin exponer secretos.
- Performance:
  - Cache local de órdenes.
  - Paginación obligatoria.
- Observabilidad:
  - Logs por acción (cotizar, generar).
  - Registro de errores técnicos por orden.

---

## 5. Stack tecnológico

- Next.js (App Router) + TypeScript
- Tailwind CSS
- shadcn/ui
- Prisma ORM
- PostgreSQL (Neon o Supabase)
- Zod para validaciones
- Fetch / Axios para APIs
- Manejo de PDFs:
  - Proxy o almacenamiento opcional

---

## 6. Estructura de proyecto (referencia)

- `/app/login`
- `/app/orders`
- `/app/orders/[orderId]`
- `/app/shipments`
- `/app/api/carton`
- `/app/api/courier`
- `/lib/cartoncloud.ts`
- `/lib/courierit.ts`
- `/lib/auth.ts`
- `/lib/prisma.ts`

---

## 7. Consideraciones futuras (fuera de MVP)

- Webhooks Carton Cloud
- Escritura de tracking y documentos en Carton Cloud
- Multi-tenant
- Auditoría avanzada
- Dashboard de métricas

---
