import { useAuthQuery } from '@/hooks/use-auth-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { DailyVolumeData } from '@shared/schema';

export default function DailyVolumeChart() {
  const { data: chartData = [], isLoading } = useAuthQuery<DailyVolumeData[]>({
    queryKey: ['/api/dashboard/daily-volume'],
  });

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading chart data...</div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-muted-foreground">No data available</div>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="date" 
            className="text-xs"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          />
          <YAxis 
            yAxisId="volume"
            orientation="left"
            className="text-xs"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${value}`}
          />
          <YAxis 
            yAxisId="aov"
            orientation="right"
            className="text-xs"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `₹${value.toFixed(0)}`}
          />
          <Tooltip 
            formatter={(value: number, name: string) => [
              name === 'orderVolume' ? `${value} orders` : `₹${value.toFixed(2)}`, 
              name === 'orderVolume' ? 'Order Volume' : 'AOV'
            ]}
            labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
          />
          <Legend />
          <Line 
            yAxisId="volume"
            type="monotone" 
            dataKey="orderVolume" 
            stroke="hsl(214 100% 59%)" 
            strokeWidth={2}
            dot={{ fill: 'hsl(214 100% 59%)', strokeWidth: 2, r: 4 }}
            name="Order Volume"
          />
          <Line 
            yAxisId="aov"
            type="monotone" 
            dataKey="aov" 
            stroke="hsl(147 78% 42%)" 
            strokeWidth={2}
            dot={{ fill: 'hsl(147 78% 42%)', strokeWidth: 2, r: 4 }}
            name="AOV"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}