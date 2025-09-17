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

  // Upload routes
  app.post('/api/upload', authenticateUser, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { fileType, sourceMonth, label } = req.body;
      
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
      processFileAsync(uploadRecord.id, req.file.buffer, fileType);

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
      
      if (!['packagingCost', 'gstPercent'].includes(field)) {
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
async function processFileAsync(uploadId: string, buffer: Buffer, fileType: string) {
  try {
    let result;
    
    if (fileType === 'orders_csv') {
      result = await FileProcessor.processOrdersCSV(buffer);
      if (result.orders) {
        await storage.bulkCreateOrders(result.orders);
        await FileProcessor.extractProductsFromOrders(result.orders);
        await storage.updateUploadStatus(uploadId, 'processed', result.orders.length, result.errors);
      }
    } else if (fileType === 'payment_zip') {
      result = await FileProcessor.processPaymentsXLSX(buffer);
      if (result.payments) {
        await storage.bulkCreatePayments(result.payments);
        await storage.updateUploadStatus(uploadId, 'processed', result.payments.length, result.errors);
      }
    }
  } catch (error) {
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
