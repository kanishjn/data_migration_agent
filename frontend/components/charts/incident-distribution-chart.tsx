'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '@/lib/theme-context';

interface IncidentDistributionChartProps {
  data: { severity: string; count: number }[];
  height?: number;
}

export function IncidentDistributionChart({
  data,
  height = 200,
}: IncidentDistributionChartProps) {
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';

  const colorMap: Record<string, string> = {
    critical: isDark ? '#f43f5e' : '#e11d48', // Rose
    high: isDark ? '#f59e0b' : '#d97706', // Amber
    medium: isDark ? '#06b6d4' : '#0891b2', // Cyan
    low: isDark ? '#10b981' : '#059669', // Emerald
    info: isDark ? '#71717a' : '#a1a1aa', // Zinc
  };

  const colors = isDark ? {
    tooltip: '#18181b',
    tooltipBorder: '#3f3f46',
  } : {
    tooltip: '#ffffff',
    tooltipBorder: '#d4d4d8',
  };

  const chartData = data.map((item) => ({
    ...item,
    color: colorMap[item.severity] || colorMap.info,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={70}
          paddingAngle={2}
          dataKey="count"
          animationDuration={800}
          animationEasing="ease-out"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: colors.tooltip,
            border: `1px solid ${colors.tooltipBorder}`,
            borderRadius: 12,
          }}
          formatter={(value, _name, props) => {
            const payload = props?.payload as { severity?: string } | undefined;
            const severity = payload?.severity || 'unknown';
            return [Number(value), severity.charAt(0).toUpperCase() + severity.slice(1)];
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
