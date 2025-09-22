import { Link, useLocation } from 'wouter';
import { 
  LayoutDashboard, 
  Upload, 
  FileText, 
  Package, 
  Calculator,
  LogOut,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { logOut } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuthQuery } from '@/hooks/use-auth-query';
import { Progress } from '@/components/ui/progress';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Upload Files', href: '/upload', icon: Upload },
  { name: 'Orders', href: '/orders', icon: FileText },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Reconciliation', href: '/reconciliation', icon: Calculator },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch usage data
  const { data: usage } = useAuthQuery({
    queryKey: ['/api/users/me/usage'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Type guard for usage data
  const usageData = usage as { used: number; limit: number; periodStart: string; periodEnd: string } | undefined;

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
    <div className="w-64 bg-card border-r border-border flex flex-col h-full" data-testid="sidebar">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">RM</span>
          </div>
          <h1 className="font-bold text-lg">ReconMe</h1>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <div 
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium cursor-pointer ${
                      isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-accent text-foreground'
                    }`}
                    data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
            <span className="text-sm font-medium" data-testid="user-initials">
              {getInitials(user?.displayName, user?.email)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="user-name">
              {user?.displayName || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-xs text-muted-foreground truncate" data-testid="user-email">
              {user?.email}
            </p>
          </div>
        </div>
        
        {/* Usage Limits */}
        {usageData && typeof usageData.used === 'number' && typeof usageData.limit === 'number' && (
          <div className="mb-3 p-3 bg-accent/50 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">File Uploads</span>
              <span className="text-xs text-muted-foreground">
                {usageData.used}/{usageData.limit}
              </span>
            </div>
            <Progress 
              value={(usageData.used / usageData.limit) * 100} 
              className="h-2 mb-2"
            />
            {usageData.used >= usageData.limit ? (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="w-3 h-3" />
                <span>Limit reached</span>
              </div>
            ) : usageData.used >= usageData.limit * 0.8 ? (
              <div className="flex items-center gap-1 text-xs text-orange-600">
                <AlertTriangle className="w-3 h-3" />
                <span>Approaching limit</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">
                {usageData.limit - usageData.used} uploads remaining
              </span>
            )}
          </div>
        )}
        
        <button 
          onClick={handleLogout}
          className="w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
