import { useState } from 'react';
import { usePlayerList, usePlayerSnapshots, usePlayerCurrentStats } from '@/hooks/usePlayerData';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import PlayerSearch from '@/components/PlayerSearch';
import { ProgressionChart } from '@/components/charts';
import { formatInteger, bigNumberToString, formatLastUpdated } from '@/utils/formatters';
import { getLatestRecord } from '@/utils/dataProcessing';
import { CSV_EXPORT_HEADERS } from '@/config/constants';

export default function PlayerLookup() {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState('eb');
  const { data: playerList, isLoading: listLoading } = usePlayerList();
  const { data: snapshots, isLoading: snapshotsLoading, error, refetch } = usePlayerSnapshots(selectedPlayer);
  const { data: currentStatsData, isLoading: isLoadingCurrent, error: errorCurrent } = usePlayerCurrentStats(selectedPlayer);

  if (listLoading) {
    return <LoadingSpinner text="Loading player list..." />;
  }

  if (!playerList || playerList.length === 0) {
    return (
      <ErrorMessage
        title="No Players Found"
        message="No player data available in the database."
      />
    );
  }

  const handlePlayerSelect = (discordId: string) => {
    setSelectedPlayer(discordId);
  };

  if (!selectedPlayer) {
    return (
      <div className="container">
        <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Player Lookup</h1>
        <div className="card">
          <p style={{ marginBottom: '1rem' }}>Select a player to view their detailed profile and statistics:</p>
          <PlayerSearch players={playerList} onSelect={handlePlayerSelect} />
        </div>
      </div>
    );
  }

  if (snapshotsLoading) {
    return <LoadingSpinner text="Loading player lookup..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        title="Failed to Load Player Data"
        message={error instanceof Error ? error.message : 'An unknown error occurred'}
        onRetry={() => refetch()}
      />
    );
  }

  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="container">
        <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Player Lookup</h1>
        <PlayerSearch players={playerList} onSelect={handlePlayerSelect} />
        <ErrorMessage
          title="No Data Found"
          message="No snapshot data found for this player."
        />
      </div>
    );
  }

  const latest = getLatestRecord(snapshots);
  if (!latest) {
    return <ErrorMessage title="No Data" message="Unable to find latest snapshot." />;
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

  // Calculate gains from oldest to latest
  const sorted = [...snapshots].sort((a, b) => 
    new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime()
  );
  const oldest = sorted[0];
  const ebGain = latest.eb - oldest.eb;
  const seGain = latest.se - oldest.se;
  const peGain = latest.pe - oldest.pe;

  return (
    <div className="container">
      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Player Lookup</h1>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <PlayerSearch players={playerList} onSelect={handlePlayerSelect} />
      </div>

      <div className="info-message" style={{ marginBottom: '2rem' }}>
        <strong>{latest.ign}</strong> ({latest.display_name}) • Discord: {latest.discord_name || latest.discord_id}
      </div>

      {/* Current Stats */}
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
        Current Stats
      </h2>
      {isLoadingCurrent ? (
        <div className="card" style={{ marginBottom: '2rem', padding: '2rem', textAlign: 'center' }}>
          <LoadingSpinner text="Loading current stats..." />
        </div>
      ) : errorCurrent ? (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <ErrorMessage
            title="Failed to Load Current Stats"
            message={errorCurrent instanceof Error ? errorCurrent.message : 'An unknown error occurred'}
          />
        </div>
      ) : !currentStatsData?.player ? (
        <div className="warning-message" style={{ marginBottom: '2rem' }}>
          <h3>📊 Current stats not available yet</h3>
          <p>This player's live stats will appear here after their first update in Egg Inc (usually within 24 hours).</p>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: '2rem', overflowX: 'auto' }}>
          <div className="info-message" style={{ marginBottom: '1rem' }}>
            Last updated: <strong>{formatLastUpdated(currentStatsData.lastUpdated)}</strong> (updates every 15 minutes from Wonky)
          </div>
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: '500' }}>IGN</td>
                <td>{currentStatsData.player.ign}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: '500' }}>Display Name</td>
                <td>{currentStatsData.player.display_name || 'N/A'}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: '500' }}>Discord Name</td>
                <td>{currentStatsData.player.discord_name || 'N/A'}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: '500' }}>Discord ID</td>
                <td>{currentStatsData.player.discord_id}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: '500' }}>Earnings Bonus</td>
                <td>{bigNumberToString(currentStatsData.player.eb)}%</td>
              </tr>
              <tr>
                <td style={{ fontWeight: '500' }}>Soul Eggs</td>
                <td>{bigNumberToString(currentStatsData.player.se)}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: '500' }}>Prophecy Eggs</td>
                <td>{currentStatsData.player.pe != null ? formatInteger(currentStatsData.player.pe) : 'N/A'}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: '500' }}>Truth Eggs</td>
                <td>{currentStatsData.player.te != null ? formatInteger(currentStatsData.player.te) : 'N/A'}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: '500' }}>Prestiges</td>
                <td>{currentStatsData.player.num_prestiges != null ? formatInteger(currentStatsData.player.num_prestiges) : 'N/A'}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: '500' }}>Role</td>
                <td>{currentStatsData.player.farmer_role || 'N/A'}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: '500' }}>Grade</td>
                <td>{currentStatsData.player.grade || 'N/A'}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: '500' }}>Active</td>
                <td>{currentStatsData.player.active ? '✅' : '❌'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Known Names */}
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Known Names</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {/* Discord Names */}
        <div className="card" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>Discord Names</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {Array.from(
              new Set([
                ...(currentStatsData?.player?.discord_name ? [currentStatsData.player.discord_name] : []),
              ])
            )
              .sort()
              .map((name, index) => (
                <li key={name} style={{ padding: '0.5rem 0', borderTop: index > 0 ? '1px solid var(--color-border)' : 'none' }}>
                  {name}
                </li>
              ))}
          </ul>
        </div>

        {/* IGN Names */}
        <div className="card" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>IGN</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {Array.from(
              new Map(
                [
                  ...(currentStatsData?.player?.ign ? [{name: currentStatsData.player.ign, date: new Date().toISOString()}] : []),
                  ...snapshots
                    .map(s => ({name: s.ign, date: s.snapshot_date}))
                    .filter(item => item.name != null && item.name.trim() !== '')
                ]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map(item => [item.name, item])
              ).values()
            )
              .map((item, index) => (
                <li key={item.name} style={{ padding: '0.5rem 0', borderTop: index > 0 ? '1px solid var(--color-border)' : 'none' }}>
                  {item.name}
                </li>
              ))}
          </ul>
        </div>

        {/* Display Names */}
        <div className="card" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>Display Names</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {Array.from(
              new Map(
                [
                  ...(currentStatsData?.player?.display_name ? [{name: currentStatsData.player.display_name, date: new Date().toISOString()}] : []),
                  ...snapshots
                    .map(s => ({name: s.display_name, date: s.snapshot_date}))
                    .filter((item): item is {name: string, date: string} => item.name != null && item.name.trim() !== '')
                ]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map(item => [item.name, item])
              ).values()
            )
              .map((item, index) => (
                <li key={item.name} style={{ padding: '0.5rem 0', borderTop: index > 0 ? '1px solid var(--color-border)' : 'none' }}>
                  {item.name}
                </li>
              ))}
          </ul>
        </div>
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

      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', marginTop: '2rem' }}>
        Total Gains ({snapshots.length} snapshots)
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="metric-card">
          <div className="metric-label">EB Gain</div>
          <div className="metric-value" style={{ fontSize: '1.5rem', color: ebGain > 0 ? '#4ade80' : '#f87171' }}>
            {ebGain > 0 ? '+' : ''}{bigNumberToString(ebGain)}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">SE Gain</div>
          <div className="metric-value" style={{ fontSize: '1.5rem', color: seGain > 0 ? '#4ade80' : '#f87171' }}>
            {seGain > 0 ? '+' : ''}{bigNumberToString(seGain)}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">PE Gain</div>
          <div className="metric-value" style={{ fontSize: '1.5rem', color: peGain > 0 ? '#4ade80' : '#f87171' }}>
            {peGain > 0 ? '+' : ''}{formatInteger(peGain)}
          </div>
        </div>
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
            {snapshots.slice(0, 50).map((snapshot) => (
              <tr key={snapshot.id}>
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
            a.download = `${latest.ign}_history.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="button button-primary"
        >
          📥 Download History as CSV
        </button>
      </div>
    </div>
  );
}
