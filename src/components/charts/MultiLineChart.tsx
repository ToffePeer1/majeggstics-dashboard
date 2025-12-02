import Plot from 'react-plotly.js';
import { bigNumberToString } from '@/utils/formatters';

interface MultiLineChartProps {
  data: { [playerName: string]: Array<{ snapshot_date: string; value: number }> };
  title: string;
  yAxisTitle: string;
  useLogScale?: boolean;
  formatYAxis?: boolean;
  isEb?: boolean;
  isInteger?: boolean;
}

function generateTickValues(allValues: number[], useLogScale: boolean): number[] | null {
  const values = allValues.filter(v => v != null && !isNaN(v));
  if (values.length === 0) return null;
  
  const yMin = Math.min(...values);
  const yMax = Math.max(...values);
  
  if (useLogScale) {
    if (yMin <= 0 || yMax <= 0) return null;
    
    const logMin = Math.floor(Math.log10(Math.max(yMin, 1e-100)));
    const logMax = Math.ceil(Math.log10(yMax));
    const ticks: number[] = [];
    
    for (let i = logMin; i <= logMax; i++) {
      ticks.push(Math.pow(10, i));
    }
    return ticks.length > 0 ? ticks : null;
  } else {
    const numTicks = 8;
    const step = (yMax - yMin) / (numTicks - 1);
    const ticks: number[] = [];
    
    for (let i = 0; i < numTicks; i++) {
      ticks.push(yMin + step * i);
    }
    return ticks;
  }
}

function formatTickLabel(value: number, isEb: boolean, isInteger: boolean): string {
  const decimals = isInteger ? 0 : 2;
  const formatted = bigNumberToString(value, decimals, undefined, true);
  return isEb ? `${formatted}%` : formatted;
}

export default function MultiLineChart({
  data,
  title,
  yAxisTitle,
  useLogScale = true,
  formatYAxis = true,
  isEb = false,
  isInteger = false,
}: MultiLineChartProps) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        No data available for chart
      </div>
    );
  }

  // Auto-detect if this is EB based on title
  const detectIsEb = isEb || yAxisTitle.toLowerCase().includes('eb') || title.toLowerCase().includes('earnings bonus');
  const detectIsInteger = isInteger || ['prestige', 'pe', 'te'].some(t => yAxisTitle.toLowerCase().includes(t));

  // Collect all y values for tick generation
  const allValues: number[] = [];
  Object.values(data).forEach(playerData => {
    playerData.forEach(d => allValues.push(d.value));
  });

  // Generate formatted y-axis ticks
  const tickvals = formatYAxis ? generateTickValues(allValues, useLogScale) : null;
  const ticktext = tickvals ? tickvals.map(v => formatTickLabel(v, detectIsEb, detectIsInteger)) : undefined;

  const traces = Object.entries(data).map(([playerName, playerData]) => {
    const hoverText = playerData.map(d => formatTickLabel(d.value, detectIsEb, detectIsInteger));
    
    return {
      x: playerData.map(d => d.snapshot_date),
      y: playerData.map(d => d.value),
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      name: playerName,
      marker: { size: 6 },
      customdata: hoverText,
      hovertemplate: '%{x}<br>%{customdata}<extra></extra>',
    };
  });

  return (
    <Plot
      data={traces}
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
          title: yAxisTitle,
          type: useLogScale ? 'log' : 'linear',
          ...(tickvals && ticktext ? {
            tickmode: 'array' as const,
            tickvals: tickvals,
            ticktext: ticktext,
          } : {}),
        },
        hovermode: 'x unified',
        height: 500,
        margin: { l: 80, r: 40, t: 60, b: 60 },
        plot_bgcolor: '#f6f6f7',
        paper_bgcolor: '#ffffff',
        showlegend: true,
        legend: {
          orientation: 'h',
          yanchor: 'bottom',
          y: 1.02,
          xanchor: 'right',
          x: 1,
        },
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

