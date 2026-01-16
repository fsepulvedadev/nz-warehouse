# Sistema de Autenticación

## Tecnología

- **NextAuth.js v5** (Auth.js)
- **Estrategia**: JWT con cookies HttpOnly
- **Provider**: Credentials (email/password)
- **Adapter**: Prisma para persistencia

## Configuración

### Archivo: `src/lib/auth.ts`

```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      async authorize(credentials) {
        // Validar con Zod
        // Buscar usuario en BD
        // Comparar password con bcrypt
        // Retornar user o null
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      // Agregar role al token
    },
    session({ session, token }) {
      // Agregar id y role a session
    },
  },
});
```

## Roles

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| `ADMIN` | Administrador | Acceso total |
| `OPERATOR` | Operador | Gestión de órdenes y envíos |

## Middleware

### Archivo: `src/middleware.ts`

```typescript
import { auth } from "@/lib/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnLogin = req.nextUrl.pathname === "/login";
  const isAuthApi = req.nextUrl.pathname.startsWith("/api/auth");

  // Permitir rutas de auth
  if (isAuthApi) return NextResponse.next();

  // Redirigir a login si no autenticado
  if (!isLoggedIn && !isOnLogin) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Redirigir a orders si ya autenticado en login
  if (isLoggedIn && isOnLogin) {
    return NextResponse.redirect(new URL("/orders", req.url));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

## Uso en Componentes

### Cliente
```typescript
"use client";
import { useSession, signIn, signOut } from "next-auth/react";

function Component() {
  const { data: session, status } = useSession();
  
  if (status === "loading") return <Loading />;
  if (!session) return <button onClick={() => signIn()}>Login</button>;
  
  return (
    <div>
      <p>Hola, {session.user.name}</p>
      <p>Rol: {session.user.role}</p>
      <button onClick={() => signOut()}>Logout</button>
    </div>
  );
}
```

### Servidor
```typescript
import { auth } from "@/lib/auth";

async function ServerComponent() {
  const session = await auth();
  
  if (!session) redirect("/login");
  
  return <div>Bienvenido, {session.user.name}</div>;
}
```

### API Routes
```typescript
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Verificar rol si es necesario
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  // ... lógica
}
```

## Extensión de Tipos

### Archivo: `src/types/next-auth.d.ts`

```typescript
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}
```

## Hash de Passwords

```typescript
import bcrypt from "bcryptjs";

// Crear hash (registro)
const hashedPassword = await bcrypt.hash(password, 12);

// Verificar (login)
const isValid = await bcrypt.compare(password, user.password);
```

## Seguridad

1. **Passwords** - Hasheados con bcrypt (cost factor 12)
2. **Sesiones** - JWT firmado con AUTH_SECRET
3. **Cookies** - HttpOnly, Secure, SameSite=Lax
4. **CSRF** - Protección incorporada en NextAuth
5. **Rate Limiting** - Implementar en producción

## Variables de Entorno

```env
# Secreto para firmar JWT (generar con: openssl rand -base64 32)
AUTH_SECRET="your-secret-key"

# URL base de la aplicación
AUTH_URL="http://localhost:3000"
```

## Usuarios de Prueba

Después del seed:

| Email | Password | Rol |
|-------|----------|-----|
| admin@nzwarehouse.co.nz | admin123 | ADMIN |
| operator@nzwarehouse.co.nz | operator123 | OPERATOR |
