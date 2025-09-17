import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuthQuery } from '@/hooks/use-auth-query';

interface RevenueTrendData {
  month: string;
  revenue: number;
  profit: number;
}

export default function RevenueChart() {
  const { data: chartData = [], isLoading } = useAuthQuery<RevenueTrendData[]>({
    queryKey: ['/api/dashboard/revenue-trend'],
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
            dataKey="month" 
            className="text-xs"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            className="text-xs"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip 
            formatter={(value: number, name: string) => [
              `₹${value.toLocaleString()}`, 
              name === 'revenue' ? 'Revenue' : 'Profit'
            ]}
            labelFormatter={(label) => `Month: ${label}`}
          />
          <Line 
            type="monotone" 
            dataKey="revenue" 
            stroke="hsl(214 100% 59%)" 
            strokeWidth={2}
            dot={{ fill: 'hsl(214 100% 59%)', strokeWidth: 2, r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="profit" 
            stroke="hsl(147 78% 42%)" 
            strokeWidth={2}
            dot={{ fill: 'hsl(147 78% 42%)', strokeWidth: 2, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
