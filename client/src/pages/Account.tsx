import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuthQuery } from '@/hooks/use-auth-query';
import { User, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface UsageInfo {
  currentUsage: number;
  monthlyQuota: number;
  remainingUsage: number;
  canProcess: boolean;
  resetDate: string;
}

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

export default function Account() {
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [usageResponse, profileResponse] = await Promise.all([
        fetch('/api/account/usage', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        }),
        fetch('/api/auth/verify', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ idToken: localStorage.getItem('authToken') })
        })
      ]);

      if (usageResponse.ok) {
        const usage = await usageResponse.json();
        setUsageInfo(usage);
      }

      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        setUserProfile(profile.user);
      }
    } catch (error) {
      console.error('Failed to fetch account data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const usagePercentage = usageInfo ? (usageInfo.currentUsage / usageInfo.monthlyQuota) * 100 : 0;
  const resetDate = usageInfo ? new Date(usageInfo.resetDate).toLocaleDateString() : '';

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-40 bg-gray-200 rounded"></div>
            <div className="h-40 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <User className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Account Settings</h1>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Profile Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {userProfile && (
            <div className="flex items-center space-x-4">
              {userProfile.photoURL ? (
                <img 
                  src={userProfile.photoURL} 
                  alt="Profile" 
                  className="h-16 w-16 rounded-full"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-8 w-8 text-gray-500" />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-lg">{userProfile.displayName || 'User'}</h3>
                <p className="text-gray-600">{userProfile.email}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Limits Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Monthly Usage Limits</span>
          </CardTitle>
          <CardDescription>
            Track your file processing usage and remaining quota for this month.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {usageInfo && (
            <>
              {/* Usage Progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Files Processed This Month</span>
                  <span className="text-sm text-gray-600">
                    {usageInfo.currentUsage} / {usageInfo.monthlyQuota}
                  </span>
                </div>
                <Progress value={usagePercentage} className="h-3" />
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>{usageInfo.remainingUsage} uploads remaining</span>
                  <span>Resets on {resetDate}</span>
                </div>
              </div>

              {/* Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {usageInfo.currentUsage}
                    </div>
                    <div className="text-sm text-gray-600">Used</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {usageInfo.remainingUsage}
                    </div>
                    <div className="text-sm text-gray-600">Remaining</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-gray-600">
                      {usageInfo.monthlyQuota}
                    </div>
                    <div className="text-sm text-gray-600">Monthly Limit</div>
                  </CardContent>
                </Card>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-center">
                {usageInfo.canProcess ? (
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Plan Information */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Plan</CardTitle>
          <CardDescription>
            Your current plan includes 10 file uploads per month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-semibold">Free Plan</h3>
              <p className="text-sm text-gray-600">10 file uploads per month</p>
            </div>
            <Badge variant="secondary">Active</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}