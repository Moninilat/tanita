# Historical import

## Objetivo

Documenta el flujo real de importación histórica desde CSV/XLSX: parseo, validación, preview, mapeo, deduplicación y commit. Protege la integridad de los datos importados y la seguridad del entorno de importación.

## Justificación

Este repositorio incluye una funcionalidad de importación histórica compleja basada en `Papa Parse` y `ExcelJS`, con validación del mapeo y comprobación de duplicados antes de insertar. El flujo está dividido en varias fases y cada fase tiene sus propias reglas:

- parsear el archivo;
- validar cabeceras y columnas;
- verificar y clasificar filas;
- permitir override explícito en duplicados;
- insertar sólo filas seleccionadas y validadas.

Si un agente simplifica el proceso y elimina comprobaciones intermedias, puede importar filas inválidas o duplicadas sin que el preview lo impida.

## Reglas

- La importación se debe entender como un flujo de 5 fases: `parse`, `validate`, `preview`, `commit`, `retry`.
- Las cabeceras deben validarse contra el archivo y el mapeo de columnas antes de cualquier preview de datos.
- El parser debe soportar CSV UTF-8 y hojas visibles de XLSX; no debe asumir que todas las planillas tienen la misma estructura.
- El mapeo debe verificarse con `validateImportMapping` antes de aceptar la importación.
- Las filas inválidas nunca deben insertarse; deben mostrarse como errores de validación.
- Los duplicados deben clasificarse antes del commit, con comprobación de `profile_id` y rango de fechas.
- Un override de duplicados sólo debe permitirse si el usuario lo confirma explícitamente.
- El bulk insert debe usar `entry_method: "import"` y no alterar el `profile_id` ni la `location_id` fuera del perfil objetivo.
- Si la comprobación de duplicados falla, el sistema debe abortar el commit de forma segura.
- Cuando falla un insert masivo, el preview debe seguir disponible y el agente debe reconocer que el error es reintentable.

## Ejemplo correcto

La fase de preview valida columnas y leerá el archivo, luego compara con mediciones ya existentes. Esto aparece en `lib/measurements/import/actions.ts`.

```ts
const requestResult = await readImportRequest(formData);
if (!requestResult.ok) return requestResult;

const errors = requestErrors(request);
if (errors.length > 0) {
  return { ok: false, message: "Fix the file headers or column mapping before previewing." };
}

const existing = await findExistingMeasurements(
  request.profileId,
  validRows.map((row) => row.payload!.measured_at),
);
```

Esto refleja la separación real entre validación, detección de duplicados y commit.

Basado en:
- `lib/measurements/import/actions.ts`
- `lib/measurements/import/parser.ts`
- `lib/measurements/import/validation.ts`
- `tests/measurement-import-actions.test.ts`

## Ejemplo incorrecto

Un agente podría hacer un insert directo tras leer el archivo sin pasar por preview ni deduplicación:

```ts
await supabase.from("measurements").insert(rows)
```

Eso rompe la fase de validación y puede introducir filas duplicadas o inválidas sin verificación del mapeo.

## Referencias

- `lib/measurements/import/actions.ts`
- `lib/measurements/import/parser.ts`
- `lib/measurements/import/validation.ts`
- `lib/measurements/import/mapping.ts`
- `lib/measurements/import/duplicates.ts`
- `tests/measurement-import.test.ts`
- `tests/measurement-import-actions.test.ts`
