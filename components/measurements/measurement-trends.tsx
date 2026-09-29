import type { MeasurementTrendSeries } from "@/lib/measurements/trends";

type MeasurementTrendsProps = {
  series: MeasurementTrendSeries[];
};

type PlotPoint = {
  id: string;
  measured_at: string;
  value: number | null;
  x: number;
  y: number | null;
};

const chartColors: Record<string, string> = {
  weight_kg: "#0f766e",
  body_fat_pct: "#c2410c",
  muscle_mass_kg: "#2563eb",
  waist_cm: "#be123c",
};

const chartWidth = 640;
const chartHeight = 300;
const plot = { left: 72, right: 20, top: 20, bottom: 58 };
const plotWidth = chartWidth - plot.left - plot.right;
const plotHeight = chartHeight - plot.top - plot.bottom;

function formatDate(value: string, withTime = false): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", withTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "short" },
  ).format(date);
}

function formatValue(value: number, decimals: number, unit: string): string {
  return `${value.toFixed(decimals)} ${unit}`;
}

function TrendChart({ series }: { series: MeasurementTrendSeries }) {
  const titleId = `trend-${series.field}-title`;
  const descriptionId = `trend-${series.field}-description`;

  return (
    <article
      aria-labelledby={titleId}
      className="min-w-0 rounded border border-zinc-200 bg-white p-4 sm:p-5"
    >
      <header className="mb-3">
        <h2 className="text-lg font-semibold" id={titleId}>{series.label}</h2>
        <p className="text-sm text-zinc-600">{series.unit}</p>
      </header>

      {!series.hasValues ? (
        <p className="py-10 text-center text-sm text-zinc-600">
          No {series.label.toLowerCase()} measurements recorded.
        </p>
      ) : (
        <>
          <TrendSvg series={series} descriptionId={descriptionId} titleId={titleId} />
          <details className="mt-3 border-t border-zinc-200 pt-3">
            <summary className="cursor-pointer text-sm font-medium text-zinc-700">
              View measurement data
            </summary>
            <div className="mt-3 max-w-full overflow-x-auto">
              <table className="w-full min-w-100 border-collapse text-left text-sm">
                <caption className="sr-only">{series.label} measurements by date</caption>
                <thead>
                  <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                    <th className="px-2 py-2 font-medium" scope="col">Measurement date</th>
                    <th className="px-2 py-2 font-medium" scope="col">Value ({series.unit})</th>
                  </tr>
                </thead>
                <tbody>
                  {series.points.map((point) => (
                    <tr className="border-b border-zinc-100 last:border-0" key={point.id}>
                      <td className="px-2 py-2">{formatDate(point.measured_at, true)}</td>
                      <td className="px-2 py-2">
                        {point.value === null
                          ? "Not recorded"
                          : formatValue(point.value, series.decimals, series.unit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </article>
  );
}

function TrendSvg({
  series,
  descriptionId,
  titleId,
}: {
  series: MeasurementTrendSeries;
  descriptionId: string;
  titleId: string;
}) {
  const measuredValues = series.points.flatMap((point) =>
    point.value === null ? [] : [point.value],
  );
  const minimumValue = Math.min(...measuredValues);
  const maximumValue = Math.max(...measuredValues);
  const valueSpan = maximumValue - minimumValue;
  const valuePadding = valueSpan === 0
    ? Math.max(Math.abs(maximumValue) * 0.05, 1)
    : valueSpan * 0.1;
  const minimumAxisValue = minimumValue >= 0
    ? Math.max(0, minimumValue - valuePadding)
    : minimumValue - valuePadding;
  const maximumAxisValue = maximumValue + valuePadding;
  const axisSpan = maximumAxisValue - minimumAxisValue || 1;
  const parsedTimes = series.points.map((point) => Date.parse(point.measured_at));
  const allTimesValid = parsedTimes.every(Number.isFinite);
  const xValues = allTimesValid
    ? parsedTimes
    : series.points.map((_, index) => index);
  const minimumTime = Math.min(...xValues);
  const maximumTime = Math.max(...xValues);
  const timeSpan = maximumTime - minimumTime;
  const color = chartColors[series.field];

  const points: PlotPoint[] = series.points.map((point, index) => {
    const x = timeSpan === 0
      ? plot.left + plotWidth / 2
      : plot.left + ((xValues[index] - minimumTime) / timeSpan) * plotWidth;
    const y = point.value === null
      ? null
      : plot.top + ((maximumAxisValue - point.value) / axisSpan) * plotHeight;

    return { ...point, x, y };
  });

  const valueTicks = [minimumAxisValue, (minimumAxisValue + maximumAxisValue) / 2, maximumAxisValue];
  const segments: PlotPoint[][] = [];
  let segment: PlotPoint[] = [];

  points.forEach((point) => {
    if (point.y === null) {
      if (segment.length > 0) segments.push(segment);
      segment = [];
    } else {
      segment.push(point);
    }
  });
  if (segment.length > 0) segments.push(segment);

  const dateLabelIndexes = [...new Set([
    0,
    Math.round((points.length - 1) / 2),
    points.length - 1,
  ])];

  return (
    <svg
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className="block h-auto w-full"
      role="img"
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
    >
      <desc id={descriptionId}>
        {series.label} over measurement dates. Missing measurements appear as gaps and are not connected.
      </desc>

      {valueTicks.map((tick, index) => {
        const y = plot.top + ((maximumAxisValue - tick) / axisSpan) * plotHeight;
        return (
          <g aria-hidden="true" key={`tick-${index}`}>
            <line
              stroke="#e4e4e7"
              strokeWidth="1"
              x1={plot.left}
              x2={chartWidth - plot.right}
              y1={y}
              y2={y}
            />
            <text
              fill="#52525b"
              fontSize="12"
              textAnchor="end"
              x={plot.left - 10}
              y={y + 4}
            >
              {tick.toFixed(series.decimals)}
            </text>
          </g>
        );
      })}

      <line
        aria-hidden="true"
        stroke="#71717a"
        strokeWidth="1"
        x1={plot.left}
        x2={plot.left}
        y1={plot.top}
        y2={chartHeight - plot.bottom}
      />
      <line
        aria-hidden="true"
        stroke="#71717a"
        strokeWidth="1"
        x1={plot.left}
        x2={chartWidth - plot.right}
        y1={chartHeight - plot.bottom}
        y2={chartHeight - plot.bottom}
      />

      {segments.filter((items) => items.length > 1).map((items, index) => (
        <path
          d={items.map((point, pointIndex) =>
            `${pointIndex === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y?.toFixed(2)}`,
          ).join(" ")}
          fill="none"
          key={`segment-${index}`}
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
      ))}

      {points.map((point) => point.y === null ? null : (
        <circle
          cx={point.x}
          cy={point.y}
          fill={color}
          key={point.id}
          r="5"
          stroke="white"
          strokeWidth="2"
        >
          <title>
            {`${formatDate(point.measured_at, true)}: ${formatValue(point.value as number, series.decimals, series.unit)}`}
          </title>
        </circle>
      ))}

      {dateLabelIndexes.map((index) => {
        const point = points[index];
        if (!point) return null;
        const anchor = index === 0 ? "start" : index === points.length - 1 ? "end" : "middle";
        return (
          <text
            aria-hidden="true"
            fill="#52525b"
            fontSize="12"
            key={`date-${point.id}`}
            textAnchor={anchor}
            x={point.x}
            y={chartHeight - plot.bottom + 22}
          >
            {formatDate(point.measured_at)}
          </text>
        );
      })}

      <text
        aria-hidden="true"
        fill="#52525b"
        fontSize="12"
        textAnchor="middle"
        x={plot.left + plotWidth / 2}
        y={chartHeight - 8}
      >
        Measurement date
      </text>
    </svg>
  );
}

export default function MeasurementTrends({ series }: MeasurementTrendsProps) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">
      {series.map((metric) => <TrendChart key={metric.field} series={metric} />)}
    </div>
  );
}
