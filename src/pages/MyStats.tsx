import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePlayerSnapshots } from '@/hooks/usePlayerData';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import { ProgressionChart } from '@/components/charts';
import { getLatestRecord } from '@/utils/dataProcessing';
import { bigNumberToString, formatInteger } from '@/utils/formatters';
import { CSV_EXPORT_HEADERS } from '@/config/constants';

/**
 * My Stats Page
 * 
 * Displays the authenticated user's own statistics.
 * 
 * SECURITY MODEL:
 * This page queries player_snapshots using the user's discord_id.
 * Even if a user tried to modify the query, RLS policies ensure
 * they can only see their own data:
 * 
 * USING (discord_id = (auth.jwt() ->> 'discord_id'))
 * 
 * The discord_id in the JWT was set by our Edge Function and signed
 * with the JWT_SECRET. Users cannot forge this value.
 */
export default function MyStats() {
  const { user, discordId } = useAuth();
  const { data: snapshots, isLoading, error, refetch } = usePlayerSnapshots(discordId);
  const [selectedMetric, setSelectedMetric] = useState('eb');

  if (isLoading) {
    return <LoadingSpinner text="Loading your statistics..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        title="Failed to Load Your Stats"
        message={error instanceof Error ? error.message : 'An unknown error occurred'}
        onRetry={() => refetch()}
      />
    );
  }

  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="container">
        <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>My Statistics</h1>
        <div className="warning-message">
          <h3>😔 No statistics found for your account</h3>
          <p>Your data may not have been collected yet.</p>
          <p>Please check back after the next weekly snapshot, or contact @toffepeer1.</p>
        </div>
      </div>
    );
  }

  const latest = getLatestRecord(snapshots);

  if (!latest) {
    return (
      <ErrorMessage
        title="No Data Available"
        message="Could not find your latest statistics"
        onRetry={() => refetch()}
      />
    );
  }

  // Metric options for progression chart
  const metricOptions: Record<string, string> = {
    eb: 'Earnings Bonus',
    se: 'Soul Eggs',
    pe: 'Prophecy Eggs',
    te: 'Truth Eggs',
    num_prestiges: 'Number of Prestiges',
  };

  // Prepare chart data for selected metric
  // Filter out null/undefined values instead of filling with 0
  const chartData = snapshots
    .map(s => ({ 
      snapshot_date: s.snapshot_date, 
      value: (s as unknown as Record<string, number | null | undefined>)[selectedMetric]
    }))
    .filter(d => d.value != null)
    .map(d => ({ snapshot_date: d.snapshot_date, value: d.value as number }))
    .sort((a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime());

  // Determine if log scale should be used
  const useLogScale = selectedMetric === 'eb' || selectedMetric === 'se';

  // Stats table data (like Streamlit's table format)
  const statsTableData = [
    { metric: 'IGN', value: latest.ign },
    { metric: 'Display Name', value: latest.display_name || 'N/A' },
    { metric: 'Discord Name', value: latest.discord_name || 'N/A' },
    { metric: 'Discord ID', value: latest.discord_id },
    { metric: 'Earnings Bonus', value: bigNumberToString(latest.eb) + '%' },
    { metric: 'Soul Eggs', value: bigNumberToString(latest.se) },
    { metric: 'Prophecy Eggs', value: latest.pe != null ? formatInteger(latest.pe) : 'N/A' },
    { metric: 'Truth Eggs', value: latest.te != null ? formatInteger(latest.te) : 'N/A' },
    { metric: 'Prestiges', value: latest.num_prestiges != null ? formatInteger(latest.num_prestiges) : 'N/A' },
    { metric: 'Role', value: latest.farmer_role || 'N/A' },
    { metric: 'Grade', value: latest.grade || 'N/A' },
  ];

  return (
    <div className="container">
      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>My Statistics</h1>

      <div className="info-message" style={{ marginBottom: '2rem' }}>
        <p><strong>Welcome, {user?.global_name || user?.username}!</strong></p>
        <p>Total snapshots tracked: <strong>{snapshots.length}</strong></p>
      </div>

      {/* Latest Statistics as Table */}
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Latest Statistics ({new Date(latest.snapshot_date).toLocaleDateString()})</h2>
      <div className="card" style={{ marginBottom: '2rem', overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {statsTableData.map((row, idx) => (
              <tr key={idx}>
                <td style={{ fontWeight: '500' }}>{row.metric}</td>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />

      {/* Progression Chart with Metric Selector */}
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Progression Analysis</h2>
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Select a metric to visualize:
          </label>
          <select 
            value={selectedMetric} 
            onChange={(e) => setSelectedMetric(e.target.value)} 
            className="select"
            style={{ maxWidth: '300px' }}
          >
            {Object.entries(metricOptions).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <ProgressionChart
          data={chartData}
          title={`${metricOptions[selectedMetric]} Progression`}
          yAxisTitle={metricOptions[selectedMetric]}
          useLogScale={useLogScale}
          showMarkers={true}
        />
      </div>

      <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />

      {/* Historical Snapshots */}
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Historical Snapshots</h2>
        <div className="card" style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>EB</th>
                <th>SE</th>
                <th>PE</th>
                <th>TE</th>
                <th>Prestiges</th>
                <th>Role</th>
                <th>Grade</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.slice(0, 50).map((snapshot, idx) => (
                <tr key={idx}>
                  <td>{snapshot.snapshot_date}</td>
                  <td>{bigNumberToString(snapshot.eb)}%</td>
                  <td>{bigNumberToString(snapshot.se)}</td>
                  <td>{formatInteger(snapshot.pe)}</td>
                  <td>{snapshot.te != null ? formatInteger(snapshot.te) : 'N/A'}</td>
                  <td>{formatInteger(snapshot.num_prestiges)}</td>
                  <td>{snapshot.farmer_role || 'N/A'}</td>
                  <td>{snapshot.grade || 'N/A'}</td>
                  <td>{snapshot.active ? '✅' : '❌'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      <div style={{ marginTop: '2rem' }}>
        <button
          onClick={() => {
            const csv = [[...CSV_EXPORT_HEADERS].join(',')];
            snapshots.forEach(snapshot => {
              const row = CSV_EXPORT_HEADERS.map(header => {
                const value = snapshot[header];
                return value != null ? `"${value}"` : '""';
              });
              csv.push(row.join(','));
            });
            const csvString = csv.join('\n');
            const blob = new Blob([csvString], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'my_stats_history.csv';
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="button button-primary"
        >
          📥 Download Full History as CSV
        </button>
      </div>
    </div>
  );
}
