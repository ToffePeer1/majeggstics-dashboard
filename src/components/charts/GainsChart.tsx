import Plot from 'react-plotly.js';

interface GainsChartProps {
  data: Array<{ snapshot_date: string; gain: number }>;
  title?: string;
}

export default function GainsChart({ data, title = 'Weekly Gains' }: GainsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        No data available for chart
      </div>
    );
  }

  const colors = data.map(d => (d.gain > 0 ? '#4ade80' : '#f87171'));

  return (
    <Plot
      data={[
        {
          x: data.map(d => d.snapshot_date),
          y: data.map(d => d.gain),
          type: 'bar',
          marker: { color: colors },
        },
      ]}
      layout={{
        title: {
          text: title,
          font: { size: 18 },
        },
        xaxis: {
          title: 'Date',
          type: 'date',
        },
        yaxis: {
          title: 'Gain',
        },
        hovermode: 'x',
        height: 400,
        margin: { l: 80, r: 40, t: 60, b: 60 },
        plot_bgcolor: '#f6f6f7',
        paper_bgcolor: '#ffffff',
      }}
      config={{
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
      }}
      style={{ width: '100%' }}
    />
  );
}

