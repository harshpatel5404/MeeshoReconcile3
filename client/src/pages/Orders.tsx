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
import { Search, Filter, Download, Calculator } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthQuery, useAuthApiRequest } from '@/hooks/use-auth-query';
import { useAuth } from '@/contexts/AuthContext';

interface OrderFilters {
  subOrderNo: string;
  status: string;
  paymentStatus: string;
  dateFrom: string;
  dateTo: string;
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
    queryKey: ['/api/orders', Object.keys(filters).length > 0 ? `?${new URLSearchParams(filters as any).toString()}` : ''],
  });

  const apiRequest = useAuthApiRequest();
  
  const reconciliationMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/reconciliations/run', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reconciliations'] });
      toast({
        title: "Reconciliation completed",
        description: "Orders have been processed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Reconciliation failed",
        description: "There was an error running reconciliation.",
        variant: "destructive",
      });
    },
  });

  const handleApplyFilters = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
  };

  const handleClearFilters = () => {
    setFilters({
      subOrderNo: '',
      status: '',
      paymentStatus: '',
      dateFrom: '',
      dateTo: '',
    });
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
  };

  const handleExportOrders = () => {
    const params = new URLSearchParams(filters);
    window.open(`/api/export/orders?${params}`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'DELIVERED':
        return <Badge className="bg-green-100 text-green-800">DELIVERED</Badge>;
      case 'RTO_COMPLETE':
        return <Badge variant="destructive">RTO_COMPLETE</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-gray-100 text-gray-800">CANCELLED</Badge>;
      case 'RTO_LOCKED':
        return <Badge className="bg-yellow-100 text-yellow-800">RTO_LOCKED</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (hasPayment: boolean) => {
    return hasPayment 
      ? <Badge className="bg-blue-100 text-blue-800">Reconciled</Badge>
      : <Badge variant="secondary">Unreconciled</Badge>;
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(Number(amount));
  };

  const calculateProfit = (settlement: number, cost: number) => {
    const profit = settlement - cost;
    return {
      amount: profit,
      isProfit: profit >= 0,
      formatted: formatCurrency(profit),
    };
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Orders Management" subtitle="View and manage your orders data" />
      
      <div className="flex-1 overflow-auto p-6">
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
                    <SelectItem value="reconciled">Reconciled</SelectItem>
                    <SelectItem value="unreconciled">Unreconciled</SelectItem>
                    <SelectItem value="mismatch">Mismatch</SelectItem>
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
                    onCheckedChange={setHandleDuplicates}
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
                  <Button 
                    size="sm" 
                    onClick={() => reconciliationMutation.mutate()}
                    disabled={reconciliationMutation.isPending}
                    data-testid="button-run-reconciliation"
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    {reconciliationMutation.isPending ? 'Running...' : 'Run Reconciliation'}
                  </Button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">S.No</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">SKU</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Sub Order ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Qty</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Order Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Listed Price</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Settlement</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Order Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                        Loading orders...
                      </td>
                    </tr>
                  ) : orders && orders.length > 0 ? (
                    orders.map((order: any, index: number) => (
                      <tr key={order.id} className="hover:bg-muted/50" data-testid={`row-order-${order.subOrderNo}`}>
                        <td className="px-4 py-3 text-sm">{index + 1}</td>
                        <td className="px-4 py-3 text-sm font-mono">{order.sku}</td>
                        <td className="px-4 py-3 text-sm font-mono">{order.subOrderNo}</td>
                        <td className="px-4 py-3 text-sm">{order.quantity}</td>
                        <td className="px-4 py-3 text-sm">
                          {new Date(order.orderDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm">{formatCurrency(order.listedPrice)}</td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {formatCurrency(order.discountedPrice)}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(order.reasonForCredit)}
                        </td>
                        <td className="px-4 py-3">
                          {getPaymentStatusBadge(false)} {/* Will be updated based on reconciliation */}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
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
