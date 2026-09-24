import {
  formatMetricValue,
  formatSignedChange,
} from "@/lib/dashboard/data";
import type { MetricHistorySummary } from "@/lib/metrics";

type MetricCardProps = {
  label: string;
  summary: MetricHistorySummary;
  currentUnit: string;
  changeUnit: string;
  currentDecimals: number;
  changeDecimals: number;
};

export default function MetricCard({
  label,
  summary,
  currentUnit,
  changeUnit,
  currentDecimals,
  changeDecimals,
}: MetricCardProps) {
  return (
    <article className="flex flex-col gap-5 rounded border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{label}</h2>
      <div>
        <p className="text-sm text-zinc-500">Current</p>
        <p className="mt-1 text-3xl font-semibold">
          <span aria-label={summary.current === null ? `${label} unavailable` : undefined}>
            {formatMetricValue(summary.current, currentDecimals)}
          </span>{" "}
          {summary.current === null ? "" : currentUnit}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-4 border-t border-zinc-100 pt-4 text-sm">
        <div>
          <dt className="text-zinc-500">From start</dt>
          <dd className="mt-1 font-medium">{formatSignedChange(summary.changeFromFirst, changeDecimals, changeUnit)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">From previous</dt>
          <dd className="mt-1 font-medium">{formatSignedChange(summary.changeFromPrevious, changeDecimals, changeUnit)}</dd>
        </div>
      </dl>
    </article>
  );
}