import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Add CORS headers for Vercel
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Basic health check route
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
app.post('/api/auth/verify', async (req: Request, res: Response) => {
  try {
    res.json({ message: 'Auth endpoint - implementation needed' });
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
});

// Dashboard routes
app.get('/api/dashboard/summary', async (req: Request, res: Response) => {
  try {
    res.json({
      totalOrders: 0,
      totalRevenue: 0,
      pendingPayments: 0,
      message: 'Dashboard endpoint - implementation needed'
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch dashboard summary' });
  }
});

app.get('/api/dashboard/comprehensive-summary', async (req: Request, res: Response) => {
  try {
    res.json({
      totalOrders: 0,
      totalRevenue: 0,
      pendingPayments: 0,
      completedOrders: 0,
      message: 'Comprehensive summary endpoint - implementation needed'
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch comprehensive summary' });
  }
});

app.get('/api/dashboard/settlement-components', async (req: Request, res: Response) => {
  try {
    res.json({
      totalSettlement: 0,
      components: [],
      message: 'Settlement components endpoint - implementation needed'
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch settlement components' });
  }
});

app.get('/api/dashboard/earnings-overview', async (req: Request, res: Response) => {
  try {
    res.json({
      totalEarnings: 0,
      breakdown: {},
      message: 'Earnings overview endpoint - implementation needed'
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch earnings overview' });
  }
});

app.get('/api/dashboard/operational-costs', async (req: Request, res: Response) => {
  try {
    res.json({
      totalCosts: 0,
      breakdown: {},
      message: 'Operational costs endpoint - implementation needed'
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch operational costs' });
  }
});

app.get('/api/dashboard/orders-overview', async (req: Request, res: Response) => {
  try {
    res.json({
      totalOrders: 0,
      statusBreakdown: {},
      message: 'Orders overview endpoint - implementation needed'
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch orders overview' });
  }
});

app.get('/api/dashboard/live-metrics', async (req: Request, res: Response) => {
  try {
    res.json({
      liveMetrics: {},
      lastUpdated: new Date().toISOString(),
      message: 'Live metrics endpoint - implementation needed'
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch live metrics' });
  }
});

app.post('/api/dashboard/recalculate', async (req: Request, res: Response) => {
  try {
    res.json({ message: 'Recalculation triggered - implementation needed' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to trigger recalculation' });
  }
});

app.get('/api/dashboard/daily-volume', async (req: Request, res: Response) => {
  try {
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch daily volume' });
  }
});

app.get('/api/dashboard/top-returns', async (req: Request, res: Response) => {
  try {
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch top returns' });
  }
});

app.get('/api/dashboard/order-status', async (req: Request, res: Response) => {
  try {
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch order status' });
  }
});

app.get('/api/dashboard/revenue-trend', async (req: Request, res: Response) => {
  try {
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch revenue trend' });
  }
});

app.get('/api/dashboard/top-products', async (req: Request, res: Response) => {
  try {
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch top products' });
  }
});

// Orders routes
app.get('/api/orders', async (req: Request, res: Response) => {
  try {
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

app.get('/api/orders-dynamic', async (req: Request, res: Response) => {
  try {
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch dynamic orders' });
  }
});

app.put('/api/orders-dynamic/:id', async (req: Request, res: Response) => {
  try {
    res.json({ message: 'Order updated - implementation needed' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update order' });
  }
});

// Products routes
app.get('/api/products', async (req: Request, res: Response) => {
  try {
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

app.get('/api/products-dynamic', async (req: Request, res: Response) => {
  try {
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch dynamic products' });
  }
});

app.put('/api/products-dynamic/:id', async (req: Request, res: Response) => {
  try {
    res.json({ message: 'Product updated - implementation needed' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update product' });
  }
});

app.put('/api/products/:sku', async (req: Request, res: Response) => {
  try {
    res.json({ message: 'Product updated by SKU - implementation needed' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update product' });
  }
});

app.post('/api/products/bulk-update', async (req: Request, res: Response) => {
  try {
    res.json({ message: 'Bulk update completed - implementation needed' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to perform bulk update' });
  }
});

app.post('/api/products/update-all-costs', async (req: Request, res: Response) => {
  try {
    res.json({ message: 'All costs updated - implementation needed' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update all costs' });
  }
});

// Upload routes
app.post('/api/upload', async (req: Request, res: Response) => {
  try {
    res.json({ message: 'Upload endpoint - implementation needed' });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed' });
  }
});

app.get('/api/uploads', async (req: Request, res: Response) => {
  try {
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch uploads' });
  }
});

// Reconciliation routes
app.get('/api/reconciliations', async (req: Request, res: Response) => {
  try {
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch reconciliations' });
  }
});

app.get('/api/reconciliations/summary', async (req: Request, res: Response) => {
  try {
    res.json({
      total: 0,
      matched: 0,
      unmatched: 0,
      message: 'Reconciliation summary - implementation needed'
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch reconciliation summary' });
  }
});

app.post('/api/reconciliations/run', async (req: Request, res: Response) => {
  try {
    res.json({ message: 'Reconciliation run started - implementation needed' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to run reconciliation' });
  }
});

// Account/User routes
app.get('/api/account/usage', async (req: Request, res: Response) => {
  try {
    res.json({
      usage: 0,
      limit: 1000,
      message: 'Account usage - implementation needed'
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch account usage' });
  }
});

app.get('/api/users/me/usage', async (req: Request, res: Response) => {
  try {
    res.json({
      usage: 0,
      limit: 1000,
      message: 'User usage - implementation needed'
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user usage' });
  }
});

// Export routes
app.get('/api/export/reconciliations', async (req: Request, res: Response) => {
  try {
    res.json({ message: 'Export reconciliations - implementation needed' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to export reconciliations' });
  }
});

app.get('/api/export/orders', async (req: Request, res: Response) => {
  try {
    res.json({ message: 'Export orders - implementation needed' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to export orders' });
  }
});

// Catch-all for undefined API routes
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ 
    message: `API endpoint ${req.path} not found`,
    availableEndpoints: [
      '/api/health',
      '/api/auth/verify',
      '/api/dashboard/*',
      '/api/orders',
      '/api/orders-dynamic',
      '/api/products',
      '/api/products-dynamic',
      '/api/upload',
      '/api/uploads',
      '/api/reconciliations',
      '/api/account/usage',
      '/api/users/me/usage',
      '/api/export/*'
    ]
  });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error('API Error:', err);
  res.status(status).json({ message });
});

// Export for Vercel serverless functions
export default app;

// Also export as handler for compatibility
export const handler = app;