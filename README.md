# Requirements Management System

Aplicación interna para gestionar requerimientos, horas y presupuesto. Soporta **datos en memoria (mock)**, **Supabase** o **Postgres portable** según variables de entorno, con auth configurable (**Supabase Auth** o **Auth.js**), middleware de sesión y **RBAC** por rol de aplicación.

## Instalación

```bash
npm install
```

Copia `.env.example` a `.env.local` y ajusta valores (ver sección Variables de entorno).

## Ejecutar en desarrollo

```bash
npm run dev           # Turbopack (recomendado en Next 16; evita ENOENT de manifiestos en .next/dev)
npm run dev:clean     # borra .next y arranca de cero
npm run dev:webpack   # solo si necesitas el bundler webpack explícito
npm run dev:turbo     # alias explícito de Turbopack
```

Si ves **`ENOENT ... routes-manifest.json`**, **`fallback-build-manifest.json`** o **`GET /sw.js 500`**: para el servidor, ejecuta `npm run dev:clean`. Suele ocurrir con **`.next` a medias** o mezclando caché tras usar `next dev --webpack`. El archivo `public/sw.js` evita errores por service workers viejos en el mismo puerto.

## Rutas principales

| Ruta | Descripción |
|------|-------------|
| `/login`, `/logout`, `/auth/callback` | Flujo de autenticación (Supabase o Auth.js según `AUTH_PROVIDER`) |
| `/api/auth/*` | Endpoints internos de Auth.js (cuando `AUTH_PROVIDER=authjs`) |
| `/dashboard` | KPIs y gráficos; filtros GET `projectId` y `clientId` |
| `/requirements` | Tabla CRUD (acciones según rol); filtro GET opcional `projectId` |
| `/requirements/[id]` | Detalle, comentarios e historial de estado |
| `/requirements/kanban` | Tablero por columnas de estado |
| `/time-entries`, `/time-entries/new` | Listado e imputación; filtros GET `clientId` y `projectId` |
| `/reports` | Reporte de horas y costo estimado; filtros GET `clientId`, `projectId`, `from`, `to` |
| `/budgets` | Presupuesto y asignaciones; filtro GET `projectId` |
| `/team` | Directorio por persona; filtro GET `projectId` |
| `/notifications` | Avisos in-app; contador en barra lateral (permiso `notifications.read`) |
| `/account` | Resumen de sesión (nombre, rol, correo) |
| `/settings/*` | Configuración; errores de servidor como `?settingsError=…` |
| `/settings/exchange-rates` | Valores de referencia 1 UF y 1 USD en CLP (tabla `rms_financial_settings` en Supabase) |
| `/api/export/requirements` | CSV de requerimientos; query opcional `projectId` (`exports.run`) |
| `/api/export/team` | CSV del directorio; query opcional `projectId` (`exports.run`) |
| `/api/export/time-entries` | CSV de imputaciones; queries opcionales `clientId`, `projectId` (`exports.run`) |
| `/api/export/budgets` | CSV de asignaciones de presupuesto; query opcional `projectId` (`exports.run`) |
| `/api/health`, `/api/session` | Salud y JSON de sesión (diagnóstico) |

## Scripts de calidad

```bash
npm run lint        # ESLint (flat config + eslint-config-next)
npm run typecheck   # TypeScript sin emitir
npm run test        # Vitest (unit)
npm run test:e2e    # Playwright (levanta dev con NEXT_PUBLIC_AUTH_ENABLED=false)
npm run build       # Build producción Next.js
```

La primera vez en un equipo local, instala el navegador de Playwright: `npx playwright install chromium`.

## Autenticación y roles

- `AUTH_PROVIDER=supabase`: usa Supabase Auth con middleware y callback `/auth/callback`.
- `AUTH_PROVIDER=authjs`: usa Auth.js (provider de credenciales) y endpoints `/api/auth/*`.
- `NEXT_PUBLIC_AUTH_ENABLED=false` desactiva redirección obligatoria a login (útil para E2E/demos).
- El rol efectivo en servidor se normaliza a: `Admin`, `Project Manager`, `Contributor`, `Viewer`.
- La matriz **rol → permisos** está en `src/lib/auth/permissions.ts` y se aplica en Server Actions y páginas servidor con `requirePermission` (`src/lib/auth/rsc-guard.ts`).
- En modo local sin proveedor real, se puede seguir usando rol ficticio con `DEV_APP_ROLE`.

## Datos: mock / Supabase / Postgres

