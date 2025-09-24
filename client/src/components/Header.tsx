import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, LayoutDashboard, Upload, FileText, Package, LogOut, Menu, X, AlertTriangle, User, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthQuery } from '@/hooks/use-auth-query';
import { logOut } from '@/lib/firebase';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Orders', href: '/orders', icon: FileText },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Upload Files', href: '/upload', icon: Upload },
];

interface HeaderProps {
  title: string;
  subtitle: string;
  rightContent?: React.ReactNode;
}

export default function Header({ title, subtitle, rightContent }: HeaderProps) {
  const [location] = useLocation();
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Fetch usage data for mobile display
  const { data: usage } = useAuthQuery({
    queryKey: ['/api/account/usage'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Type guard for usage data
  const usageData = usage as { 
    currentUsage: number; 
    monthlyQuota: number; 
    remainingUsage: number; 
    canProcess: boolean; 
    resetDate: string; 
  } | undefined;

  const handleLogout = async () => {
    try {
      toast({
        title: "Signing out...",
        description: "Clearing your session data.",
      });
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout fails
      window.location.href = '/login';
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <>
      {/* Top Navigation Header */}
      <nav className="bg-card border-b border-border px-4 sm:px-6 py-3" data-testid="top-nav">
        <div className="flex items-center justify-between">
          {/* Logo and Mobile Menu */}
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden"
                  data-testid="mobile-menu-trigger"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <div className="flex flex-col h-full">
                  {/* Mobile Header */}
                  <div className="flex items-center justify-between p-6 border-b">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h1 className="font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">ReconMe</h1>
                    </div>
                  </div>

                  {/* Mobile Navigation */}
                  <div className="flex-1 p-6">
                    <nav className="space-y-2">
                      {navigation.map((item) => {
                        const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
                        return (
                          <Link key={item.name} href={item.href}>
                            <div 
                              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium cursor-pointer ${
                                isActive 
                                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                                  : 'hover:bg-slate-100 text-slate-700'
                              }`}
                              onClick={() => setIsDrawerOpen(false)}
                              data-testid={`mobile-nav-${item.name.toLowerCase().replace(' ', '-')}`}
                            >
                              <item.icon className="w-5 h-5" />
                              {item.name}
                            </div>
                          </Link>
                        );
                      })}
                    </nav>
                  </div>

                  {/* Mobile User Profile */}
                  <div className="p-6 border-t">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium" data-testid="mobile-user-initials">
                          {getInitials(user?.displayName, user?.email)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium" data-testid="mobile-user-name">
                          {user?.displayName || user?.email?.split('@')[0] || 'User'}
                        </p>
                        <p className="text-xs text-muted-foreground" data-testid="mobile-user-email">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                    
                    {/* Mobile Usage Limits */}
                    {usageData && typeof usageData.currentUsage === 'number' && typeof usageData.monthlyQuota === 'number' && (
                      <div className="mb-4 p-3 bg-accent/50 rounded-md">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-muted-foreground">Monthly Uploads</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {String(usageData.currentUsage).padStart(2, '0')}/{String(usageData.monthlyQuota).padStart(2, '0')}
                          </span>
                        </div>
                        <Progress 
                          value={(usageData.currentUsage / usageData.monthlyQuota) * 100} 
                          className="h-2 mb-2"
                        />
                        {usageData.currentUsage >= usageData.monthlyQuota ? (
                          <div className="flex items-center gap-1 text-xs text-destructive">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Limit reached</span>
                          </div>
                        ) : usageData.currentUsage >= usageData.monthlyQuota * 0.8 ? (
                          <div className="flex items-center gap-1 text-xs text-orange-600">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Approaching limit</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {usageData.remainingUsage} uploads remaining
                          </span>
                        )}
                      </div>
                    )}
                    
                    <Button 
                      onClick={handleLogout}
                      variant="outline"
                      className="w-full justify-start gap-2"
                      data-testid="mobile-button-logout"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">ReconMe</h1>
            </div>
          </div>
            
          {/* Desktop Navigation Links - Hidden on Mobile */}
          <div className="hidden md:flex items-center gap-6">
            {navigation.map((item) => {
              const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
              return (
                <Link key={item.name} href={item.href}>
                  <div 
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm font-medium cursor-pointer ${
                      isActive 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                    data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop User Profile - Hidden on Mobile */}
          <div className="hidden md:flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent"
                  data-testid="profile-menu-trigger"
                >
                  <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium" data-testid="user-initials">
                      {getInitials(user?.displayName, user?.email)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" data-testid="user-name">
                      {user?.displayName || user?.email?.split('@')[0] || 'User'}
                    </span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.displayName || user?.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Usage Limits in Dropdown */}
                {usageData && typeof usageData.currentUsage === 'number' && typeof usageData.monthlyQuota === 'number' && (
                  <>
                    <div className="px-2 py-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Monthly Uploads</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {String(usageData.currentUsage).padStart(2, '0')}/{String(usageData.monthlyQuota).padStart(2, '0')}
                          </span>
                        </div>
                        <Progress 
                          value={(usageData.currentUsage / usageData.monthlyQuota) * 100} 
                          className="h-2"
                        />
                        <div className="flex items-center justify-between text-xs">
                          {usageData.currentUsage >= usageData.monthlyQuota ? (
                            <div className="flex items-center gap-1 text-destructive">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Limit reached</span>
                            </div>
                          ) : usageData.currentUsage >= usageData.monthlyQuota * 0.8 ? (
                            <div className="flex items-center gap-1 text-orange-600">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Approaching limit</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              {usageData.remainingUsage} uploads remaining
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
                
                <Link href="/account">
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Account Settings</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* Page Header */}
      <header className="bg-card border-b border-border px-4 sm:px-6 py-4" data-testid="header">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold truncate" data-testid="page-title">{title}</h1>
            <p className="text-sm sm:text-base text-muted-foreground truncate" data-testid="page-subtitle">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 ml-4">
            {rightContent}
            <Button variant="ghost" size="icon" data-testid="button-menu">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>
    </>
  );
}
