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
  className,
}: {
  option: EChartsOption;
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
  }, [option]);

  return <div ref={ref} className={cn('h-72 w-full', className)} />;
}

export const chartAxisStyle = {
  axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.18)' } },
  axisTick: { show: false },
  axisLabel: { color: '#94a3b8', fontSize: 10 },
  splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.08)' } },
};
