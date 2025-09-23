# 🚀 ReconMe - Vercel Deployment Guide

This guide will walk you through deploying your ReconMe application to Vercel step by step.

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ A Vercel account (sign up at [vercel.com](https://vercel.com))
- ✅ Your project code ready with all recent changes
- ✅ Firebase project configured
- ✅ Supabase database set up
- ✅ Git repository (GitHub, GitLab, or Bitbucket)

## 🔧 Pre-Deployment Setup

### 1. Update Environment Variables

Create a `.env.production` file in your project root:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyCLtVv-8X3mBfKeCkS_Q0nqk-7DoPfDo4c
VITE_FIREBASE_AUTH_DOMAIN=reconme-fbee1.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=reconme-fbee1
VITE_FIREBASE_STORAGE_BUCKET=reconme-fbee1.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Database Configuration
DATABASE_URL=postgresql://postgres:$Harsh98@db.tepwrjnmaosalngjffvy.supabase.co:5432/postgres

# Server Configuration
PORT=3000
NODE_ENV=production
```

### 2. Create Vercel Configuration

Create `vercel.json` in your project root:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "client/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    },
    {
      "src": "server/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/client/dist/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "server/index.ts": {
      "maxDuration": 30
    }
  }
}
```

### 3. Update Package.json Scripts

Update your root `package.json`:

```json
{
  "name": "meesho-reconcile",
  "version": "1.0.0",
  "scripts": {
    "build": "npm run build:client && npm run build:server",
    "build:client": "cd client && npm install && npm run build",
    "build:server": "cd server && npm install && npm run build",
    "start": "cd server && npm start",
    "dev": "concurrently \"npm run dev:client\" \"npm run dev:server\"",
    "dev:client": "cd client && npm run dev",
    "dev:server": "cd server && npm run dev"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

### 4. Update Client Build Configuration

Update `client/vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
```

### 5. Update Server Configuration

Update `server/index.ts` to handle Vercel deployment:

```typescript
import express from 'express';
import cors from 'cors';
import path from 'path';
import { registerRoutes } from './routes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-app-name.vercel.app'] 
    : ['http://localhost:5173'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
registerRoutes(app);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// For Vercel serverless functions
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
```

## 🚀 Deployment Steps

### Step 1: Push Code to Git Repository

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit changes
git commit -m "feat: prepare for Vercel deployment with modern UI updates"

# Add remote repository (replace with your repo URL)
git remote add origin https://github.com/yourusername/meesho-reconcile.git

# Push to main branch
git push -u origin main
```

### Step 2: Connect to Vercel

1. **Login to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with your GitHub/GitLab/Bitbucket account

2. **Import Project**
   - Click "New Project"
   - Select your repository
   - Click "Import"

### Step 3: Configure Project Settings

1. **Framework Preset**: Select "Other"
2. **Root Directory**: Leave as `.` (root)
3. **Build Command**: `npm run build`
4. **Output Directory**: `client/dist`
5. **Install Command**: `npm install`

### Step 4: Set Environment Variables

In Vercel dashboard, go to your project → Settings → Environment Variables:

Add these variables:

```
VITE_FIREBASE_API_KEY=AIzaSyCLtVv-8X3mBfKeCkS_Q0nqk-7DoPfDo4c
VITE_FIREBASE_AUTH_DOMAIN=reconme-fbee1.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=reconme-fbee1
VITE_FIREBASE_STORAGE_BUCKET=reconme-fbee1.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
DATABASE_URL=postgresql://postgres:$Harsh98@db.tepwrjnmaosalngjffvy.supabase.co:5432/postgres
NODE_ENV=production
```

### Step 5: Deploy

1. Click "Deploy" button
2. Wait for build to complete (usually 2-5 minutes)
3. Your app will be available at `https://your-project-name.vercel.app`

## 🔧 Post-Deployment Configuration

### 1. Update Firebase Configuration

In Firebase Console:
1. Go to Authentication → Settings → Authorized domains
2. Add your Vercel domain: `your-project-name.vercel.app`

### 2. Update CORS Settings

Update your server CORS configuration with the actual Vercel URL:

```typescript
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-actual-vercel-url.vercel.app'] 
    : ['http://localhost:5173'],
  credentials: true
}));
```

### 3. Test Your Deployment

1. **Authentication**: Test Google sign-in
2. **File Upload**: Test CSV/ZIP file processing
3. **Dashboard**: Verify all charts and data load
4. **Orders**: Check order filtering and calculations
5. **Products**: Test product cost updates

## 🐛 Troubleshooting

### Common Issues and Solutions

#### Build Failures

**Issue**: Build fails with dependency errors
```bash
# Solution: Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Issue**: TypeScript errors during build
```bash
# Solution: Check and fix TypeScript errors
npm run type-check
```

#### Runtime Errors

**Issue**: API calls fail with CORS errors
- **Solution**: Update CORS configuration with correct Vercel URL

**Issue**: Environment variables not working
- **Solution**: Ensure all env vars are set in Vercel dashboard and prefixed with `VITE_` for client-side variables

**Issue**: Database connection fails
- **Solution**: Verify DATABASE_URL is correct and Supabase allows connections from Vercel IPs

#### Performance Issues

**Issue**: Slow loading times
- **Solution**: Enable compression and optimize bundle size:

```typescript
// Add to vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
  },
})
```

## 📊 Monitoring and Analytics

### 1. Vercel Analytics

Enable Vercel Analytics in your project dashboard for:
- Page views and user sessions
- Performance metrics
- Error tracking

### 2. Custom Monitoring

Add error boundary and logging:

```typescript
// Add to your main App component
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({error}: {error: Error}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

// Wrap your app
<ErrorBoundary FallbackComponent={ErrorFallback}>
  <App />
</ErrorBoundary>
```

## 🔄 Continuous Deployment

### Automatic Deployments

Vercel automatically deploys when you push to your main branch:

```bash
# Make changes
git add .
git commit -m "feat: add new feature"
git push origin main
# Vercel will automatically deploy
```

### Preview Deployments

Every pull request gets a preview deployment:
1. Create a new branch
2. Make changes
3. Push and create PR
4. Vercel creates preview URL
5. Test before merging

## 🎉 Success Checklist

After successful deployment, verify:

- ✅ Login page loads with modern design
- ✅ Google sign-in works with proper logo
- ✅ ReconMe logo displays correctly
- ✅ Dashboard shows all analytics
- ✅ File upload processes correctly
- ✅ Orders page displays and filters work
- ✅ Products page bulk updates function
- ✅ Footer appears on all pages
- ✅ Mobile responsive design works
- ✅ All buttons have modern gradient colors
- ✅ Performance is acceptable (< 3s load time)

## 📞 Support

If you encounter issues:

1. **Check Vercel Logs**: Project → Functions → View logs
2. **Check Browser Console**: F12 → Console tab
3. **Verify Environment Variables**: Project → Settings → Environment Variables
4. **Test Locally First**: Ensure everything works in development

## 🔗 Useful Links

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [Supabase Connection Guide](https://supabase.com/docs/guides/database/connecting-to-postgres)

---

**🎊 Congratulations!** Your ReconMe application is now live on Vercel with modern UI, Google authentication, and comprehensive functionality!

**Live URL**: `https://your-project-name.vercel.app`

Remember to update this URL in your Firebase configuration and share it with your users.