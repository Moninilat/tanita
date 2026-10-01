# Measurement domain

## Objetivo

Protege la semántica de las mediciones del repositorio: qué datos son opcionales, qué campos son obligatorios, cómo se manejan fechas y horas, y cómo se representan los valores ausentes.

## Justificación

Este repositorio trata cada medición como una entrada de seguimiento corporal con valores parciales y no todos los campos son obligatorios. La lógica real ya define esto en varios puntos del proyecto:

- `null` representa ausencia de dato; no debe convertirse en `0`.
- Un formulario sólo es válido si incluye al menos un valor corporal; no basta con rellenar metadatos.
- Una date/time validada se combina antes de insertarse en Supabase.
- La base de datos y la validación de servidor restringen rangos físicos y porcentuales.

Si se rompe esta regla, un agente puede introducir mediciones semánticamente falsas, por ejemplo valores ausentes interpretados como cero, fechas inválidas o datos parciales que rompen la representación histórica.

## Reglas

- `null != 0` en este proyecto. Cuando un campo está vacío en el formulario, conserva su semántica de ausencia y no se reemplaza por cero.
- Un formulario de medición debe exigir al menos `profile_id`, `location_id`, `measurement_date` y al menos un valor corporal.
- Cualquier campo numérico opcional debe aceptarse como `null` cuando esté vacío.
- Los campos físicos positivos deben ser mayores que cero cuando estén presentes.
- Los porcentajes deben estar entre 0 y 100; el visceral fat debe estar entre 1 y 59.
- Las fechas deben validarse como `YYYY-MM-DD` y las horas como `HH:MM` cuando se proporcionen.
- Las mediciones parciales están permitidas; un registro puede tener sólo peso, o sólo grasa corporal, sin necesidad de completar todo el formulario.
- La edición y creación usan el mismo flujo de validación; no se debe introducir un comportamiento distinto sólo en la UI.
- Si se cambia la semántica del dato, también debe actualizarse la lógica de resumen y tests relacionados.

## Ejemplo correcto

El formulario de mediciones parsea valores vacíos como `null` y sólo valida rangos cuando hay un número real. Este patrón aparece en `lib/measurements/validation.ts`.

```ts
if (value === "") {
  return null;
}

const number = Number(value);
if (!Number.isFinite(number)) {
  errors.push(`${field} must be a valid number.`);
  return null;
}
```

Esto refleja la regla real del repositorio: ausencia de valor significa `null`, no cero.

Basado en:
- `lib/measurements/validation.ts`
- `tests/measurement-validation.test.ts`

## Ejemplo incorrecto

Un agente podría escribir una conversión como esta:

```ts
const value = Number(formData.get(field) ?? 0);
```

Eso transforma una ausencia en `0`, lo que rompe la semántica del dominio y provoca cálculos e históricos incorrectos.

## Referencias

- `lib/measurements/validation.ts`
- `supabase/migrations/001_initial_schema.sql`
- `tests/measurement-validation.test.ts`
- `tests/measurement-edit-delete.test.tsx`
