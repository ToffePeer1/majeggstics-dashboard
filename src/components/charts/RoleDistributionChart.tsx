import Plot from 'react-plotly.js';
import { FARMER_ROLES, type FarmerRoleName } from '@/utils/eb';

interface RoleDistributionChartProps {
  data: Partial<Record<FarmerRoleName, number>>;
  title?: string;
}

/**
 * Bar chart showing distribution of players across farmer roles
 * Displays only roles that have at least one player, from Farmer I up to the highest current role
 * Each bar is colored according to the role's color from FARMER_ROLES
 */
export default function RoleDistributionChart({
  data,
  title = 'Role Distribution',
}: RoleDistributionChartProps) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        No data available for chart
      </div>
    );
  }

  // Create a mapping from role name to role data
  const roleMap = new Map(FARMER_ROLES.map(role => [role.name, role]));

  // Find the highest role with players
  let highestRoleIndex = 0;
  for (const [roleName, count] of Object.entries(data) as [FarmerRoleName, number][]) {
    if (count > 0) {
      const roleData = roleMap.get(roleName);
      if (roleData) {
        highestRoleIndex = Math.max(highestRoleIndex, roleData.oom);
      }
    }
  }

  // Create array of all roles from Farmer I (oom 0) to highest current role
  const displayRoles = FARMER_ROLES.filter(role => role.oom <= highestRoleIndex);

  // Prepare data for plotting
  const roleNames = displayRoles.map(role => role.name);
  const roleCounts = displayRoles.map(role => data[role.name] || 0);
  const roleColors = displayRoles.map(role => role.color);

  // Create hover text with count information
  const hoverText = displayRoles.map((role, idx) => 
    `${role.name}: ${roleCounts[idx]} player${roleCounts[idx] !== 1 ? 's' : ''}`
  );

  return (
    <Plot
      data={[
        {
          x: roleNames,
          y: roleCounts,
          type: 'bar',
          marker: {
            color: roleColors,
            line: {
              color: 'rgba(0,0,0,0.3)',
              width: 1,
            },
          },
          text: roleCounts.map(count => count.toString()), // Just the number
          textposition: 'outside', // Position text above bars
          hovertemplate: hoverText.map(text => `${text}<extra></extra>`), // Full text on hover
        },
      ]}
      layout={{
        title: {
          text: title,
          font: { size: 18 },
        },
        xaxis: {
          title: 'Farmer Role',
          tickangle: -45,
          automargin: true,
        },
        yaxis: {
          title: 'Number of Players',
          rangemode: 'tozero',
          automargin: true,
        },
        hovermode: 'closest',
        height: 500,
        margin: { l: 80, r: 40, t: 60, b: 150 },
        plot_bgcolor: '#f6f6f7',
        paper_bgcolor: '#ffffff',
        showlegend: false,
      }}
      config={{
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d', 'zoom2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d'],
      }}
      style={{ width: '100%' }}
    />
  );
}
