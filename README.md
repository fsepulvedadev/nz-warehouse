# NZ Warehouse - Shipping Portal

Portal de integración entre **Carton Cloud** y **Courier IT** para gestión de envíos en Nueva Zelanda.

## 🚀 Características

- **Sincronización de órdenes** desde Carton Cloud
- **Cotización automática** con múltiples proveedores (Fastway, NZ Post)
- **Generación de envíos** y etiquetas PDF
- **Comparación de precios** entre proveedores
- **Gestión de estados** de órdenes
- **Autenticación segura** con roles (admin/operator)

## 📋 Requisitos

- Node.js 20.19+ o 22.12+
- PostgreSQL (Neon, Supabase, o local)
- Credenciales de Carton Cloud API
- Credenciales de Courier IT API

## 🛠️ Instalación

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd nz-warehouse
npm install
```

### 2. Configurar variables de entorno

Copiar el archivo de ejemplo y configurar:

```bash
cp env.example .env
```

Editar `.env` con tus credenciales:

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/nz_warehouse"

# NextAuth.js
AUTH_SECRET="tu-secreto-generado-con-openssl"
AUTH_URL="http://localhost:3000"

# Carton Cloud API
CARTON_BASE_URL="https://api.cartoncloud.com"
CARTON_CLIENT_ID="tu-client-id"
CARTON_CLIENT_SECRET="tu-client-secret"
CARTON_TENANT_UUID="tu-tenant-uuid"
CARTON_CUSTOMER_UUID="tu-customer-uuid"

# Courier IT API
COURIERIT_BASE_URL="https://courierit1.net.nz"
COURIERIT_USERNAME="tu-username"
COURIERIT_PASSWORD="tu-password"
```

### 3. Configurar base de datos

```bash
# Generar cliente de Prisma
npx prisma generate

# Crear tablas en la base de datos
npx prisma db push

# (Opcional) Cargar datos de prueba
npx prisma db seed
```

### 4. Iniciar el servidor

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## 👤 Credenciales de prueba

Después de ejecutar el seed:

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@nzwarehouse.co.nz | admin123 |
| Operator | operator@nzwarehouse.co.nz | operator123 |

## 📁 Estructura del proyecto

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── orders/           # Lista y detalle de órdenes
│   │   └── shipments/        # Lista de envíos generados
│   ├── api/
│   │   ├── auth/             # Autenticación
│   │   ├── carton/           # API de Carton Cloud
│   │   ├── courier/          # API de Courier IT
│   │   └── shipments/        # Gestión de envíos
│   └── login/                # Página de login
├── components/
│   ├── ui/                   # Componentes shadcn/ui
│   ├── navbar.tsx            # Barra de navegación
│   ├── sidebar.tsx           # Menú lateral
│   └── providers.tsx         # Providers de la app
├── lib/
│   ├── auth.ts               # Configuración NextAuth
│   ├── cartoncloud.ts        # Cliente API Carton Cloud
│   ├── courierit.ts          # Cliente API Courier IT
│   ├── prisma.ts             # Cliente Prisma
│   └── utils.ts              # Utilidades
└── types/
    └── next-auth.d.ts        # Tipos de NextAuth
```

## 🔄 Flujo de trabajo

1. **Sincronizar órdenes** desde Carton Cloud
2. **Revisar datos** - verificar dirección, peso, dimensiones
3. **Obtener cotizaciones** de Fastway y NZ Post
4. **Seleccionar proveedor** con mejor precio/servicio
5. **Generar envío** y descargar etiqueta PDF
6. **Tracking** - seguimiento del envío

## 📊 Estados de órdenes

| Estado | Descripción |
|--------|-------------|
| `PENDING_DATA` | Faltan datos requeridos |
| `READY_TO_QUOTE` | Lista para cotizar |
| `QUOTED` | Cotizada, esperando envío |
| `LABEL_CREATED` | Etiqueta generada |
| `ERROR` | Error en algún proceso |

## 🔧 Scripts disponibles

```bash
npm run dev       # Servidor de desarrollo
npm run build     # Build de producción
npm run start     # Iniciar en producción
npm run lint      # Linter
npx prisma studio # GUI de base de datos
```

## 🛡️ Seguridad

- Credenciales API solo en backend (variables de entorno)
- Autenticación con JWT mediante NextAuth.js
- Rutas protegidas por middleware
- Validación de datos con Zod

## 📝 Próximas mejoras

- [ ] Webhooks de Carton Cloud
- [ ] Escritura de tracking en Carton Cloud
- [ ] Multi-tenant
- [ ] Dashboard de métricas
- [ ] Auditoría avanzada

## 📄 Licencia

Privado - NZ Warehouse Ltd.
