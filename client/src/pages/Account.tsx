import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuthQuery } from '@/hooks/use-auth-query';
import { useAuth } from '@/contexts/AuthContext';
import { User, Clock, CheckCircle, AlertCircle, Upload, FileText } from 'lucide-react';
import Header from '@/components/Header';

interface UsageInfo {
  currentUsage: number;
  monthlyQuota: number;
  remainingUsage: number;
  canProcess: boolean;
  resetDate: string;
}

interface UsageSummary {
  used: number;
  limit: number;
  periodStart: string;
  periodEnd: string;
}

export default function Account() {
  const { user } = useAuth();
  
  // Fetch usage data using auth hooks
  const { data: usageData, isLoading: usageLoading } = useAuthQuery<UsageSummary>({
    queryKey: ['/api/users/me/usage'],
  });

  const { data: detailedUsage, isLoading: detailedLoading } = useAuthQuery<UsageInfo>({
    queryKey: ['/api/account/usage'],
  });

  const isLoading = usageLoading || detailedLoading;

  // Use detailed usage if available, otherwise fall back to basic usage data
  const currentUsage = detailedUsage?.currentUsage ?? usageData?.used ?? 0;
  const monthlyQuota = detailedUsage?.monthlyQuota ?? usageData?.limit ?? 10;
  const remainingUsage = detailedUsage?.remainingUsage ?? (monthlyQuota - currentUsage);
  const canProcess = detailedUsage?.canProcess ?? (remainingUsage > 0);
  
  const usagePercentage = monthlyQuota > 0 ? (currentUsage / monthlyQuota) * 100 : 0;
  
  // Format reset date
  const resetDate = detailedUsage?.resetDate 
    ? new Date(detailedUsage.resetDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : usageData?.periodEnd 
    ? new Date(usageData.periodEnd).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Unknown';

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header title="Account Settings" subtitle="Manage your profile and usage limits" />
        <div className="flex-1 p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-40 bg-gray-200 rounded"></div>
              <div className="h-40 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Account Settings" subtitle="Manage your profile and usage limits" />
      
      <div className="flex-1 p-6 space-y-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Profile Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user && (
              <div className="flex items-center space-x-4">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt="Profile" 
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-lg">{user.displayName || 'User'}</h3>
                  <p className="text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Member since {new Date(user.metadata?.creationTime || Date.now()).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Limits Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Monthly Usage Limits</span>
            </CardTitle>
            <CardDescription>
              Track your file processing usage and remaining quota for this month.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Usage Progress */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Files Processed This Month</span>
                <span className="text-sm text-muted-foreground">
                  {currentUsage} / {monthlyQuota}
                </span>
              </div>
              <Progress value={usagePercentage} className="h-3" />
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>{remainingUsage} uploads remaining</span>
                <span>Resets on {resetDate}</span>
              </div>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {currentUsage}
                  </div>
                  <div className="text-sm text-muted-foreground">Files Used</div>
                </CardContent>
              </Card>
              
              <Card className="border-green-200 bg-green-50/50">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {remainingUsage}
                  </div>
                  <div className="text-sm text-muted-foreground">Remaining</div>
                </CardContent>
              </Card>
              
              <Card className="border-gray-200 bg-gray-50/50">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-600">
                    {monthlyQuota}
                  </div>
                  <div className="text-sm text-muted-foreground">Monthly Limit</div>
                </CardContent>
              </Card>
            </div>

            {/* Status Badge */}
            <div className="flex items-center justify-center">
              {canProcess ? (
                <Badge variant="outline" className="flex items-center space-x-2 px-4 py-2 bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="h-4 w-4" />
                  <span>You can upload more files</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-700 border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <span>Monthly limit reached - resets on {resetDate}</span>
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Plan Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Badge className="h-5 w-5" />
              <span>Subscription Plan</span>
            </CardTitle>
            <CardDescription>
              Your current plan includes {monthlyQuota} file uploads per month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <h3 className="font-semibold">Free Plan</h3>
                <p className="text-sm text-muted-foreground">{monthlyQuota} file uploads per month</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Perfect for small businesses and personal use
                </p>
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>
            
            {/* Usage History */}
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-medium mb-2">Usage Statistics</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Current Period:</span>
                  <p className="font-medium">
                    {usageData?.periodStart ? new Date(usageData.periodStart).toLocaleDateString() : 'N/A'} - {resetDate}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Usage Rate:</span>
                  <p className="font-medium">{usagePercentage.toFixed(1)}% of quota used</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}