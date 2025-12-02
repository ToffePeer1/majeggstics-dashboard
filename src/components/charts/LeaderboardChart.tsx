import Plot from 'react-plotly.js';
import { bigNumberToString } from '@/utils/formatters';

interface LeaderboardChartProps {
  data: Array<{
    ign: string;
    value: number;
  }>;
  title?: string;
  valueColumn?: string;
  topN?: number;
}

function generateLogTickValues(values: number[]): { tickvals: number[]; ticktext: string[] } | null {
  const filtered = values.filter(v => v != null && !isNaN(v) && v > 0);
  if (filtered.length === 0) return null;
  
  const xMin = Math.min(...filtered);
  const xMax = Math.max(...filtered);
  
  const logMin = Math.floor(Math.log10(Math.max(xMin, 1e-100)));
  const logMax = Math.ceil(Math.log10(xMax));
  const tickvals: number[] = [];
  
  for (let i = logMin; i <= logMax; i++) {
    tickvals.push(Math.pow(10, i));
  }
  
  if (tickvals.length === 0) return null;
  
  return {
    tickvals,
    ticktext: tickvals.map(v => bigNumberToString(v, 0, undefined, true)),
  };
}

/**
 * Horizontal bar chart for leaderboard visualization.
 * Shows top N players with highest at top.
 */
export default function LeaderboardChart({
  data,
  title = 'Top Players',
  valueColumn = 'EB',
  topN = 10,
}: LeaderboardChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        No data available for chart
      </div>
    );
  }

  // Get top N and reverse for display (highest at top)
  const displayData = data.slice(0, topN).reverse();
  const isEb = valueColumn.toLowerCase() === 'eb';

  // Create custom hover text with formatted values
  const hoverText = displayData.map(d => 
    `${d.ign}: ${bigNumberToString(d.value)}${isEb ? '%' : ''}`
  );

  // Generate formatted x-axis ticks
  const tickConfig = generateLogTickValues(displayData.map(d => d.value));
  const ticktext = tickConfig ? tickConfig.ticktext.map(t => isEb ? `${t}%` : t) : undefined;

  return (
    <Plot
      data={[
        {
          x: displayData.map(d => d.value),
          y: displayData.map(d => d.ign),
          type: 'bar',
          orientation: 'h',
          marker: {
            color: 'lightblue',
            line: {
              color: 'darkblue',
              width: 1,
            },
          },
          text: hoverText,
          hovertemplate: '%{text}<extra></extra>',
        },
      ]}
      layout={{
        title: {
          text: title,
          font: { size: 18 },
        },
        xaxis: {
          title: valueColumn.toUpperCase(),
          type: 'log',
          ...(tickConfig && ticktext ? {
            tickmode: 'array' as const,
            tickvals: tickConfig.tickvals,
            ticktext: ticktext,
          } : {}),
        },
        yaxis: {
          title: 'Player',
        },
        height: 400 + (topN * 20),
        margin: { l: 120, r: 40, t: 60, b: 60 },
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
