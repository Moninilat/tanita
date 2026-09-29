"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  commitHistoricalImport,
  inspectImportFile,
  previewHistoricalImport,
} from "@/lib/measurements/import/actions";
import {
  suggestImportMapping,
  validateImportMapping,
} from "@/lib/measurements/import/mapping";
import { importMetricFields } from "@/lib/measurements/import/types";
import type {
  ImportDestination,
  ImportInspection,
  ImportMapping,
  ImportPreview,
  ImportResultSummary,
} from "@/lib/measurements/import/types";

type SelectorOption = { id: string; name: string };

type ImportWizardProps = {
  profiles: SelectorOption[];
  locations: SelectorOption[];
  initialProfileId: string;
};

const destinationOptions: Array<{ value: ImportDestination; label: string }> = [
  { value: "measurement_date", label: "Measurement date" },
  { value: "measurement_time", label: "Measurement time" },
  { value: "location", label: "Location name" },
  { value: "notes", label: "Notes" },
  { value: "weight_kg", label: "Weight (kg)" },
  { value: "bmr_kcal", label: "BMR (kcal/day)" },
  { value: "bone_mass_kg", label: "Bone mass (kg)" },
  { value: "visceral_fat_rating", label: "Visceral fat rating" },
  { value: "body_fat_pct", label: "Body fat (%)" },
  { value: "muscle_mass_kg", label: "Muscle mass (kg)" },
  { value: "muscle_quality_score", label: "Muscle quality score" },
  { value: "physique_rating", label: "Physique rating" },
  { value: "body_water_pct", label: "Body water (%)" },
  { value: "heart_rate_bpm", label: "Heart rate (bpm)" },
  { value: "metabolic_age", label: "Metabolic age (years)" },
  { value: "abdomen_cm", label: "Abdomen (cm)" },
  { value: "flexed_arm_cm", label: "Flexed arm (cm)" },
  { value: "arm_cm", label: "Arm (cm)" },
  { value: "waist_cm", label: "Waist (cm)" },
  { value: "hip_cm", label: "Hip (cm)" },
  { value: "thigh_cm", label: "Thigh (cm)" },
];

const destinationLabels = Object.fromEntries(
  destinationOptions.map((option) => [option.value, option.label]),
) as Record<ImportDestination, string>;

const metricLabels: Record<string, string> = {
  weight_kg: "Weight",
  bmr_kcal: "BMR",
  bone_mass_kg: "Bone mass",
  visceral_fat_rating: "Visceral fat rating",
  body_fat_pct: "Body fat",
  muscle_mass_kg: "Muscle mass",
  muscle_quality_score: "Muscle quality score",
  physique_rating: "Physique rating",
  body_water_pct: "Body water",
  heart_rate_bpm: "Heart rate",
  metabolic_age: "Metabolic age",
  abdomen_cm: "Abdomen",
  flexed_arm_cm: "Flexed arm",
  arm_cm: "Arm",
  waist_cm: "Waist",
  hip_cm: "Hip",
  thigh_cm: "Thigh",
};

function buildMapping(
  columns: Record<string, ImportDestination>,
  dateFormat: string,
  decimalFormat: string,
  timeZone: string,
  defaultLocationId: string,
  worksheet: string,
): ImportMapping {
  return {
    columns,
    dateFormat: dateFormat as ImportMapping["dateFormat"],
    decimalFormat: decimalFormat as ImportMapping["decimalFormat"],
    timeZone,
    defaultLocationId,
    worksheet,
  };
}

function addRequestSettings(
  formData: FormData,
  file: File,
  profileId: string,
  profileConfirmed: boolean,
  mapping: ImportMapping,
) {
  formData.set("file", file, file.name);
  formData.set("profile_id", profileId);
  formData.set("profile_confirmed", profileConfirmed ? "yes" : "no");
  formData.set("columns", JSON.stringify(mapping.columns));
  formData.set("date_format", mapping.dateFormat);
  formData.set("decimal_format", mapping.decimalFormat);
  formData.set("time_zone", mapping.timeZone);
  formData.set("default_location_id", mapping.defaultLocationId);
  formData.set("worksheet", mapping.worksheet);
}

