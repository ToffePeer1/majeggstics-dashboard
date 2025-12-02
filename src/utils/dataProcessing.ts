// Data processing utilities

import type { PlayerSnapshot, ChartData, GrowthData } from '@/types';

export function prepareChartData(snapshots: PlayerSnapshot[]): ChartData[] {
  return snapshots
    .map((snapshot) => ({
      ...snapshot,
      snapshot_date: new Date(snapshot.snapshot_date),
    }))
    .sort((a, b) => a.snapshot_date.getTime() - b.snapshot_date.getTime());
}

export function getLatestRecord(snapshots: PlayerSnapshot[]): PlayerSnapshot | null {
  if (snapshots.length === 0) {
    return null;
  }

  return [...snapshots].sort((a, b) => {
    return new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime();
  })[0];
}

export function calculateWeeklyGains(
  snapshots: PlayerSnapshot[],
  valueColumn: keyof PlayerSnapshot
): Array<PlayerSnapshot & { gain: number; gainPct: number }> {
  // Filter to only snapshots with valid values for this column
  const validSnapshots = snapshots.filter(s => s[valueColumn] != null);
  
  const sorted = [...validSnapshots].sort((a, b) => {
    return new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime();
  });

  return sorted.map((snapshot, index) => {
    if (index === 0) {
      return { ...snapshot, gain: 0, gainPct: 0 };
    }

    const prevValue = Number(sorted[index - 1][valueColumn]);
    const currValue = Number(snapshot[valueColumn]);
    const gain = currValue - prevValue;
    const gainPct = prevValue !== 0 ? (gain / prevValue) * 100 : 0;

    return { ...snapshot, gain, gainPct };
  });
}

export function filterDateRange(
  snapshots: PlayerSnapshot[],
  weeksBack: number = 52
): PlayerSnapshot[] {
  const maxDate = Math.max(
    ...snapshots.map((s) => new Date(s.snapshot_date).getTime())
  );
  const cutoffDate = new Date(maxDate);
  cutoffDate.setDate(cutoffDate.getDate() - weeksBack * 7);

  return snapshots.filter(
    (s) => new Date(s.snapshot_date).getTime() >= cutoffDate.getTime()
  );
}

export function calculateGrowth(
  snapshots: PlayerSnapshot[],
  metric: keyof PlayerSnapshot
): GrowthData | null {
  // Filter to only snapshots with valid values for this metric
  const validSnapshots = snapshots.filter(s => s[metric] != null);
  
  if (validSnapshots.length < 2) {
    return null;
  }

  const sorted = [...validSnapshots].sort((a, b) => {
    return new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime();
  });

  const firstValue = Number(sorted[0][metric]);
  const lastValue = Number(sorted[sorted.length - 1][metric]);

  if (firstValue === 0) {
    return null;
  }

  const absoluteGrowth = lastValue - firstValue;
  const growthPercentage = (absoluteGrowth / firstValue) * 100;

  return {
    player: sorted[0].ign,
    startingValue: firstValue,
    currentValue: lastValue,
    absoluteGrowth,
    growthPercentage,
    weeksTracked: sorted.length,
  };
}

export function aggregateStats(snapshots: PlayerSnapshot[]): {
  [key: string]: { mean: number; median: number; min: number; max: number };
} {
  const numericColumns: Array<keyof PlayerSnapshot> = ['eb', 'se', 'pe', 'te', 'num_prestiges'];
  const stats: { [key: string]: { mean: number; median: number; min: number; max: number } } = {};

  numericColumns.forEach((col) => {
    const values = snapshots
      .filter((s) => s[col] != null)
      .map((s) => Number(s[col]))
      .filter((v) => !isNaN(v))
      .sort((a, b) => a - b);

    if (values.length === 0) {
      return;
    }

    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / values.length;
    const median = values[Math.floor(values.length / 2)];
    const min = values[0];
    const max = values[values.length - 1];

    stats[col] = { mean, median, min, max };
  });

  return stats;
}
