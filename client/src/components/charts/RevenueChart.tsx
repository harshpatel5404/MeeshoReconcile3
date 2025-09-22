import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAuthQuery } from '@/hooks/use-auth-query';

interface RevenueTrendData {
  date: string;
  revenue: number;
  orders: number;
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
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="date" 
            className="text-xs"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const date = new Date(value);
              const day = String(date.getDate()).padStart(2, '0');
              const month = String(date.getMonth() + 1).padStart(2, '0');
              return `${day}/${month}`;
            }}
          />
          <YAxis 
            yAxisId="revenue"
            orientation="left"
            className="text-xs"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
          />
          <YAxis 
            yAxisId="orders"
            orientation="right"
            className="text-xs"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip 
            formatter={(value: number, name: string) => {
              if (name === 'Revenue') {
                return [`₹${value.toLocaleString()}`, 'Daily Revenue'];
              } else if (name === 'Orders') {
                return [`${value}`, 'Total Orders'];
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
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              padding: '8px 12px'
            }}
            labelStyle={{
              color: '#1e293b',
              fontWeight: '500',
              marginBottom: '4px'
            }}
          />
          <Legend />
          <Area 
            yAxisId="revenue"
            type="monotone" 
            dataKey="revenue" 
            stroke="hsl(214 100% 59%)" 
            fill="hsl(214 100% 59% / 0.3)"
            strokeWidth={2}
            name="Revenue"
          />
          <Area 
            yAxisId="orders"
            type="monotone" 
            dataKey="orders" 
            stroke="hsl(147 78% 42%)" 
            fill="hsl(147 78% 42% / 0.3)"
            strokeWidth={2}
            name="Orders"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
