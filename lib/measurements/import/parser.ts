import ExcelJS from "exceljs";
import Papa from "papaparse";
import type {
  ImportCell,
  ImportCellValue,
  ImportRow,
  ParsedImportFile,
} from "./types";

export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 5000;
export const MAX_VISIBLE_WORKSHEETS = 20;

export class ImportFileError extends Error {}

function isBlankCell(value: ImportCellValue): boolean {
  return value === null || (typeof value === "string" && value.trim() === "");
}

function createHeadersAndRows(
  fileName: string,
  worksheet: string,
  rows: ImportRow[],
  headers: string[],
  worksheets: string[],
  date1904 = false,
): ParsedImportFile {
  const headerErrors: string[] = [];
  const normalizedHeaders = new Set<string>();

  headers.forEach((header, index) => {
    const normalized = header.trim().toLowerCase();
    if (!normalized) {
      headerErrors.push(`Column ${index + 1} has a blank header. Add a header in the source file and upload it again.`);
    } else if (normalizedHeaders.has(normalized)) {
      headerErrors.push(`The header "${header}" appears more than once. Rename duplicate headers in the source file.`);
    } else {
      normalizedHeaders.add(normalized);
    }
  });

  if (rows.length > MAX_IMPORT_ROWS) {
    throw new ImportFileError(`This file has more than ${MAX_IMPORT_ROWS.toLocaleString()} data rows.`);
  }

  return { fileName, headers, rows, headerErrors, worksheets, worksheet, date1904 };
}

function csvCell(value: string | undefined): ImportCell {
  return { value: value === undefined || value.trim() === "" ? null : value };
}

async function parseCsv(file: File, bytes: Uint8Array): Promise<ParsedImportFile> {
  if ((bytes[0] === 0x50 && bytes[1] === 0x4b) || bytes.includes(0)) {
    throw new ImportFileError("The file content does not look like a UTF-8 CSV.");
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new ImportFileError("CSV files must use UTF-8 encoding.");
  }

  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), {
    delimiter: "",
    delimitersToGuess: [",", "\t", ";", "|"],
    dynamicTyping: false,
    skipEmptyLines: "greedy",
  });

  if (parsed.errors.length > 0) {
    const firstError = parsed.errors[0];
    throw new ImportFileError(`The CSV could not be parsed near row ${(firstError.row ?? 0) + 1}.`);
  }

  const records = parsed.data.filter((record) => record.some((value) => value.trim() !== ""));
  if (records.length === 0) {
    throw new ImportFileError("The selected file does not contain a header or data rows.");
  }

  const headerRecord = records[0];
  const headers = headerRecord.map((header) => header.trim());
  const inconsistentRow = records.slice(1).findIndex((record) => record.length !== headers.length);
  if (inconsistentRow !== -1) {
    throw new ImportFileError(`The CSV has a row with a different number of columns near row ${inconsistentRow + 2}.`);
  }
  const rows = records.slice(1).map((record, index) => ({
    rowNumber: index + 2,
    cells: headers.map((_, cellIndex) => csvCell(record[cellIndex])),
  }));

  return createHeadersAndRows(file.name, "", rows, headers, []);
}

function scalarExcelValue(value: unknown): ImportCell {
  if (value === null || value === undefined || value === "") {
    return { value: null };
  }

  if (value instanceof Date) {
    return { value, dateHasTime: false };
  }

  if (typeof value === "string" || typeof value === "number") {
    return { value: typeof value === "string" && value.trim() === "" ? null : value };
  }

  if (typeof value === "boolean") {
    return { value: value ? "TRUE" : "FALSE" };
  }

  if (typeof value === "object") {
    const cellValue = value as {
      formula?: string;
      sharedFormula?: string;
      result?: unknown;
      richText?: Array<{ text: string }>;
      text?: string;
    };

    if (cellValue.formula || cellValue.sharedFormula) {
      const result = scalarExcelValue(cellValue.result);
      return result.value === null
        ? { value: null, isFormula: true, formulaError: true }
        : { ...result, isFormula: true };
    }

    if (cellValue.richText) {
      return { value: cellValue.richText.map((part) => part.text).join("") };
    }

    if (typeof cellValue.text === "string") {
      return { value: cellValue.text };
    }
  }

  return { value: null, formulaError: true };
}

