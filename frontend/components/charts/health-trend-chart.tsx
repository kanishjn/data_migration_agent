'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useTheme } from '@/lib/theme-context';
import type { HealthTrendData } from '@/types';

interface HealthTrendChartProps {
  data: HealthTrendData[];
  height?: number;
  showLegend?: boolean;
}

export function HealthTrendChart({
  data,
  height = 300,
  showLegend = true,
}: HealthTrendChartProps) {
  const { resolvedTheme } = useTheme();

  const colors = resolvedTheme === 'dark' ? {
    apiHealth: '#06b6d4', // Cyan
    webhookHealth: '#10b981', // Emerald
    grid: '#27272a',
    text: '#a1a1aa',
    tooltip: '#18181b',
    tooltipBorder: '#3f3f46',
  } : {
    apiHealth: '#0891b2', // Cyan darker
    webhookHealth: '#059669', // Emerald darker
    grid: '#e4e4e7',
    text: '#52525b',
    tooltip: '#ffffff',
    tooltipBorder: '#d4d4d8',
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="apiHealthGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colors.apiHealth} stopOpacity={0.3} />
            <stop offset="95%" stopColor={colors.apiHealth} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="webhookHealthGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colors.webhookHealth} stopOpacity={0.3} />
            <stop offset="95%" stopColor={colors.webhookHealth} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatTime}
          stroke={colors.text}
          tick={{ fill: colors.text, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[80, 100]}
          stroke={colors.text}
          tick={{ fill: colors.text, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: colors.tooltip,
            border: `1px solid ${colors.tooltipBorder}`,
            borderRadius: 12,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
          labelFormatter={(label) => formatTime(String(label))}
          formatter={(value) => [`${Number(value).toFixed(1)}%`, '']}
        />
        {showLegend && (
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            iconSize={8}
          />
        )}
        <Area
          type="monotone"
          dataKey="apiHealth"
          name="API Health"
          stroke={colors.apiHealth}
          strokeWidth={2}
          fill="url(#apiHealthGradient)"
          animationDuration={800}
          animationEasing="ease-out"
        />
        <Area
          type="monotone"
          dataKey="webhookHealth"
          name="Webhook Health"
          stroke={colors.webhookHealth}
          strokeWidth={2}
          fill="url(#webhookHealthGradient)"
          animationDuration={800}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
