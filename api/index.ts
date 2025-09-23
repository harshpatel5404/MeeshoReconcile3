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

// Placeholder routes for the main functionality
app.post('/api/auth/verify', async (req: Request, res: Response) => {
  try {
    // For now, return a basic response
    res.json({ message: 'Auth endpoint - implementation needed' });
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
});

app.get('/api/dashboard/summary', async (req: Request, res: Response) => {
  try {
    // Return mock data for now
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

app.get('/api/orders', async (req: Request, res: Response) => {
  try {
    // Return empty array for now
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

app.get('/api/products', async (req: Request, res: Response) => {
  try {
    // Return empty array for now
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

app.post('/api/upload', async (req: Request, res: Response) => {
  try {
    res.json({ message: 'Upload endpoint - implementation needed' });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed' });
  }
});

// Catch-all for undefined API routes
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ 
    message: `API endpoint ${req.path} not found`,
    availableEndpoints: [
      '/api/health',
      '/api/auth/verify',
      '/api/dashboard/summary',
      '/api/orders',
      '/api/products',
      '/api/upload'
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

// Export for Vercel
export default app;