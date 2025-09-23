import { useState } from 'react';
import { useAuthQuery } from '@/hooks/use-auth-query';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import RevenueChart from '@/components/charts/RevenueChart';
import OrderStatusChart from '@/components/charts/OrderStatusChart';
import DailyVolumeChart from '@/components/charts/DailyVolumeChart';
import TopProductsChart from '@/components/charts/TopProductsChart';
import TopReturnsChart from '@/components/charts/TopReturnsChart';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { 
  DollarSign, 
  TrendingUp, 
  ShoppingBag, 
  CheckCircle,
  Clock,
  FileText,
  Package,
  CreditCard,
  PieChart,
  BarChart3,
  TrendingDown,
  Activity,
  BarChart,
  Database,
  Zap,
  RefreshCw
} from 'lucide-react';

import type { 
  ComprehensiveFinancialSummary, 
  SettlementComponentsData, 
  EarningsOverviewData, 
  OperationalCostsData,
  OrdersOverview 
} from '@shared/schema';

export default function Dashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const { token } = useAuth();

  const { data: summary, isLoading: summaryLoading } = useAuthQuery<ComprehensiveFinancialSummary>({
    queryKey: ['/api/dashboard/comprehensive-summary'],
  });

  const { data: settlementComponents = [], isLoading: settlementLoading } = useAuthQuery<SettlementComponentsData[]>({
    queryKey: ['/api/dashboard/settlement-components'],
  });

  const { data: earningsOverview = [], isLoading: earningsLoading } = useAuthQuery<EarningsOverviewData[]>({
    queryKey: ['/api/dashboard/earnings-overview'],
  });

  const { data: operationalCosts = [], isLoading: costsLoading } = useAuthQuery<OperationalCostsData[]>({
    queryKey: ['/api/dashboard/operational-costs'],
  });

  const { data: ordersOverview, isLoading: ordersOverviewLoading } = useAuthQuery<OrdersOverview>({
    queryKey: ['/api/dashboard/orders-overview'],
  });

  const isLoading = summaryLoading || settlementLoading || earningsLoading || costsLoading || ordersOverviewLoading;

  const handleRefreshData = async () => {
    if (!token) {
      toast({
        title: "Authentication Error",
        description: "Please log in again to refresh data.",
        variant: "destructive",
      });
      return;
    }

    setIsRefreshing(true);
    try {
      // Call the recalculate API endpoint
      const response = await fetch('/api/dashboard/recalculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Session Expired",
            description: "Please log in again to refresh data.",
            variant: "destructive",
          });
          // Handle auth failure - could add logout logic here if needed
          return;
        }
        throw new Error('Failed to refresh data');
      }

      // Invalidate all dashboard queries to force refetch
      await queryClient.invalidateQueries({ 
        predicate: (query) => 
          typeof query.queryKey[0] === 'string' && 
          query.queryKey[0].startsWith('/api/dashboard')
      });

      toast({
        title: "Data Refreshed",
        description: "Dashboard data has been updated with the latest processed files.",
      });
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Refresh Failed", 
        description: "Failed to refresh dashboard data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
        <Header title="Dashboard" subtitle="Financial Analytics & Insights" />
        <div className="flex-1 p-6">
          <div className="space-y-6">
            {/* Loading Financial Summary */}
            <div className="grid lg:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <Card key={i} className="modern-card animate-pulse">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-200 rounded-lg animate-shimmer"></div>
                      <div className="flex-1">
                        <div className="h-5 bg-slate-200 rounded w-3/4 mb-2 animate-shimmer"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/2 animate-shimmer"></div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[...Array(3)].map((_, j) => (
                        <div key={j} className="space-y-2">
                          <div className="h-3 bg-slate-200 rounded w-1/4 animate-shimmer"></div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="h-16 bg-slate-200 rounded-xl animate-shimmer"></div>
                            <div className="h-16 bg-slate-200 rounded-xl animate-shimmer"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Loading Chart */}
            <Card className="modern-card animate-pulse">
              <CardHeader className="pb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-lg animate-shimmer"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-slate-200 rounded w-1/2 mb-2 animate-shimmer"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/3 animate-shimmer"></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-80 bg-slate-200 rounded-xl animate-shimmer"></div>
              </CardContent>
            </Card>
            
            {/* Loading Cards Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="modern-card animate-pulse">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-200 rounded-lg animate-shimmer"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-slate-200 rounded w-3/4 mb-1 animate-shimmer"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/2 animate-shimmer"></div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[...Array(4)].map((_, j) => (
                        <div key={j} className="flex justify-between items-center">
                          <div className="h-3 bg-slate-200 rounded w-1/3 animate-shimmer"></div>
                          <div className="h-4 bg-slate-200 rounded w-1/4 animate-shimmer"></div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const summaryData = summary || {
    totalSaleAmount: 0,
    settlementAmount: 0,
    totalPurchaseCost: 0,
    totalPackagingCost: 0,
    shippingCost: 0,
    totalTds: 0,
    netProfit: 0,
    totalOrders: 0,
    delivered: 0,
    shipped: 0,
    exchanged: 0,
    cancelled: 0,
    returns: 0,
    avgOrderValue: 0,
    returnRate: 0,
    ordersAwaitingPaymentRecord: 0,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered': return 'text-green-600';
      case 'shipped': return 'text-blue-600';
      case 'cancelled': return 'text-red-600';
      case 'exchanged': return 'text-yellow-600';
      default: return 'text-muted-foreground';
    }
  };

  const refreshButton = (
    <Button 
      onClick={handleRefreshData} 
      disabled={isRefreshing}
      size="sm"
      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
      data-testid="button-refresh-dashboard"
    >
      <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
      {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
    </Button>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      <Header 
        title="Dashboard" 
        subtitle="Financial Analytics & Insights" 
        rightContent={refreshButton}
      />
      
      <div className="flex-1 p-6">
        <div className="space-y-6">
        {/* Top Row - Overall Financial Summary & Orders Overview */}
        <div className="grid responsive-grid lg:grid-cols-2 gap-6 animate-fadeIn">
          {/* Overall Financial Summary - Optimized */}
          <Card className="modern-card hover-lift animate-slideInUp group" style={{"--stagger": 1} as any}>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 text-green-600">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <span>Financial Summary</span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground font-normal">Net Profit</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(summaryData.netProfit)}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Revenue Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Revenue</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-green-50 border border-green-100 hover:bg-green-100 transition-colors">
                    <p className="text-xs text-green-700 font-medium">Total Sales</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(summaryData.totalSaleAmount)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors">
                    <p className="text-xs text-blue-700 font-medium">Settlement</p>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(summaryData.settlementAmount)}</p>
                  </div>
                </div>
              </div>
              
              {/* Costs Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Costs</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <span className="text-xs text-muted-foreground">Purchase</span>
                    <span className="text-sm font-semibold text-orange-600">{formatCurrency(summaryData.totalPurchaseCost)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <span className="text-xs text-muted-foreground">Packaging</span>
                    <span className="text-sm font-semibold text-purple-600">{formatCurrency(summaryData.totalPackagingCost)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <span className="text-xs text-muted-foreground">Shipping</span>
                    <span className="text-sm font-semibold text-indigo-600">{formatCurrency(summaryData.shippingCost)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <span className="text-xs text-muted-foreground">TDS</span>
                    <span className="text-sm font-semibold text-red-600">{formatCurrency(summaryData.totalTds)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orders Overview - New 9 Metrics */}
          <Card className="modern-card hover-lift animate-slideInUp group" style={{"--stagger": 2} as any}>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <span>Orders Overview</span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground font-normal">Delivered Orders</p>
                  <p className="text-2xl font-bold text-blue-600">{(ordersOverview?.delivered ?? 0).toLocaleString()}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Primary Order Status Metrics */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Order Status Metrics</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 hover:scale-105 transition-transform cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-blue-700 font-medium">Shipped</p>
                        <p className="text-lg font-bold text-blue-600">{(ordersOverview?.shipped ?? 0).toLocaleString()}</p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-yellow-50 border border-yellow-100 hover:scale-105 transition-transform cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-yellow-700 font-medium">Ready To Ship</p>
                        <p className="text-lg font-bold text-yellow-600">{(ordersOverview?.readyToShip ?? 0).toLocaleString()}</p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100 hover:scale-105 transition-transform cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-red-700 font-medium">Cancelled</p>
                        <p className="text-lg font-bold text-red-600">{(ordersOverview?.cancelled ?? 0).toLocaleString()}</p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 hover:scale-105 transition-transform cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-purple-700 font-medium">Exchanged</p>
                        <p className="text-lg font-bold text-purple-600">{(ordersOverview?.exchanged ?? 0).toLocaleString()}</p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Key Order Metrics */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Key Order Metrics</h4>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex justify-between items-center py-2 px-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg hover:from-slate-100 hover:to-slate-150 transition-all">
                    <span className="text-sm font-medium">Avg. Order Value</span>
                    <span className="text-base font-bold">{formatCurrency(ordersOverview?.avgOrderValue ?? 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg hover:from-red-100 hover:to-orange-100 transition-all">
                    <span className="text-sm font-medium">Return Rate</span>
                    <span className="text-base font-bold text-red-600">{formatPercentage(ordersOverview?.returnRate ?? 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg hover:from-orange-100 hover:to-red-100 transition-all">
                    <span className="text-sm font-medium">RTO (RTO Complete + Locked)</span>
                    <span className="text-base font-bold text-orange-600">{(ordersOverview?.rto ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg hover:from-yellow-100 hover:to-amber-100 transition-all">
                    <span className="text-sm font-medium">Awaiting Payment Orders</span>
                    <span className="text-base font-bold text-yellow-600">{(ordersOverview?.awaitingPaymentOrders ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue and Orders Trend - Optimized */}
        <Card className="modern-card hover-lift animate-scaleIn" style={{"--stagger": 3} as any}>
          <CardHeader className="pb-6">
            <CardTitle className="text-xl font-bold flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <span>Revenue & Orders Trend</span>
                  <p className="text-sm text-muted-foreground font-normal mt-1">Daily performance overview</p>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-100">
              <RevenueChart />
            </div>
          </CardContent>
        </Card>

        {/* Middle Row - Financial Components - Optimized */}
        <div className="grid responsive-grid lg:grid-cols-3 gap-6 animate-fadeIn" style={{"--stagger": 4} as any}>
          {/* Settlement Components Breakdown */}
          <Card className="modern-card hover-lift group">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <span>Settlement Breakdown</span>
                  <p className="text-sm text-muted-foreground font-normal">Component analysis</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {settlementComponents.map((component, index) => (
                  <div key={index} className="group/item flex justify-between items-center py-3 px-4 rounded-lg hover:bg-slate-50 transition-all cursor-pointer" style={{"--stagger": index + 1} as any}>
                    <span className="text-sm font-medium group-hover/item:font-semibold transition-all">{component.component}</span>
                    <span className="text-sm font-bold text-emerald-600 group-hover/item:text-emerald-700 transition-all">{formatCurrency(component.totalAmount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Earnings Overview */}
          <Card className="modern-card hover-lift group">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                  <PieChart className="w-5 h-5" />
                </div>
                <div>
                  <span>Earnings Overview</span>
                  <p className="text-sm text-muted-foreground font-normal">Profit & loss summary</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {earningsOverview.map((earning, index) => (
                  <div key={index} className="group/item flex justify-between items-center py-3 px-4 rounded-lg hover:bg-slate-50 transition-all cursor-pointer">
                    <span className="text-sm font-medium group-hover/item:font-semibold transition-all">{earning.description}</span>
                    <span className={`text-sm font-bold group-hover/item:scale-105 transition-transform ${
                      earning.amount >= 0 
                        ? 'text-green-600 group-hover/item:text-green-700' 
                        : 'text-red-600 group-hover/item:text-red-700'
                    }`}>
                      {formatCurrency(earning.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order Status Overview */}
          <Card className="modern-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order Status Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OrderStatusChart />
            </CardContent>
          </Card>
        </div>

        {/* Operational Costs & Daily Volume */}
        <div className="grid responsive-grid lg:grid-cols-2 gap-6 animate-fadeIn" style={{"--stagger": 6} as any}>
          {/* Operational Costs & Recoveries */}
          <Card className="modern-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                Operational Costs & Recoveries
                <span className="text-sm text-muted-foreground ml-2">(Metrics from the payment files (e.g., commission fees, claims))</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {operationalCosts.map((cost, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                    <span className="text-sm font-medium">{cost.type}</span>
                    <span className="text-sm font-bold text-red-600">{formatCurrency(cost.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Daily Order Volume & AOV */}
          <Card className="modern-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Daily Order Volume & AOV
                <span className="text-sm text-muted-foreground ml-2">(Daily order count and average order value)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DailyVolumeChart />
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row - Top Products Analytics */}
        <div className="grid responsive-grid lg:grid-cols-2 gap-6 animate-fadeIn" style={{"--stagger": 8} as any}>
          {/* Top 10 Performing Products */}
          <Card className="modern-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Top 10 Performing Products (by SKU)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TopProductsChart />
            </CardContent>
          </Card>

          {/* Top 10 SKUs by Combined Returns/RTOs */}
          <Card className="modern-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                Top 10 SKUs by Combined Returns/RTOs
                <span className="text-sm text-muted-foreground ml-2">(SKUs with highest quantity of returns or RTOs)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TopReturnsChart />
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </div>
  );
}
