'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useTheme } from '@/lib/theme-context';
import type { MigrationMetrics } from '@/types';

interface MigrationProgressChartProps {
  metrics: MigrationMetrics;
  height?: number;
}

export function MigrationProgressChart({
  metrics,
  height = 200,
}: MigrationProgressChartProps) {
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';

  const data = [
    { name: 'Migrated', value: metrics.migratedEndpoints, color: isDark ? '#10b981' : '#059669' }, // Emerald
    { name: 'In Progress', value: metrics.inProgressEndpoints, color: isDark ? '#06b6d4' : '#0891b2' }, // Cyan
    { name: 'Pending', value: metrics.totalEndpoints - metrics.migratedEndpoints - metrics.inProgressEndpoints - metrics.failedEndpoints, color: isDark ? '#71717a' : '#a1a1aa' }, // Zinc
    { name: 'Failed', value: metrics.failedEndpoints, color: isDark ? '#f43f5e' : '#e11d48' }, // Rose
  ];

  const colors = isDark ? {
    grid: '#27272a',
    text: '#a1a1aa',
    tooltip: '#18181b',
    tooltipBorder: '#3f3f46',
  } : {
    grid: '#e4e4e7',
    text: '#52525b',
    tooltip: '#ffffff',
    tooltipBorder: '#d4d4d8',
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 10, right: 10, left: 60, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={false} />
        <XAxis
          type="number"
          stroke={colors.text}
          tick={{ fill: colors.text, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke={colors.text}
          tick={{ fill: colors.text, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={80}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: colors.tooltip,
            border: `1px solid ${colors.tooltipBorder}`,
            borderRadius: 12,
          }}
          formatter={(value) => [Number(value), 'Endpoints']}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={800}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
