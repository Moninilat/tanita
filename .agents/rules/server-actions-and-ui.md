# Server actions and UI

## Objetivo

Define la separación real entre UI, server components, client components y server actions para evitar mezclar responsabilidades en un mismo módulo.

## Justificación

Este repositorio combina Next.js App Router con React 19 y Supabase. Las páginas de servidor leen datos y las acciones de servidor realizan mutaciones protegidas. Los formularios con `useActionState` se usan en componentes cliente para recibir feedback y errores.

El patrón real del repo es:

- las páginas bajo `app/` leen datos y deciden la UI del estado inicial;
- los formularios y widgets interactivos viven en `components/` y se conectan a server actions;
- la lógica de dominio y validación vive en `lib/`;
- los datos protegidos se leen con Supabase del lado servidor y no se exponen directa ni inseguramente al navegador.

Si un agente ignora esta separación, puede mezclar validación del cliente, redirecciones inseguras y acceso directo a datos protegidos.

## Reglas

- Las páginas de servidor deben usar `requireAuthenticatedUser()` antes de leer/proteger datos.
- Los cambios de escritura deben hacerse en server actions, no desde componentes cliente con llamadas directas a Supabase.
- Las validaciones complejas deben permanecer en `lib/` y no duplicarse en el cliente.
- Los componentes cliente sólo deben manejar UI y estado de formulario; deben delegar la escritura a acciones del servidor.
- Cuando un cambio afecta la UI, revisa también `lib/measurements/actions.ts`, `lib/measurements/validation.ts` o la página correspondiente.
- `useActionState` es el patrón real del proyecto para formularios con retorno de errores y mensajes de estado.
- Los redirects después de acción deben seguir la política de rutas internas y seguras.
- Nunca se debe asumir que un cambio de frontend es independiente del backend si el formulario escribe en base de datos o usa auth.

## Ejemplo correcto

El formulario de medición usa `useActionState` y delega la escritura a acciones del servidor. Esto aparece en `app/measurements/new/measurement-form.tsx` y `lib/measurements/actions.ts`.

```tsx
const [state, formAction, pending] = useActionState(
  action,
  initialMeasurementActionState,
);
```

```ts
export async function createMeasurement(
  _previousState: MeasurementActionState,
  formData: FormData,
): Promise<MeasurementActionState> {
  const { supabase } = await requireAuthenticatedUser();
  const parsed = parseMeasurementForm(formData);
  // ...
}
```

Basado en:
- `app/measurements/new/measurement-form.tsx`
- `lib/measurements/actions.ts`
- `lib/measurements/validation.ts`

## Ejemplo incorrecto

Un agente podría poner en un componente cliente directamente:

```tsx
await supabase.from("measurements").insert(payload)
```

Eso rompe la separación entre UI y servidor y omite las validaciones y permisos que aplican en el lado del servidor.

## Referencias

- `app/page.tsx`
- `app/measurements/new/page.tsx`
- `app/measurements/new/measurement-form.tsx`
- `lib/measurements/actions.ts`
- `lib/auth/server.ts`
- `lib/supabase/server.ts`
- `lib/supabase/browser.ts`
- `tests/auth-sensitive-actions.test.ts`
