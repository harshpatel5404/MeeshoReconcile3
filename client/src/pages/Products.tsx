import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Header from '@/components/Header';
import { Package, Search, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthQuery, useAuthApiRequest } from '@/hooks/use-auth-query';

export default function Products() {
  const [bulkCostPrice, setBulkCostPrice] = useState('');
  const [bulkPackagingCost, setBulkPackagingCost] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [productValues, setProductValues] = useState<Record<string, {costPrice: string, packagingCost: string, gstPercent: string}>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const apiRequest = useAuthApiRequest();

  const { data: products, isLoading } = useAuthQuery({
    queryKey: ['/api/products'],
  });

  const productsArray = Array.isArray(products) ? products : [];

  // Helper function to invalidate all related queries when product data changes
  const invalidateAllRelatedQueries = () => {
    // Product-related queries
    queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    queryClient.invalidateQueries({ queryKey: ['/api/products-dynamic'] });
    
    // Order-related queries (these use product cost data for calculations)
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    queryClient.invalidateQueries({ queryKey: ['/api/orders-dynamic'] });
    
    // Dashboard queries (all depend on product cost data for profit calculations)
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/comprehensive-summary'] });
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/settlement-components'] });
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/earnings-overview'] });
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/operational-costs'] });
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/daily-volume'] });
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/top-products'] });
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/top-returns'] });
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/orders-overview'] });
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/revenue-trend'] });
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/order-status'] });
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/live-metrics'] });
    
    // Invalidate any cached calculation results
    queryClient.invalidateQueries({ predicate: (query) => 
      typeof query.queryKey[0] === 'string' && 
      (query.queryKey[0].startsWith('/api/dashboard') || 
       query.queryKey[0].startsWith('/api/orders') ||
       query.queryKey[0].startsWith('/api/products'))
    });
  };

  // Sync product values with incoming data
  useEffect(() => {
    if (productsArray.length > 0) {
      const newValues: Record<string, {costPrice: string, packagingCost: string, gstPercent: string}> = {};
      productsArray.forEach((product: any) => {
        newValues[product.sku] = {
          costPrice: product.costPrice || '0',
          packagingCost: product.packagingCost || '0',
          gstPercent: product.gstPercent ?? '5'
        };
      });
      setProductValues(newValues);
    }
  }, [productsArray]);


  const updateProductMutation = useMutation({
    mutationFn: async ({ sku, data }: { sku: string; data: any }) => {
      return apiRequest('PUT', `/api/products/${sku}`, data);
    },
    onSuccess: () => {
      // Invalidate all related queries to ensure complete data consistency
      invalidateAllRelatedQueries();
      toast({
        title: "Product updated",
        description: "Product has been updated successfully. Dashboard and orders data will refresh automatically.",
      });
    },
    onError: (error) => {
      console.error('Product update error:', error);
      toast({
        title: "Product update failed",
        description: "There was an error updating the product. Please try again.",
        variant: "destructive",
      });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: string }) => {
      return apiRequest('POST', '/api/products/bulk-update', { field, value });
    },
    onSuccess: (data) => {
      // Invalidate all related queries to ensure complete data consistency
      invalidateAllRelatedQueries();
      // Clear the bulk input fields
      setBulkCostPrice('');
      setBulkPackagingCost('');
      toast({
        title: "Bulk update completed",
        description: `Successfully updated products. Dashboard and orders data will refresh automatically.`,
      });
    },
    onError: (error) => {
      console.error('Bulk update error:', error);
      toast({
        title: "Bulk update failed",
        description: "There was an error updating the products. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateAllCostsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/products/update-all-costs', {});
    },
    onSuccess: (data) => {
      // Invalidate all related queries to ensure complete data consistency
      invalidateAllRelatedQueries();
      toast({
        title: "All product costs updated",
        description: `Successfully processed all products. Final prices recalculated and dashboard refreshed.`,
      });
    },
    onError: (error) => {
      console.error('Update all costs error:', error);
      toast({
        title: "Update failed",
        description: "There was an error updating product costs. Please try again.",
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

  const updateProductValue = (sku: string, field: string, value: string) => {
    setProductValues(prev => ({
      ...prev,
      [sku]: {
        ...prev[sku],
        [field]: value
      }
    }));
  };

  const calculateFinalPrice = (costPrice: number, packagingCost: number, gstPercent: number) => {
    // Final price = cost + (cost × GST%) + packaging
    const baseCost = costPrice || 0;
    const packaging = packagingCost || 0;
    const gst = gstPercent || 0;
    
    const gstAmount = (baseCost * gst) / 100;
    const finalPrice = baseCost + gstAmount + packaging;
    
    // Round to 2 decimals
    return Math.round(finalPrice * 100) / 100;
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
                {(updateProductMutation.isPending || bulkUpdateMutation.isPending || updateAllCostsMutation.isPending) && (
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                )}
              </h3>
              <div className="flex items-center gap-4">
                {(updateProductMutation.isPending || bulkUpdateMutation.isPending || updateAllCostsMutation.isPending) && (
                  <span className="text-sm text-blue-600 font-medium animate-pulse">
                    Syncing data across dashboard and orders...
                  </span>
                )}
                <Button 
                  onClick={() => updateAllCostsMutation.mutate()}
                  disabled={updateAllCostsMutation.isPending}
                  data-testid="button-update-all-products"
                >
                  {updateAllCostsMutation.isPending ? 'Updating...' : 'Update Dashboard & Product Costs'}
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
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Final Price (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        Loading products...
                      </td>
                    </tr>
                  ) : filteredProducts.length > 0 ? (
                    filteredProducts.map((product: any, index: number) => {
                      const currentValues = productValues[product.sku] || {
                        costPrice: product.costPrice || '0',
                        packagingCost: product.packagingCost || '0',
                        gstPercent: product.gstPercent ?? '5'
                      };
                      const costPrice = parseFloat(currentValues.costPrice);
                      const packagingCost = parseFloat(currentValues.packagingCost);
                      const gstPercent = parseFloat(currentValues.gstPercent);
                      const finalPrice = calculateFinalPrice(costPrice, packagingCost, gstPercent);
                      
                      return (
                        <tr key={product.sku} className="hover:bg-muted/50" data-testid={`row-product-${product.sku}`}>
                          <td className="px-4 py-3 text-sm font-medium text-center">{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-mono">{product.sku}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="max-w-xs">
                              <span className="text-sm" title={product.title}>
                                {product.title ? (product.title.length > 30 ? `${product.title.substring(0, 30)}...` : product.title) : (
                                  <span className="text-gray-400 italic">No product name</span>
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Input
                              type="number"
                              step="0.01"
                              value={currentValues.costPrice}
                              onChange={(e) => updateProductValue(product.sku, 'costPrice', e.target.value)}
                              onBlur={(e) => handleProductUpdate(product.sku, 'costPrice', e.target.value)}
                              className="w-24"
                              data-testid={`input-cost-price-${product.sku}`}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Input
                              type="number"
                              step="0.01"
                              value={currentValues.packagingCost}
                              onChange={(e) => updateProductValue(product.sku, 'packagingCost', e.target.value)}
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
                              value={currentValues.gstPercent}
                              onChange={(e) => updateProductValue(product.sku, 'gstPercent', e.target.value)}
                              onBlur={(e) => handleProductUpdate(product.sku, 'gstPercent', e.target.value)}
                              className="w-20"
                              data-testid={`input-gst-percent-${product.sku}`}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex flex-col">
                              <span className={`font-bold ${
                                finalPrice > 0 ? 'text-green-600' : 'text-gray-400'
                              }`}>
                                ₹{finalPrice.toFixed(2)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
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
