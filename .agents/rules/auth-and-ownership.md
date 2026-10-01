# Auth and ownership

## Objetivo

Garantiza que el acceso a la aplicación, los perfiles, ubicaciones y mediciones se resuelva con autenticación real, autorización por servidor y ownership por usuario.

## Justificación

Este repositorio no basa la seguridad en la UI. La autorización y el aislamiento de datos dependen principalmente de Supabase Auth, Supabase SSR y políticas RLS. Esto está implementado en varias capas del proyecto:

- `requireAuthenticatedUser()` fuerza autenticación antes de acceder a acciones o páginas protegidas.
- `lib/supabase/proxy.ts` redirige a `/sign-in` si la sesión no existe.
- `supabase/migrations/003_auth_ownership_policies.sql` restringe `profiles`, `locations` y `measurements` por `user_id`.

Si esta regla se rompe, un agente puede permitir lectura o modificación cruzada entre usuarios, incluso si el formulario o la página parece correcto.

## Reglas

- La autenticación debe verificarse del lado del servidor; la validación de UI no sustituye a la autorización real.
- Cualquier query o mutation que dependa del usuario autenticado debe usar el cliente de servidor (`lib/supabase/server.ts`) o un cliente autenticado de Supabase.
- No se debe confiar en `user_id` enviado por el navegador; el ownership debe resolverse desde la sesión autenticada y las policies de base de datos.
- `profiles`, `locations` y `measurements` deben ser accesibles sólo dentro del `user_id` del usuario autenticado.
- Antes de tocar auth, perfiles, ubicaciones o queries protegidas, revisa `lib/auth/server.ts`, `lib/supabase/proxy.ts` y la migración de ownership.
- Los redirects internos deben filtrarse con `safeInternalRedirect`; no se aceptan rutas absolutas o externas.
- Las callbacks de invitación y setup de contraseña deben comprobar el `next` interno antes de redirigir.
- Si un cambio afecta perfiles, ubicaciones o mediciones, debe revisarse también la tabla `user_id` y las policy RLS.

## Ejemplo correcto

La autenticación del servidor exige sesión antes de continuar y las políticas de SQL validan el owner. Este patrón aparece en `lib/auth/server.ts` y `supabase/migrations/003_auth_ownership_policies.sql`.

```ts
export async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) redirect("/sign-in");

  return { supabase, user };
}
```

Y en SQL:

```sql
create policy profiles_select_own
  on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));
```

Basado en:
- `lib/auth/server.ts`
- `lib/supabase/proxy.ts`
- `supabase/migrations/003_auth_ownership_policies.sql`
- `tests/auth-rls.integration.test.ts`

## Ejemplo incorrecto

Un agente podría escribir un query del navegador como:

```ts
await supabase.from("profiles").select("*").eq("id", profileId)
```

sin revisar la sesión ni las políticas, y asumir que `profileId` ya está validado por la UI. Eso ignora el ownership real del usuario y puede devolver o mutar datos ajenos.

## Referencias

- `lib/auth/server.ts`
- `lib/auth/redirect.ts`
- `lib/auth/callback.ts`
- `lib/supabase/server.ts`
- `lib/supabase/browser.ts`
- `lib/supabase/proxy.ts`
- `supabase/migrations/002_rls_lockdown.sql`
- `supabase/migrations/003_auth_ownership_policies.sql`
- `tests/auth-rls.integration.test.ts`
