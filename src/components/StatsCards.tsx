interface StatsCardsProps {
  stats: { [key: string]: string | number };
}

export default function StatsCards({ stats }: StatsCardsProps) {
  if (!stats) {
    return null;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
      {Object.entries(stats).map(([label, value]) => (
        <div key={label} className="metric-card">
          <div className="metric-label">{label}</div>
          <div className="metric-value" style={{ fontSize: '1.25rem' }}>{value}</div>
        </div>
      ))}
    </div>
  );
}
