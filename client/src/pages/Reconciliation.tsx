import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';
import { Calculator, CheckCircle, X, AlertTriangle, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthQuery, useAuthApiRequest } from '@/hooks/use-auth-query';
import { useAuth } from '@/contexts/AuthContext';

interface ReconciliationFilters {
  dateFrom: string;
  dateTo: string;
  tolerance: string;
  status: string;
}

export default function Reconciliation() {
  const [filters, setFilters] = useState<ReconciliationFilters>({
    dateFrom: '',
    dateTo: '',
    tolerance: '1.00',
    status: '',
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const apiRequest = useAuthApiRequest();

  const { data: reconciliations, isLoading: reconciliationsLoading } = useAuthQuery({
    queryKey: ['/api/reconciliations', filters.status],
  });

  const { data: summary, isLoading: summaryLoading } = useAuthQuery({
    queryKey: ['/api/reconciliations/summary'],
  });

  const reconciliationMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/reconciliations/run', {});
    },
    onSuccess: (response) => {
      const data = response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/reconciliations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reconciliations/summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
      toast({
        title: "Reconciliation completed",
        description: `Processed ${data.processed} records. ${data.reconciled} reconciled, ${data.mismatched} mismatched, ${data.unreconciled} unreconciled.`,
      });
    },
    onError: () => {
      toast({
        title: "Reconciliation failed",
        description: "There was an error running the reconciliation engine.",
        variant: "destructive",
      });
    },
  });

  const handleRunReconciliation = () => {
    reconciliationMutation.mutate();
  };

  const handleExportResults = () => {
    const params = new URLSearchParams({ status: filters.status });
    window.open(`/api/export/reconciliations?${params}`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'reconciled':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Reconciled
          </Badge>
        );
      case 'mismatch':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Mismatch
          </Badge>
        );
      case 'unreconciled':
        return (
          <Badge variant="secondary">
            <X className="w-3 h-3 mr-1" />
            Unreconciled
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(Number(amount));
  };

  const summaryData = summary || {
    reconciled: 0,
    mismatch: 0,
    unreconciled: 0,
    successRate: 0,
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Reconciliation" subtitle="Review and reconcile payment discrepancies" />
      
      <div className="flex-1 overflow-auto p-6">
        {/* Reconciliation Controls */}
        <Card className="shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Reconciliation Engine
              </h3>
              <Button 
                onClick={handleRunReconciliation}
                disabled={reconciliationMutation.isPending}
                data-testid="button-run-full-reconciliation"
              >
                {reconciliationMutation.isPending ? 'Running...' : 'Run Full Reconciliation'}
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="date-from">Date From</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  data-testid="input-date-from"
                />
              </div>
              <div>
                <Label htmlFor="date-to">Date To</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  data-testid="input-date-to"
                />
              </div>
              <div>
                <Label htmlFor="tolerance">Tolerance (₹)</Label>
                <Input
                  id="tolerance"
                  type="number"
                  step="0.01"
                  value={filters.tolerance}
                  onChange={(e) => setFilters({ ...filters, tolerance: e.target.value })}
                  data-testid="input-tolerance"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reconciliation Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-sm" data-testid="card-reconciled-orders">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Reconciled Orders</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="text-reconciled-count">
                    {summaryLoading ? '...' : summaryData.reconciled.toLocaleString()}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm" data-testid="card-mismatched">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Mismatched</p>
                  <p className="text-2xl font-bold text-yellow-600" data-testid="text-mismatch-count">
                    {summaryLoading ? '...' : summaryData.mismatch.toLocaleString()}
                  </p>
                </div>
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm" data-testid="card-unreconciled">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Unreconciled</p>
                  <p className="text-2xl font-bold text-red-600" data-testid="text-unreconciled-count">
                    {summaryLoading ? '...' : summaryData.unreconciled.toLocaleString()}
                  </p>
                </div>
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <X className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm" data-testid="card-success-rate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Success Rate</p>
                  <p className="text-2xl font-bold text-blue-600" data-testid="text-success-rate">
                    {summaryLoading ? '...' : `${summaryData.successRate.toFixed(1)}%`}
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reconciliation Details */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="p-6 border-b border-border">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Reconciliation Details</h3>
                <div className="flex items-center gap-4">
                  <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                    <SelectTrigger className="w-40" data-testid="select-status-filter">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="reconciled">Reconciled</SelectItem>
                      <SelectItem value="mismatch">Mismatch</SelectItem>
                      <SelectItem value="unreconciled">Unreconciled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="secondary" 
                    onClick={handleExportResults}
                    data-testid="button-export-results"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Results
                  </Button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Sub Order ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">SKU</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Order Value</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Settlement</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Product Cost</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Ads Cost</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Net Profit</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reconciliationsLoading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                        Loading reconciliation data...
                      </td>
                    </tr>
                  ) : reconciliations && reconciliations.length > 0 ? (
                    reconciliations.map((reconciliation: any) => {
                      const netProfit = Number(reconciliation.netProfit) || 0;
                      const isProfit = netProfit >= 0;
                      
                      return (
                        <tr key={reconciliation.id} className="hover:bg-muted/50" data-testid={`row-reconciliation-${reconciliation.subOrderNo}`}>
                          <td className="px-4 py-3 text-sm font-mono">{reconciliation.subOrderNo}</td>
                          <td className="px-4 py-3 text-sm font-mono">
                            {/* This would need to be joined from the order data */}
                            -
                          </td>
                          <td className="px-4 py-3 text-sm">{formatCurrency(reconciliation.orderValue)}</td>
                          <td className="px-4 py-3 text-sm font-medium">{formatCurrency(reconciliation.settlementAmount)}</td>
                          <td className="px-4 py-3 text-sm">{formatCurrency(reconciliation.productCost)}</td>
                          <td className="px-4 py-3 text-sm">{formatCurrency(reconciliation.adsCost)}</td>
                          <td className={`px-4 py-3 text-sm font-medium ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                            {isProfit ? '+' : ''}{formatCurrency(netProfit)}
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(reconciliation.status)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Button 
                              variant="link" 
                              size="sm"
                              data-testid={`button-view-details-${reconciliation.subOrderNo}`}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                        No reconciliation data found. Run reconciliation to generate results.
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
