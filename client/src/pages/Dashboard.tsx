import { useAuthQuery } from '@/hooks/use-auth-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';
import RevenueChart from '@/components/charts/RevenueChart';
import OrderStatusChart from '@/components/charts/OrderStatusChart';
import { 
  DollarSign, 
  TrendingUp, 
  ShoppingBag, 
  CheckCircle,
  Clock,
  FileText,
  Package
} from 'lucide-react';

export default function Dashboard() {
  const { data: summary, isLoading } = useAuthQuery<{
    totalRevenue: number;
    netProfit: number;
    totalOrders: number;
    successRate: number;
    revenueGrowth: number;
    profitGrowth: number;
    ordersGrowth: number;
    successRateGrowth: number;
  }>({
    queryKey: ['/api/dashboard/summary'],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header title="Dashboard" subtitle="Overview of your payment and order analytics" />
        <div className="flex-1 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-8 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const summaryData = summary || {
    totalRevenue: 0,
    netProfit: 0,
    totalOrders: 0,
    successRate: 0,
    revenueGrowth: 0,
    profitGrowth: 0,
    ordersGrowth: 0,
    successRateGrowth: 0,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatGrowth = (growth: number) => {
    return growth > 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen flex flex-col gradient-bg">
      <Header title="Dashboard" subtitle="Overview of your payment and order analytics" />
      
      <div className="flex-1 p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="metric-card" data-testid="card-revenue">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Revenue</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-total-revenue">
                    {formatCurrency(summaryData.totalRevenue)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex items-center mt-2">
                <span className={`text-sm ${summaryData.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatGrowth(summaryData.revenueGrowth)}
                </span>
                <span className="text-muted-foreground text-sm ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="metric-card" data-testid="card-profit">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Net Profit</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-net-profit">
                    {formatCurrency(summaryData.netProfit)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex items-center mt-2">
                <span className={`text-sm ${summaryData.profitGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatGrowth(summaryData.profitGrowth)}
                </span>
                <span className="text-muted-foreground text-sm ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="metric-card" data-testid="card-orders">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Orders</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-total-orders">
                    {summaryData.totalOrders.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex items-center mt-2">
                <span className={`text-sm ${summaryData.ordersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatGrowth(summaryData.ordersGrowth)}
                </span>
                <span className="text-muted-foreground text-sm ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="metric-card" data-testid="card-success-rate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Success Rate</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-success-rate">
                    {summaryData.successRate.toFixed(1)}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex items-center mt-2">
                <span className={`text-sm ${summaryData.successRateGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatGrowth(summaryData.successRateGrowth)}
                </span>
                <span className="text-muted-foreground text-sm ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="modern-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-chart-1/20 to-chart-1/40 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-chart-1" />
                </div>
                <h3 className="text-lg font-semibold">Revenue Trend</h3>
              </div>
              <RevenueChart />
            </CardContent>
          </Card>

          <Card className="modern-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-chart-2/20 to-chart-2/40 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 text-chart-2" />
                </div>
                <h3 className="text-lg font-semibold">Order Status Distribution</h3>
              </div>
              <OrderStatusChart />
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="modern-card" data-testid="card-recent-activity">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-muted to-muted/60 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Recent Activity</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">August payments processed</p>
                    <p className="text-sm text-muted-foreground">151 orders reconciled successfully</p>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">2 hours ago</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Product costs updated</p>
                    <p className="text-sm text-muted-foreground">45 SKU cost prices modified</p>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">5 hours ago</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Payment file uploaded</p>
                    <p className="text-sm text-muted-foreground">meesho_PREVIOUS_PAYMENT_aug.xlsx</p>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">1 day ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
