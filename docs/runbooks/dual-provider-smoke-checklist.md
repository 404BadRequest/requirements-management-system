# Dual Provider Smoke Checklist

Validar después de cambios en capa de datos o autenticación:

## Build/Typecheck por combinación

- [x] `AUTH_PROVIDER=authjs DATA_PROVIDER=mock npm run build`
- [x] `AUTH_PROVIDER=authjs DATA_PROVIDER=postgres npm run build`
- [x] `AUTH_PROVIDER=supabase DATA_PROVIDER=supabase npm run typecheck`

## Flujo funcional manual (recomendado en entorno local)

- [ ] Login correcto con `AUTH_PROVIDER=authjs` (credenciales válidas)
- [ ] Login rechazado con credenciales inválidas
- [ ] Logout limpia sesión y redirige a `/login`
- [ ] Acceso a ruta protegida redirige a login sin sesión
- [ ] CRUD de requerimientos funciona con `DATA_PROVIDER=postgres`
- [ ] CRUD de tiempo/presupuesto funciona con `DATA_PROVIDER=postgres`
- [ ] Notificaciones y contador unread funcionan con `DATA_PROVIDER=postgres`
- [ ] Exportes CSV (`/api/export/*`) responden sin errores
- [ ] `AUTH_PROVIDER=supabase` mantiene comportamiento legacy
