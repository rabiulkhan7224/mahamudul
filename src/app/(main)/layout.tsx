
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Header } from '@/components/layout/header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ProfileSettingsDialog } from '@/components/profile-settings-dialog';
import { Loader2 } from 'lucide-react';
import { NavigationLoaderProvider } from '@/context/navigation-loader-context';
import { useIsMobile } from '@/hooks/use-mobile';


export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const { 
    isAuthenticated, 
    isFirstLogin, 
    completeFirstLogin, 
    isLoading,
    subscriptionStatus, 
    subscriptionExpiry 
  } = useAuth();
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (isFirstLogin) {
        setIsProfileDialogOpen(true);
      } else if (subscriptionStatus !== 'active' && pathname !== '/subscription' && pathname !== '/settings') {
        // If not subscribed (none, pending, expired), only allow access to subscription and settings pages.
        router.push('/subscription');
      }
    }
  }, [isAuthenticated, isLoading, router, isFirstLogin, subscriptionStatus, pathname]);

  const handleProfileSaved = () => {
    completeFirstLogin();
    setIsProfileDialogOpen(false);
    // After profile is saved, redirect to subscription page
    router.push('/subscription');
  };
  
  if (isLoading) {
    return (
        <div className="flex min-h-screen w-full bg-background items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin" />
        </div>
    );
  }

  // Render children only if authenticated and not in a loading or redirecting state.
  // This prevents brief flashes of content.
  if (!isAuthenticated || isFirstLogin) {
      return (
        <>
            <div className="flex min-h-screen w-full bg-background items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin" />
            </div>
             <ProfileSettingsDialog 
                isOpen={isProfileDialogOpen} 
                onOpenChange={setIsProfileDialogOpen}
                onSave={handleProfileSaved}
                isFirstTimeSetup={true}
            />
        </>
    );
  }


  return (
    <>
      <NavigationLoaderProvider>
        <SidebarProvider>
          <div className="flex min-h-screen w-full bg-background">
            <AppSidebar />
            <SidebarInset>
                <Header />
                <main className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pt-6 ${isMobile ? 'pb-24' : ''}`}>
                    {children}
                </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </NavigationLoaderProvider>
      <ProfileSettingsDialog 
        isOpen={isProfileDialogOpen} 
        onOpenChange={setIsProfileDialogOpen}
        onSave={handleProfileSaved}
        isFirstTimeSetup={isFirstLogin}
      />
    </>
  );
}
