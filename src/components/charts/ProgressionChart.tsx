import Plot from 'react-plotly.js';
import { bigNumberToString } from '@/utils/formatters';

interface ProgressionChartProps {
  data: Array<{ snapshot_date: string; value: number }>;
  title: string;
  yAxisTitle: string;
  useLogScale?: boolean;
  showMarkers?: boolean;
  formatYAxis?: boolean;
  isEb?: boolean; // Whether this is an EB chart (adds % suffix)
  isInteger?: boolean; // Whether values are integers (prestiges, pe, te)
  showDataLossNote?: boolean; // Whether to show data loss note for prestiges
}

function generateTickValues(data: Array<{ value: number }>, useLogScale: boolean): number[] | null {
  const values = data.map(d => d.value).filter(v => v != null && !isNaN(v));
  if (values.length === 0) return null;
  
  const yMin = Math.min(...values);
  const yMax = Math.max(...values);
  
  if (useLogScale) {
    // For log scale, create ticks at powers of 10
    if (yMin <= 0 || yMax <= 0) return null;
    
    const logMin = Math.floor(Math.log10(Math.max(yMin, 1e-100)));
    const logMax = Math.ceil(Math.log10(yMax));
    const ticks: number[] = [];
    
    for (let i = logMin; i <= logMax; i++) {
      ticks.push(Math.pow(10, i));
    }
    return ticks.length > 0 ? ticks : null;
  } else {
    // For linear scale, generate evenly spaced ticks
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

export default function ProgressionChart({
  data,
  title,
  yAxisTitle,
  useLogScale = true,
  showMarkers = true,
  formatYAxis = true,
  isEb = false,
  isInteger = false,
  showDataLossNote = false,
}: ProgressionChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        No data available for this metric. The selected statistic may not have been tracked during this period.
      </div>
    );
  }

  // Auto-detect if this is EB based on title
  const detectIsEb = isEb || yAxisTitle.toLowerCase().includes('eb') || title.toLowerCase().includes('earnings bonus');
  const detectIsInteger = isInteger || ['prestige', 'pe', 'te'].some(t => yAxisTitle.toLowerCase().includes(t));
  const shouldShowNote = showDataLossNote || (detectIsInteger && yAxisTitle.toLowerCase().includes('prestige'));

  // Generate formatted y-axis ticks
  const tickvals = formatYAxis ? generateTickValues(data, useLogScale) : null;
  const ticktext = tickvals ? tickvals.map(v => formatTickLabel(v, detectIsEb, detectIsInteger)) : undefined;

  // Split data into segments where gaps > 3 weeks don't connect
  const GAP_THRESHOLD_MS = 3 * 7 * 24 * 60 * 60 * 1000; // 3 weeks in milliseconds
  const segments: Array<Array<{ snapshot_date: string; value: number }>> = [];
  let currentSegment: Array<{ snapshot_date: string; value: number }> = [];

  for (let i = 0; i < data.length; i++) {
    if (currentSegment.length === 0) {
      currentSegment.push(data[i]);
    } else {
      const prevDate = new Date(currentSegment[currentSegment.length - 1].snapshot_date).getTime();
      const currDate = new Date(data[i].snapshot_date).getTime();
      const gap = currDate - prevDate;

      if (gap > GAP_THRESHOLD_MS) {
        // Gap too large, start a new segment
        segments.push(currentSegment);
        currentSegment = [data[i]];
      } else {
        currentSegment.push(data[i]);
      }
    }
  }
  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  // Create traces for each segment
  const traces = segments.map((segment, idx) => {
    const hoverText = segment.map(d => formatTickLabel(d.value, detectIsEb, detectIsInteger));
    return {
      x: segment.map(d => d.snapshot_date),
      y: segment.map(d => d.value),
      type: 'scatter' as const,
      mode: (showMarkers ? 'lines+markers' : 'lines') as 'lines+markers' | 'lines',
      name: yAxisTitle,
      line: { color: '#5865f2' },
      marker: { size: 6 },
      customdata: hoverText,
      hovertemplate: '%{x}<br>%{customdata}<extra></extra>',
      showlegend: idx === 0, // Only show legend for first segment
    };
  });

  return (
    <>
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
          legend: {
            orientation: 'h',
            yanchor: 'top',
            y: -0.2,
            xanchor: 'center',
            x: 0.5,
          },
          hovermode: 'x unified',
          height: 500,
          margin: { l: 80, r: 40, t: 60, b: 80 },
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
      {shouldShowNote && (
        <p style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fef3c7', borderLeft: '4px solid #f59e0b', fontSize: '0.9rem', color: '#92400e' }}>
          <strong>Note:</strong> Any gaps in the data of prestige count are likely because of a loss of data.
        </p>
      )}
    </>
  );
}

