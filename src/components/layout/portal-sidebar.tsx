
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useLanguage } from "@/context/language-context";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  User,
  LogOut,
  Loader2,
  Receipt,
  Wallet,
  CalendarCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigationLoader } from "@/context/navigation-loader-context";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: string[]; // Optional roles that can see this item
};

type PortalSidebarProps = {
  employeeId: string;
};

type Employee = {
    id: number;
    name: string;
    role: string;
}

export function PortalSidebar({ employeeId }: PortalSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { language } = useLanguage();
  const { startLoading, stopLoading } = useNavigationLoader();
  const [loadingHref, setLoadingHref] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const isMobile = useIsMobile();


  useEffect(() => {
    try {
      const storedProfile = localStorage.getItem('profile-settings');
      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        setBusinessName(profile.businessName || 'Dealership');
      } else {
        setBusinessName('Dealership');
      }

      const storedEmployees = localStorage.getItem('employees');
      if (storedEmployees) {
          const employees: Employee[] = JSON.parse(storedEmployees);
          const currentEmployee = employees.find(e => String(e.id) === employeeId);
          setEmployee(currentEmployee || null);
      }

    } catch (error) {
      console.error('Failed to parse data from localStorage', error);
      setBusinessName('Dealership');
    }
  }, [employeeId]);

  useEffect(() => {
    setLoadingHref(null);
    stopLoading();
  }, [pathname, stopLoading]);

  const navItems: NavItem[] = [
    { href: `/portal/${employeeId}`, label: language === 'bn' ? "ড্যাশবোর্ড" : "Dashboard", icon: LayoutDashboard },
    { href: `/portal/${employeeId}/daily-summary`, label: language === 'bn' ? "দৈনিক সামারী" : "Daily Summary", icon: CalendarCheck, roles: ['সেলসকর্মী'] },
    { href: `/portal/${employeeId}/accounts-receivable`, label: language === 'bn' ? "বকেয়া খাতা" : "Accounts Receivable", icon: Receipt },
    { href: `/portal/${employeeId}/monthly-salary`, label: language === 'bn' ? "মাসিক বেতন" : "Monthly Salary", icon: Wallet, roles: ['ডেলিভারি কর্মী'] },
    { href: `/portal/${employeeId}/profile`, label: language === 'bn' ? "প্রোফাইল" : "Profile", icon: User },
  ];
  
  const t = {
    logOut: { en: 'Log out', bn: 'লগ আউট' },
    confirmLogoutTitle: { en: 'Are you sure?', bn: 'আপনি কি নিশ্চিত?' },
    confirmLogoutDesc: { en: 'You are about to be logged out.', bn: 'আপনি লগ আউট হতে চলেছেন।' },
    cancel: { en: 'Cancel', bn: 'বাতিল' },
  };

  const handleNavigate = (href: string) => {
    if (pathname !== href) {
        setLoadingHref(href);
        startLoading();
        router.push(href);
    }
  };

  const renderMenuItem = (item: NavItem, isMobileView: boolean) => {
    if (item.roles && !item.roles.includes(employee?.role || '')) {
      return null;
    }
    const isActive = (item.href === `/portal/${employeeId}`) ? pathname === item.href : pathname.startsWith(item.href);
    const isLinkLoading = loadingHref === item.href;
    return (
       <SidebarMenuItem key={item.href} className={cn(isMobileView && "flex-1")}>
        <SidebarMenuButton
          onClick={() => handleNavigate(item.href)}
          isActive={isActive}
          tooltip={!isMobileView ? { children: item.label, side: "right" } : undefined}
          className={cn(
            isMobileView
              ? "flex-col h-16 justify-center"
              : "justify-center group-data-[state=expanded]:justify-start group-data-[state=expanded]:pl-5"
          )}
          disabled={isLinkLoading}
        >
          {isLinkLoading ? (
            <Loader2 className={cn("animate-spin", isMobileView ? "h-5 w-5" : "group-data-[state=collapsed]:h-5 group-data-[state=collapsed]:w-5")} />
          ) : (
            <item.icon className={cn(isMobileView ? "h-5 w-5" : "group-data-[state=collapsed]:h-5 group-data-[state=collapsed]:w-5")} />
          )}
          <span className={cn(
            isMobileView ? "text-xs mt-1" : "group-data-[state=collapsed]:hidden"
          )}>{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };
  
  const renderLogoutMenuItem = () => {
    return (
       <SidebarMenuItem>
         <AlertDialog>
            <AlertDialogTrigger asChild>
                <SidebarMenuButton
                  tooltip={{ children: t.logOut[language], side: "right" }}
                  className="justify-center group-data-[state=expanded]:justify-start group-data-[state=expanded]:pl-5"
                  variant="ghost"
                >
                  <LogOut className="group-data-[state=collapsed]:h-5 group-data-[state=collapsed]:w-5 text-destructive" />
                  <span className="group-data-[state=collapsed]:hidden text-destructive">{t.logOut[language]}</span>
                </SidebarMenuButton>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t.confirmLogoutTitle[language]}</AlertDialogTitle>
                    <AlertDialogDescription>{t.confirmLogoutDesc[language]}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t.cancel[language]}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleNavigate('/login')}>{t.logOut[language]}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </SidebarMenuItem>
    );
  };

  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 h-20 bg-background border-t">
        <SidebarMenu className="flex flex-row justify-around items-center h-full px-2">
            {navItems.map(item => renderMenuItem(item, true))}
        </SidebarMenu>
      </div>
    );
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader>
        <Link
          href={`/portal/${employeeId}`}
          className="flex items-center justify-center gap-2 font-bold text-lg text-foreground"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 text-primary"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          <span className="group-data-[collapsible=icon]:hidden text-glow font-extrabold">{businessName}</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="flex flex-col justify-between">
        <SidebarMenu>
          {navItems.map(item => renderMenuItem(item, false))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {renderLogoutMenuItem()}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
