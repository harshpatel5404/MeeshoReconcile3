import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockData = [
  { month: 'Jan', revenue: 45000, profit: 12000 },
  { month: 'Feb', revenue: 52000, profit: 15500 },
  { month: 'Mar', revenue: 48000, profit: 13200 },
  { month: 'Apr', revenue: 61000, profit: 18300 },
  { month: 'May', revenue: 55000, profit: 16500 },
  { month: 'Jun', revenue: 67000, profit: 20100 },
  { month: 'Jul', revenue: 72000, profit: 21600 },
  { month: 'Aug', revenue: 245678, profit: 45234 },
];

export default function RevenueChart() {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={mockData}>
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
