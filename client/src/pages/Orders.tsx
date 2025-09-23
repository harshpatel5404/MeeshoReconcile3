import { useState, useMemo } from 'react';
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
    queryKey: ['/api/orders-dynamic'],
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
    const normalizedStatus = status.toUpperCase().trim();
    
    switch (normalizedStatus) {
      // Delivered - Success State
      case 'DELIVERED':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Delivered</Badge>;
      
      // Shipped - In Transit States
      case 'SHIPPED':
      case 'IN_TRANSIT':
      case 'IN TRANSIT':
      case 'OUT_FOR_DELIVERY':
      case 'OUT FOR DELIVERY':
      case 'OFD':
      case 'READY_TO_SHIP':
      case 'READY TO SHIP':
      case 'RTS':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Shipped</Badge>;
      
      // Return - Customer Return States
      case 'RETURN':
      case 'RETURNED':
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Return</Badge>;
      
      // RTO - Return to Origin States
      case 'RTO':
      case 'RTO_COMPLETE':
      case 'RTO COMPLETE':
      case 'RTO_LOCKED':
      case 'RTO LOCKED':
      case 'RTO_OFD':
      case 'RTO OFD':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">RTO</Badge>;
      
      // Cancelled States
      case 'CANCELLED':
      case 'CANCELED':
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">Cancelled</Badge>;
      
      // Exchanged States
      case 'EXCHANGE':
      case 'EXCHANGED':
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Exchanged</Badge>;
      
      default:
        return <Badge variant="secondary" className="bg-slate-100 text-slate-800">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (paymentStatus?: string, hasPayment?: boolean, settlementAmount?: number, paymentDate?: string, orderStatus?: string) => {
    const label = deriveEffectivePaymentStatus({ 
      paymentStatus, 
      hasPayment, 
      settlementAmount, 
      paymentDate, 
      orderStatus 
    });
    
    switch (label) {
      case 'Paid':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Paid</Badge>;
      case 'Refunded':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Refunded</Badge>;
      case 'NA':
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">N/A</Badge>;
      case 'Pending':
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pending</Badge>;
    }
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
    const isNegativeSettlement = typeof settlementAmount === 'number' && settlementAmount < 0;
    // Check if order status is RETURNED or RTO LOCKED (or RTO COMPLETE) - exclude product cost for these statuses
    const isRtoOrReturned = orderStatus && (
      orderStatus.toUpperCase() === 'RTO_LOCKED' ||
      orderStatus.toUpperCase() === 'RTO LOCKED' ||
      orderStatus.toUpperCase() === 'RTO_COMPLETE' ||
      orderStatus.toUpperCase() === 'RTO COMPLETE' ||
      orderStatus.toUpperCase() === 'RETURN' ||
      orderStatus.toUpperCase() === 'RETURNED' || isNegativeSettlement
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

  // Simplified payment status based on file processing guide
  const deriveEffectivePaymentStatus = ({
    paymentStatus,
    hasPayment,
    settlementAmount,
    paymentDate,
    orderStatus,
  }: {
    paymentStatus?: string;
    hasPayment?: boolean;
    settlementAmount?: number;
    paymentDate?: string;
    orderStatus?: string;
  }): 'Paid' | 'Refunded' | 'NA' | 'Pending' => {
    const norm = (s?: string) => (s ? s.toUpperCase().trim() : '');
    const normalizedOrderStatus = norm(orderStatus);

    // Priority 1: Settlement amount analysis (most reliable from payment file)
    if (hasPayment && typeof settlementAmount === 'number' && isFinite(settlementAmount)) {
      if (settlementAmount > 0) {
        return 'Paid';
      } else {
        // Zero or negative settlement = Refunded
        return 'Refunded';
      }
    }

    // Priority 2: Order status-based payment mapping (from file processing guide)
    switch (normalizedOrderStatus) {
      case 'DELIVERED':
        return 'Paid';
      
      case 'RTO_COMPLETE':
      case 'RTO':
      case 'RTO_LOCKED':
      case 'RTO_OFD':
      case 'RETURNED':
      case 'RETURN':
        return 'Refunded';
      
      case 'CANCELLED':
      case 'CANCELED':
        return 'NA'; // No payment applicable for cancelled orders
      
      case 'SHIPPED':
      case 'OUT_FOR_DELIVERY':
      case 'IN_TRANSIT':
      case 'READY_TO_SHIP':
      case 'PENDING':
      case 'PROCESSING':
        return 'Pending';
    }

    // Priority 3: Explicit payment status mapping
    const normalizedPaymentStatus = norm(paymentStatus);
    switch (normalizedPaymentStatus) {
      case 'PAID':
        return 'Paid';
      case 'REFUNDED':
        return 'Refunded';
      case 'N/A':
      case 'NA':
      case 'CANCELLED':
      case 'CANCELED':
        return 'NA';
      default:
        return 'Pending';
    }
  };

  // Simplified order status normalization based on file processing guide
  const normalizeOrderStatus = (reason?: string): string => {
    if (!reason) return 'Unknown';
    const r = reason.toUpperCase().trim();
    
    // Map to user-friendly categories: Delivered, Shipped, Return, RTO, Cancelled, Exchanged
    switch (r) {
      case 'DELIVERED':
        return 'Delivered';
      
      case 'SHIPPED':
      case 'IN_TRANSIT':
      case 'IN TRANSIT':
      case 'OUT_FOR_DELIVERY':
      case 'OUT FOR DELIVERY':
      case 'OFD':
      case 'READY_TO_SHIP':
      case 'READY TO SHIP':
      case 'RTS':
        return 'Shipped';
      
      case 'RETURN':
      case 'RETURNED':
        return 'Return';
      
      case 'RTO':
      case 'RTO_COMPLETE':
      case 'RTO COMPLETE':
      case 'RTO_LOCKED':
      case 'RTO LOCKED':
      case 'RTO_OFD':
      case 'RTO OFD':
        return 'RTO';
      
      case 'CANCELLED':
      case 'CANCELED':
        return 'Cancelled';
      
      case 'EXCHANGE':
      case 'EXCHANGED':
        return 'Exchanged';
      
      default:
        return r;
    }
  };

  // Map UI filter values to normalized status strings
  const mapStatusFilter = (value?: string): string | null => {
    if (!value || value === 'all' || value === '') return null;
    const v = value.trim().toUpperCase();
    
    switch (v) {
      case 'DELIVERED':
        return 'Delivered';
      case 'SHIPPED':
        return 'Shipped';
      case 'RETURN':
        return 'Return';
      case 'RTO':
        return 'RTO';
      case 'CANCELLED':
        return 'Cancelled';
      case 'EXCHANGED':
        return 'Exchanged';
      default:
        return value;
    }
  };

  const filteredOrders = useMemo(() => {
    if (!orders) return [] as any[];
    let result = orders.slice();

    // Text filter: Sub Order ID
    if (filters.subOrderNo && filters.subOrderNo.trim() !== '') {
      const needle = filters.subOrderNo.trim().toLowerCase();
      result = result.filter((o: any) => String(o.subOrderNo || '').toLowerCase().includes(needle));
    }

    // Status filter with mapping
    const mappedStatus = mapStatusFilter(filters.status);
    if (mappedStatus) {
      result = result.filter((o: any) => normalizeOrderStatus(o.reasonForCredit) === mappedStatus);
    }

    // Payment status filter mapping using derived effective label
    if (filters.paymentStatus && filters.paymentStatus !== 'all' && filters.paymentStatus !== '') {
      const v = filters.paymentStatus.toLowerCase();
      result = result.filter((o: any) => {
        const settlementAmount = (() => {
          if (o.settlementAmount === null || o.settlementAmount === undefined) return undefined;
          const parsed = typeof o.settlementAmount === 'string' ? parseFloat(o.settlementAmount) : Number(o.settlementAmount);
          return isNaN(parsed) ? undefined : parsed;
        })();
        const label = deriveEffectivePaymentStatus({
          paymentStatus: o.paymentStatus,
          hasPayment: o.hasPayment,
          settlementAmount,
          paymentDate: o.paymentDate,
          orderStatus: o.reasonForCredit,
        }).toLowerCase();
        return label === v;
      });
    }

    // Date filters
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter((o: any) => {
        const d = new Date(o.orderDate);
        return !isNaN(d.getTime()) && d >= from;
      });
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      // Make end date inclusive: compare strictly less than next day's start
      to.setHours(0, 0, 0, 0);
      const nextDay = new Date(to);
      nextDay.setDate(nextDay.getDate() + 1);
      result = result.filter((o: any) => {
        const d = new Date(o.orderDate);
        return !isNaN(d.getTime()) && d < nextDay;
      });
    }

    return result;
  }, [orders, filters]);

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                    <SelectItem value="SHIPPED">Shipped</SelectItem>
                    <SelectItem value="RETURN">Return</SelectItem>
                    <SelectItem value="RTO">RTO</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="EXCHANGED">Exchanged</SelectItem>
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
                    <SelectItem value="refunded">Refunded</SelectItem>
                    <SelectItem value="na">N/A</SelectItem>
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 gap-4">
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button onClick={handleApplyFilters} data-testid="button-apply-filters" className="w-full sm:w-auto">
                  Apply Filters
                </Button>
                <Button variant="secondary" onClick={handleClearFilters} data-testid="button-clear-filters" className="w-full sm:w-auto">
                  Clear
                </Button>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto justify-start sm:justify-end">
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
                  Orders ({filteredOrders ? filteredOrders.length : 0} total)
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
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[800px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-muted-foreground">S.No.</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-muted-foreground">SKU</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-muted-foreground">Sub Order ID</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-muted-foreground">Qty</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-muted-foreground">Order Date</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-muted-foreground">Payment Date</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-muted-foreground">Listed Price</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-muted-foreground">Settlement</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-muted-foreground">Cost Price</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-muted-foreground">Gross P/L</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-muted-foreground">Order Status</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-muted-foreground">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-8 text-center text-muted-foreground">
                        Loading orders...
                      </td>
                    </tr>
                  ) : filteredOrders && filteredOrders.length > 0 ? (
                    filteredOrders.map((order: any, index: number) => {
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
                      const orderStatus = (order.reasonForCredit || 'PENDING');
                      
                      return (
                        <tr key={`${order.subOrderNo}-${index}`} className="hover:bg-muted/50" data-testid={`row-order-${order.subOrderNo}`}>
                          <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm">{index + 1}</td>
                          <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm font-mono truncate max-w-[80px] sm:max-w-none">{order.sku}</td>
                          <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm font-mono truncate max-w-[120px] sm:max-w-none">{order.subOrderNo}</td>
                          <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm">{order.quantity}</td>
                          <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm">
                            {new Date(order.orderDate).toLocaleDateString('en-IN', { 
                              year: 'numeric', 
                              month: '2-digit', 
                              day: '2-digit' 
                            })}
                          </td>
                          <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm">
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
                          <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm">{formatCurrency(order.listedPrice)}</td>
                          <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium">
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
                          <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm">
                            <span>{costPrice > 0 ? formatCurrency(costPrice) : '-'}</span>
                          </td>
                          <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm">
                            {profitLoss.amount !== null ? (
                              <span className={`font-medium whitespace-nowrap ${profitLoss.isProfit ? 'text-green-600' : 'text-red-600'}`}>
                                {profitLoss.formatted}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-2 sm:px-4 py-3">
                            {getStatusBadge(orderStatus)}
                          </td>
                          <td className="px-2 sm:px-4 py-3">
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
