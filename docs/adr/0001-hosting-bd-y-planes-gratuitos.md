# ADR 0001: Hosting de base de datos y planes gratuitos (mercado)

- **Estado**: Aceptado (documento de referencia; revisar cuotas antes de cada despliegue a producción).
- **Fecha de revisión de cuotas**: 2026-05-10 (fuentes oficiales enlazadas abajo).

## Contexto

El RMS (Requirements Management System) usa **PostgreSQL** con esquema `rms_*`, **RLS** y, en la implementación actual, **Supabase** como proveedor (Auth + API Postgres vía adaptador en servidor). Se necesita criterio explícito para elegir o mantener proveedor y una **instantánea verificable** de límites del plan gratuito antes de producción.

## Criterios de decisión

| Criterio | Peso | Notas |
|----------|------|--------|
| Compatibilidad con Postgres y migraciones SQL existentes | Alto | Evita reescritura de [rms-data-access.ts](../../src/data/adapters/supabase/rms-data-access.ts) y [supabase/migrations/](../../supabase/migrations/). |
| Auth integrada con el mismo proveedor | Medio | El flujo actual usa Supabase Auth; separar implica trabajo adicional (p. ej. Auth.js + OIDC). |
| Límites de almacenamiento y egress | Alto | Riesgo de corte o costes al superar cuotas. |
| Comportamiento ante inactividad (pausa / scale-to-zero) | Medio | Importante para demos y proyectos con poco tráfico. |
| Lock-in y portabilidad | Medio | Preferir SQL estándar y export lógico del esquema. |
| Coste de migración desde el estado actual | Alto | Cambiar a NoSQL o SQLite edge implica nuevo modelo de datos y políticas de seguridad. |

## Decisión

1. **Proveedor elegido para este repositorio**: seguir con **Supabase** en free tier para desarrollo y pilotos, por alineación directa con el código y migraciones ya presentes.
2. **Alternativa de bajo riesgo documentada**: **Neon** (Postgres serverless) si en el futuro se desacopla la base del resto de la plataforma Supabase; la autenticación debería resolverse aparte (p. ej. Supabase solo como Auth, o Auth.js).
3. **Opciones descartadas por coste de migración** (salvo requisito de producto distinto): Firestore, MongoDB Atlas como BD principal, Turso/D1 como sustituto 1:1 de Postgres+RLS actual.

## Consecuencias

- Las revisiones de **pricing** deben repetirse antes de producción o al acercarse a límites (egress, tamaño de BD, MAU).
- Si Supabase deja de ser viable en free tier, la vía menos costosa suele ser **Postgres gestionado compatible** (Neon u otro), no un cambio de paradigma de datos.

---

## Instantánea verificada: plan gratuito (fuentes oficiales)

Los valores siguientes se extrajeron de la documentación / pricing oficial en la fecha de revisión indicada arriba. **Las cuotas pueden cambiar**: confirmar siempre en las URLs.

### Supabase (plan Free)

Fuente: [Pricing](https://supabase.com/pricing), [Billing / quotas](https://supabase.com/docs/guides/platform/billing-on-supabase).

| Concepto | Valor indicado en documentación oficial |
|----------|------------------------------------------|
| Coste base | 0 USD/mes |
| Proyectos activos (free) | 2 (los pausados no cuentan para el límite de proyectos gratuitos, según doc de billing) |
| Tamaño de base de datos | 500 MB por proyecto |
| Egress | 5 GB incluidos; 5 GB cached egress |
| MAU (Auth) | 50.000 incluidos |
| Almacenamiento de archivos (Storage) | 1 GB |
| API | Ilimitadas (según pricing) |
| Pausa por inactividad | Proyectos free: pausa tras **1 semana** sin actividad (tabla “Pausing” en pricing) |
| Compute / RAM (free) | CPU compartida, **500 MB RAM** (pricing) |

### Neon (plan Free)

Fuente: [Neon plans](https://neon.com/docs/introduction/plans).

| Concepto | Valor indicado en documentación oficial |
|----------|------------------------------------------|
| Coste base | 0 USD/mes |
| Proyectos | 100 |
| Ramas (branches) por proyecto | 10 |
| Almacenamiento | 0,5 GB por proyecto (tabla: por proyecto; detalle de facturación por rama en la misma página) |
| Compute | 100 **CU-hours** por proyecto y mes |
| Scale to zero | Tras **5 minutos** de inactividad |
| Transferencia pública | 5 GB incluidos |
| Neon Auth (si se usa) | Hasta 60k MAU en Free (tabla de planes) |

### Aviso de mercado

- **PlanetScale** retiró su tier gratuito (hecho histórico de mercado); cualquier free tier puede ajustarse: no basar arquitectura solo en límites “de terceros” sin enlace oficial actualizado.

## Referencias

- Supabase Pricing: https://supabase.com/pricing  
- Supabase Billing y cuotas: https://supabase.com/docs/guides/platform/billing-on-supabase  
- Neon Plans: https://neon.com/docs/introduction/plans  

## Lista de comprobación pre-producción

- [ ] Releer pricing oficial de Supabase (o del proveedor final).
- [ ] Confirmar tamaño real de BD y proyección 6–12 meses frente a 500 MB.
- [ ] Revisar egress (export CSV, adjuntos, tráfico API) frente a 5 GB.
- [ ] Confirmar MAU esperado frente a 50k.
- [ ] Política de pausa: planificar actividad mínima o upgrade si el entorno no puede pausarse.
