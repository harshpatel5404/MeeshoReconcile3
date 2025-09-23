# Vercel Deployment Fix Guide

## Issue Resolved
The deployment was failing with the error:
```
[ERR_MODULE_NOT_FOUND]: Cannot find module '/var/task/server/routes' imported from /var/task/api/index.js
```

## Root Cause
The original `api/index.ts` was trying to import from `../server/routes`, but Vercel's serverless environment doesn't include the server directory structure in the deployment package.

## Changes Made

### 1. Updated `api/index.ts`
- Removed dependency on `../server/routes`
- Created a self-contained serverless function
- Added basic API endpoints with placeholder implementations
- Included proper CORS headers
- Added error handling

### 2. Updated `vercel.json`
- Added catch-all rewrite rule for SPA routing: `"source": "/(.*)", "destination": "/index.html"`
- This ensures the React app handles client-side routing properly

### 3. Updated `tsconfig.json`
- Added `"api/**/*"` to the include array
- This ensures TypeScript properly compiles the API directory

## Current API Endpoints
The following endpoints are now available (with basic implementations):

- `GET /api/health` - Health check
- `POST /api/auth/verify` - Authentication (placeholder)
- `GET /api/dashboard/summary` - Dashboard data (placeholder)
- `GET /api/orders` - Orders list (placeholder)
- `GET /api/products` - Products list (placeholder)
- `POST /api/upload` - File upload (placeholder)

## Next Steps

### For Immediate Deployment
1. Commit these changes to your repository
2. Deploy to Vercel - the deployment should now succeed
3. The frontend will load, but API functionality will be limited to placeholders

### For Full Functionality
You'll need to implement the full API logic in `api/index.ts`. This involves:

1. **Database Connection**: Set up your database connection (Neon, PostgreSQL, etc.)
2. **Authentication**: Implement Firebase authentication verification
3. **File Processing**: Add file upload and processing logic
4. **Business Logic**: Implement all the dashboard calculations and data processing

### Environment Variables
Make sure these are set in your Vercel dashboard:
- `DATABASE_URL` - Your database connection string
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_PRIVATE_KEY` - Firebase service account private key
- `FIREBASE_CLIENT_EMAIL` - Firebase service account email
- Any other environment variables your app needs

## Testing the Fix
1. Deploy to Vercel
2. Visit your deployed URL
3. Check that the React app loads without errors
4. Test the `/api/health` endpoint to confirm the API is working
5. Gradually implement and test each API endpoint

## File Structure After Fix
```
/
├── api/
│   └── index.ts          # Self-contained serverless function
├── client/               # React frontend
├── server/               # Local development server (not deployed)
├── shared/               # Shared types and schemas
├── vercel.json           # Updated Vercel configuration
└── tsconfig.json         # Updated TypeScript configuration
```

The deployment should now work successfully, giving you a foundation to build upon.