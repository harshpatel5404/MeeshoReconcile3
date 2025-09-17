# ReconMe - Payment Reconciliation Platform

## Overview

ReconMe is a comprehensive payment reconciliation web application designed for e-commerce businesses, particularly those selling through platforms like Meesho. The system automates the complex process of matching orders with payment settlements, providing detailed financial analytics and discrepancy detection.

The application processes uploaded CSV/Excel files containing order and payment data, automatically reconciles transactions, and generates comprehensive reports with profit/loss calculations, commission tracking, and settlement analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development patterns
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent, responsive design
- **State Management**: React Query (TanStack Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for robust form handling
- **Charts**: Recharts for data visualization and analytics dashboards

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for full-stack type safety
- **Database ORM**: Drizzle ORM with PostgreSQL for type-safe database operations
- **File Processing**: Multer for multipart file uploads, with support for CSV and Excel parsing
- **API Design**: RESTful API endpoints with proper HTTP status codes and error handling

### Authentication & Authorization
- **Primary Auth**: Firebase Authentication for user management
- **Token Verification**: Firebase Admin SDK for server-side token validation
- **Session Management**: JWT tokens with automatic refresh capabilities
- **Authorization**: Role-based access control through Firebase user claims

### Database Design
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **Schema Management**: Drizzle migrations for version-controlled database changes
- **Core Entities**:
  - Users (Firebase UID mapping, user profiles)
  - Products (SKU management, cost tracking, GST calculations)
  - Orders (transaction details, customer information, pricing)
  - Payments (settlement tracking, fee calculations)
  - Reconciliations (matched transactions, discrepancy detection)
  - Uploads (file processing history, batch tracking)

### File Processing Pipeline
- **Upload Handling**: Multipart form data processing with file type validation
- **Format Support**: CSV and Excel file parsing with automatic column mapping
- **Data Transformation**: Order and payment data normalization with validation
- **Batch Processing**: Idempotent processing to prevent duplicate data insertion
- **Error Handling**: Comprehensive error logging and user feedback for processing issues

### Reconciliation Engine
- **Matching Algorithm**: Sub-order number based transaction matching
- **Financial Calculations**: 
  - Profit/loss computation with product costs and fees
  - Commission and gateway fee tracking
  - GST calculations and tax reporting
- **Discrepancy Detection**: Automated identification of mismatched settlements
- **Status Tracking**: Order lifecycle management (delivered, RTO, cancelled)

### UI/UX Architecture
- **Design System**: Consistent component library with shadcn/ui
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Dark Mode**: CSS custom properties for theme switching
- **Accessibility**: ARIA compliance and keyboard navigation support
- **Loading States**: Skeleton loading and progressive enhancement

## External Dependencies

### Cloud Services
- **Firebase**: Authentication service and user management
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit**: Development and deployment platform

### Core Libraries
- **@neondatabase/serverless**: PostgreSQL driver for serverless environments
- **drizzle-orm**: Type-safe ORM with query builder
- **@tanstack/react-query**: Server state management and caching
- **firebase-admin**: Server-side Firebase SDK for token verification
- **multer**: File upload middleware for Express

### UI Components
- **@radix-ui**: Headless component primitives for accessibility
- **recharts**: Chart library for data visualization
- **react-hook-form**: Form validation and state management
- **@hookform/resolvers**: Zod integration for form validation
- **tailwindcss**: Utility-first CSS framework

### Development Tools
- **Vite**: Build tool with hot module replacement
- **TypeScript**: Static type checking across the stack
- **ESBuild**: Fast JavaScript bundler for production builds
- **tsx**: TypeScript execution for development server

### File Processing
- **csv-parser**: CSV file parsing and transformation
- **xlsx**: Excel file reading and data extraction
- **date-fns**: Date manipulation and formatting utilities

The architecture emphasizes type safety, scalability, and maintainability while providing a smooth user experience for complex financial data processing workflows.