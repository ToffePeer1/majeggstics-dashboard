import { useState } from 'react';
import { usePlayerList, usePlayerComparison } from '@/hooks/usePlayerData';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import PlayerSearch from '@/components/PlayerSearch';
import { MultiLineChart } from '@/components/charts';
import { bigNumberToString, formatInteger, formatScientificNotation } from '@/utils/formatters';
import { getLatestRecord } from '@/utils/dataProcessing';
import type { PlayerSnapshot } from '@/types';

export default function PlayerComparison() {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectedMetric, setSelectedMetric] = useState('eb');
  const [activePlayerTab, setActivePlayerTab] = useState<string | null>(null);
  const { data: playerList, isLoading: listLoading } = usePlayerList();
  const { data: comparisonData, isLoading: dataLoading, error, refetch } = usePlayerComparison(selectedPlayers);

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

  const handleAddPlayer = (discordId: string) => {
    if (!selectedPlayers.includes(discordId)) {
      setSelectedPlayers([...selectedPlayers, discordId]);
    }
  };

  const handleRemovePlayer = (discordId: string) => {
    setSelectedPlayers(selectedPlayers.filter(id => id !== discordId));
  };

  const handleClearAll = () => {
    setSelectedPlayers([]);
  };

  if (selectedPlayers.length === 0) {
    return (
      <div className="container">
        <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>⚖️ Player Comparisons</h1>
        <p style={{ marginBottom: '1.5rem' }}>
          Compare multiple players side-by-side to see how they stack up against each other.
          Select up to 5 players to compare their progression and statistics.
        </p>
        <div className="card">
          <p style={{ marginBottom: '1rem' }}>👥 Select players to compare (up to 5):</p>
          <PlayerSearch players={playerList} onSelect={handleAddPlayer} />
          <div className="info-message" style={{ marginTop: '1rem' }}>
            👆 Select at least 2 players to start comparing
          </div>
        </div>
        
        {/* Instructions */}
        <details style={{ marginTop: '2rem' }}>
          <summary style={{ cursor: 'pointer', fontWeight: '600', fontSize: '1.125rem' }}>
            ℹ️ How to use this page
          </summary>
          <div className="card" style={{ marginTop: '1rem' }}>
            <h3>How to Compare Players</h3>
            <ol style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li><strong>Select Players</strong>: Use the dropdown above to select 2-5 players</li>
              <li><strong>View Summary</strong>: See current stats side-by-side</li>
              <li><strong>Choose Metric</strong>: Select which statistic to compare over time</li>
              <li><strong>Analyze Growth</strong>: View relative growth rates</li>
            </ol>
            
            <h3 style={{ marginTop: '1rem' }}>Available Metrics</h3>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li><strong>Earnings Bonus (EB)</strong>: Overall player strength</li>
              <li><strong>Soul Eggs (SE)</strong>: Prestige currency</li>
              <li><strong>Prophecy Eggs (PE)</strong>: Rare prestige currency</li>
              <li><strong>Truth Eggs (TE)</strong>: Lifetime earnings</li>
              <li><strong>Number of Prestiges</strong>: Total prestige count</li>
            </ul>
          </div>
        </details>
      </div>
    );
  }

  if (dataLoading) {
    return <LoadingSpinner text="Loading comparison data..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        title="Failed to Load Comparison"
        message={error instanceof Error ? error.message : 'An unknown error occurred'}
        onRetry={() => refetch()}
      />
    );
  }

  if (!comparisonData || Object.keys(comparisonData).length === 0) {
    return (
      <div className="container">
        <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>⚖️ Player Comparison</h1>
        <ErrorMessage
          title="No Data Found"
          message="No snapshot data found for selected players."
        />
        <button onClick={handleClearAll} className="button button-secondary">
          Clear Selection
        </button>
      </div>
    );
  }

  // Extract latest snapshot for each player
  const latestSnapshots: PlayerSnapshot[] = [];
  Object.entries(comparisonData).forEach(([_discordId, snapshots]) => {
    const latest = getLatestRecord(snapshots);
    if (latest) {
      latestSnapshots.push(latest);
    }
  });

  if (latestSnapshots.length === 0) {
    return (
      <div className="container">
        <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>⚖️ Player Comparison</h1>
        <ErrorMessage
          title="No Data Found"
          message="No valid snapshot data found for selected players."
        />
      </div>
    );
  }

  // Find the best player for each metric
  const metrics: { [key: string]: { label: string; key: keyof PlayerSnapshot; format: (val: number) => string } } = {
    eb: { label: 'Earnings Bonus', key: 'eb', format: bigNumberToString },
    se: { label: 'Soul Eggs', key: 'se', format: bigNumberToString },
    pe: { label: 'Prophecy Eggs', key: 'pe', format: formatInteger },
    te: { label: 'Truth Eggs', key: 'te', format: formatInteger },
    num_prestiges: { label: 'Prestiges', key: 'num_prestiges', format: formatInteger },
  };

  const metricOptions: Record<string, string> = {
    eb: 'Earnings Bonus',
    se: 'Soul Eggs',
    pe: 'Prophecy Eggs',
    te: 'Truth Eggs',
    num_prestiges: 'Number of Prestiges',
  };

  const bestPlayers: { [key: string]: PlayerSnapshot } = {};
  Object.entries(metrics).forEach(([metricKey, { key }]) => {
    bestPlayers[metricKey] = [...latestSnapshots].sort((a, b) => 
      ((b[key] as number) || 0) - ((a[key] as number) || 0)
    )[0];
  });

  // Prepare chart data for comparison
  const chartData: { [playerName: string]: Array<{ snapshot_date: string; value: number }> } = {};
  Object.entries(comparisonData).forEach(([_discordId, snapshots]) => {
    if (snapshots.length > 0) {
      const playerName = snapshots[0].ign;
      chartData[playerName] = snapshots
        .map(s => ({ 
          snapshot_date: s.snapshot_date, 
          value: (s as unknown as Record<string, number>)[selectedMetric] || 0 
        }))
        .sort((a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime());
    }
  });

  // Calculate relative growth for each player
  const growthData: Array<{
    player: string;
    discordId: string;
    startingValue: number;
    currentValue: number;
    absoluteGrowth: number;
    growthPct: number;
    weeksTracked: number;
  }> = [];

  Object.entries(comparisonData).forEach(([discordId, snapshots]) => {
    if (snapshots.length >= 2 && selectedMetric in snapshots[0]) {
      const sorted = [...snapshots].sort((a, b) => 
        new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime()
      );
      const firstValue = (sorted[0] as unknown as Record<string, number>)[selectedMetric] || 0;
      const lastValue = (sorted[sorted.length - 1] as unknown as Record<string, number>)[selectedMetric] || 0;
      
      if (firstValue > 0) {
        const absoluteGrowth = lastValue - firstValue;
        const growthPct = (absoluteGrowth / firstValue) * 100;
        
        growthData.push({
          player: sorted[0].ign,
          discordId,
          startingValue: firstValue,
          currentValue: lastValue,
          absoluteGrowth,
          growthPct,
          weeksTracked: sorted.length,
        });
      }
    }
  });

  // Set initial active player tab
  if (activePlayerTab === null && latestSnapshots.length > 0) {
    setActivePlayerTab(latestSnapshots[0].discord_id);
  }

  const useLogScale = selectedMetric === 'eb' || selectedMetric === 'se';

  return (
    <div className="container">
      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>⚖️ Player Comparisons</h1>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Selected Players ({selectedPlayers.length})</h3>
          <button onClick={handleClearAll} className="button button-secondary">
            Clear All
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {latestSnapshots.map(player => (
            <div key={player.discord_id} className="tag">
              {player.ign}
              <button
                onClick={() => handleRemovePlayer(player.discord_id)}
                style={{ marginLeft: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {selectedPlayers.length < 5 && (
          <PlayerSearch players={playerList} onSelect={handleAddPlayer} label="Add another player (up to 5)" />
        )}
      </div>

      {selectedPlayers.length < 2 && (
        <div className="warning-message" style={{ marginBottom: '2rem' }}>
          Please select at least 2 players for comparison
        </div>
      )}

      {/* Current Stats Comparison */}
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>📊 Current Stats Comparison</h2>
      <div className="card" style={{ overflowX: 'auto', marginBottom: '2rem' }}>
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>IGN</th>
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
            {latestSnapshots.map(player => (
              <tr key={player.discord_id}>
                <td><strong>{player.display_name}</strong></td>
                <td>{player.ign}</td>
                <td style={{ 
                  fontWeight: bestPlayers.eb?.discord_id === player.discord_id ? 'bold' : 'normal',
                  color: bestPlayers.eb?.discord_id === player.discord_id ? '#4ade80' : 'inherit'
                }}>
                  {bigNumberToString(player.eb)}%
                  {bestPlayers.eb?.discord_id === player.discord_id && ' 🏆'}
                </td>
                <td style={{ 
                  fontWeight: bestPlayers.se?.discord_id === player.discord_id ? 'bold' : 'normal',
                  color: bestPlayers.se?.discord_id === player.discord_id ? '#4ade80' : 'inherit'
                }}>
                  {bigNumberToString(player.se)}
                  {bestPlayers.se?.discord_id === player.discord_id && ' 🏆'}
                </td>
                <td style={{ 
                  fontWeight: bestPlayers.pe?.discord_id === player.discord_id ? 'bold' : 'normal',
                  color: bestPlayers.pe?.discord_id === player.discord_id ? '#4ade80' : 'inherit'
                }}>
                  {formatInteger(player.pe)}
                  {bestPlayers.pe?.discord_id === player.discord_id && ' 🏆'}
                </td>
                <td style={{ 
                  fontWeight: bestPlayers.te?.discord_id === player.discord_id ? 'bold' : 'normal',
                  color: bestPlayers.te?.discord_id === player.discord_id ? '#4ade80' : 'inherit'
                }}>
                  {player.te != null ? formatInteger(player.te) : 'N/A'}
                  {bestPlayers.te?.discord_id === player.discord_id && player.te != null && ' 🏆'}
                </td>
                <td style={{ 
                  fontWeight: bestPlayers.num_prestiges?.discord_id === player.discord_id ? 'bold' : 'normal',
                  color: bestPlayers.num_prestiges?.discord_id === player.discord_id ? '#4ade80' : 'inherit'
                }}>
                  {formatInteger(player.num_prestiges)}
                  {bestPlayers.num_prestiges?.discord_id === player.discord_id && ' 🏆'}
                </td>
                <td>{player.farmer_role}</td>
                <td>{player.grade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />

      {/* Progression Comparison */}
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>📈 Progression Comparison</h2>
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Select metric to compare:
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
        
        {Object.keys(chartData).length > 0 && (
          <MultiLineChart
            data={chartData}
            title={`${metricOptions[selectedMetric]} Comparison`}
            yAxisTitle={metricOptions[selectedMetric]}
            useLogScale={useLogScale}
          />
        )}
      </div>

      <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />

      {/* Relative Growth */}
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>📈 Relative Growth - {metricOptions[selectedMetric]}</h2>
      {growthData.length > 0 ? (
        <div className="card" style={{ overflowX: 'auto', marginBottom: '2rem' }}>
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Starting Value</th>
                <th>Current Value</th>
                <th>Absolute Growth</th>
                <th>Growth %</th>
                <th>Weeks Tracked</th>
              </tr>
            </thead>
            <tbody>
              {growthData.map(row => (
                <tr key={row.discordId}>
                  <td>{row.player}</td>
                  <td>{formatScientificNotation(row.startingValue)}</td>
                  <td>{formatScientificNotation(row.currentValue)}</td>
                  <td>{formatScientificNotation(row.absoluteGrowth)}</td>
                  <td style={{ color: row.growthPct > 0 ? '#4ade80' : '#f87171' }}>
                    {row.growthPct.toFixed(2)}%
                  </td>
                  <td>{row.weeksTracked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="info-message" style={{ marginBottom: '2rem' }}>
          Not enough data to calculate growth
        </div>
      )}

      <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />

      {/* Detailed Comparison - Player Tabs */}
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>📊 Detailed Comparison</h2>
      
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {latestSnapshots.map(player => (
          <button
            key={player.discord_id}
            onClick={() => setActivePlayerTab(player.discord_id)}
            className={`button ${activePlayerTab === player.discord_id ? 'button-primary' : 'button-secondary'}`}
          >
            {player.ign}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activePlayerTab && comparisonData[activePlayerTab] && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          {(() => {
            const playerSnapshots = comparisonData[activePlayerTab];
            const latest = getLatestRecord(playerSnapshots);
            if (!latest) return null;

            return (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="metric-card">
                    <div className="metric-label">IGN</div>
                    <div className="metric-value" style={{ fontSize: '1rem' }}>{latest.ign}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">EB</div>
                    <div className="metric-value" style={{ fontSize: '1rem' }}>{bigNumberToString(latest.eb, 3)}%</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">PE</div>
                    <div className="metric-value" style={{ fontSize: '1rem' }}>{formatInteger(latest.pe)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">Records</div>
                    <div className="metric-value" style={{ fontSize: '1rem' }}>{playerSnapshots.length}</div>
                  </div>
                </div>

                <h4 style={{ marginBottom: '0.5rem' }}>Snapshots</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>EB</th>
                        <th>SE</th>
                        <th>PE</th>
                        <th>Prestiges</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playerSnapshots.map((snapshot, idx) => (
                        <tr key={idx}>
                          <td>{snapshot.snapshot_date}</td>
                          <td>{bigNumberToString(snapshot.eb)}%</td>
                          <td>{bigNumberToString(snapshot.se)}</td>
                          <td>{formatInteger(snapshot.pe)}</td>
                          <td>{formatInteger(snapshot.num_prestiges)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      )}

      <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />

      {/* Export */}
      <p style={{ marginBottom: '1rem', color: 'var(--color-text-muted)' }}>
        Download comparison data if you feel you need it. (why?)
      </p>
      <button
        onClick={() => {
          const combinedData: PlayerSnapshot[] = [];
          Object.entries(comparisonData).forEach(([discordId, snapshots]) => {
            snapshots.forEach(s => combinedData.push({ ...s, discord_id: discordId }));
          });
          
          if (combinedData.length === 0) return;
          
          const headers = Object.keys(combinedData[0]).join(',');
          const rows = combinedData.map(row => Object.values(row).join(','));
          const csv = [headers, ...rows].join('\n');
          
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'player_comparison.csv';
          a.click();
          URL.revokeObjectURL(url);
        }}
        className="button button-primary"
      >
        📥 Generate Comparison Report
      </button>
    </div>
  );
}
