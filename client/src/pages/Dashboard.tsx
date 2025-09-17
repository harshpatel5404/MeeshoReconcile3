import { useState } from 'react';
import { useAuthQuery } from '@/hooks/use-auth-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/Header';
import LiveDashboard from '@/components/LiveDashboard';
import DynamicTable from '@/components/DynamicTable';
import RevenueChart from '@/components/charts/RevenueChart';
import OrderStatusChart from '@/components/charts/OrderStatusChart';
import DailyVolumeChart from '@/components/charts/DailyVolumeChart';
import TopProductsChart from '@/components/charts/TopProductsChart';
import TopReturnsChart from '@/components/charts/TopReturnsChart';
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
  Zap
} from 'lucide-react';

import type { 
  ComprehensiveFinancialSummary, 
  SettlementComponentsData, 
  EarningsOverviewData, 
  OperationalCostsData 
} from '@shared/schema';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('live');

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

  // Fetch current uploads to determine dynamic columns
  const { data: currentUploads = [] } = useAuthQuery<any[]>({
    queryKey: ['/api/current-uploads'],
  });

  const isLoading = summaryLoading || settlementLoading || earningsLoading || costsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header title="Dashboard" subtitle="Comprehensive Financial Analytics & Insights" />
        <div className="flex-1 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(8)].map((_, i) => (
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


  // Dynamic column structures based on uploaded files
  const productColumns = [
    { name: 'sku', type: 'text' as const, required: true, description: 'Product SKU' },
    { name: 'name', type: 'text' as const, required: true, description: 'Product Name' },
    { name: 'price', type: 'currency' as const, required: true, description: 'Product Price' },
    { name: 'purchaseCost', type: 'currency' as const, required: false, description: 'Purchase Cost' },
    { name: 'packagingCost', type: 'currency' as const, required: false, description: 'Packaging Cost' },
  ];

  const orderColumns = [
    { name: 'orderId', type: 'text' as const, required: true, description: 'Order ID' },
    { name: 'sku', type: 'text' as const, required: true, description: 'Product SKU' },
    { name: 'quantity', type: 'number' as const, required: true, description: 'Quantity' },
    { name: 'salePrice', type: 'currency' as const, required: true, description: 'Sale Price' },
    { name: 'status', type: 'text' as const, required: true, description: 'Order Status' },
    { name: 'paymentDate', type: 'date' as const, required: false, description: 'Payment Date' },
  ];

  return (
    <div className="min-h-screen flex flex-col gradient-bg">
      <Header title="Meesho Payment Reconciliation SaaS" subtitle="Dynamic Financial Analytics & Real-time Insights" />
      
      <div className="flex-1 responsive-padding">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="live" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Live Dashboard
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Dynamic Data
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-6">
            <LiveDashboard />
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <div className="grid responsive-grid lg:grid-cols-1 gap-6">
              <DynamicTable
                title="Products"
                dataType="products"
                columns={productColumns}
                showSearch={true}
                editable={true}
              />
              <DynamicTable
                title="Orders"
                dataType="orders"
                columns={orderColumns}
                showSearch={true}
                editable={true}
              />
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
        {/* Top Row - Overall Financial Summary & Orders Overview */}
        <div className="grid responsive-grid lg:grid-cols-2 gap-6 animate-fadeIn">
          {/* Overall Financial Summary */}
          <Card className="modern-card hover-lift animate-slideInUp" style={{"--stagger": 1} as any}>
            <CardHeader>
              <CardTitle className="responsive-text text-lg font-semibold flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Overall Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="responsive-padding-sm space-y-4">
              <div className="grid responsive-grid-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sale Amount</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(summaryData.totalSaleAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Settlement Amount</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(summaryData.settlementAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Purchase Cost</p>
                  <p className="text-xl font-bold text-orange-600">{formatCurrency(summaryData.totalPurchaseCost)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Packaging Cost</p>
                  <p className="text-xl font-bold text-purple-600">{formatCurrency(summaryData.totalPackagingCost)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Shipping Cost</p>
                  <p className="text-xl font-bold text-indigo-600">{formatCurrency(summaryData.shippingCost)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total TDS</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(summaryData.totalTds)}</p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Net Profit</p>
                  <p className="text-2xl font-bold text-green-700">{formatCurrency(summaryData.netProfit)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orders Overview */}
          <Card className="modern-card hover-lift animate-slideInUp" style={{"--stagger": 2} as any}>
            <CardHeader>
              <CardTitle className="responsive-text text-lg font-semibold flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Orders Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="responsive-padding-sm space-y-4">
              <div className="grid responsive-grid lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-xl font-bold">{summaryData.totalOrders.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Delivered</p>
                  <p className="text-xl font-bold text-green-600">{summaryData.delivered.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Shipped</p>
                  <p className="text-xl font-bold text-blue-600">{summaryData.shipped.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Exchanged</p>
                  <p className="text-xl font-bold text-yellow-600">{summaryData.exchanged.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cancelled</p>
                  <p className="text-xl font-bold text-red-600">{summaryData.cancelled.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Returns (RTO)</p>
                  <p className="text-xl font-bold text-orange-600">{summaryData.returns.toLocaleString()}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Order Value</p>
                  <p className="text-lg font-bold">{formatCurrency(summaryData.avgOrderValue)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Return Rate</p>
                  <p className="text-lg font-bold text-red-600">{summaryData.returnRate.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Orders Awaiting Payment Record</p>
                  <p className="text-lg font-bold text-yellow-600">{summaryData.ordersAwaitingPaymentRecord.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue and Orders Trend */}
        <Card className="modern-card hover-lift animate-scaleIn" style={{"--stagger": 3} as any}>
          <CardHeader>
            <CardTitle className="responsive-text text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Revenue and Orders Trend
              <span className="responsive-text-sm text-sm text-muted-foreground ml-2">(Daily view of sale revenue and order count)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="responsive-padding">
            <RevenueChart />
          </CardContent>
        </Card>

        {/* Middle Row - Settlement Components, Earnings Overview, Order Status */}
        <div className="grid responsive-grid lg:grid-cols-3 gap-6 animate-fadeIn" style={{"--stagger": 4} as any}>
          {/* Settlement Components Breakdown */}
          <Card className="modern-card hover-lift interactive-scale">
            <CardHeader>
              <CardTitle className="responsive-text text-lg font-semibold flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Settlement Components Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="responsive-padding-sm">
              <div className="space-y-3">
                {settlementComponents.map((component, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-border last:border-0 animate-slideInUp" style={{"--stagger": index + 1} as any}>
                    <span className="responsive-text-sm text-sm font-medium">{component.component}</span>
                    <span className="responsive-text-sm text-sm font-bold">{formatCurrency(component.totalAmount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Earnings Overview */}
          <Card className="modern-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Earnings Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {earningsOverview.map((earning, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                    <span className="text-sm font-medium">{earning.description}</span>
                    <span className={`text-sm font-bold ${earning.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
