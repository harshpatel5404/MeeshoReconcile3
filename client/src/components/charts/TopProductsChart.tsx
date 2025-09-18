import { useAuthQuery } from '@/hooks/use-auth-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TopProductsData } from '@shared/schema';

export default function TopProductsChart() {
  const { data: chartData = [], isLoading } = useAuthQuery<TopProductsData[]>({
    queryKey: ['/api/dashboard/top-products'],
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
    displayName: item.name && item.name.length > 15 ? `${item.name.substring(0, 15)}...` : (item.name || 'Unknown Product')
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
            formatter={(value: number) => [`${value} orders`, 'Orders']}
            labelFormatter={(label) => {
              const item = chartFormattedData.find(d => d.displayName === label);
              return `Product: ${item?.name || label}`;
            }}
          />
          <Bar 
            dataKey="orders" 
            fill="hsl(147 78% 42%)"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}