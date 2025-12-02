import { useState } from 'react';
import { useLatestSnapshotDate, useLeaderboard } from '@/hooks/usePlayerData';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import { LeaderboardChart } from '@/components/charts';
import { formatInteger, bigNumberToString } from '@/utils/formatters';

export default function Leaderboards() {
  const { data: latestDate, isLoading: dateLoading } = useLatestSnapshotDate();
  const [sortBy, setSortBy] = useState('eb');
  const [limit, setLimit] = useState(100);
  const [showGuests, setShowGuests] = useState(true);
  const [showInactive, setShowInactive] = useState(true);
  const [activeTab, setActiveTab] = useState<'table' | 'chart'>('table');
  const [chartLimit, setChartLimit] = useState(10);

  // Fetch all players for the snapshot - sorting/filtering done client-side
  const { data: players, isLoading: playersLoading, error, refetch } = useLeaderboard(latestDate);

  if (dateLoading || playersLoading) {
    return <LoadingSpinner text="Loading leaderboard..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        title="Failed to Load Leaderboard"
        message={error instanceof Error ? error.message : 'An unknown error occurred'}
        onRetry={() => refetch()}
      />
    );
  }

  if (!players || players.length === 0) {
    return (
      <ErrorMessage
        title="No Data Available"
        message="No leaderboard data found for the latest snapshot."
      />
    );
  }

  // Apply filters
  let filteredPlayers = [...players];
  if (!showGuests) {
    filteredPlayers = filteredPlayers.filter(p => !p.is_guest);
  }
  if (!showInactive) {
    filteredPlayers = filteredPlayers.filter(p => p.active);
  }
  
  // Filter out players with null/undefined values for the sort column
  // and re-sort client-side to ensure proper ordering (database puts NULLs first in descending order)
  filteredPlayers = filteredPlayers
    .filter(p => {
      const value = (p as unknown as Record<string, number | null | undefined>)[sortBy];
      return value != null;
    })
    .sort((a, b) => {
      const aVal = (a as unknown as Record<string, number>)[sortBy] || 0;
      const bVal = (b as unknown as Record<string, number>)[sortBy] || 0;
      return bVal - aVal; // Descending order
    });
  
  filteredPlayers = filteredPlayers.slice(0, limit);

  const sortOptions: Record<string, string> = {
    eb: 'Earnings Bonus',
    se: 'Soul Eggs',
    pe: 'Prophecy Eggs',
    te: 'Truth Eggs',
    num_prestiges: 'Number of Prestiges',
  };

  // Calculate statistics
  const ebValues = filteredPlayers.map(p => p.eb).filter(v => v != null);
  const peValues = filteredPlayers.map(p => p.pe).filter(v => v != null);
  
  const avgEb = ebValues.reduce((sum, v) => sum + v, 0) / ebValues.length;
  const medianEb = [...ebValues].sort((a, b) => a - b)[Math.floor(ebValues.length / 2)];
  const stdDevEb = Math.sqrt(ebValues.reduce((sum, v) => sum + Math.pow(v - avgEb, 2), 0) / ebValues.length);
  
  const avgPe = peValues.reduce((sum, v) => sum + v, 0) / peValues.length;
  const medianPe = [...peValues].sort((a, b) => a - b)[Math.floor(peValues.length / 2)];
  const stdDevPe = Math.sqrt(peValues.reduce((sum, v) => sum + Math.pow(v - avgPe, 2), 0) / peValues.length);
  
  const topEb = filteredPlayers[0]?.eb || 0;
  const totalPe = peValues.reduce((sum, v) => sum + v, 0);

  // Role distribution
  const roleDistribution: Record<string, number> = {};
  filteredPlayers.forEach(p => {
    const role = p.farmer_role || 'Unknown';
    roleDistribution[role] = (roleDistribution[role] || 0) + 1;
  });

  // Prepare chart data
  const chartData = filteredPlayers.slice(0, chartLimit).map(p => ({
    ign: p.ign,
    value: (p as unknown as Record<string, number>)[sortBy] || 0,
  }));

  return (
    <div className="container">
      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>🏆 Current Leaderboards</h1>

      <div className="info-message" style={{ marginBottom: '1.5rem' }}>
        📅 Showing leaderboard for: <strong>{latestDate}</strong>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="metric-card">
          <div className="metric-label">Total Players</div>
          <div className="metric-value">{filteredPlayers.length}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Average EB</div>
          <div className="metric-value" style={{ fontSize: '1.25rem' }}>{bigNumberToString(avgEb)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Top EB</div>
          <div className="metric-value" style={{ fontSize: '1.25rem' }}>{bigNumberToString(topEb)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total PE</div>
          <div className="metric-value" style={{ fontSize: '1.25rem' }}>{formatInteger(totalPe)}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Options</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="select">
              {Object.entries(sortOptions).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Show top N players:</label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              min={10}
              max={500}
              step={10}
              className="input"
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showGuests}
                onChange={(e) => setShowGuests(e.target.checked)}
              />
              Include guests
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem' }}>
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Include inactive
            </label>
          </div>
        </div>
        {limit > 200 && (
          <div style={{ color: '#f59e0b', fontSize: '0.875rem', marginTop: '1rem' }}>
            ⚠️ Showing more than 200 players may impact performance
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setActiveTab('table')}
          className={`button ${activeTab === 'table' ? 'button-primary' : 'button-secondary'}`}
        >
          📊 Table View
        </button>
        <button
          onClick={() => setActiveTab('chart')}
          className={`button ${activeTab === 'chart' ? 'button-primary' : 'button-secondary'}`}
        >
          📈 Chart View
        </button>
      </div>

      {activeTab === 'table' && (
      <div className="card" style={{ overflowX: 'auto' }}>
        <h2 style={{ marginBottom: '1rem' }}>Top {filteredPlayers.length} Players by {sortOptions[sortBy]}</h2>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>IGN</th>
              <th>Display Name</th>
              <th>EB</th>
              <th>SE</th>
              <th>PE</th>
              <th>TE</th>
              <th>Prestiges</th>
              <th>Role</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((player, idx) => (
              <tr key={player.discord_id}>
                <td><strong>{idx + 1}</strong></td>
                <td>{player.ign}</td>
                <td>{player.display_name}</td>
                <td>{bigNumberToString(player.eb)}%</td>
                <td>{bigNumberToString(player.se)}</td>
                <td>{formatInteger(player.pe)}</td>
                <td>{player.te != null ? formatInteger(player.te) : 'N/A'}</td>
                <td>{formatInteger(player.num_prestiges)}</td>
                <td>{player.farmer_role}</td>
                <td>{player.grade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {activeTab === 'chart' && (
        <div className="card">
          <h2 style={{ marginBottom: '1rem' }}>Top Players Visualization</h2>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Number of players in chart:
            </label>
            <input
              type="range"
              min={5}
              max={Math.min(20, filteredPlayers.length)}
              value={chartLimit}
              onChange={(e) => setChartLimit(Number(e.target.value))}
              style={{ width: '200px' }}
            />
            <span style={{ marginLeft: '0.5rem' }}>{chartLimit}</span>
          </div>
          <LeaderboardChart
            data={chartData}
            title={`Top ${chartLimit} Players by ${sortOptions[sortBy]}`}
            valueColumn={sortBy}
            topN={chartLimit}
          />
        </div>
      )}

      <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />

      {/* Detailed Statistics - Collapsible */}
      <details style={{ marginBottom: '2rem' }}>
        <summary style={{ cursor: 'pointer', fontWeight: '600', fontSize: '1.25rem', marginBottom: '1rem' }}>
          📊 Detailed Statistics
        </summary>
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Distribution Analysis</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div>
              <h4 style={{ marginBottom: '0.5rem' }}>Earnings Bonus Distribution</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li>• Median: {bigNumberToString(medianEb)}%</li>
                <li>• Mean: {bigNumberToString(avgEb)}%</li>
                <li>• Std Dev: {bigNumberToString(stdDevEb)}%</li>
              </ul>
            </div>
            <div>
              <h4 style={{ marginBottom: '0.5rem' }}>Prophecy Eggs Distribution</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li>• Median: {formatInteger(medianPe)}</li>
                <li>• Mean: {formatInteger(avgPe)}</li>
                <li>• Std Dev: {formatInteger(stdDevPe)}</li>
              </ul>
            </div>
          </div>
          
          <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>Player Roles Distribution</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {Object.entries(roleDistribution)
              .sort((a, b) => b[1] - a[1])
              .map(([role, count]) => (
                <div key={role} className="tag" style={{ padding: '0.5rem 1rem' }}>
                  {role}: {count}
                </div>
              ))}
          </div>
        </div>
      </details>

      <div style={{ marginTop: '2rem' }}>
        <button
          onClick={() => {
            const csv = [
              ['Rank', 'IGN', 'Display Name', 'EB', 'SE', 'PE', 'TE', 'Prestiges', 'Role', 'Grade'].join(','),
              ...filteredPlayers.map((p, idx) => 
                [idx + 1, p.ign, p.display_name, p.eb, p.se, p.pe, p.te ?? '', p.num_prestiges, p.farmer_role, p.grade].join(',')
              )
            ].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `leaderboard_${latestDate}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="button button-primary"
        >
          📥 Download Leaderboard as CSV
        </button>
      </div>
    </div>
  );
}