async function parseXlsx(
  file: File,
  bytes: Uint8Array,
  selectedWorksheet: string | undefined,
): Promise<ParsedImportFile> {
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new ImportFileError("The .xlsx file is not a valid Excel Open XML workbook.");
  }

  const workbook = new ExcelJS.Workbook();
  try {
    const workbookBytes = Buffer.from(bytes);
    await workbook.xlsx.load(
      workbookBytes as unknown as Parameters<typeof workbook.xlsx.load>[0],
    );
  } catch {
    throw new ImportFileError("The Excel workbook could not be opened. Check that it is a valid, unprotected .xlsx file.");
  }

  const visibleWorksheets = workbook.worksheets.filter((sheet) => sheet.state === "visible");
  const worksheetNames = visibleWorksheets.map((sheet) => sheet.name);
  if (visibleWorksheets.length === 0) {
    throw new ImportFileError("The workbook has no visible worksheets.");
  }
  if (visibleWorksheets.length > MAX_VISIBLE_WORKSHEETS) {
    throw new ImportFileError(`This workbook has more than ${MAX_VISIBLE_WORKSHEETS} visible worksheets. Make a copy with fewer sheets and upload it again.`);
  }

  const worksheet = selectedWorksheet
    ? visibleWorksheets.find((sheet) => sheet.name === selectedWorksheet)
    : visibleWorksheets[0];
  if (!worksheet) {
    throw new ImportFileError("Choose a visible worksheet from this workbook.");
  }

  let headerRow: ExcelJS.Row | undefined;
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    if (headerRow) return;
    let hasContent = false;
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (!isBlankCell(scalarExcelValue(cell.value).value)) hasContent = true;
    });
    if (hasContent) headerRow = row;
  });

  if (!headerRow) {
    throw new ImportFileError("The selected worksheet does not contain a header or data rows.");
  }

  const firstHeaderRow = headerRow;
  const headers = Array.from({ length: Math.max(firstHeaderRow.cellCount, worksheet.columnCount) }, (_, index) => {
    const cell = scalarExcelValue(firstHeaderRow.getCell(index + 1).value);
    return cell.value === null ? "" : String(cell.value).trim();
  });
  while (headers.length > 0 && headers[headers.length - 1] === "") headers.pop();

  const rows: ImportRow[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    if (row.number <= firstHeaderRow.number) return;

    const cells = headers.map((_, index) => {
      const cell = row.getCell(index + 1);
      const parsed = scalarExcelValue(cell.value);
      const formatHasTime = /h|s|am\/pm|:/i.test((cell.numFmt ?? "").replace(/"[^"]*"|\\./g, ""));
      return parsed.value instanceof Date
        ? { ...parsed, dateHasTime: formatHasTime }
        : parsed;
    });

    if (cells.every((cell) => isBlankCell(cell.value) && !cell.formulaError)) return;
    rows.push({ rowNumber: row.number, cells });
  });

  return createHeadersAndRows(
    file.name,
    worksheet.name,
    rows,
    headers,
    worksheetNames,
    workbook.properties.date1904,
  );
}

export async function parseImportFile(
  file: File,
  selectedWorksheet?: string,
): Promise<ParsedImportFile> {
  if (file.size === 0) throw new ImportFileError("Choose a file that contains data.");
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    throw new ImportFileError("The file is larger than the 5 MiB import limit.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (extension === "csv") return parseCsv(file, bytes);
  if (extension === "xlsx") return parseXlsx(file, bytes, selectedWorksheet);

  throw new ImportFileError("Choose a UTF-8 .csv or .xlsx file.");
}

export function previewCellValue(cell: ImportCell): string {
  if (cell.formulaError) return "Unsupported formula or cell value";
  if (cell.value === null) return "";
  if (cell.value instanceof Date) return cell.value.toISOString();
  return String(cell.value);
}

export function isBlankImportCell(cell: ImportCell | undefined): boolean {
  return !cell || cell.formulaError === true || isBlankCell(cell.value);
}