function formatPreviewDate(value: string | null, timeZone: string): string {
  if (!value) return "Invalid or missing date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return value;
  }
}

function downloadHistoryHref(profileId: string): string {
  return `/measurements?profile=${encodeURIComponent(profileId)}`;
}

export default function ImportWizard({
  profiles,
  locations,
  initialProfileId,
}: ImportWizardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [profileId, setProfileId] = useState(initialProfileId);
  const [profileConfirmed, setProfileConfirmed] = useState(false);
  const [defaultLocationId, setDefaultLocationId] = useState("");
  const [inspection, setInspection] = useState<ImportInspection | null>(null);
  const [worksheet, setWorksheet] = useState("");
  const [columns, setColumns] = useState<Record<string, ImportDestination>>({});
  const [dateFormat, setDateFormat] = useState("auto");
  const [decimalFormat, setDecimalFormat] = useState("decimal-point");
  const [timeZone, setTimeZone] = useState("UTC");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
  const [result, setResult] = useState<ImportResultSummary | null>(null);
  const [feedback, setFeedback] = useState<{ type: "error" | "status"; message: string; details?: string[] } | null>(null);
  const [page, setPage] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!detectedTimeZone) return;
    const frame = window.requestAnimationFrame(() => setTimeZone(detectedTimeZone));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const currentMapping = buildMapping(
    columns,
    dateFormat,
    decimalFormat,
    timeZone,
    defaultLocationId,
    worksheet,
  );
  const mappingErrors = inspection
    ? [
        ...inspection.headerErrors,
        ...validateImportMapping(inspection.headers, currentMapping),
        ...(!Object.values(columns).includes("location") && !defaultLocationId
          ? ["Select a default location when the file has no mapped location column."]
          : []),
      ]
    : [];
  const selectedDuplicateRows = preview?.rows
    .filter((row) => row.status === "duplicate" && selectedRows.includes(row.rowNumber)) ?? [];
  const duplicateRowsNotImported = (preview?.duplicateCount ?? 0) - selectedDuplicateRows.length;
  const pageSize = 50;
  const pageCount = preview ? Math.max(1, Math.ceil(preview.rows.length / pageSize)) : 0;
  const visibleRows = preview?.rows.slice(page * pageSize, (page + 1) * pageSize) ?? [];

  function clearPreview() {
    setPreview(null);
    setSelectedRows([]);
    setDuplicateConfirmed(false);
    setResult(null);
  }

  function handleFileChange(nextFile: File | null) {
    setFile(nextFile);
    setInspection(null);
    setWorksheet("");
    setColumns({});
    clearPreview();
    setFeedback(null);
  }

  function runInspection(selectedWorksheet = worksheet) {
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file, file.name);
    formData.set("worksheet", selectedWorksheet);
    startTransition(async () => {
      const response = await inspectImportFile(formData);
      if (!response.ok) {
        setInspection(null);
        setFeedback({ type: "error", message: response.message });
        return;
      }
      setInspection(response.data);
      setWorksheet(response.data.worksheet);
      setColumns(suggestImportMapping(response.data.headers));
      clearPreview();
      setFeedback(null);
    });
  }

  function updateColumn(header: string, destination: string) {
    const next = { ...columns };
    if (!destination) delete next[header];
    else next[header] = destination as ImportDestination;
    setColumns(next);
    clearPreview();
  }

  function handlePreview() {
    if (!file || !profileId || mappingErrors.length > 0) return;
    const formData = new FormData();
    addRequestSettings(formData, file, profileId, profileConfirmed, currentMapping);
    startTransition(async () => {
      const response = await previewHistoricalImport(formData);
      if (!response.ok) {
        setPreview(null);
        setSelectedRows([]);
        setFeedback({ type: "error", message: response.message, details: response.fieldErrors });
        return;
      }
      setPreview(response.data);
      setSelectedRows(response.data.rows
        .filter((row) => row.status === "valid")
        .map((row) => row.rowNumber));
      setPage(0);
      setResult(null);
      setFeedback({ type: "status", message: "Preview ready. No measurements have been inserted." });
    });
  }

  function toggleRow(rowNumber: number, checked: boolean) {
    setSelectedRows((current) => checked
      ? [...new Set([...current, rowNumber])]
      : current.filter((selected) => selected !== rowNumber));
    setResult(null);
  }

  function handleCommit() {
    if (!file || !preview || selectedRows.length === 0) return;
    if (selectedDuplicateRows.length > 0 && !duplicateConfirmed) return;

    const confirmation = [
      `Import ${selectedRows.length} selected rows for ${profiles.find((profile) => profile.id === profileId)?.name ?? "the selected profile"}?`,
      `Skip ${preview.invalidCount} invalid rows, ${duplicateRowsNotImported} duplicate rows, and ${preview.validCount - selectedRows.filter((row) => preview.rows.find((item) => item.rowNumber === row)?.status === "valid").length} deselected valid rows.`,
      selectedDuplicateRows.length > 0 ? `This will add ${selectedDuplicateRows.length} exact duplicate rows again.` : "",
    ].filter(Boolean).join("\n");
    if (!window.confirm(confirmation)) return;

    const formData = new FormData();
    addRequestSettings(formData, file, profileId, profileConfirmed, currentMapping);
    formData.set("selected_rows", JSON.stringify(selectedRows));
    formData.set("duplicate_overrides", JSON.stringify(selectedDuplicateRows.map((row) => row.rowNumber)));
    formData.set("duplicates_confirmed", duplicateConfirmed ? "yes" : "no");

    startTransition(async () => {
      const response = await commitHistoricalImport(formData);
      if (!response.ok) {
        setFeedback({ type: "error", message: response.message, details: response.fieldErrors });
        return;
      }
      setResult(response.data);
      setFeedback({ type: "status", message: "Import finished." });
    });
  }

  const allVisibleSelected = visibleRows.length > 0 && visibleRows
    .filter((row) => row.status !== "invalid")
    .every((row) => selectedRows.includes(row.rowNumber));

  function toggleVisibleRows(checked: boolean) {
    const eligible = visibleRows.filter((row) => row.status !== "invalid").map((row) => row.rowNumber);
    setSelectedRows((current) => checked
      ? [...new Set([...current, ...eligible])]
      : current.filter((rowNumber) => !eligible.includes(rowNumber)));
  }

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="file-heading" className="border-b border-zinc-200 pb-8">
        <h2 className="text-xl font-semibold" id="file-heading">1. Choose file and target</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="font-medium">Target profile</span>
            <select
              className="rounded border border-zinc-300 bg-white px-3 py-2"
              onChange={(event) => { setProfileId(event.target.value); setProfileConfirmed(false); clearPreview(); }}
              required
              value={profileId}
            >
              <option value="">Select a profile</option>
              {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-medium">CSV or Excel file</span>
            <input
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="block w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:font-medium"
              onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
              type="file"
            />
            <span className="text-sm text-zinc-600">UTF-8 CSV or .xlsx, up to 5 MiB and 5,000 data rows.</span>
          </label>
        </div>

        {file && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="text-sm text-zinc-700">Selected: {file.name}</p>
            <button
              className="rounded bg-black px-4 py-2 font-medium text-white disabled:opacity-50"
              disabled={pending}
              onClick={() => runInspection(worksheet)}
              type="button"
            >
              {pending ? "Reading file..." : "Read file headers"}
            </button>
          </div>
        )}
      </section>

      {inspection && (
        <section aria-labelledby="mapping-heading" className="border-b border-zinc-200 pb-8">
          <h2 className="text-xl font-semibold" id="mapping-heading">2. Map source columns</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Confirm each suggested match. Unmapped columns will be ignored; profile and entry method are set by this import.
          </p>

          <label className="mt-4 flex max-w-2xl items-start gap-3 rounded border border-zinc-300 p-4">
            <input
              checked={profileConfirmed}
              onChange={(event) => { setProfileConfirmed(event.target.checked); clearPreview(); }}
              type="checkbox"
            />
            <span>
              I confirm that all imported rows belong to <strong>{profiles.find((profile) => profile.id === profileId)?.name ?? "the selected profile"}</strong>.
            </span>
          </label>

          {inspection.worksheets.length > 0 && (
            <label className="mt-4 flex max-w-sm flex-col gap-2">
              <span className="font-medium">Worksheet</span>
              <select
                className="rounded border border-zinc-300 bg-white px-3 py-2"
                onChange={(event) => setWorksheet(event.target.value)}
                value={worksheet}
              >
                {inspection.worksheets.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              <span className="text-xs text-zinc-600">Showing {inspection.worksheets.length} visible worksheets; import one worksheet at a time (maximum 20).</span>
              {worksheet !== inspection.worksheet && (
                <button
                  className="self-start rounded border border-zinc-300 px-3 py-2 text-sm font-medium"
                  disabled={pending}
                  onClick={() => runInspection(worksheet)}
                  type="button"
                >
                  Load selected worksheet
                </button>
              )}
            </label>
          )}

          {inspection.headerErrors.length > 0 ? (
            <ul className="mt-4 list-disc rounded border border-red-300 bg-red-50 p-4 pl-8 text-red-800" role="alert">
              {inspection.headerErrors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          ) : (
            <div className="mt-5 overflow-x-auto rounded border border-zinc-200">
              <table className="w-full min-w-160 border-collapse text-left text-sm">
                <caption className="sr-only">Map source file columns to measurement fields</caption>
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-3 py-2 font-medium" scope="col">Source header</th>
                    <th className="px-3 py-2 font-medium" scope="col">Sample</th>
                    <th className="px-3 py-2 font-medium" scope="col">Import as</th>
                  </tr>
                </thead>
                <tbody>
                  {inspection.headers.map((header, index) => (
                    <tr className="border-t border-zinc-200" key={`${header}-${index}`}>
                      <th className="max-w-60 truncate px-3 py-2 font-medium" scope="row">{header || `Column ${index + 1}`}</th>
                      <td className="max-w-72 truncate px-3 py-2 text-zinc-600">
                        {inspection.sampleRows.slice(0, 2).map((row) => row.values[index] || "(blank)").join(" · ")}
                      </td>
                      <td className="px-3 py-2">
                        <label className="sr-only" htmlFor={`mapping-${index}`}>Map {header || `column ${index + 1}`}</label>
                        <select
                          className="w-full min-w-52 rounded border border-zinc-300 bg-white px-2 py-1.5"
                          id={`mapping-${index}`}
                          onChange={(event) => updateColumn(header, event.target.value)}
                          value={columns[header] ?? ""}
                        >
                          <option value="">Ignore column</option>
                          {destinationOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-2">
              <span className="font-medium">Default location</span>
              <select
                className="rounded border border-zinc-300 bg-white px-3 py-2"
                onChange={(event) => { setDefaultLocationId(event.target.value); clearPreview(); }}
                value={defaultLocationId}
              >
                <option value="">No default location</option>
                {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select>
              <span className="text-xs text-zinc-600">Used when no location column is mapped or a mapped cell is blank.</span>
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-medium">Date format</span>
              <select
                className="rounded border border-zinc-300 bg-white px-3 py-2"
                onChange={(event) => { setDateFormat(event.target.value); clearPreview(); }}
                value={dateFormat}
              >
                <option value="auto">ISO / auto-detect</option>
                <option value="month-first">Month-first (MM/DD/YYYY)</option>
                <option value="day-first">Day-first (DD/MM/YYYY)</option>
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-medium">Decimal format</span>
              <select
                className="rounded border border-zinc-300 bg-white px-3 py-2"
                onChange={(event) => { setDecimalFormat(event.target.value); clearPreview(); }}
                value={decimalFormat}
              >
                <option value="decimal-point">Decimal point (54.2)</option>
                <option value="decimal-comma">Decimal comma (54,2)</option>
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-medium">Timezone for local dates</span>
              <input
                autoComplete="off"
                className="rounded border border-zinc-300 px-3 py-2"
                onChange={(event) => { setTimeZone(event.target.value); clearPreview(); }}
                value={timeZone}
              />
              <span className="text-xs text-zinc-600">Detected timezone: {timeZone || "not available"}</span>
            </label>
          </div>

          {mappingErrors.length > 0 && (
            <ul className="mt-5 list-disc rounded border border-amber-300 bg-amber-50 p-4 pl-8 text-amber-900">
              {mappingErrors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          )}

          <button
            className="mt-5 rounded bg-black px-4 py-2.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={pending || !profileId || !profileConfirmed || mappingErrors.length > 0}
            onClick={handlePreview}
            type="button"
          >
            {pending ? "Validating rows..." : "Generate preview"}
          </button>
        </section>
      )}

      {preview && (
        <section aria-labelledby="preview-heading" className="border-b border-zinc-200 pb-8">
          <h2 className="text-xl font-semibold" id="preview-heading">3. Review preview</h2>
          <p className="mt-2 text-sm text-zinc-600">
            {preview.totalRows} rows: {preview.validCount} valid, {preview.invalidCount} invalid, {preview.duplicateCount} duplicate.
            {" "}No rows have been inserted.
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            Dates without an offset are interpreted in {timeZone}; date-only rows use noon. Unmapped columns are ignored.
          </p>

          {preview.unmappedHeaders.length > 0 && (
            <p className="mt-3 rounded border border-zinc-200 bg-zinc-50 p-3 text-sm">
              Ignored columns: {preview.unmappedHeaders.join(", ")}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="font-medium" aria-live="polite">{selectedRows.length} rows selected for import</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                checked={allVisibleSelected}
                onChange={(event) => toggleVisibleRows(event.target.checked)}
                type="checkbox"
              />
              Select eligible rows on this page
            </label>
          </div>

          <div className="mt-3 overflow-x-auto rounded border border-zinc-200">
            <table className="w-full min-w-240 border-collapse text-left text-sm">
              <caption className="sr-only">Historical measurement import preview</caption>
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-3 py-2 font-medium" scope="col">Source row</th>
                  <th className="px-3 py-2 font-medium" scope="col">Measurement date</th>
                  <th className="px-3 py-2 font-medium" scope="col">Location</th>
                  <th className="px-3 py-2 font-medium" scope="col">Status</th>
                  <th className="px-3 py-2 font-medium" scope="col">Values and row details</th>
                  <th className="px-3 py-2 font-medium" scope="col">Import</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  const canSelect = row.status !== "invalid";
                  const statusLabel = row.status === "valid" ? "Valid" : row.status === "duplicate" ? "Duplicate" : "Invalid";
                  return (
                    <tr className="border-t border-zinc-200 align-top" key={row.rowNumber}>
                      <th className="whitespace-nowrap px-3 py-3 font-medium" scope="row">{row.rowNumber}</th>
                      <td className="whitespace-nowrap px-3 py-3">
                        {row.measuredAt ? formatPreviewDate(row.measuredAt, timeZone) : row.values.measurement_date || "Missing"}
                      </td>
                      <td className="px-3 py-3">{row.locationName ?? row.values.location ?? "Missing"}</td>
                      <td className="px-3 py-3">
                        <span className={row.status === "valid" ? "font-medium text-green-800" : row.status === "duplicate" ? "font-medium text-amber-800" : "font-medium text-red-800"}>
                          {statusLabel}
                        </span>
                        {row.duplicateOf && (
                          <p className="mt-1 max-w-48 text-xs text-zinc-600">
                            Matches {row.duplicateOf}{row.duplicateOf === "an existing measurement" && row.measuredAt ? ` dated ${formatPreviewDate(row.measuredAt, timeZone)}` : ""}.
                            {row.duplicateOf === "an existing measurement" && (
                              <>
                                {" "}
                                <Link className="underline" href={downloadHistoryHref(profileId)}>View history</Link>
                              </>
                            )}
                          </p>
                        )}
                      </td>
                      <td className="max-w-96 px-3 py-3">
                        <details>
                          <summary className="cursor-pointer font-medium underline">
                            {row.errors.length > 0 ? `${row.errors.length} issue${row.errors.length === 1 ? "" : "s"}` : "View mapped values"}
                          </summary>
                          {row.errors.length > 0 && (
                            <ul className="mt-2 list-disc pl-5 text-red-800">
                              {row.errors.map((error) => <li key={`${error.field}-${error.message}`}><strong>{error.field}:</strong> {error.message}</li>)}
                            </ul>
                          )}
                          <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
                            {Object.entries(row.values).map(([field, value]) => (
                              <div className="flex min-w-0 gap-2" key={field}>
                                <dt className="shrink-0 text-zinc-600">{destinationLabels[field as ImportDestination] ?? field}:</dt>
                                <dd className="break-all font-medium">{value ?? "NULL"}</dd>
                              </div>
                            ))}
                            {row.payload && importMetricFields
                              .filter((field) => !(field in row.values))
                              .map((field) => (
                                <div className="flex min-w-0 gap-2" key={field}>
                                  <dt className="shrink-0 text-zinc-600">{metricLabels[field]}:</dt>
                                  <dd className="font-medium">{row.payload?.[field] ?? "NULL"}</dd>
                                </div>
                              ))}
                          </dl>
                        </details>
                      </td>
                      <td className="px-3 py-3">
                        <label className="flex items-center gap-2">
                          <input
                            checked={selectedRows.includes(row.rowNumber)}
                            disabled={!canSelect || pending}
                            onChange={(event) => toggleRow(row.rowNumber, event.target.checked)}
                            type="checkbox"
                          />
                          <span className="sr-only">Import source row {row.rowNumber}</span>
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <nav aria-label="Preview pages" className="mt-4 flex items-center gap-3">
              <button
                className="rounded border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50"
                disabled={page === 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                type="button"
              >
                Previous rows
              </button>
              <span aria-live="polite" className="text-sm">Page {page + 1} of {pageCount}</span>
              <button
                className="rounded border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50"
                disabled={page + 1 >= pageCount}
                onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
                type="button"
              >
                Next rows
              </button>
            </nav>
          )}

          {preview.duplicateCount > 0 && (
            <label className="mt-5 flex max-w-3xl items-start gap-3 rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
              <input
                checked={duplicateConfirmed}
                onChange={(event) => setDuplicateConfirmed(event.target.checked)}
                type="checkbox"
              />
              <span>I understand that selected duplicate rows will be added as new records; existing measurements will not be changed.</span>
            </label>
          )}

          <div className="mt-5 flex flex-col gap-3 border-t border-zinc-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-700">
              Confirmation: import {selectedRows.length}; skip {preview.invalidCount} invalid, {duplicateRowsNotImported} duplicate, and {Math.max(0, preview.validCount - selectedRows.filter((row) => preview.rows.find((item) => item.rowNumber === row)?.status === "valid").length)} deselected valid rows.
            </p>
            <button
              className="rounded bg-black px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={pending || selectedRows.length === 0 || (selectedDuplicateRows.length > 0 && !duplicateConfirmed)}
              onClick={handleCommit}
              type="button"
            >
              {pending ? "Importing..." : `Import ${selectedRows.length} selected rows`}
            </button>
          </div>
        </section>
      )}

      {result && (
        <section aria-labelledby="result-heading" className="rounded border border-green-300 bg-green-50 p-5">
          <h2 className="text-lg font-semibold" id="result-heading">Import complete</h2>
          <p className="mt-2" role="status">
            Added {result.insertedCount} rows; skipped {result.invalidSkippedCount} invalid rows, {result.duplicateSkippedCount} duplicates, and {result.deselectedCount} deselected valid rows. Added {result.duplicateOverrideCount} explicitly confirmed duplicates.
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            <Link className="font-medium underline" href={downloadHistoryHref(profileId)}>View measurement history</Link>
            <Link className="font-medium underline" href={`/measurements/trends?profile=${encodeURIComponent(profileId)}`}>View trends</Link>
          </div>
        </section>
      )}

      {feedback && (
        <div aria-live="polite" className={feedback.type === "error" ? "rounded border border-red-300 bg-red-50 p-4 text-red-900" : "text-sm text-zinc-700"} role={feedback.type === "error" ? "alert" : "status"}>
          {feedback.message}
          {feedback.details && feedback.details.length > 0 && (
            <ul className="mt-2 list-disc pl-5">
              {feedback.details.map((detail) => <li key={detail}>{detail}</li>)}
            </ul>
          )}
        </div>
      )}

      <p className="text-sm text-zinc-600">
        CSV and .xlsx files only. Spreadsheet formulas are not executed. Blank metric cells remain NULL.
      </p>
    </div>
  );
}
