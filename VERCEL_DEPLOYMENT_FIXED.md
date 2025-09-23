# Vercel Deployment Guide - Fixed

## ✅ Issue Fixed

The error "The `functions` property cannot be used in conjunction with the `builds` property" has been resolved by:

1. **Removed deprecated `builds` property** from `vercel.json`
2. **Updated to use modern Vercel configuration** with `functions` property
3. **Fixed build scripts** to avoid infinite loops
4. **Corrected output directory** to match Vite build output

## 📁 Current Configuration

### vercel.json
```json
{
  "version": 2,
  "buildCommand": "npm run build:client",
  "outputDirectory": "dist/public",
  "installCommand": "npm install",
  "functions": {
    "server/index.ts": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/server/index.ts"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### package.json scripts (fixed)
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:client\" \"npm run dev:server\"",
    "dev:client": "vite",
    "dev:server": "NODE_ENV=development tsx server/index.ts",
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build",
    "build:server": "esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "vercel-build": "npm run build:client"
  }
}
```

## 🚀 Deployment Steps

### 1. Environment Variables
Make sure to set these in your Vercel dashboard:

```bash
DATABASE_URL=your_neon_database_url
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
NODE_ENV=production
```

### 2. Deploy to Vercel

#### Option A: Vercel CLI
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy
vercel --prod
```

#### Option B: GitHub Integration
1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Vercel will automatically deploy

### 3. Verify Deployment

After deployment, check:
- ✅ Frontend loads correctly
- ✅ API endpoints work (`/api/health`)
- ✅ Database connections work
- ✅ Authentication works
- ✅ File uploads work

## 🔧 Build Process

The build process now:
1. **Install dependencies**: `npm install`
2. **Build client**: `vite build` → outputs to `dist/public/`
3. **Serve static files**: Vercel serves from `dist/public/`
4. **API routes**: Handled by `server/index.ts` function

## 🐛 Troubleshooting

### If build fails:
```bash
# Test build locally
npm run build:client

# Check output
ls -la dist/public/
```

### If API doesn't work:
- Check environment variables in Vercel dashboard
- Verify database connection string
- Check function logs in Vercel dashboard

### If static files don't load:
- Verify `outputDirectory` in `vercel.json`
- Check build output in `dist/public/`

## 📝 Notes

- **No more `builds` property**: Using modern Vercel configuration
- **Functions timeout**: Set to 30 seconds for database operations
- **Static files**: Served from `dist/public/`
- **API routes**: All `/api/*` routes go to `server/index.ts`

Your deployment should now work without the functions/builds conflict error! 🎉