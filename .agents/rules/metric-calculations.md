# Metric calculations

## Objetivo

Centraliza y protege la lógica de cálculos derivados y resúmenes históricos para que no se duplique en componentes ni se confunda la semántica de valores ausentes.

## Justificación

El repositorio ya separa la recalculación de métricas de la UI. Las transformaciones derivadas y los resúmenes se resuelven en `lib/metrics` y `lib/dashboard/data.ts`:

- `calculateBodyFatMass` calcula grasa corporal a partir de peso y porcentaje.
- `calculateWaistToHipRatio` devuelve `null` si falta un dato o si el valor es inválido.
- `summarizeMetricHistory` calcula `current`, `first`, `previous` y diferencias usando sólo valores observados.

Si un agente replica estos cálculos en un componente o en un servidor action, se corre el riesgo de que la numeración diverja entre pantalla, historial y dashboard.

## Reglas

- La fuente canónica de los cálculos derivados es `lib/metrics/calculations.ts` y `lib/metrics/index.ts`.
- No se deben duplicar fórmulas de métricas en componentes de React.
- Los valores ausentes deben mantenerse `null`; el código no los convierte en cero antes de calcular.
- Las series de historial deben ordenar por `measured_at` y luego `id`, siguiendo el patrón real del proyecto.
- El cambio desde el primer valor y desde el valor anterior debe calcularse con diferencia absoluta de puntos porcentuales cuando el campo lo requiere.
- Cuando un valor es `null`, el cambio asociado también debe ser `null` salvo que la lógica del cálculo lo permita explícitamente.
- Antes de cambiar una métrica derivada, revisar el resumen del dashboard y los tests de métricas.

## Ejemplo correcto

La centralización real del repositorio aparece en `lib/metrics/calculations.ts`.

```ts
export function calculateBodyFatMass(
  weightKg: MetricValue,
  bodyFatPct: MetricValue,
): MetricValue {
  if (weightKg === null || bodyFatPct === null) {
    return null;
  }

  return weightKg * bodyFatPct / 100;
}
```

Esto evita que la UI de dashboard y la lógica de resumen operen con definiciones diferentes.

Basado en:
- `lib/metrics/calculations.ts`
- `lib/dashboard/data.ts`
- `tests/metrics.test.ts`

## Ejemplo incorrecto

Un agente podría crear en un componente algo como:

```ts
const change = ((current ?? 0) - (first ?? 0));
```

Eso convierte el dato ausente en `0`, rompe la semántica del `null` y produce cambios incorrectos en dashboard y tendencias.

## Referencias

- `lib/metrics/calculations.ts`
- `lib/metrics/types.ts`
- `lib/dashboard/data.ts`
- `lib/measurements/trends.ts`
- `tests/metrics.test.ts`
- `tests/measurement-trends.test.ts`
