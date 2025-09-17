# Meesho Payment Reconciliation System

A full-stack web application for reconciling payment data from Meesho with automated order matching and financial reporting capabilities.

## 🚀 Features

- **Authentication**: Firebase-based user authentication with email/password and Google sign-in
- **File Upload**: Support for CSV and Excel file uploads for payment and order data
- **Data Reconciliation**: Automated matching of payments with orders
- **Dashboard**: Real-time analytics with charts and metrics
- **Responsive Design**: Modern UI built with React, Tailwind CSS, and Shadcn/UI components

## 🛠 Tech Stack

**Frontend:**
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS + Shadcn/UI components
- React Query for state management
- Recharts for data visualization
- Wouter for routing

**Backend:**
- Node.js with Express
- TypeScript
- Firebase Admin SDK
- Drizzle ORM for database operations

**Database:**
- PostgreSQL (Supabase)
- Drizzle ORM for schema management

**Authentication:**
- Firebase Authentication
- Google OAuth integration
- Session-based authentication with express-session

## 🔧 Environment Setup

### Quick Setup for New Developers

1. **Check Configuration Files**:
   - All credentials are stored in `config/setup.js` and `config/env.template`
   - Use these files to quickly understand and set up the project

2. **Run Setup Helper** (optional):
   ```bash
   node -e "require('./config/setup.js').setupEnvironment()"
   ```

### Required Environment Variables

Copy values from `config/env.template` to your Replit Secrets:

```env
# Firebase Configuration
VITE_FIREBASE_PROJECT_ID=reconme-fbee1
VITE_FIREBASE_APP_ID=1:511599323860:web:38ac9cf5e061ff350e2941
VITE_FIREBASE_API_KEY=AIzaSyCLtVv-8X3mBfKeCkS_Q0nqk-7DoPfDo4c
VITE_FIREBASE_MESSAGING_SENDER_ID=511599323860

# Database
DATABASE_URL=postgresql://postgres:$Harsh98@db.tepwrjnmaosalngjffvy.supabase.co:5432/postgres
```

### Firebase Configuration Details

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyCLtVv-8X3mBfKeCkS_Q0nqk-7DoPfDo4c",
  authDomain: "reconme-fbee1.firebaseapp.com",
  databaseURL: "https://reconme-fbee1-default-rtdb.firebaseio.com",
  projectId: "reconme-fbee1",
  storageBucket: "reconme-fbee1.firebasestorage.app",
  messagingSenderId: "511599323860",
  appId: "1:511599323860:web:38ac9cf5e061ff350e2941"
};
```

### Test Credentials

For testing purposes, use these credentials:
- **Email**: test@gmail.com
- **Password**: test1234

## 📦 Installation & Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Set Environment Variables**:
   - Add the Firebase environment variables listed above
   - Ensure DATABASE_URL is configured for your database

3. **Database Setup**:
   ```bash
   npm run db:push
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts (Auth, etc.)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/           # Utilities and configurations
│   │   ├── pages/         # Page components
│   │   └── main.tsx       # Entry point
├── server/                # Backend Express server
│   ├── services/          # Business logic services
│   ├── index.ts          # Server entry point
│   └── routes.ts         # API routes
├── shared/               # Shared types and schemas
└── package.json          # Dependencies and scripts
```

## 🔄 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes

## 🔐 Security Features

- Environment variable-based configuration
- Firebase authentication with secure token management
- Session-based authentication with secure cookies
- Input validation using Zod schemas
- Protected API routes with authentication middleware

## 🚀 Deployment

The application is configured for Replit deployment:
- Frontend serves from port 5000
- Backend API runs on the same port
- Environment variables managed through Replit's secret management
- Automatic SSL and domain setup

## 🔄 Data Flow

1. **File Upload**: Users upload payment/order CSV/Excel files
2. **Processing**: Backend processes and validates data
3. **Storage**: Data stored in PostgreSQL database
4. **Reconciliation**: Automated matching of payments with orders
5. **Visualization**: Dashboard displays reconciliation results and analytics

## 🤝 Contributing

When making changes to this project:

1. Ensure environment variables are properly configured
2. Test authentication flows with provided test credentials
3. Verify database connectivity before deploying
4. Follow existing code patterns and TypeScript conventions

## 📝 Notes for Future Development

- Firebase project: `reconme-fbee1`
- Database: Supabase PostgreSQL instance
- Authentication supports both email/password and Google OAuth
- All sensitive configuration is environment-based for security
- The project uses modern React patterns with hooks and context
- Backend follows RESTful API design principles

## 🆘 Troubleshooting

**Authentication Issues:**
- Verify Firebase environment variables are set correctly
- Check Firebase console for authorized domains
- Ensure test credentials are active in Firebase Auth

**Database Issues:**
- Verify DATABASE_URL connection string
- Check Supabase dashboard for connection limits
- Run `npm run db:push` to sync schema

**Build Issues:**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check TypeScript compilation: `npm run check`
- Verify all environment variables are set