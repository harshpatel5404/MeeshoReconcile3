import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { verifyFirebaseToken } from "./services/firebase";
import { FileProcessor } from "./services/fileProcessor";
import { insertUserSchema, insertProductSchema } from "@shared/schema";

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Helper function to update orders with payment data after processing payments
async function updateOrdersWithPaymentData(payments: any[]) {
  try {
    console.log(`Updating ${payments.length} orders with payment data...`);
    
    for (const payment of payments) {
      if (payment.subOrderNo && payment.settlementDate) {
        // Determine payment status based on settlement amount (handle both string and number)
        let paymentStatus = 'PAID';
        const amount = typeof payment.settlementAmount === 'string' 
          ? parseFloat(payment.settlementAmount) 
          : typeof payment.settlementAmount === 'number' 
          ? payment.settlementAmount 
          : 0;
        
        if (amount <= 0) {
          paymentStatus = 'REFUNDED';
        }
        
        try {
          // Update the order with payment date and status from settlement data
          await storage.updateOrderWithPaymentData(payment.subOrderNo, {
            paymentDate: payment.settlementDate,
            paymentStatus: paymentStatus
          });
        } catch (error) {
          console.error(`Error updating order ${payment.subOrderNo} with payment data:`, error);
        }
      }
    }
    
    console.log(`Successfully updated orders with payment data`);
  } catch (error) {
    console.error('Error in updateOrdersWithPaymentData:', error);
  }
}

