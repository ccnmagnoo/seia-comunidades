import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';
import type { ResolvedTheme } from '@/shared/theme';
import { cn } from '../lib/utils';

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
]);

export function Chart({
  option,
  theme,
  className,
}: {
  option: EChartsOption;
  theme: ResolvedTheme;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, undefined, { renderer: 'canvas' });
    chart.setOption(option);

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(ref.current);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [option, theme]);

  return <div ref={ref} className={cn('h-72 w-full', className)} />;
}

export function chartTheme(theme: ResolvedTheme) {
  const dark = theme === 'dark';
  return {
    dark,
    axisLine: {
      lineStyle: { color: dark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(15, 23, 42, 0.18)' },
    },
    axisLabel: {
      color: dark ? '#94a3b8' : '#64748b',
      fontSize: 10,
    },
    splitLine: {
      lineStyle: { color: dark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(15, 23, 42, 0.08)' },
    },
    tooltip: {
      backgroundColor: dark ? '#0f172a' : '#ffffff',
      borderColor: dark ? 'rgba(148, 163, 184, 0.25)' : 'rgba(15, 23, 42, 0.12)',
      textStyle: { color: dark ? '#e2e8f0' : '#0f172a', fontSize: 12 },
    },
    bar: dark ? '#38bdf8' : '#0284c7',
    line: dark ? '#a78bfa' : '#6d28d9',
    areaTop: dark ? 'rgba(167, 139, 250, 0.32)' : 'rgba(109, 40, 217, 0.18)',
    areaBottom: 'rgba(109, 40, 217, 0)',
  };
}
