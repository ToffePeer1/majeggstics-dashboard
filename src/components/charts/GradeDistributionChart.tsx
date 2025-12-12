import { useState } from 'react';
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
  const [isNormalized, setIsNormalized] = useState(false);

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        No data available for chart
      </div>
    );
  }

// Calculate normalized data if needed
const processedData = isNormalized
  ? data.map(row => {
      const total = GRADES.reduce((sum, grade) => sum + row[grade], 0);
      return {
        snapshot_date: row.snapshot_date,
        // A bit hacky but TS needs the explicit type here
        AAA: total > 0 ? (row.AAA / total) * 100 : 0,
        AA: total > 0 ? (row.AA / total) * 100 : 0,
        A: total > 0 ? (row.A / total) * 100 : 0,
        B: total > 0 ? (row.B / total) * 100 : 0,
        C: total > 0 ? (row.C / total) * 100 : 0,
      };
    })
  : data;

  const traces = GRADES.map(grade => ({
    x: processedData.map(d => d.snapshot_date),
    y: processedData.map(d => d[grade]),
    type: 'scatter' as const,
    mode: 'lines' as const,
    name: grade.toUpperCase(),
    line: { width: 0.5, color: GRADE_COLORS[grade] },
    stackgroup: 'one',
    fillcolor: GRADE_COLORS[grade],
    hovertemplate: isNormalized
      ? `%{y:.1f}%<extra></extra>`
      : `%{y}<extra></extra>`,
  }));

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        marginBottom: '0.5rem',
        paddingRight: '1rem'
      }}>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          cursor: 'pointer',
          fontSize: '0.9rem'
        }}>
          <input
            type="checkbox"
            checked={isNormalized}
            onChange={(e) => setIsNormalized(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          Show as percentage
        </label>
      </div>
      
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
            title: isNormalized ? 'Percentage (%)' : 'Player Count',
            ...(isNormalized && { range: [0, 100] }),
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
    </div>
  );
}