export type MetricValue = number | null;

export type MetricHistoryEntry = {
  value: MetricValue;
  measured_at: string;
  id: string;
};

export type MetricHistoryInput = MetricValue[] | MetricHistoryEntry[];

export type MetricHistorySummary = {
  current: MetricValue;
  first: MetricValue;
  previous: MetricValue;
  changeFromFirst: MetricValue;
  changeFromPrevious: MetricValue;
};