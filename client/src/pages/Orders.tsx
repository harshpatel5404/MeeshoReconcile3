import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import Header from '@/components/Header';
import { Search, Filter, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthQuery, useAuthApiRequest } from '@/hooks/use-auth-query';
import { useAuth } from '@/contexts/AuthContext';

interface OrderFilters {
  subOrderNo: string;
  status: string;
  paymentStatus: string;
  dateFrom: string;
  dateTo: string;
  [key: string]: string; // Add index signature to satisfy URLSearchParams
}

export default function Orders() {
  const [filters, setFilters] = useState<OrderFilters>({
    subOrderNo: '',
    status: '',
    paymentStatus: '',
    dateFrom: '',
    dateTo: '',
  });
  const [handleDuplicates, setHandleDuplicates] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useAuthQuery<any[]>({
    queryKey: ['/api/orders-dynamic', Object.keys(filters).length > 0 ? `?${new URLSearchParams(filters as Record<string, string>).toString()}` : ''],
  });

  const apiRequest = useAuthApiRequest();
  

  const handleApplyFilters = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/orders-dynamic'] });
  };

  const handleClearFilters = () => {
    setFilters({
      subOrderNo: '',
      status: '',
      paymentStatus: '',
      dateFrom: '',
      dateTo: '',
    });
    queryClient.invalidateQueries({ queryKey: ['/api/orders-dynamic'] });
  };

  const handleExportOrders = () => {
    const params = new URLSearchParams(filters as Record<string, string>);
    window.open(`/api/export/orders?${params}`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'DELIVERED':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">DELIVERED</Badge>;
      case 'RTO_COMPLETE':
      case 'RTO COMPLETE':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">RTO COMPLETE</Badge>;
      case 'CANCELLED':
      case 'CANCELED':
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">CANCELLED</Badge>;
      case 'RTO_LOCKED':
      case 'RTO LOCKED':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">RTO LOCKED</Badge>;
      case 'SHIPPED':
      case 'IN_TRANSIT':
      case 'IN TRANSIT':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">SHIPPED</Badge>;
      case 'OUT_FOR_DELIVERY':
      case 'OUT FOR DELIVERY':
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">OUT FOR DELIVERY</Badge>;
      case 'RETURN':
      case 'RETURNED':
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">RETURNED</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (paymentStatus?: string, hasPayment?: boolean, settlementAmount?: number, paymentDate?: string, orderStatus?: string) => {
    // Enhanced logic based on actual payment data instead of just order status
    
    // 1. If we have actual payment/settlement data, use that
    if (hasPayment && typeof settlementAmount === 'number' && isFinite(settlementAmount)) {
      if (settlementAmount > 0) {
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Paid</Badge>;
      } else if (settlementAmount === 0) {
        // Zero settlement could be RTO with full refund or cancelled with no charge
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Refunded</Badge>;
      } else {
        // Negative settlement (rare case)
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Refunded</Badge>;
      }
    }
    
    // 2. If payment date exists but no settlement amount, it's processing
    if (paymentDate && hasPayment) {
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Processing</Badge>;
    }
    
    // 3. Use enhanced payment status from orders table if available
    if (paymentStatus) {
      switch (paymentStatus.toUpperCase()) {
        case 'PAID':
          return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Paid</Badge>;
        case 'REFUNDED':
          return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Refunded</Badge>;
        case 'CANCELLED':
          return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">Cancelled</Badge>;
        case 'PROCESSING':
          return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Processing</Badge>;
        case 'LOST':
          return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Lost</Badge>;
        default:
          return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">Pending</Badge>;
      }
    }
    
    // 4. Fallback: No payment data available
    return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">Pending</Badge>;
  };

  const formatCurrency = (amount: string | number) => {
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(Number(amount));
    // Ensure single line display by replacing any line breaks
    return formatted.replace(/\s*\n\s*/g, ' ');
  };

  const calculateGrossProfitLoss = (settlementAmount?: number, costPrice?: number, packagingCost?: number, quantity = 1, orderStatus?: string) => {
    // Calculate if we have finite settlement data from payment file (including 0 and negative)
    if (typeof settlementAmount !== 'number' || !isFinite(settlementAmount)) {
      return {
        amount: null,
        isProfit: null,
        formatted: '-',
        note: 'No settlement data'
      };
    }

    // Check if order status is RTO or RETURNED - exclude product cost for these statuses
    const isRtoOrReturned = orderStatus && (
      orderStatus.toUpperCase() === 'RTO_COMPLETE' ||
      orderStatus.toUpperCase() === 'RTO COMPLETE' ||
      orderStatus.toUpperCase() === 'RETURN' ||
      orderStatus.toUpperCase() === 'RETURNED'
    );

    // Ecommerce Gross P/L = Revenue (Settlement) - COGS (Cost of Goods Sold)
    // For RTO/RETURNED orders: Only include packaging cost, exclude product cost
    // For normal orders: Include both product cost and packaging cost
    const totalCOGS = isRtoOrReturned 
      ? (packagingCost || 0) * quantity  // Only packaging cost for RTO/RETURNED
      : ((costPrice || 0) + (packagingCost || 0)) * quantity;  // Full COGS for others
    
    const grossPL = settlementAmount - totalCOGS;
    
    return {
      amount: grossPL,
      isProfit: grossPL >= 0,
      formatted: formatCurrency(grossPL),
      note: totalCOGS > 0 ? null : isRtoOrReturned ? 'RTO/Return - Cost excluded' : 'No cost data'
    };
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Orders Management" subtitle="View and manage your orders data" />
      
      <div className="flex-1 p-6">
        {/* Filters Section */}
        <Card className="shadow-sm mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="sub-order-id">Sub Order ID</Label>
                <Input
                  id="sub-order-id"
                  placeholder="Search sub order ID..."
                  value={filters.subOrderNo}
                  onChange={(e) => setFilters({ ...filters, subOrderNo: e.target.value })}
                  data-testid="input-sub-order-id"
                />
              </div>
              <div>
                <Label htmlFor="order-status">Order Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                  <SelectTrigger data-testid="select-order-status">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="DELIVERED">DELIVERED</SelectItem>
                    <SelectItem value="RTO_COMPLETE">RTO_COMPLETE</SelectItem>
                    <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                    <SelectItem value="RTO_LOCKED">RTO_LOCKED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="payment-status">Payment Status</Label>
                <Select value={filters.paymentStatus} onValueChange={(value) => setFilters({ ...filters, paymentStatus: value })}>
                  <SelectTrigger data-testid="select-payment-status">
                    <SelectValue placeholder="All Payments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="date-range">Date Range</Label>
                <Input
                  id="date-range"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  data-testid="input-date-range"
                />
              </div>
            </div>
            <div className="flex justify-between items-center mt-4">
              <div className="flex gap-2">
                <Button onClick={handleApplyFilters} data-testid="button-apply-filters">
                  Apply Filters
                </Button>
                <Button variant="secondary" onClick={handleClearFilters} data-testid="button-clear-filters">
                  Clear
                </Button>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <Checkbox 
                    checked={handleDuplicates}
                    onCheckedChange={(checked) => setHandleDuplicates(checked === true)}
                    data-testid="checkbox-handle-duplicates"
                  />
                  <span className="text-sm">Handle Duplicates</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="p-6 border-b border-border">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  Orders ({orders ? orders.length : 0} total)
                </h3>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={handleExportOrders}
                    data-testid="button-export-orders"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">S.No.</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">SKU</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Sub Order ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Qty</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Order Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Payment Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Listed Price</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Settlement</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Cost Price</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Gross P/L</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Order Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-8 text-center text-muted-foreground">
                        Loading orders...
                      </td>
                    </tr>
                  ) : orders && orders.length > 0 ? (
                    orders.map((order: any, index: number) => {
                      const costPrice = parseFloat(order.costPrice || '0');
                      const packagingCost = parseFloat(order.packagingCost || '0');
                      const quantity = parseInt(order.quantity || '1');
                      
                      // Enhanced settlement amount parsing with better validation
                      const settlementAmount = (() => {
                        if (order.settlementAmount === null || order.settlementAmount === undefined) {
                          return undefined;
                        }
                        const parsed = typeof order.settlementAmount === 'string' 
                          ? parseFloat(order.settlementAmount)
                          : Number(order.settlementAmount);
                        return isNaN(parsed) ? undefined : parsed;
                      })();
                      
                      // Use settlement amount from payment file (including 0 and negative values)
                      const profitLoss = calculateGrossProfitLoss(
                        settlementAmount,
                        costPrice,
                        packagingCost,
                        quantity,
                        order.reasonForCredit
                      );

                      const isNegativeSettlement = typeof settlementAmount === 'number' && settlementAmount < 0;
                      const orderStatus = isNegativeSettlement ? 'RETURN' : (order.reasonForCredit || 'PENDING');
                      
                      return (
                        <tr key={`${order.subOrderNo}-${index}`} className="hover:bg-muted/50" data-testid={`row-order-${order.subOrderNo}`}>
                          <td className="px-4 py-3 text-sm">{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-mono">{order.sku}</td>
                          <td className="px-4 py-3 text-sm font-mono">{order.subOrderNo}</td>
                          <td className="px-4 py-3 text-sm">{order.quantity}</td>
                          <td className="px-4 py-3 text-sm">
                            {new Date(order.orderDate).toLocaleDateString('en-IN', { 
                              year: 'numeric', 
                              month: '2-digit', 
                              day: '2-digit' 
                            })}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {order.paymentDate ? new Date(order.paymentDate).toLocaleDateString('en-IN', { 
                              year: 'numeric', 
                              month: '2-digit', 
                              day: '2-digit' 
                            }) : 
                             order.settlementDate ? new Date(order.settlementDate).toLocaleDateString('en-IN', { 
                              year: 'numeric', 
                              month: '2-digit', 
                              day: '2-digit' 
                            }) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">{formatCurrency(order.listedPrice)}</td>
                          <td className="px-4 py-3 text-sm font-medium">
                            {typeof settlementAmount === 'number' && isFinite(settlementAmount) ? (
                              <span className={`font-semibold ${
                                settlementAmount > 0 ? "text-green-600" : 
                                settlementAmount === 0 ? "text-yellow-600" : 
                                "text-red-600"
                              }`}>
                                {formatCurrency(settlementAmount)}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span>{costPrice > 0 ? formatCurrency(costPrice) : '-'}</span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {profitLoss.amount !== null ? (
                              <span className={`font-medium whitespace-nowrap ${profitLoss.isProfit ? 'text-green-600' : 'text-red-600'}`}>
                                {profitLoss.formatted}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(orderStatus)}
                          </td>
                          <td className="px-4 py-3">
                            {getPaymentStatusBadge(order.paymentStatus, order.hasPayment || false, settlementAmount, order.paymentDate, orderStatus)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={12} className="px-4 py-8 text-center text-muted-foreground">
                        No orders found. Upload order files to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
