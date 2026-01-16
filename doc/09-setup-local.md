# Setup Local - Paso a Paso

## Requisitos Previos

- Node.js 20.19+ o 22.12+
- npm 10+
- PostgreSQL (local o cloud)

## Paso 1: Variables de Entorno

Editar el archivo `.env` en la raíz del proyecto:

```env
# ============================================
# OBLIGATORIAS (el proyecto no funciona sin estas)
# ============================================

# Base de datos PostgreSQL
# Opción 1: Local
DATABASE_URL="postgresql://postgres:password@localhost:5432/nz_warehouse"

# Opción 2: Neon (gratis) - ejemplo:
# DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/nzwarehouse?sslmode=require"

# Opción 3: Supabase (gratis) - ejemplo:
# DATABASE_URL="postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres"

# Secreto para autenticación (generar uno nuevo con: openssl rand -base64 32)
AUTH_SECRET="mi-secreto-super-seguro-cambiar-en-produccion"

# URL de la aplicación
AUTH_URL="http://localhost:3000"

# ============================================
# OPCIONALES (para testing sin APIs reales)
# ============================================

# Carton Cloud (dejar vacías para usar datos de prueba)
CARTON_BASE_URL=""
CARTON_CLIENT_ID=""
CARTON_CLIENT_SECRET=""
CARTON_TENANT_UUID=""
CARTON_CUSTOMER_UUID=""
CARTON_WAREHOUSE_UUID=""

# Courier IT (dejar vacías para usar datos de prueba)
COURIERIT_BASE_URL=""
COURIERIT_USERNAME=""
COURIERIT_PASSWORD=""

# Configuración de envíos
DEFAULT_SIGNATURE_REQUIRED="false"
DEFAULT_SERVICE_TYPE="Parcel"
```

## Paso 2: Crear Base de Datos

### Si usas PostgreSQL Local:

```bash
# Conectar a PostgreSQL
psql -U postgres

# Crear la base de datos
CREATE DATABASE nz_warehouse;

# Salir
\q
```

### Si usas Neon.tech (recomendado):

1. Ir a https://neon.tech
2. Crear cuenta gratis
3. Crear nuevo proyecto
4. Copiar "Connection string" al `.env`

### Si usas Supabase:

1. Ir a https://supabase.com
2. Crear cuenta gratis
3. Crear nuevo proyecto
4. Settings → Database → Connection string
5. Copiar al `.env`

## Paso 3: Inicializar Base de Datos

```bash
# Generar cliente Prisma
npx prisma generate

# Crear tablas en la BD
npx prisma db push

# Cargar usuarios y órdenes de prueba
npx prisma db seed
```

## Paso 4: Iniciar Servidor

```bash
npm run dev
```

Abrir http://localhost:3000

## Paso 5: Login

Usar las credenciales creadas por el seed:

| Email | Password | Rol |
|-------|----------|-----|
| admin@nzwarehouse.co.nz | admin123 | Admin |
| operator@nzwarehouse.co.nz | operator123 | Operator |

---

## Solución de Problemas

### Error: "Invalid `prisma.xxx` invocation"
```bash
npx prisma generate
```

### Error: "P1001: Can't reach database server"
- Verificar que PostgreSQL está corriendo
- Verificar DATABASE_URL en .env
- Si usas Neon/Supabase, verificar que la IP está permitida

### Error: "AUTH_SECRET must be set"
Agregar al `.env`:
```
AUTH_SECRET="cualquier-string-seguro-de-32-caracteres"
```

### Página en blanco después de login
Borrar cookies y reintentar:
- DevTools → Application → Cookies → Clear all

### Los estilos no cargan
```bash
npm run dev
# Si persiste:
rm -rf .next
npm run dev
```

---

## Modo de Prueba (Sin APIs Reales)

El proyecto puede funcionar sin credenciales de Carton Cloud y Courier IT usando los datos de prueba del seed.

Las órdenes de ejemplo creadas son:
- ORD-001: John Smith, Auckland (READY_TO_QUOTE)
- ORD-002: Sarah Johnson, Wellington (READY_TO_QUOTE)
- ORD-003: Mike Wilson, Waikato Rural (PENDING_DATA)

Para probar el flujo completo necesitarás credenciales reales de las APIs.
