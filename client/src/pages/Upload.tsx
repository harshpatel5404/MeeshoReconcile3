import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';
import { Upload as UploadIcon, FileText, Archive } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';

export default function Upload() {
  const [paymentFiles, setPaymentFiles] = useState<FileList | null>(null);
  const [ordersFiles, setOrdersFiles] = useState<FileList | null>(null);
  const { toast } = useToast();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const { data: uploads = [], isLoading } = useQuery({
    queryKey: ['/api/uploads'],
    queryFn: getQueryFn({ on401: "returnNull", token }),
    enabled: !!token,
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/uploads'] });
      toast({
        title: "Upload started",
        description: "Your files are being processed.",
      });
      
      // Start polling for completion and refresh UI when both files are processed
      const pollForCompletion = () => {
        setTimeout(async () => {
          try {
            const response = await fetch('/api/uploads', {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            const uploads = await response.json();
            
            // Check if all recent uploads are processed
            const recentUploads = uploads.filter((upload: any) => 
              new Date(upload.createdAt) > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
            );
            
            const allProcessed = recentUploads.length > 0 && 
              recentUploads.every((upload: any) => upload.status === 'processed' || upload.status === 'failed');
            
            if (allProcessed) {
              // Refresh all data when processing is complete
              queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
              queryClient.invalidateQueries({ queryKey: ['/api/dashboard/revenue-trend'] });
              queryClient.invalidateQueries({ queryKey: ['/api/dashboard/order-status'] });
              queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
              queryClient.invalidateQueries({ queryKey: ['/api/products'] });
              queryClient.invalidateQueries({ queryKey: ['/api/uploads'] });
              
              toast({
                title: "Processing completed",
                description: "Your files have been processed and data updated.",
              });
            } else if (recentUploads.some((upload: any) => upload.status === 'processing')) {
              pollForCompletion(); // Continue polling
            }
          } catch (error) {
            // Silently handle polling errors
          }
        }, 2000); // Poll every 2 seconds
      };
      
      pollForCompletion();
      
      // Reset form
      setPaymentFiles(null);
      setOrdersFiles(null);
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "There was an error uploading your files.",
        variant: "destructive",
      });
    },
  });

  const handleProcessFiles = async () => {
    if (!paymentFiles && !ordersFiles) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to process.",
        variant: "destructive",
      });
      return;
    }

    const uploads = [];

    if (paymentFiles) {
      const formData = new FormData();
      formData.append('file', paymentFiles[0]);
      formData.append('fileType', 'payment_zip');
      uploads.push(formData);
    }

    if (ordersFiles) {
      const formData = new FormData();
      formData.append('file', ordersFiles[0]);
      formData.append('fileType', 'orders_csv');
      uploads.push(formData);
    }

    // Process uploads sequentially
    for (const formData of uploads) {
      await uploadMutation.mutateAsync(formData);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processed':
        return <Badge className="bg-green-100 text-green-800">Processed</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-800">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        title="Upload Files" 
        subtitle="Upload and process payment and order files"
      />
      
      <div className="flex-1 p-6">
        {/* Upload Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Payment Files Upload */}
          <Card className="shadow-sm" data-testid="card-payment-upload">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Archive className="w-5 h-5 text-blue-600" />
                Payment ZIP Files
              </h3>
              
              <div 
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
                onClick={() => document.getElementById('payment-file')?.click()}
                data-testid="dropzone-payment"
              >
                <UploadIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">Drop payment ZIP files here</p>
                <p className="text-muted-foreground mt-2">or click to browse</p>
                <p className="text-sm text-muted-foreground mt-2">Supports ZIP files containing XLSX payment sheets</p>
              </div>
              
              <input
                id="payment-file"
                type="file"
                accept=".zip"
                className="hidden"
                onChange={(e) => setPaymentFiles(e.target.files)}
                data-testid="input-payment-file"
              />
              
              {paymentFiles && paymentFiles.length > 0 && paymentFiles[0] && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">Selected: {paymentFiles[0].name}</p>
                </div>
              )}
              
            </CardContent>
          </Card>

          {/* Orders CSV Upload */}
          <Card className="shadow-sm" data-testid="card-orders-upload">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                Orders CSV Files
              </h3>
              
              <div 
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
                onClick={() => document.getElementById('orders-file')?.click()}
                data-testid="dropzone-orders"
              >
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">Drop orders CSV files here</p>
                <p className="text-muted-foreground mt-2">or click to browse</p>
                <p className="text-sm text-muted-foreground mt-2">Supports CSV files with order data</p>
              </div>
              
              <input
                id="orders-file"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => setOrdersFiles(e.target.files)}
                data-testid="input-orders-file"
              />
              
              {ordersFiles && ordersFiles.length > 0 && ordersFiles[0] && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">Selected: {ordersFiles[0].name}</p>
                </div>
              )}
              
            </CardContent>
          </Card>
        </div>

        {/* Process Files Button */}
        <div className="text-center mb-8">
          <Button 
            size="lg"
            onClick={handleProcessFiles}
            disabled={uploadMutation.isPending}
            data-testid="button-process-files"
          >
            {uploadMutation.isPending ? 'Processing...' : 'Process Files'}
          </Button>
        </div>

        {/* Upload History */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold">Upload History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">File Name</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Type</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Records</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Uploaded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                        Loading upload history...
                      </td>
                    </tr>
                  ) : Array.isArray(uploads) && uploads.length > 0 ? (
                    uploads.map((upload: any) => (
                      <tr key={upload.id} className="hover:bg-muted/50" data-testid={`row-upload-${upload.id}`}>
                        <td className="px-6 py-4 text-sm font-medium">{upload.originalName}</td>
                        <td className="px-6 py-4 text-sm">
                          {upload.fileType === 'payment_zip' ? 'Payment ZIP' : 'Orders CSV'}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(upload.status)}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {upload.recordsProcessed > 0 
                            ? `${upload.recordsProcessed} records` 
                            : '-'
                          }
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {new Date(upload.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                        No uploads yet. Upload your first file to get started.
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
