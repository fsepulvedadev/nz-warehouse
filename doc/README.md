# Documentación del Proyecto NZ Warehouse

## Índice

1. [**Arquitectura**](./01-arquitectura.md)
   - Visión general del sistema
   - Stack tecnológico
   - Estructura de carpetas
   - Flujo de datos
   - Patrones de diseño

2. [**Base de Datos**](./02-base-de-datos.md)
   - Diagrama ER
   - Modelos Prisma
   - Comandos útiles
   - Migraciones
   - Seed de datos

3. [**API Routes**](./03-api-routes.md)
   - Endpoints de autenticación
   - Endpoints de Carton Cloud
   - Endpoints de Courier IT
   - Endpoints de Shipments
   - Códigos de error

4. [**Integraciones**](./04-integraciones.md)
   - Carton Cloud API
   - Courier IT API
   - Manejo de errores
   - Limitaciones

5. [**Autenticación**](./05-autenticacion.md)
   - NextAuth.js v5
   - Roles y permisos
   - Middleware
   - Uso en componentes
   - Seguridad

6. [**Componentes UI**](./06-componentes-ui.md)
   - shadcn/ui
   - Componentes personalizados
   - Patrones de UI
   - Iconos y estilos

7. [**Guía de Desarrollo**](./07-guia-desarrollo.md)
   - Instalación
   - Scripts NPM
   - Flujo de trabajo Git
   - Desarrollo de API y páginas
   - Debugging
   - Producción

8. [**Flujos de Negocio**](./08-flujos-negocio.md)
   - Diagrama general
   - Estados de orden
   - Flujo de cotización
   - Flujo de envío
   - Reglas de negocio

---

## Quick Start

```bash
# Instalar
npm install

# Configurar
cp env.example .env
# Editar .env

# Base de datos
npx prisma generate
npx prisma db push
npx prisma db seed

# Desarrollo
npm run dev
```

## Credenciales de Prueba

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@nzwarehouse.co.nz | admin123 |
| Operator | operator@nzwarehouse.co.nz | operator123 |

## Links Útiles

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [NextAuth.js](https://authjs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)

---

*Última actualización: Enero 2026*
