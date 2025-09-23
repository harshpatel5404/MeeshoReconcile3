import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MoreHorizontal, LayoutDashboard, Upload, FileText, Package, LogOut, Menu, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
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
}

export default function Header({ title, subtitle }: HeaderProps) {
  const [location] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);


  const handleLogout = async () => {
    try {
      await logOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account.",
      });
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "There was a problem signing out. Please try again.",
        variant: "destructive",
      });
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
                      <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                        <span className="text-primary-foreground font-bold text-sm">RM</span>
                      </div>
                      <h1 className="font-bold text-lg">ReconMe</h1>
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
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'hover:bg-accent text-foreground'
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
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">RM</span>
              </div>
              <h1 className="font-bold text-lg">ReconMe</h1>
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
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-accent text-foreground'
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
            <button 
              onClick={handleLogout}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent"
              data-testid="button-logout"
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
                <LogOut className="w-4 h-4" />
              </div>
            </button>
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
            <Button variant="ghost" size="icon" data-testid="button-menu">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>
    </>
  );
}
