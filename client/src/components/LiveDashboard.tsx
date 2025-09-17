import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, 
  Calculator, RotateCcw, Activity, Target, TrendingDown as LossIcon 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';

interface LiveMetrics {
  totalProducts: number;
  totalOrders: number;
  totalSales: number;
  totalGST: number;
  profitLoss: number;
  trends: {
    sales: { date: string; value: number }[];
    gst: { date: string; value: number }[];
    profit: { date: string; value: number }[];
  };
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-IN').format(num);
};

// Color schemes for charts
const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  teal: '#14B8A6',
};

const CHART_COLORS = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.purple, COLORS.teal];

export default function LiveDashboard() {
  const [isRecalculating, setIsRecalculating] = useState(false);
  const queryClient = useQueryClient();
  const { token } = useAuth();

  const { data: liveMetrics, isLoading, error, refetch } = useQuery<LiveMetrics>({
    queryKey: ['/api/dashboard/live-metrics'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/dashboard/live-metrics', undefined, token);
      return response.json();
    },
    enabled: !!token,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    staleTime: 10000, // Consider stale after 10 seconds
  });

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      await apiRequest('POST', '/api/dashboard/recalculate', undefined, token);
      await refetch();
      queryClient.invalidateQueries(); // Refresh all related queries
    } catch (error) {
      console.error('Failed to recalculate metrics:', error);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Auto-refresh when window regains focus
  useEffect(() => {
    const handleFocus = () => refetch();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Live Dashboard</h1>
          <div className="animate-pulse bg-muted h-10 w-32 rounded"></div>
        </div>
        <div className="grid responsive-grid lg:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid responsive-grid lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-64 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive">Failed to load live metrics</h2>
          <p className="text-muted-foreground mt-2">Please try refreshing or contact support if the issue persists.</p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RotateCcw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const metrics = liveMetrics!;
  const isProfitable = metrics.profitLoss > 0;

  // Prepare chart data
  const combinedTrendData = metrics.trends.sales.map((sales, index) => ({
    date: new Date(sales.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    sales: sales.value,
    gst: metrics.trends.gst[index]?.value || 0,
    profit: metrics.trends.profit[index]?.value || 0,
  }));

  const profitLossData = [
    { name: 'Revenue', value: metrics.totalSales, color: COLORS.success },
    { name: 'Costs', value: metrics.totalSales - metrics.profitLoss, color: COLORS.danger },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Live Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time business metrics and analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="animate-pulse">
            <Activity className="w-3 h-3 mr-1" />
            Live
          </Badge>
          <Button 
            onClick={handleRecalculate} 
            disabled={isRecalculating}
            variant="outline"
            size="sm"
          >
            <RotateCcw className={`w-4 h-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
            {isRecalculating ? 'Recalculating...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid responsive-grid lg:grid-cols-5 gap-6">
        <Card className="metric-card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold mt-1">{formatNumber(metrics.totalProducts)}</p>
              </div>
              <Package className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold mt-1">{formatNumber(metrics.totalOrders)}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(metrics.totalSales)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total GST</p>
                <p className="text-2xl font-bold mt-1 text-orange-600">{formatCurrency(metrics.totalGST)}</p>
              </div>
              <Calculator className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={`metric-card hover-lift ${isProfitable ? 'border-green-200' : 'border-red-200'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Profit/Loss</p>
                <p className={`text-2xl font-bold mt-1 ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(metrics.profitLoss)}
                </p>
              </div>
              {isProfitable ? (
                <TrendingUp className="w-8 h-8 text-green-500" />
              ) : (
                <LossIcon className="w-8 h-8 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid responsive-grid lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <Card className="modern-card hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Sales, GST & Profit Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={combinedTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#666"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#666"
                  fontSize={12}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip 
                  formatter={(value, name) => [formatCurrency(Number(value)), name]}
                  labelStyle={{ color: '#666' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke={COLORS.success} 
                  strokeWidth={3}
                  dot={{ fill: COLORS.success, strokeWidth: 2, r: 4 }}
                  name="Sales"
                  animationDuration={1000}
                />
                <Line 
                  type="monotone" 
                  dataKey="gst" 
                  stroke={COLORS.warning} 
                  strokeWidth={2}
                  dot={{ fill: COLORS.warning, strokeWidth: 2, r: 3 }}
                  name="GST"
                  animationDuration={1200}
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke={COLORS.primary} 
                  strokeWidth={2}
                  dot={{ fill: COLORS.primary, strokeWidth: 2, r: 3 }}
                  name="Profit"
                  animationDuration={1400}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Profit/Loss Breakdown */}
        <Card className="modern-card hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Revenue vs Costs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={profitLossData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={1000}
                >
                  {profitLossData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-muted-foreground">Profit Margin</p>
                <p className="text-lg font-bold text-green-600">
                  {((metrics.profitLoss / metrics.totalSales) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-muted-foreground">Cost Ratio</p>
                <p className="text-lg font-bold text-blue-600">
                  {(((metrics.totalSales - metrics.profitLoss) / metrics.totalSales) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Indicators */}
      <Card className="modern-card">
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid responsive-grid lg:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
              <h3 className="font-semibold text-blue-700 dark:text-blue-300">Average Order Value</h3>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {formatCurrency(metrics.totalSales / (metrics.totalOrders || 1))}
              </p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
              <h3 className="font-semibold text-green-700 dark:text-green-300">Revenue per Product</h3>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {formatCurrency(metrics.totalSales / (metrics.totalProducts || 1))}
              </p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
              <h3 className="font-semibold text-purple-700 dark:text-purple-300">GST Rate</h3>
              <p className="text-2xl font-bold text-purple-600 mt-2">
                {((metrics.totalGST / metrics.totalSales) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}