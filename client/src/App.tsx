import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Footer from "@/components/Footer";
import Dashboard from "@/pages/Dashboard";
import Upload from "@/pages/Upload";
import Orders from "@/pages/Orders";
import Products from "@/pages/Products";
import Account from "@/pages/Account";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import NotFound from "@/pages/not-found";

function AppLayout({ children, showFooter = true }: { children: React.ReactNode; showFooter?: boolean }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1">
        {children}
      </div>
      {showFooter && <Footer />}
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <>{children}</>;
}

function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login">
        {user ? <Dashboard /> : <Login />}
      </Route>
      <Route path="/signup">
        {user ? <Dashboard /> : <Signup />}
      </Route>
      
      {/* Protected routes */}
      <Route path="/">
        <ProtectedRoute>
          <AppLayout>
            <Dashboard />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/upload">
        <ProtectedRoute>
          <AppLayout>
            <Upload />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/orders">
        <ProtectedRoute>
          <AppLayout>
            <Orders />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/products">
        <ProtectedRoute>
          <AppLayout>
            <Products />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/account">
        <ProtectedRoute>
          <AppLayout>
            <Account />
          </AppLayout>
        </ProtectedRoute>
      </Route>
      
      {/* 404 route */}
      <Route>
        <AppLayout>
          <NotFound />
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppRouter />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
