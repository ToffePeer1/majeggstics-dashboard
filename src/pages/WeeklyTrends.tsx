import { useState } from 'react';
import { useWeeklyStatistics } from '@/hooks/usePlayerData';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import { ProgressionChart, GradeDistributionChart } from '@/components/charts';
import { bigNumberToString, formatInteger } from '@/utils/formatters';
import type { WeeklyStatistics } from '@/types';

type MetricKey = 'eb' | 'se' | 'pe' | 'te' | 'prestiges';
type AggregateKey = 'avg' | 'median' | 'max' | 'total';

const METRIC_OPTIONS: Record<MetricKey, string> = {
  eb: 'Earnings Bonus',
  se: 'Soul Eggs',
  pe: 'Prophecy Eggs',
  te: 'Truth Eggs',
  prestiges: 'Prestiges',
};

const AGGREGATE_OPTIONS: Record<AggregateKey, string> = {
  avg: 'Average',
  median: 'Median',
  max: 'Maximum',
  total: 'Total',
};

function getColumnName(metric: MetricKey, aggregate: AggregateKey): keyof WeeklyStatistics {
  return `${aggregate}_${metric}` as keyof WeeklyStatistics;
}

function formatMetricValue(value: number | null | undefined, metric: MetricKey): string {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  
  switch (metric) {
    case 'eb':
      return bigNumberToString(value) + '%';
    case 'se':
      return bigNumberToString(value);
    case 'pe':
    case 'te':
    case 'prestiges':
      return formatInteger(value);
    default:
      return String(value);
  }
}