- **Acceso desde servidor**: importar `@/data/repositories/server-db` (marcado `server-only`). No importarlo desde componentes cliente.
- `DATA_PROVIDER=mock` (default): usa adaptadores en memoria (`src/data/adapters/mock`).
- `DATA_PROVIDER=supabase`: usa adaptador Supabase (`src/data/adapters/supabase`), requiere variables Supabase y migraciones de `supabase/migrations`.
- `DATA_PROVIDER=postgres`: usa adaptador portable (`src/data/adapters/postgres`) con `POSTGRES_URL` y migraciones en `db/migrations`.
- Compatibilidad retro: si `DATA_PROVIDER` no está definido, `USE_SUPABASE_DATA=true` fuerza `supabase`.
- El archivo `src/data/repositories/index.ts` es solo referencia; la fachada real es `server-db.ts`.

## Auditoría e historial

- **Auditoría**: `recordAuditSafely` escribe en memoria o en `rms_audit_logs` en altas/bajas/modificaciones de requerimientos vía `src/app/requirements/data-actions.ts`.
- **Historial de estado**: al cambiar `status` en un requerimiento, se inserta fila en `rms_requirement_status_history` (Supabase) o en el almacén mutable del mock.

## Stack relevante

- **Next.js** (App Router) + **React** + **TypeScript**.
- **Tailwind CSS**, **TanStack Table**, formularios **React Hook Form** + **Zod**.
- Gráficos del dashboard con **ECharts** (`echarts-for-react`).
- Toasts globales con **Sonner**.
- **Vitest** y **Playwright** para pruebas.

## Observabilidad

- Eventos de mutación de requerimientos emiten líneas JSON vía `logServerActionEvent` (`src/lib/logging/server-action-log.ts`) sin datos personales en el mensaje.

## CI

Workflow GitHub Actions en `.github/workflows/ci.yml`: `npm ci` → lint → typecheck → test → build.

## Runbooks técnicos

- Checklist de validación dual (`DATA_PROVIDER` / `AUTH_PROVIDER`): `docs/runbooks/dual-provider-smoke-checklist.md`.

## Variables de entorno

Resumen (detalle en `.env.example`):

| Variable | Uso |
|----------|-----|
| `DATA_PROVIDER` | `mock`, `supabase` o `postgres` |
| `AUTH_PROVIDER` | `supabase` o `authjs` |
| `AUTH_SECRET` | secreto para tokens de Auth.js |
| `POSTGRES_URL` | cadena de conexión Postgres (Neon/RDS/etc.) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | variables Supabase (si `supabase`) |
| `USE_SUPABASE_DATA` | compatibilidad retro si no se usa `DATA_PROVIDER` |
| `NEXT_PUBLIC_AUTH_ENABLED` | `false` para desactivar middleware de login |
| `DEV_APP_ROLE` | Rol simulado en modo local / sin middleware de auth |

## Próximos pasos de producto

- **RLS por membresía de equipo**: hoy las políticas `rms_*_all` permiten a cualquier usuario autenticado leer/escribir el mismo espacio de datos. Un paso evolutivo es introducir tabla de membresía por proyecto (p. ej. `rms_project_members`) y políticas que restrinjan filas por `project_id` y usuario del directorio enlazado a `auth.users`.
- **Proyectos en base de datos**: `getProjects()` sigue sirviendo datos mock; alinear con tabla `rms_projects` (o similar) cuando el negocio defina el modelo.
- **Notificaciones**: políticas más estrictas (solo lectura/escritura del destinatario) si se expone Supabase al cliente además del adaptador servidor.

### Backlog UX (priorizado)

- **Consistencia transversal**: unificar patrones de filtros, estados vacíos/carga y exportación para que todas las vistas se comporten igual.
- **Feedback del sistema**: reforzar estados de carga/guardado/error y confirmaciones persistentes en flujos clave (no solo toasts efímeros).
- **Paridad de vistas**: mantener equivalencia entre tabla y kanban en filtros, navegación entre vistas y expectativas de interacción.
- **Accesibilidad e interacción**: mejorar navegación por teclado, foco en overlays/menús y claridad de estados activos.
- **Flujo guiado**: incorporar recomendaciones de siguiente acción por contexto (después de crear/cerrar/actualizar).

#### Sprint UX 1 (impacto inmediato)

- Estandarizar estados de carga/guardado/error en todos los módulos.
- Mejorar empty states con CTA contextual.
- Persistencia de filtros y proyecto activo por usuario.
- Ajustes de copy y consistencia visual fina.

#### Sprint UX 2 (nivel PM-tool)

- Acciones rápidas globales + shortcuts.
- Timeline por requerimiento y notificaciones accionables.
- Mejoras de accesibilidad de teclado.
- Optimización móvil de kanban/tablas.
