import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Header from '@/components/Header';
import { Package, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthQuery, useAuthApiRequest } from '@/hooks/use-auth-query';

export default function Products() {
  const [bulkCostPrice, setBulkCostPrice] = useState('');
  const [bulkPackagingCost, setBulkPackagingCost] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const apiRequest = useAuthApiRequest();

  const { data: products, isLoading } = useAuthQuery({
    queryKey: ['/api/products'],
  });

  const productsArray = Array.isArray(products) ? products : [];

  const updateProductMutation = useMutation({
    mutationFn: async ({ sku, data }: { sku: string; data: any }) => {
      return apiRequest('PUT', `/api/products/${sku}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Product updated",
        description: "Product has been updated successfully.",
      });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: string }) => {
      return apiRequest('POST', '/api/products/bulk-update', { field, value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Bulk update completed",
        description: "All products have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Bulk update failed",
        description: "There was an error updating the products.",
        variant: "destructive",
      });
    },
  });

  const updateAllCostsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/products/update-all-costs', {});
    },
    onSuccess: () => {
      // Refresh products and dashboard data
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/comprehensive-summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/settlement-components'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/earnings-overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/operational-costs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/daily-volume'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/top-products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/top-returns'] });
      toast({
        title: "All product costs updated",
        description: "Final prices have been recalculated and dashboard refreshed.",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "There was an error updating product costs.",
        variant: "destructive",
      });
    },
  });

  const handleProductUpdate = (sku: string, field: string, value: string) => {
    updateProductMutation.mutate({
      sku,
      data: { [field]: value }
    });
  };

  const calculateFinalPrice = (costPrice: number, packagingCost: number) => {
    // Final price is just cost + packaging (no GST added)
    const baseCost = costPrice || 0;
    const costPlusPackaging = baseCost + (packagingCost || 0);
    
    // Round to 2 decimals
    return Math.round(costPlusPackaging * 100) / 100;
  };


  const handleBulkSetCost = () => {
    if (!bulkCostPrice) {
      toast({
        title: "Missing value", 
        description: "Please enter a cost price value.",
        variant: "destructive",
      });
      return;
    }
    bulkUpdateMutation.mutate({
      field: 'costPrice',
      value: bulkCostPrice
    });
  };

  const handleBulkSetPackaging = () => {
    if (!bulkPackagingCost) {
      toast({
        title: "Missing value",
        description: "Please enter a packaging cost value.",
        variant: "destructive",
      });
      return;
    }
    bulkUpdateMutation.mutate({
      field: 'packagingCost',
      value: bulkPackagingCost
    });
  };

  const filteredProducts = productsArray.filter((product: any) =>
    product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Products" subtitle="Manage product costs and configurations" />
      
      <div className="flex-1 p-6">
        {/* Product Management Header */}
        <Card className="shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Package className="w-5 h-5" />
                Product Cost Management
              </h3>
              <div className="flex items-center gap-4">
                <Button 
                  onClick={() => updateAllCostsMutation.mutate()}
                  disabled={updateAllCostsMutation.isPending}
                  data-testid="button-update-all-products"
                >
                  {updateAllCostsMutation.isPending ? 'Updating...' : 'Update All Product Costs'}
                </Button>
              </div>
            </div>
            
            {/* Bulk Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="bulk-cost">Bulk Set Cost Price</Label>
                <div className="flex gap-2">
                  <Input
                    id="bulk-cost"
                    type="number"
                    step="0.01"
                    placeholder="₹ Amount"
                    value={bulkCostPrice}
                    onChange={(e) => setBulkCostPrice(e.target.value)}
                    data-testid="input-bulk-cost-price"
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleBulkSetCost}
                    disabled={bulkUpdateMutation.isPending}
                    data-testid="button-bulk-set-cost"
                    className="whitespace-nowrap"
                  >
                    Apply to All
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="bulk-packaging">Bulk Set Packaging Cost</Label>
                <div className="flex gap-2">
                  <Input
                    id="bulk-packaging"
                    type="number"
                    step="0.01"
                    placeholder="₹ Amount"
                    value={bulkPackagingCost}
                    onChange={(e) => setBulkPackagingCost(e.target.value)}
                    data-testid="input-bulk-packaging-cost"
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleBulkSetPackaging}
                    disabled={bulkUpdateMutation.isPending}
                    data-testid="button-bulk-set-packaging"
                    className="whitespace-nowrap"
                  >
                    Apply to All
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="search">Search Products</Label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by SKU or title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-products"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold">
                Products ({filteredProducts.length} total)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">S.No.</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">SKU</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Product Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Cost (₹)</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Packaging (₹)</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">GST (%)</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Total Orders</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Final Price (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        Loading products...
                      </td>
                    </tr>
                  ) : filteredProducts.length > 0 ? (
                    filteredProducts.map((product: any, index: number) => {
                      const costPrice = parseFloat(product.costPrice || '0');
                      const packagingCost = parseFloat(product.packagingCost || '0');
                      const gstPercent = parseFloat(product.gstPercent ?? '5');
                      const finalPrice = calculateFinalPrice(costPrice, packagingCost);
                      
                      return (
                        <tr key={product.sku} className="hover:bg-muted/50" data-testid={`row-product-${product.sku}`}>
                          <td className="px-4 py-3 text-sm font-medium text-center">{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-mono">{product.sku}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="max-w-xs">
                              <span className="text-sm" title={product.title}>
                                {product.title ? (product.title.length > 30 ? `${product.title.substring(0, 30)}...` : product.title) : '-'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Input
                              type="number"
                              step="0.01"
                              defaultValue={product.costPrice || '0'}
                              onBlur={(e) => handleProductUpdate(product.sku, 'costPrice', e.target.value)}
                              className="w-24"
                              data-testid={`input-cost-price-${product.sku}`}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Input
                              type="number"
                              step="0.01"
                              defaultValue={product.packagingCost || '0'}
                              onBlur={(e) => handleProductUpdate(product.sku, 'packagingCost', e.target.value)}
                              className="w-24"
                              data-testid={`input-packaging-cost-${product.sku}`}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              defaultValue={product.gstPercent ?? '5'}
                              onBlur={(e) => handleProductUpdate(product.sku, 'gstPercent', e.target.value)}
                              className="w-20"
                              placeholder="5"
                              data-testid={`input-gst-percent-${product.sku}`}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <div className="flex flex-col">
                              <span className="font-medium text-blue-600">{product.totalOrders || 0}</span>
                              <span className="text-xs text-muted-foreground">orders</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex flex-col">
                              <span className="font-bold text-green-600">₹{finalPrice.toFixed(2)}</span>
                              <span className="text-xs text-muted-foreground">
                                Cost + Packaging
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        No products found. {searchQuery ? 'Try adjusting your search.' : 'Upload order files to create products.'}
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