export default function WeeklyTrends() {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('eb');
  const [selectedAggregate, setSelectedAggregate] = useState<AggregateKey>('avg');
  const [showPlayerCount, setShowPlayerCount] = useState(true);
  const [showGradeDist, setShowGradeDist] = useState(true);
  const [showCommunityStats, setShowCommunityStats] = useState(true);
  
  const { data: stats, isLoading, error, refetch } = useWeeklyStatistics();

  if (isLoading) {
    return <LoadingSpinner text="Loading weekly trends..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        title="Failed to Load Trends"
        message={error?.message || 'An unknown error occurred'}
        onRetry={() => refetch()}
      />
    );
  }

  if (!stats || stats.length === 0) {
    return (
      <ErrorMessage
        title="No Data Available"
        message="No weekly statistics found for trend analysis."
      />
    );
  }

  // Get latest stats
  const latestStats = stats[stats.length - 1];
  const totalSnapshots = stats.length;
  const latestPlayerCount = latestStats?.player_count || 0;
  const avgPlayerCount = Math.round(stats.reduce((sum, s) => sum + s.player_count, 0) / stats.length);
  const maxPlayerCount = Math.max(...stats.map(s => s.player_count));

  // Player growth calculation
  const firstStats = stats[0];
  const playerGrowth = latestStats.player_count - firstStats.player_count;
  const playerGrowthPct = firstStats.player_count > 0 
    ? ((playerGrowth / firstStats.player_count) * 100).toFixed(1) 
    : '0';
  const avgWeeklyGrowth = (playerGrowth / stats.length).toFixed(1);

  // Prepare player count chart data
  const playerCountData = stats.map(s => ({
    snapshot_date: s.snapshot_date,
    value: s.player_count,
  }));

  // Prepare grade distribution data
  const gradeDistData = stats.map(s => ({
    snapshot_date: s.snapshot_date,
    aaa: s.grade_aaa,
    aa: s.grade_aa,
    a: s.grade_a,
    b: s.grade_b,
    c: s.grade_c,
  }));

  // Prepare community stats chart data
  const columnName = getColumnName(selectedMetric, selectedAggregate);
  const communityStatsData = stats.map(s => ({
    snapshot_date: s.snapshot_date,
    value: Number(s[columnName]) || 0,
  }));
  
  const latestMetricValue = latestStats[columnName] as number;
  const useLogScale = ['eb', 'se', 'te'].includes(selectedMetric) && selectedAggregate !== 'total';

  return (
    <div className="container">
      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Community Weekly Trends</h1>

      {/* View Options */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>View Options</h3>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showPlayerCount}
              onChange={(e) => setShowPlayerCount(e.target.checked)}
            />
            Player Count
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showGradeDist}
              onChange={(e) => setShowGradeDist(e.target.checked)}
            />
            Grade Distribution
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showCommunityStats}
              onChange={(e) => setShowCommunityStats(e.target.checked)}
            />
            Community Stats
          </label>
        </div>
      </div>

      {/* Summary Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="metric-card">
          <div className="metric-label">Total Snapshots</div>
          <div className="metric-value">{totalSnapshots}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Latest Player Count</div>
          <div className="metric-value">{formatInteger(latestPlayerCount)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Average Player Count</div>
          <div className="metric-value">{formatInteger(avgPlayerCount)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Peak Player Count</div>
          <div className="metric-value">{formatInteger(maxPlayerCount)}</div>
        </div>
      </div>

      {/* Player Count Over Time */}
      {showPlayerCount && (
        <>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>👥 Active Players Over Time</h2>
          <div className="card" style={{ marginBottom: '2rem' }}>
            <ProgressionChart
              data={playerCountData}
              title="Player Count Over Time"
              yAxisTitle="Number of Players"
              useLogScale={false}
              showMarkers={true}
            />
            
            {stats.length >= 2 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
                <div className="metric-card">
                  <div className="metric-label">Player Growth</div>
                  <div className="metric-value" style={{ color: playerGrowth >= 0 ? '#4ade80' : '#f87171' }}>
                    {playerGrowth >= 0 ? '+' : ''}{formatInteger(playerGrowth)}
                    <span style={{ fontSize: '0.875rem', marginLeft: '0.5rem' }}>
                      ({playerGrowthPct}%)
                    </span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Avg Weekly Growth</div>
                  <div className="metric-value" style={{ color: Number(avgWeeklyGrowth) >= 0 ? '#4ade80' : '#f87171' }}>
                    {Number(avgWeeklyGrowth) >= 0 ? '+' : ''}{avgWeeklyGrowth}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Grade Distribution Over Time */}
      {showGradeDist && (
        <>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>🎖️ Grade Distribution Over Time</h2>
          <div className="card" style={{ marginBottom: '2rem' }}>
            <GradeDistributionChart
              data={gradeDistData}
              title="Grade Distribution Over Time"
            />
            
            {/* Current Grade Distribution Table */}
            <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>Current Grade Distribution</h3>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Grade</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>AAA</td><td>{formatInteger(latestStats.grade_aaa)}</td></tr>
                  <tr><td>AA</td><td>{formatInteger(latestStats.grade_aa)}</td></tr>
                  <tr><td>A</td><td>{formatInteger(latestStats.grade_a)}</td></tr>
                  <tr><td>B</td><td>{formatInteger(latestStats.grade_b)}</td></tr>
                  <tr><td>C</td><td>{formatInteger(latestStats.grade_c)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Community Statistics Trends */}
      {showCommunityStats && (
        <>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>📊 Community Statistics Trends</h2>
          <div className="card" style={{ marginBottom: '2rem' }}>
            {/* Selectors */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Select metric to visualize:
                </label>
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value as MetricKey)}
                  className="select"
                  style={{ width: '100%' }}
                >
                  {Object.entries(METRIC_OPTIONS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Select aggregate function:
                </label>
                <select
                  value={selectedAggregate}
                  onChange={(e) => setSelectedAggregate(e.target.value as AggregateKey)}
                  className="select"
                  style={{ width: '100%' }}
                >
                  {Object.entries(AGGREGATE_OPTIONS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <ProgressionChart
              data={communityStatsData}
              title={`${AGGREGATE_OPTIONS[selectedAggregate]} ${METRIC_OPTIONS[selectedMetric]}`}
              yAxisTitle={METRIC_OPTIONS[selectedMetric]}
              useLogScale={useLogScale}
              showMarkers={true}
            />

            {/* Current Value Metric */}
            <div style={{ marginTop: '1.5rem' }}>
              <div className="metric-card" style={{ maxWidth: '300px' }}>
                <div className="metric-label">
                  Current {AGGREGATE_OPTIONS[selectedAggregate]} {METRIC_OPTIONS[selectedMetric]}
                </div>
                <div className="metric-value" style={{ fontSize: '1.5rem' }}>
                  {formatMetricValue(latestMetricValue, selectedMetric)}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Weekly Statistics Table */}
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>📋 Weekly Statistics Table</h2>
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Players</th>
                <th>Active</th>
                <th>Guests</th>
                <th>AAA</th>
                <th>AA</th>
                <th>A</th>
                <th>B</th>
                <th>C</th>
              </tr>
            </thead>
            <tbody>
              {[...stats].reverse().slice(0, 50).map((row) => (
                <tr key={row.snapshot_date}>
                  <td>{row.snapshot_date}</td>
                  <td>{formatInteger(row.player_count)}</td>
                  <td>{formatInteger(row.active_player_count)}</td>
                  <td>{formatInteger(row.guest_count)}</td>
                  <td>{formatInteger(row.grade_aaa)}</td>
                  <td>{formatInteger(row.grade_aa)}</td>
                  <td>{formatInteger(row.grade_a)}</td>
                  <td>{formatInteger(row.grade_b)}</td>
                  <td>{formatInteger(row.grade_c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