// Auth middleware
async function authenticateUser(req: Request, res: Response, next: any) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decodedToken = await verifyFirebaseToken(token);
    
    // Get the database user record
    const user = await storage.getUserByFirebaseUid(decodedToken.uid);
    if (!user) {
      return res.status(401).json({ message: 'User not found in database' });
    }

    req.user = {
      ...decodedToken,
      dbId: user.id // Add database ID to user object
    };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post('/api/auth/verify', async (req: Request, res: Response) => {
    try {
      const { idToken } = req.body;
      
      if (!idToken) {
        return res.status(400).json({ message: 'ID token is required' });
      }
      
      const decodedToken = await verifyFirebaseToken(idToken);
      
      // Get or create user
      let user = await storage.getUserByFirebaseUid(decodedToken.uid);
      if (!user) {
        user = await storage.createUser({
          firebaseUid: decodedToken.uid,
          email: decodedToken.email || '',
          displayName: decodedToken.name,
          photoURL: decodedToken.picture,
        });
      }

      res.json({ user, token: idToken });
    } catch (error) {
      console.error('Auth verification error:', error);
      res.status(401).json({ message: 'Authentication failed' });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/summary', authenticateUser, async (req: Request, res: Response) => {
    try {
      const summary = await storage.getDashboardSummary();
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch dashboard summary' });
    }
  });

  app.get('/api/dashboard/revenue-trend', authenticateUser, async (req: Request, res: Response) => {
    try {
      const revenueTrend = await storage.getRevenueTrend();
      res.json(revenueTrend);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch revenue trend' });
    }
  });

  app.get('/api/dashboard/order-status', authenticateUser, async (req: Request, res: Response) => {
    try {
      const orderStatus = await storage.getOrderStatusDistribution();
      res.json(orderStatus);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch order status' });
    }
  });

  // Enhanced Dashboard Analytics Endpoints
  app.get('/api/dashboard/comprehensive-summary', authenticateUser, async (req: Request, res: Response) => {
    try {
      const summary = await storage.getComprehensiveFinancialSummary();
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch comprehensive financial summary' });
    }
  });

  app.get('/api/dashboard/settlement-components', authenticateUser, async (req: Request, res: Response) => {
    try {
      const components = await storage.getSettlementComponents();
      res.json(components);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch settlement components' });
    }
  });

  app.get('/api/dashboard/earnings-overview', authenticateUser, async (req: Request, res: Response) => {
    try {
      const earnings = await storage.getEarningsOverview();
      res.json(earnings);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch earnings overview' });
    }
  });

  app.get('/api/dashboard/operational-costs', authenticateUser, async (req: Request, res: Response) => {
    try {
      const costs = await storage.getOperationalCosts();
      res.json(costs);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch operational costs' });
    }
  });

  app.get('/api/dashboard/daily-volume', authenticateUser, async (req: Request, res: Response) => {
    try {
      const dailyVolume = await storage.getDailyVolumeAndAOV();
      res.json(dailyVolume);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch daily volume data' });
    }
  });

  app.get('/api/dashboard/top-products', authenticateUser, async (req: Request, res: Response) => {
    try {
      const topProducts = await storage.getTopPerformingProducts();
      res.json(topProducts);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch top products' });
    }
  });

  app.get('/api/dashboard/top-returns', authenticateUser, async (req: Request, res: Response) => {
    try {
      const topReturns = await storage.getTopReturnProducts();
      res.json(topReturns);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch top return products' });
    }
  });

  // Live Dashboard Metrics
  app.get('/api/dashboard/live-metrics', authenticateUser, async (req: Request, res: Response) => {
    try {
      const liveMetrics = await storage.getLiveDashboardMetrics();
      res.json(liveMetrics);
    } catch (error) {
      console.error('Failed to fetch live dashboard metrics:', error);
      res.status(500).json({ message: 'Failed to fetch live dashboard metrics' });
    }
  });

  app.post('/api/dashboard/recalculate', authenticateUser, async (req: Request, res: Response) => {
    try {
      await storage.recalculateAllMetrics();
      res.json({ message: 'Metrics recalculated successfully' });
    } catch (error) {
      console.error('Failed to recalculate metrics:', error);
      res.status(500).json({ message: 'Failed to recalculate metrics' });
    }
  });

  // Dynamic Data Routes
  app.get('/api/products-dynamic', authenticateUser, async (req: Request, res: Response) => {
    try {
      const products = await storage.getAllProductsDynamic();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch dynamic products' });
    }
  });

  app.put('/api/products-dynamic/:id', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updatedProduct = await storage.updateProductDynamic(id, req.body);
      
      if (updatedProduct) {
        // Trigger real-time recalculation
        await storage.recalculateAllMetrics();
        res.json(updatedProduct);
      } else {
        res.status(404).json({ message: 'Product not found' });
      }
    } catch (error) {
      console.error('Failed to update dynamic product:', error);
      res.status(500).json({ message: 'Failed to update product' });
    }
  });

  app.get('/api/orders-dynamic', authenticateUser, async (req: Request, res: Response) => {
    try {
      const orders = await storage.getAllOrdersDynamic();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch dynamic orders' });
    }
  });

  app.put('/api/orders-dynamic/:id', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updatedOrder = await storage.updateOrderDynamic(id, req.body);
      
      if (updatedOrder) {
        // Trigger real-time recalculation
        await storage.recalculateAllMetrics();
        res.json(updatedOrder);
      } else {
        res.status(404).json({ message: 'Order not found' });
      }
    } catch (error) {
      console.error('Failed to update dynamic order:', error);
      res.status(500).json({ message: 'Failed to update order' });
    }
  });

  // File Structure Routes
  app.get('/api/file-structure/:uploadId', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { uploadId } = req.params;
      const fileStructure = await storage.getFileStructure(uploadId);
      
      if (fileStructure) {
        res.json(fileStructure);
      } else {
        res.status(404).json({ message: 'File structure not found' });
      }
    } catch (error) {
      console.error('Failed to fetch file structure:', error);
      res.status(500).json({ message: 'Failed to fetch file structure' });
    }
  });

  app.get('/api/current-uploads', authenticateUser, async (req: Request, res: Response) => {
    try {
      const currentUploads = await storage.getCurrentUploads();
      res.json(currentUploads);
    } catch (error) {
      console.error('Failed to fetch current uploads:', error);
      res.status(500).json({ message: 'Failed to fetch current uploads' });
    }
  });

  // Upload routes
  app.post('/api/upload', authenticateUser, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { fileType, sourceMonth, label, gstPercent } = req.body;
      
      // Create upload record
      const uploadRecord = await storage.createUpload({
        filename: req.file.filename || req.file.originalname,
        originalName: req.file.originalname,
        fileType,
        status: 'processing',
        sourceMonth,
        label,
        uploadedBy: req.user?.dbId || '',
      });

      // Process file asynchronously
      processFileAsync(uploadRecord.id, req.file.buffer, fileType, gstPercent);

      res.json({ uploadId: uploadRecord.id, status: 'processing' });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: 'Upload failed' });
    }
  });

  app.get('/api/uploads', authenticateUser, async (req: Request, res: Response) => {
    try {
      const uploads = await storage.getAllUploads();
      res.json(uploads);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch uploads' });
    }
  });

  // Orders routes
  app.get('/api/orders', authenticateUser, async (req: Request, res: Response) => {
    try {
      const filters = {
        subOrderNo: req.query.subOrderNo as string,
        status: req.query.status as string,
        paymentStatus: req.query.paymentStatus as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      };

      const orders = await storage.getAllOrders(filters);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  // Products routes
  app.get('/api/products', authenticateUser, async (req: Request, res: Response) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch products' });
    }
  });

  app.put('/api/products/:sku', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { sku } = req.params;
      const updateData = insertProductSchema.partial().parse(req.body);
      
      const product = await storage.updateProduct(sku, updateData);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      res.json(product);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update product' });
    }
  });

  app.post('/api/products/bulk-update', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { field, value } = req.body;
      
      if (!['packagingCost', 'gstPercent', 'costPrice'].includes(field)) {
        return res.status(400).json({ message: 'Invalid field' });
      }

      const products = await storage.getAllProducts();
      const updates = products.map(product => 
        storage.updateProduct(product.sku, { [field]: value.toString() })
      );
      
      await Promise.all(updates);
      res.json({ message: 'Bulk update completed' });
    } catch (error) {
      res.status(500).json({ message: 'Bulk update failed' });
    }
  });

  app.post('/api/products/update-all-costs', authenticateUser, async (req: Request, res: Response) => {
    try {
      // Get all products
      const products = await storage.getAllProducts();
      
      // For each product, recalculate and persist final price based on cost + packaging
      const updates = products.map(async (product) => {
        const costPrice = parseFloat(product.costPrice || '0');
        const packagingCost = parseFloat(product.packagingCost || '0');
        const finalPrice = Math.round((costPrice + packagingCost) * 100) / 100;
        
        // Update the product with the calculated final price
        return await storage.updateProduct(product.sku, { 
          finalPrice: finalPrice.toString() 
        });
      });
      
      const updatedProducts = await Promise.all(updates);
      
      // Trigger dashboard metrics recalculation
      await storage.recalculateAllMetrics();
      
      res.json({ 
        message: 'All product costs updated successfully',
        productsProcessed: updatedProducts.length,
        totalFinalPriceCalculated: updatedProducts.reduce((sum, product) => sum + parseFloat(product?.finalPrice || '0'), 0)
      });
    } catch (error) {
      console.error('Failed to update all product costs:', error);
      res.status(500).json({ message: 'Failed to update product costs' });
    }
  });


  // Export routes
  app.get('/api/export/:type', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { type } = req.params;
      let data: any[] = [];
      let filename = '';

      switch (type) {
        case 'orders':
          data = await storage.getAllOrders();
          filename = 'orders_export.csv';
          break;
        case 'payments':
          data = await storage.getAllPayments();
          filename = 'payments_export.csv';
          break;
        default:
          return res.status(400).json({ message: 'Invalid export type' });
      }

      // Convert to CSV
      const csv = convertToCSV(data);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: 'Export failed' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Async file processing
async function processFileAsync(uploadId: string, buffer: Buffer, fileType: string, gstPercent?: string) {
  try {
    let result;
    let recordsProcessed = 0;
    
    if (fileType === 'orders_csv') {
      // Use new dynamic processing for orders
      const dynamicResult = await FileProcessor.processOrdersCSVDynamic(buffer, uploadId);
      
      if (dynamicResult.data && dynamicResult.data.length > 0) {
        // Convert dynamic data to order records
        const ordersDynamic = dynamicResult.data.map(row => ({
          uploadId,
          dynamicData: row,
          subOrderNo: row['Sub Order No'] || row['subOrderNo'] || '',
        }));

        // Replace all existing orders for this upload (data overwrite)
        await storage.replaceAllOrdersDynamic(uploadId, ordersDynamic);
        
        // Extract and replace products from the order data
        const productsDynamic = await FileProcessor.extractProductsFromOrdersDynamic(
          dynamicResult.data, 
          uploadId, 
          gstPercent || '18'
        );
        
        if (productsDynamic.length > 0) {
          await storage.addUniqueProductsDynamic(uploadId, productsDynamic);
        }

        // Save file structure metadata
        await storage.saveFileStructure(uploadId, dynamicResult.fileStructure);
        
        // Mark this upload as the current version
        await storage.markUploadAsCurrent(uploadId, fileType);
        
        recordsProcessed = dynamicResult.data.length;
        
        // Trigger real-time calculation update
        await storage.recalculateAllMetrics(uploadId);
        
        console.log(`Processed ${recordsProcessed} orders dynamically, extracted ${productsDynamic.length} products`);
      }

      // Process orders through ENHANCED CSV processor with exact column mapping 
      // Only run this if dynamic processing succeeded to avoid conflicts
      if (recordsProcessed > 0) {
        const { CSVProcessor } = await import('./services/csvProcessor');
        const enhancedResult = await CSVProcessor.processOrdersCSV(buffer);
        if (enhancedResult.orders) {
          try {
            // Use upsert logic to handle duplicates gracefully
            await storage.bulkUpsertOrders(enhancedResult.orders);
            
            // Extract products with metadata from CSV if available
            await FileProcessor.extractProductsFromOrders(enhancedResult.orders, gstPercent || '5');
            
            // Apply product metadata from ENHANCED CSV (GST%, Cost Price) with default 5% GST
            if (enhancedResult.productMetadata && enhancedResult.productMetadata.length > 0) {
              console.log(`Applying ${enhancedResult.productMetadata.length} product metadata records from ENHANCED CSV processor`);
              for (const metadata of enhancedResult.productMetadata) {
                try {
                  // Default to 5% GST if not specified (based on real file analysis)
                  const gstToApply = metadata.gstPercent !== undefined ? metadata.gstPercent : 5;
                  await storage.updateProductGst(metadata.sku, gstToApply, metadata.productName);
                  
                  if (metadata.costPrice !== undefined) {
                    await storage.updateProduct(metadata.sku, { costPrice: metadata.costPrice.toString() });
                  }
                } catch (error) {
                  console.warn(`Failed to update metadata for product ${metadata.sku}:`, error);
                }
              }
            }
            
            console.log(`Processed ${enhancedResult.orders.length} orders with exact column mapping and payment data`);
          } catch (error) {
            console.error('Enhanced CSV processing error (non-blocking):', error);
          }
        }
      }

      await storage.updateUploadStatus(uploadId, 'processed', recordsProcessed, dynamicResult.errors);
      
    } else if (fileType === 'payment_zip') {
      // Use ENHANCED ZIP processing method for 42-column XLSX files
      const { ZIPProcessor } = await import('./services/zipProcessor');
      result = await ZIPProcessor.processPaymentZIP(buffer);
      if (result.payments) {
        await storage.bulkCreatePayments(result.payments);
        
        // CRITICAL: Update orders with payment data after processing payments
        await updateOrdersWithPaymentData(result.payments);
        
        // Process additional GST data extracted from ENHANCED ZIP files (exact 42-column mapping)
        if (result.productGstData && result.productGstData.length > 0) {
          console.log(`Updating ${result.productGstData.length} products with GST data from ENHANCED ZIP processor`);
          for (const gstData of result.productGstData) {
            try {
              console.log(`Attempting to update GST for SKU: "${gstData.sku}" with ${gstData.gstPercent}% GST (from column 7)`);
              const updated = await storage.updateProductGst(gstData.sku, gstData.gstPercent, gstData.productName);
              if (updated) {
                console.log(`✓ Successfully updated GST for SKU: "${gstData.sku}" to ${gstData.gstPercent}%`);
              } else {
                console.warn(`✗ No product found with SKU: "${gstData.sku}" - GST update skipped`);
              }
            } catch (error) {
              console.error(`✗ Failed to update GST for product "${gstData.sku}":`, error);
            }
          }
        }
        
        // Process additional order status data extracted from ZIP files
        if (result.orderStatusData && result.orderStatusData.length > 0) {
          console.log(`Updating ${result.orderStatusData.length} orders with status data from ZIP`);
          for (const statusData of result.orderStatusData) {
            try {
              await storage.updateOrderStatus(statusData.subOrderNo, statusData.orderStatus);
            } catch (error) {
              console.warn(`Failed to update status for order ${statusData.subOrderNo}:`, error);
            }
          }
        }
        
        await storage.updateUploadStatus(uploadId, 'processed', result.payments.length, result.errors);
        
        // Trigger real-time calculation update for payments
        await storage.recalculateAllMetrics(uploadId);
        console.log(`Processed ${result.payments.length} payments from ZIP file`);
      } else {
        // If ZIP processing failed, try direct XLSX processing as fallback
        console.log('ZIP processing failed, attempting direct XLSX processing as fallback');
        const fallbackResult = await FileProcessor.processPaymentsXLSX(buffer);
        if (fallbackResult.payments) {
          await storage.bulkCreatePayments(fallbackResult.payments);
          
          // CRITICAL: Update orders with payment data after processing payments
          await updateOrdersWithPaymentData(fallbackResult.payments);
          
          await storage.updateUploadStatus(uploadId, 'processed', fallbackResult.payments.length, [...(result?.errors || []), ...(fallbackResult.errors || [])]);
          await storage.recalculateAllMetrics(uploadId);
          console.log(`Processed ${fallbackResult.payments.length} payments from direct XLSX`);
        }
      }
    } else if (fileType === 'products_csv') {
      // Handle product files dynamically
      const dynamicResult = await FileProcessor.processGenericCSV(buffer, uploadId, 'SKU');
      
      if (dynamicResult.data && dynamicResult.data.length > 0) {
        const productsDynamic = dynamicResult.data.map(row => ({
          uploadId,
          dynamicData: row,
          sku: row['SKU'] || row['sku'] || '',
        }));

        // Replace all existing products for this upload
        await storage.replaceAllProductsDynamic(uploadId, productsDynamic);
        
        // Save file structure metadata
        await storage.saveFileStructure(uploadId, dynamicResult.fileStructure);
        
        // Mark this upload as current
        await storage.markUploadAsCurrent(uploadId, fileType);
        
        recordsProcessed = dynamicResult.data.length;
        
        // Trigger real-time calculation update
        await storage.recalculateAllMetrics(uploadId);
        
        console.log(`Processed ${recordsProcessed} products dynamically`);
      }

      await storage.updateUploadStatus(uploadId, 'processed', recordsProcessed, dynamicResult.errors);
    }
  } catch (error) {
    console.error(`File processing error for upload ${uploadId}:`, error);
    await storage.updateUploadStatus(uploadId, 'failed', 0, [String(error)]);
  }
}

// CSV conversion helper
function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
        name?: string;
        picture?: string;
        dbId?: string; // Add database ID
      };
    }
  }
}
