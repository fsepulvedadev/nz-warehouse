# Arquitectura del Sistema

## Visión General

El portal NZ Warehouse es una aplicación web que integra **Carton Cloud** (gestión de órdenes de almacén) con **Courier IT** (servicios de mensajería) para automatizar el proceso de envío.

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  Carton Cloud   │ ───► │   NZ Warehouse   │ ───► │   Courier IT    │
│   (Órdenes)     │      │     Portal       │      │   (Envíos)      │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │   PostgreSQL     │
                         │   (Persistencia) │
                         └──────────────────┘
```

## Stack Tecnológico

| Tecnología         | Uso                                |
| ------------------ | ---------------------------------- |
| **Next.js 16**     | Framework fullstack con App Router |
| **TypeScript**     | Tipado estático                    |
| **Tailwind CSS 4** | Estilos utility-first              |
| **shadcn/ui**      | Componentes UI accesibles          |
| **Prisma 5**       | ORM para PostgreSQL                |
| **NextAuth.js 5**  | Autenticación con JWT              |
| **Zod**            | Validación de esquemas             |

## Estructura de Carpetas

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Grupo de rutas protegidas
│   │   ├── layout.tsx      # Layout con navbar y sidebar
│   │   ├── orders/         # Gestión de órdenes
│   │   └── shipments/      # Lista de envíos
│   ├── api/                # API Routes
│   │   ├── auth/           # Autenticación
│   │   ├── carton/         # Proxy a Carton Cloud
│   │   ├── courier/        # Proxy a Courier IT
│   │   └── shipments/      # CRUD de envíos
│   ├── login/              # Página pública de login
│   └── page.tsx            # Redirección inicial
├── components/
│   ├── ui/                 # Componentes shadcn/ui
│   ├── navbar.tsx          # Barra superior
│   ├── sidebar.tsx         # Menú lateral
│   └── providers.tsx       # Context providers
├── lib/
│   ├── auth.ts             # Config de NextAuth
│   ├── cartoncloud.ts      # Cliente API Carton Cloud
│   ├── courierit.ts        # Cliente API Courier IT
│   ├── prisma.ts           # Cliente Prisma singleton
│   └── utils.ts            # Utilidades (cn)
├── middleware.ts           # Protección de rutas
└── types/
    └── next-auth.d.ts      # Extensión de tipos
```

## Flujo de Datos

### 1. Sincronización de Órdenes

```
Usuario → GET /api/carton/orders → Carton Cloud API
                                         │
                                         ▼
                              Normalizar y validar datos
                                         │
                                         ▼
                              Upsert en base de datos
                                         │
                                         ▼
                              Respuesta al frontend
```

### 2. Cotización

```
Usuario → POST /api/courier/quote → Courier IT /calculate
              │                            │
              │                            ▼
              │                    Fastway + NZ Post
              │                            │
              ▼                            ▼
    Guardar quotations ◄─────── Comparar precios
```

### 3. Generación de Envío

```
Usuario → POST /api/courier/ship → Courier IT /sendparcel
              │                            │
              │                            ▼
              │                    Crear consignment
              │                            │
              ▼                            ▼
    Guardar shipment ◄──────── Descargar label PDF
```

## Patrones de Diseño

### Singleton para Prisma

```typescript
// src/lib/prisma.ts
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### Token Cache para OAuth

```typescript
// src/lib/cartoncloud.ts
let accessToken: string | null = null;
let tokenExpiry: Date | null = null;

async function getAccessToken() {
  if (accessToken && tokenExpiry && new Date() < tokenExpiry) {
    return accessToken;
  }
  // ... refresh token
}
```

### Middleware de Autenticación

```typescript
// src/middleware.ts
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  // ... redirect logic
});
```

## Seguridad

1. **Credenciales API** - Solo en servidor (variables de entorno)
2. **Autenticación** - JWT con cookies HttpOnly
3. **Protección de rutas** - Middleware global
4. **Validación** - Zod en todas las API routes
5. **CORS** - Configurado por Next.js
