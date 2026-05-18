# ADR 0002: Postgres portable + Auth.js

- **Estado**: Aceptado
- **Fecha**: 2026-05-17

## Contexto

El RMS ya modela su dominio sobre tablas `rms_*` y contratos de datos estables. Se prioriza portabilidad y reducción de lock-in, manteniendo rollback rápido en etapa MVP.

## Decisión

1. El proveedor de datos principal evoluciona a **Postgres portable** (`DATA_PROVIDER=postgres`) con fallback controlado a `mock` o `supabase`.
2. La autenticación evoluciona a **Auth.js** (`AUTH_PROVIDER=authjs`) con proveedor de credenciales y role mapping a nivel de aplicación.
3. Se mantiene compatibilidad temporal:
   - `DATA_PROVIDER=supabase` y `AUTH_PROVIDER=supabase`.
   - `USE_SUPABASE_DATA=true` como compatibilidad retro si `DATA_PROVIDER` no está definido.

## Consecuencias

- Se agrega migración portable independiente de `auth.users` (archivo `db/migrations/001_portable_postgres_schema.sql`).
- La capa de acceso de datos se desacopla mediante `AppDataProvider` y `getServerDataProvider`.
- El middleware y la sesión quedan en modo dual (Supabase/Auth.js) para cutover gradual y rollback en minutos por variables de entorno.
