# Local Setup Instructions - Meesho Payment Reconciliation System

Complete step-by-step guide to run the Meesho Payment Reconciliation application on your local machine.

## 📋 Prerequisites

Before starting, ensure you have the following installed:

### Required Software
1. **Node.js** (version 18 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **npm** (comes with Node.js)
   - Verify installation: `npm --version`

3. **Git** (for cloning repository)
   - Download from: https://git-scm.com/
   - Verify installation: `git --version`

## 🚀 Step 1: Get the Code

### Option A: Clone from GitHub (if available)
```bash
git clone <your-github-repository-url>
cd meesho-payment-reconciliation
```

### Option B: Download ZIP file
1. Download the project ZIP file
2. Extract to your desired folder
3. Open terminal/command prompt in the extracted folder

## 📦 Step 2: Install Dependencies

```bash
# Install all project dependencies
npm install
```

**Expected output:** You should see packages being installed and no major errors.

## 🗄️ Step 3: Database Setup

The application uses Supabase PostgreSQL database with embedded credentials.

### Push Database Schema
```bash
# Create all required database tables
npm run db:push
```

**Expected output:** 
```
✓ Pulling schema from database...
✓ Changes applied
```

## 🔥 Step 4: Firebase Configuration

**✅ No setup required!** All Firebase credentials are embedded in the code:
- Located in: `client/src/lib/firebase.ts` and `server/services/firebase.ts`
- Project: `reconme-fbee1`
- All configuration is automatic

## ▶️ Step 5: Start the Application

```bash
# Start the development server
npm run dev
```

**Expected output:**
```
> rest-express@1.0.0 dev
> NODE_ENV=development tsx server/index.ts

[timestamp] [express] serving on port 5000
```

## 🌐 Step 6: Access the Application

1. **Open your web browser**
2. **Navigate to:** `http://localhost:5000`
3. **You should see:** The login page for Meesho Payment Reconciliation

## 🔐 Step 7: Test Login

Use the embedded test credentials:
- **Email:** `test@gmail.com`
- **Password:** `test1234`

### Login Process:
1. Enter the credentials on the login page
2. Click "Sign In"
3. You should be redirected to the Dashboard
4. Dashboard should display analytics and summary data

## 📁 Step 8: Test File Upload

1. **Navigate to Upload page** (use sidebar menu)
2. **Test with sample files:**
   - **Orders CSV:** Any CSV file with order data
   - **Payment Excel:** Any XLSX file with payment data
3. **Upload process:**
   - Select files
   - Add source month/label (optional)
   - Click "Process Files"
   - Check upload status in the history section

## 🛠️ Step 9: Verify All Features

### Core Features to Test:
- ✅ **Authentication:** Login/logout works
- ✅ **Dashboard:** Analytics and charts display
- ✅ **File Upload:** CSV and Excel files can be uploaded
- ✅ **Data Processing:** Files are processed and stored
- ✅ **Navigation:** All menu items work (Orders, Products, Reconciliation)

## 🔧 Step 10: Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Check TypeScript types
npm run check

# Push database schema changes
npm run db:push
```

## 📂 Project Structure Overview

```
meesho-payment-reconciliation/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── lib/           # Firebase and utility configs
│   │   └── contexts/      # React contexts
├── server/                # Backend Express server
│   ├── services/          # Business logic
│   ├── routes.ts          # API routes
│   └── storage.ts         # Database operations
├── shared/                # Shared types and schemas
└── config/               # Configuration files
```

## 🚨 Troubleshooting

### Common Issues and Solutions:

#### 1. **Port 5000 already in use**
```bash
# Kill process using port 5000
npx kill-port 5000
# Then restart
npm run dev
```

#### 2. **Database connection errors**
- **Issue:** `relation "users" does not exist`
- **Solution:** Run `npm run db:push` to create tables

#### 3. **Firebase authentication errors**
- **Issue:** `Invalid API key`
- **Solution:** Credentials are embedded, restart the server: `npm run dev`

#### 4. **Module not found errors**
```bash
# Clean install dependencies
rm -rf node_modules
rm package-lock.json
npm install
```

#### 5. **TypeScript errors**
```bash
# Check for type errors
npm run check
```

#### 6. **Build errors**
```bash
# Clean build
rm -rf dist
npm run build
```

## 📊 Using the Application

### 1. **Dashboard**
- View revenue analytics
- Monitor reconciliation status
- Check order success rates

### 2. **Upload Files**
- **Payment Files:** Upload Meesho payment XLSX files
- **Order Files:** Upload order CSV files
- Monitor processing status

### 3. **Orders Management**
- View all uploaded orders
- Filter by date, status, sub-order number
- Export data

### 4. **Products Management**
- View product catalog
- Update cost prices and GST
- Monitor product performance

### 5. **Reconciliation**
- View matched/unmatched payments
- Analyze profit margins
- Export reconciliation reports

## 🔒 Important Notes

### Security:
- **Database credentials** are embedded for development
- **Firebase credentials** are embedded for easy setup
- **For production:** Use environment variables

### Data:
- **Test data** is safe to use
- **Real data** will be processed and stored
- **Database** is persistent across restarts

### Performance:
- **File size limit:** 50MB per upload
- **Supported formats:** CSV, XLSX, ZIP
- **Processing** is asynchronous

## ✅ Success Checklist

Before considering setup complete, verify:

- [ ] Node.js and npm installed
- [ ] Dependencies installed without errors
- [ ] Database tables created (`npm run db:push`)
- [ ] Server starts on port 5000
- [ ] Login works with test credentials
- [ ] Dashboard loads with data
- [ ] File upload interface accessible
- [ ] All navigation menu items work

## 📞 Getting Help

If you encounter issues:

1. **Check the console** for error messages
2. **Verify prerequisites** are installed correctly
3. **Run commands in order** as specified
4. **Check database connectivity** with `npm run db:push`
5. **Restart the server** if authentication fails

## 🎯 Next Steps

After successful setup:

1. **Customize** the application for your needs
2. **Upload real data** for testing
3. **Configure production** environment variables
4. **Deploy** to your preferred hosting platform

---

**🎉 Congratulations!** Your Meesho Payment Reconciliation System is now running locally!