import type { DateFormat, ImportCell, ParsedImportFile } from "./types";

export type MeasurementDateResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

type DateTimeOptions = {
  dateFormat: DateFormat;
  timeZone: string;
  date1904: boolean;
};

type DateParts = { year: number; month: number; day: number };
type TimeParts = { hour: number; minute: number; second: number };

function validDate({ year, month, day }: DateParts): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

function validTime({ hour, minute, second }: TimeParts): boolean {
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59;
}

function isBlank(cell: ImportCell | undefined): boolean {
  return !cell || cell.value === null || (typeof cell.value === "string" && cell.value.trim() === "");
}

function parseDateString(text: string, dateFormat: DateFormat): DateParts | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };

  const slash = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
  if (!slash || dateFormat === "auto") return null;

  const first = Number(slash[1]);
  const second = Number(slash[2]);
  const year = Number(slash[3]);
  return dateFormat === "month-first"
    ? { year, month: first, day: second }
    : { year, month: second, day: first };
}

function parseTimeString(text: string): TimeParts | null {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(text.trim());
  if (!match) return null;
  const parts = { hour: Number(match[1]), minute: Number(match[2]), second: Number(match[3] ?? 0) };
  return validTime(parts) ? parts : null;
}

function excelSerialToParts(serial: number, date1904: boolean): { date: DateParts; time: TimeParts } | null {
  if (!Number.isFinite(serial) || serial < 0 || serial > 2958465) return null;

  const wholeDays = Math.floor(serial);
  const dayFraction = serial - wholeDays;
  let epoch: number;
  let offsetDays: number;

  if (date1904) {
    epoch = Date.UTC(1904, 0, 1);
    offsetDays = wholeDays;
  } else {
    if (wholeDays === 60) return null;
    epoch = Date.UTC(1899, 11, 31);
    offsetDays = wholeDays >= 60 ? wholeDays - 1 : wholeDays;
  }

  const date = new Date(epoch + offsetDays * 86400000);
  const secondsInDay = Math.round(dayFraction * 86400) % 86400;
  return {
    date: { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() },
    time: {
      hour: Math.floor(secondsInDay / 3600),
      minute: Math.floor((secondsInDay % 3600) / 60),
      second: secondsInDay % 60,
    },
  };
}

function excelDateParts(cell: ImportCell, date1904: boolean): { date: DateParts; time: TimeParts; hasTime: boolean } | null {
  if (cell.value instanceof Date) {
    return {
      date: {
        year: cell.value.getUTCFullYear(),
        month: cell.value.getUTCMonth() + 1,
        day: cell.value.getUTCDate(),
      },
      time: {
        hour: cell.value.getUTCHours(),
        minute: cell.value.getUTCMinutes(),
        second: cell.value.getUTCSeconds(),
      },
      hasTime: cell.dateHasTime ?? false,
    };
  }

  if (typeof cell.value === "number") {
    const parts = excelSerialToParts(cell.value, date1904);
    return parts
      ? { ...parts, hasTime: cell.value % 1 !== 0 }
      : null;
  }

  return null;
}

function parseTimeCell(cell: ImportCell | undefined, date1904: boolean): TimeParts | null {
  if (isBlank(cell)) return null;
  if (cell?.formulaError) return null;
  if (cell?.value instanceof Date) {
    return {
      hour: cell.value.getUTCHours(),
      minute: cell.value.getUTCMinutes(),
      second: cell.value.getUTCSeconds(),
    };
  }
  if (typeof cell?.value === "number") {
    if (cell.value < 0 || cell.value >= 1) return null;
    return excelSerialToParts(cell.value, date1904)?.time ?? null;
  }
  if (typeof cell?.value === "string") return parseTimeString(cell.value);
  return null;
}

