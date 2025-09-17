import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Download, LayoutDashboard, Upload, FileText, Package, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { logOut } from '@/lib/firebase';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Upload Files', href: '/upload', icon: Upload },
  { name: 'Orders', href: '/orders', icon: FileText },
  { name: 'Products', href: '/products', icon: Package },
];

interface HeaderProps {
  title: string;
  subtitle: string;
  showExport?: boolean;
}

export default function Header({ title, subtitle, showExport = true }: HeaderProps) {
  const [location] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const handleExport = () => {
    toast({
      title: "Export started",
      description: "Your data export will begin shortly.",
    });
  };

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
      <nav className="bg-card border-b border-border px-6 py-3" data-testid="top-nav">
        <div className="flex items-center justify-between">
          {/* Logo and Navigation */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">RM</span>
              </div>
              <h1 className="font-bold text-lg">ReconMe</h1>
            </div>
            
            {/* Navigation Links */}
            <div className="flex items-center gap-6">
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
          </div>

          {/* User Profile and Export */}
          <div className="flex items-center gap-4">
            {showExport && (
              <Button onClick={handleExport} data-testid="button-export">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            )}
            
            {/* User Profile */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                <span className="text-sm font-medium" data-testid="user-initials">
                  {getInitials(user?.displayName, user?.email)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" data-testid="user-name">
                  {user?.displayName || user?.email?.split('@')[0] || 'User'}
                </p>
              </div>
              <button 
                onClick={handleLogout}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Header */}
      <header className="bg-card border-b border-border px-6 py-4" data-testid="header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="page-title">{title}</h1>
            <p className="text-muted-foreground" data-testid="page-subtitle">{subtitle}</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" data-testid="button-menu">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>
    </>
  );
}
