import { useAuthQuery } from '@/hooks/use-auth-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="date" 
            className="text-xs"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }}
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
            formatter={(value: number, name: string) => {
              if (name === 'Order Volume') {
                return [`${value}`, 'Daily Order Volume'];
              } else if (name === 'AOV') {
                return [`₹${value.toFixed(0)}`, 'Average Order Value'];
              }
              return [value, name];
            }}
            labelFormatter={(label) => {
              const date = new Date(label);
              return date.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              });
            }}
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              padding: '8px 12px'
            }}
            labelStyle={{
              color: 'hsl(var(--foreground))',
              fontWeight: '500',
              marginBottom: '4px'
            }}
          />
          <Legend />
          <Area 
            yAxisId="volume"
            type="monotone" 
            dataKey="orderVolume" 
            stroke="hsl(214 100% 59%)" 
            fill="hsl(214 100% 59% / 0.3)"
            strokeWidth={2}
            name="Order Volume"
          />
          <Area 
            yAxisId="aov"
            type="monotone" 
            dataKey="aov" 
            stroke="hsl(147 78% 42%)" 
            fill="hsl(147 78% 42% / 0.3)"
            strokeWidth={2}
            name="AOV"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}