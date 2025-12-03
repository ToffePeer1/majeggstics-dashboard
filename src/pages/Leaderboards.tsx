import { useState } from 'react';
import { useLatestSnapshotDate, useLeaderboard } from '@/hooks/usePlayerData';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import { formatInteger, bigNumberToString } from '@/utils/formatters';

export default function Leaderboards() {
  const { data: latestDate, isLoading: dateLoading } = useLatestSnapshotDate();
  const { discordId } = useAuth();
  const [sortBy, setSortBy] = useState('eb');
  const [showInactive, setShowInactive] = useState(true);

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

  // Store total player count before filtering
  const totalPlayerCount = players.length;

  // Apply filters (guests are always included)
  let filteredPlayers = [...players];
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
  
  // Calculate proper ranking with ties (dense ranking)
  const playerRanks: Record<string, number> = {};
  let currentRank = 1;
  let previousValue: number | null = null;
  
  filteredPlayers.forEach((player, idx) => {
    const currentValue = (player as unknown as Record<string, number>)[sortBy] || 0;
    
    if (previousValue !== null && currentValue !== previousValue) {
      currentRank = idx + 1;
    }
    
    playerRanks[player.discord_id] = currentRank;
    previousValue = currentValue;
  });
  
  // Find current user's rank
  const currentUserRank = discordId && playerRanks[discordId] ? playerRanks[discordId] : null;

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
  const seValues = filteredPlayers.map(p => p.se).filter(v => v != null);
  
  const totalSe = seValues.reduce((sum, v) => sum + v, 0);
  const totalEb = ebValues.reduce((sum, v) => sum + v, 0);
  const totalPe = peValues.reduce((sum, v) => sum + v, 0);

  // Role distribution
  const roleDistribution: Record<string, number> = {};
  filteredPlayers.forEach(p => {
    const role = p.farmer_role || 'Unknown';
    roleDistribution[role] = (roleDistribution[role] || 0) + 1;
  });

  return (
    <div className="container">
      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>🏆 Current Leaderboards</h1>

      <div className="info-message" style={{ marginBottom: '1.5rem' }}>
        📅 Showing leaderboard for: <strong>{latestDate}</strong>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="metric-card">
          <div className="metric-label">Total Players</div>
          <div className="metric-value">{totalPlayerCount}</div>
          {filteredPlayers.length !== totalPlayerCount && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              ({filteredPlayers.length} shown)
            </div>
          )}
        </div>
        {currentUserRank && currentUserRank > 0 ? (
          <div className="metric-card" style={{ borderColor: 'var(--color-primary)', borderWidth: '2px' }}>
            <div className="metric-label">Your Rank ({sortOptions[sortBy]})</div>
            <div className="metric-value">#{currentUserRank}</div>
          </div>
        ) : discordId ? (
          <div className="metric-card">
            <div className="metric-label">Your Rank</div>
            <div className="metric-value" style={{ fontSize: '1rem' }}>Not ranked</div>
          </div>
        ) : null}
        <div className="metric-card">
          <div className="metric-label">Total SE</div>
          <div className="metric-value" style={{ fontSize: '1.25rem' }}>{bigNumberToString(totalSe)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total EB</div>
          <div className="metric-value" style={{ fontSize: '1.25rem' }}>{bigNumberToString(totalEb)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total PE</div>
          <div className="metric-value" style={{ fontSize: '1.25rem' }}>{formatInteger(totalPe)}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Options</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="select" style={{ maxWidth: '300px' }}>
              {Object.entries(sortOptions).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Include inactive players
            </label>
          </div>
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <h2 style={{ marginBottom: '1rem' }}>Players by {sortOptions[sortBy]}</h2>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>IGN</th>
              <th>Discord Display Name</th>
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
            {filteredPlayers.map((player) => (
              <tr key={player.discord_id}>
                <td><strong>{playerRanks[player.discord_id]}</strong></td>
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

      <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />

    </div>
  );
}
