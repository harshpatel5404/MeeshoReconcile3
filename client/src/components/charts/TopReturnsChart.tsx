import { useAuthQuery } from '@/hooks/use-auth-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TopReturnsData } from '@shared/schema';

export default function TopReturnsChart() {
  const { data: chartData = [], isLoading } = useAuthQuery<TopReturnsData[]>({
    queryKey: ['/api/dashboard/top-returns'],
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

  // Format data for chart display
  const chartFormattedData = chartData.map(item => ({
    ...item,
    displayName: item.name.length > 15 ? `${item.name.substring(0, 15)}...` : item.name
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartFormattedData} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            type="number"
            className="text-xs"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            type="category"
            dataKey="displayName"
            className="text-xs"
            tick={{ fontSize: 10 }}
            width={120}
          />
          <Tooltip 
            formatter={(value: number, name: string) => {
              if (name === 'Combined Returns/RTOs') {
                return [`${value}`, 'Total Returns & RTOs'];
              }
              return [value, name];
            }}
            labelFormatter={(label) => {
              const item = chartFormattedData.find(d => d.displayName === label);
              return `${item?.name || label} (${item?.sku})`;
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
          <Bar 
            dataKey="combinedCount" 
            fill="hsl(0 84% 60%)"
            radius={[0, 4, 4, 0]}
            name="Combined Returns/RTOs"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}