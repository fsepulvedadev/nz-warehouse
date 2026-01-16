# Guía de Desarrollo

## Requisitos del Sistema

- **Node.js**: 20.19+ o 22.12+
- **npm**: 10+
- **PostgreSQL**: 14+
- **Git**

## Instalación

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd nz-warehouse

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp env.example .env
# Editar .env con tus valores

# 4. Configurar base de datos
npx prisma generate
npx prisma db push

# 5. Cargar datos de prueba (opcional)
npx prisma db seed

# 6. Iniciar servidor de desarrollo
npm run dev
```

## Scripts NPM

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (http://localhost:3000) |
| `npm run build` | Build de producción |
| `npm run start` | Iniciar en modo producción |
| `npm run lint` | Ejecutar ESLint |
| `npx prisma studio` | GUI de base de datos |
| `npx prisma db seed` | Cargar datos de prueba |
| `npx prisma generate` | Regenerar cliente Prisma |
| `npx prisma db push` | Sincronizar schema con BD |

## Estructura de Archivos

```
.
├── doc/                    # Documentación
├── prisma/
│   ├── schema.prisma       # Modelos de BD
│   └── seed.ts             # Datos de prueba
├── public/                 # Assets estáticos
├── src/
│   ├── app/                # Páginas y API routes
│   ├── components/         # Componentes React
│   ├── lib/                # Librerías y utilidades
│   ├── middleware.ts       # Middleware global
│   └── types/              # Definiciones TypeScript
├── env.example             # Template de variables
├── package.json
└── tsconfig.json
```

## Flujo de Trabajo Git

```bash
# Crear rama de feature
git checkout -b feature/nombre-feature

# Commits frecuentes
git add .
git commit -m "feat: descripción del cambio"

# Push y PR
git push origin feature/nombre-feature
# Crear Pull Request en GitHub
```

### Convención de Commits

```
feat: nueva funcionalidad
fix: corrección de bug
docs: documentación
style: formato (sin cambios de código)
refactor: refactorización
test: tests
chore: tareas de mantenimiento
```

## Desarrollo de API Routes

### Estructura básica

```typescript
// src/app/api/ejemplo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";

// Schema de validación
const RequestSchema = z.object({
  campo: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticación
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Validar body
    const body = await request.json();
    const data = RequestSchema.parse(body);

    // 3. Lógica de negocio
    const result = await doSomething(data);

    // 4. Responder
    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

## Desarrollo de Páginas

### Estructura básica

```typescript
// src/app/(dashboard)/ejemplo/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function EjemploPage() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/ejemplo");
      if (!response.ok) throw new Error("Failed to fetch");
      const json = await response.json();
      setData(json.data);
    } catch (error) {
      toast.error("Error loading data");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <Skeleton />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ejemplo</h1>
      {/* Contenido */}
    </div>
  );
}
```

## Testing Manual

### Endpoints de prueba

```bash
# Login
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nzwarehouse.co.nz","password":"admin123"}'

# Listar órdenes (requiere sesión)
curl http://localhost:3000/api/carton/orders \
  -H "Cookie: next-auth.session-token=..."
```

### Prisma Studio

```bash
npx prisma studio
# Abre http://localhost:5555
```

## Debugging

### Logs del servidor
```typescript
console.log("[API] Processing request:", data);
console.error("[API] Error:", error);
```

### Variables de entorno
```typescript
console.log("DATABASE_URL defined:", !!process.env.DATABASE_URL);
```

### Network tab
Revisar requests en DevTools > Network

## Producción

### Build
```bash
npm run build
```

### Variables requeridas
```env
DATABASE_URL=postgresql://...
AUTH_SECRET=...
CARTON_*=...
COURIERIT_*=...
```

### Despliegue en Vercel
```bash
vercel deploy --prod
```

### Migraciones de BD
```bash
npx prisma migrate deploy
```

## Problemas Comunes

### Error: "PrismaClient is not generated"
```bash
npx prisma generate
```

### Error: "Cannot find module '@prisma/client'"
```bash
rm -rf node_modules
npm install
npx prisma generate
```

### Error: "AUTH_SECRET must be defined"
Asegúrate de que `.env` tiene `AUTH_SECRET` definido.

### Error de CORS en APIs externas
Las llamadas a Carton Cloud y Courier IT solo funcionan desde el servidor (API routes), no desde el cliente.
