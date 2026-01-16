# Componentes UI

## shadcn/ui

Utilizamos [shadcn/ui](https://ui.shadcn.com/) como librería de componentes base. Los componentes están en `src/components/ui/`.

### Componentes Instalados

| Componente | Uso |
|------------|-----|
| `avatar` | Foto de perfil en navbar |
| `badge` | Estados de órdenes |
| `button` | Acciones y CTAs |
| `card` | Contenedores de información |
| `command` | Búsqueda avanzada |
| `dialog` | Modales de cotización y envío |
| `dropdown-menu` | Menú de usuario |
| `form` | Formularios con validación |
| `input` | Campos de texto |
| `label` | Etiquetas de formulario |
| `popover` | Tooltips y popovers |
| `select` | Selectores |
| `separator` | Divisores |
| `sheet` | Menú móvil |
| `skeleton` | Loading states |
| `sonner` | Notificaciones toast |
| `table` | Tablas de datos |
| `tabs` | Navegación por pestañas |

### Agregar nuevos componentes

```bash
npx shadcn@latest add [component-name]
```

---

## Componentes Personalizados

### Navbar (`src/components/navbar.tsx`)

Barra de navegación superior con:
- Logo y nombre de la app
- Menú móvil (Sheet)
- Avatar y dropdown de usuario

```tsx
import { Navbar } from "@/components/navbar";

<Navbar />
```

### Sidebar (`src/components/sidebar.tsx`)

Menú de navegación lateral:
- Links a Orders y Shipments
- Estado de conexión de APIs
- Versión móvil integrada

```tsx
import { Sidebar } from "@/components/sidebar";

<Sidebar mobile={false} />  // Desktop
<Sidebar mobile={true} />   // Mobile (dentro de Sheet)
```

### Providers (`src/components/providers.tsx`)

Wrapper de contextos:
- SessionProvider de NextAuth

```tsx
import { Providers } from "@/components/providers";

<Providers>{children}</Providers>
```

---

## Patrones de UI

### Loading States

```tsx
import { Skeleton } from "@/components/ui/skeleton";

// Tabla
{isLoading ? (
  Array.from({ length: 5 }).map((_, i) => (
    <TableRow key={i}>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
    </TableRow>
  ))
) : (
  // Datos reales
)}
```

### Empty States

```tsx
<TableRow>
  <TableCell colSpan={6} className="h-32 text-center">
    <div className="flex flex-col items-center gap-2 text-slate-500">
      <Package className="h-8 w-8" />
      <p>No orders found</p>
      <p className="text-sm">Try adjusting your filters</p>
    </div>
  </TableCell>
</TableRow>
```

### Notificaciones

```tsx
import { toast } from "sonner";

// Éxito
toast.success("Shipment created!", {
  description: "Label is ready for download",
});

// Error
toast.error("Failed to create shipment", {
  description: error.message,
});

// Info
toast.info("Processing...");
```

### Badges de Estado

```tsx
const statusConfig = {
  PENDING_DATA: { label: "Pending Data", variant: "outline" },
  READY_TO_QUOTE: { label: "Ready to Quote", variant: "secondary" },
  QUOTED: { label: "Quoted", variant: "default" },
  LABEL_CREATED: { label: "Label Created", variant: "default" },
  ERROR: { label: "Error", variant: "destructive" },
};

<Badge variant={statusConfig[order.status].variant}>
  {statusConfig[order.status].label}
</Badge>
```

### Diálogos

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Título</DialogTitle>
      <DialogDescription>Descripción</DialogDescription>
    </DialogHeader>
    
    {/* Contenido */}
    
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleSubmit}>
        Confirm
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Iconos

Utilizamos [Lucide React](https://lucide.dev/):

```tsx
import {
  Package,
  Truck,
  Calculator,
  Download,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";

<Package className="h-5 w-5" />
```

---

## Estilos

### Tailwind CSS 4

Configuración en `src/app/globals.css`:

```css
@import "tailwindcss";
@plugin "tw-animate-css";

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  /* ... más variables */
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ... más variables */
}
```

### Utility: cn()

```tsx
import { cn } from "@/lib/utils";

<div className={cn(
  "base-styles",
  isActive && "active-styles",
  className
)} />
```

---

## Responsive Design

```tsx
// Mobile-first
<div className="flex flex-col sm:flex-row">
  {/* Vertical en móvil, horizontal en sm+ */}
</div>

// Grid responsive
<div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
  {/* 2 columnas en móvil, 5 en lg+ */}
</div>

// Ocultar en ciertos breakpoints
<div className="hidden lg:block">Desktop only</div>
<div className="lg:hidden">Mobile only</div>
```
