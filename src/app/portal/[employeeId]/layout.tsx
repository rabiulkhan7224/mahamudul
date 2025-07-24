
'use client';

import { useEffect, useState } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { PortalSidebar } from '@/components/layout/portal-sidebar';
import { PortalHeader } from '@/components/layout/portal-header';
import { NavigationLoaderProvider } from '@/context/navigation-loader-context';
import { useLanguage } from '@/context/language-context';

export default function EmployeePortalLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: { employeeId: string };
}>) {
  const { language } = useLanguage();
  const employeeId = params.employeeId;

  const t = {
    appName: { en: 'Dealership', bn: 'ডিলারশিপ' },
    copyright: { en: 'All rights reserved.', bn: 'সর্বস্বত্ব সংরক্ষিত।' },
  };

  return (
    <>
      <NavigationLoaderProvider>
        <SidebarProvider>
          <div className="flex min-h-screen w-full bg-background">
            <PortalSidebar employeeId={employeeId} />
            <SidebarInset>
                <PortalHeader />
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pt-6">
                    {children}
                </main>
                <footer className="py-4 px-6 text-center text-xs text-muted-foreground border-t">
                    © {new Date().getFullYear()} {t.appName[language]}. {t.copyright[language]}
                </footer>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </NavigationLoaderProvider>
    </>
  );
}