function timezoneDateParts(timestamp: number, timeZone: string): DateParts & TimeParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(timestamp);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function localDateTimeToInstant(
  date: DateParts,
  time: TimeParts,
  timeZone: string,
): MeasurementDateResult {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-US", { timeZone });
    formatter.format(0);
  } catch {
    return { ok: false, message: "choose a valid IANA timezone." };
  }
  void formatter;

  const targetUtc = Date.UTC(date.year, date.month - 1, date.day, time.hour, time.minute, time.second);
  const offsets = new Set<number>();
  for (let deltaHours = -36; deltaHours <= 36; deltaHours += 6) {
    const probe = targetUtc + deltaHours * 3600000;
    const local = timezoneDateParts(probe, timeZone);
    const localAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
    offsets.add(localAsUtc - probe);
  }

  const candidates = [...offsets]
    .map((offset) => targetUtc - offset)
    .filter((candidate) => {
      const actual = timezoneDateParts(candidate, timeZone);
      return actual.year === date.year && actual.month === date.month && actual.day === date.day &&
        actual.hour === time.hour && actual.minute === time.minute && actual.second === time.second;
    });

  if (candidates.length === 0) {
    return { ok: false, message: "this local date/time does not exist in the selected timezone." };
  }
  if (candidates.length > 1) {
    return { ok: false, message: "this local date/time is ambiguous in the selected timezone; provide an explicit timezone offset." };
  }

  return { ok: true, value: new Date(candidates[0]).toISOString() };
}

function parseExplicitIsoDateTime(value: string): MeasurementDateResult | null {
  const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/i.exec(value);
  if (!match) return null;

  const date = parseDateString(match[1], "auto");
  const time = parseTimeString(`${match[2]}:${match[3] ?? "00"}`);
  if (!date || !validDate(date) || !time) {
    return { ok: false, message: "enter a valid ISO date and time." };
  }
  if (match[5] !== "Z" && match[5] !== "z") {
    const [offsetHours, offsetMinutes] = match[5].slice(1).split(":").map(Number);
    if (offsetHours > 14 || offsetMinutes > 59 || (offsetHours === 14 && offsetMinutes !== 0)) {
      return { ok: false, message: "enter a valid UTC offset." };
    }
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed)
    ? { ok: true, value: new Date(parsed).toISOString() }
    : { ok: false, message: "enter a valid ISO date and time." };
}

export function parseMeasurementDateTime(
  dateCell: ImportCell | undefined,
  timeCell: ImportCell | undefined,
  table: Pick<ParsedImportFile, "date1904">,
  options: Pick<DateTimeOptions, "dateFormat" | "timeZone">,
): MeasurementDateResult {
  if (!dateCell || isBlank(dateCell)) return { ok: false, message: "enter a measurement date." };
  if (dateCell.formulaError) return { ok: false, message: "replace the formula or unsupported date cell with a literal value." };
  if (timeCell?.formulaError) return { ok: false, message: "replace the formula or unsupported time cell with a literal value." };

  if (typeof dateCell.value === "string") {
    const text = dateCell.value.trim();
    const explicit = parseExplicitIsoDateTime(text);
    if (explicit) {
      if (!isBlank(timeCell)) {
        return { ok: false, message: "do not map a separate time column when the date cell already includes a timezone-qualified time." };
      }
      return explicit;
    }

    const localDateTime = /^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}:\d{2}(?::\d{2})?)$/.exec(text);
    if (localDateTime) {
      const date = parseDateString(localDateTime[1], "auto");
      const time = parseTimeString(localDateTime[2]);
      if (!date || !validDate(date) || !time) return { ok: false, message: "enter a valid ISO date and time." };
      if (!isBlank(timeCell)) return { ok: false, message: "a separate time column cannot be combined with a date cell that already contains a time." };
      return localDateTimeToInstant(date, time, options.timeZone);
    }
  }

  const excelParts = excelDateParts(dateCell, table.date1904);
  let date: DateParts | null;
  let time: TimeParts = { hour: 12, minute: 0, second: 0 };
  let sourceHasTime = false;

  if (excelParts) {
    date = excelParts.date;
    sourceHasTime = excelParts.hasTime;
    if (sourceHasTime) time = excelParts.time;
  } else if (typeof dateCell.value === "string") {
    date = parseDateString(dateCell.value.trim(), options.dateFormat);
  } else {
    return { ok: false, message: "enter a supported date value." };
  }

  if (!date || !validDate(date)) {
    return {
      ok: false,
      message: options.dateFormat === "auto"
        ? "enter a valid ISO date or choose month-first/day-first for this date format."
        : "enter a valid date in the selected format.",
    };
  }

  if (!isBlank(timeCell)) {
    const parsedTime = parseTimeCell(timeCell, table.date1904);
    if (!parsedTime) return { ok: false, message: "enter a valid time in HH:MM or HH:MM:SS format." };
    time = parsedTime;
    sourceHasTime = true;
  }

  if (!sourceHasTime) time = { hour: 12, minute: 0, second: 0 };
  if (!validTime(time)) return { ok: false, message: "enter a valid measurement time." };

  return localDateTimeToInstant(date, time, options.timeZone);
}