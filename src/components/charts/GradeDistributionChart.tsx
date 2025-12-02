import Plot from 'react-plotly.js';

interface GradeDistributionChartProps {
  data: Array<{
    snapshot_date: string;
    aaa: number;
    aa: number;
    a: number;
    b: number;
    c: number;
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

  const gradeColors = {
    aaa: '#df4e56',
    aa: '#efa345',
    a: '#9a08d5',
    b: '#3f88c7',
    c: '#b8b8b8',
  };

  const grades = ['aaa', 'aa', 'a', 'b', 'c'] as const;

  const traces = grades.map(grade => ({
    x: data.map(d => d.snapshot_date),
    y: data.map(d => d[grade]),
    type: 'scatter' as const,
    mode: 'lines' as const,
    name: grade.toUpperCase(),
    line: { width: 0.5, color: gradeColors[grade] },
    stackgroup: 'one',
    fillcolor: gradeColors[grade],
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

