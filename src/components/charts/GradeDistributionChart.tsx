import Plot from 'react-plotly.js';
import { GRADE_COLORS, GRADES } from '@/config/constants';

interface GradeDistributionChartProps {
  data: Array<{
    snapshot_date: string;
    AAA: number;
    AA: number;
    A: number;
    B: number;
    C: number;
  }>;
  title?: string;
}

export default function GradeDistributionChart({
  data,
  title = 'Grade Distribution Over Time',
}: GradeDistributionChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        No data available for chart
      </div>
    );
  }

  const traces = GRADES.map(grade => ({
    x: data.map(d => d.snapshot_date),
    y: data.map(d => d[grade]),
    type: 'scatter' as const,
    mode: 'lines' as const,
    name: grade.toUpperCase(),
    line: { width: 0.5, color: GRADE_COLORS[grade] },
    stackgroup: 'one',
    fillcolor: GRADE_COLORS[grade],
  }));

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
          title: 'Player Count',
        },
        hovermode: 'x unified',
        height: 500,
        margin: { l: 80, r: 40, t: 60, b: 80 },
        plot_bgcolor: '#f6f6f7',
        paper_bgcolor: '#ffffff',
        showlegend: true,
        legend: {
          orientation: 'h',
          yanchor: 'bottom',
          y: -0.5,
          xanchor: 'center',
          x: 0.5,
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

