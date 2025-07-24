
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
  SidebarMenuBadge,
} from "@/components/ui/sidebar";
import { useLanguage } from "@/context/language-context";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BookCopy,
  Users,
  Receipt,
  Package,
  Settings,
  ShieldX,
  ClipboardList,
  Gift,
  BarChart2,
  CalendarCheck,
  Loader2,
  CreditCard,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useNavigationLoader } from "@/context/navigation-loader-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";

export type NavItem = {
  href: string;
  label: { en: string; bn: string; bn_short: string; };
  icon: LucideIcon;
};

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { language } = useLanguage();
  const { isLoading, startLoading, stopLoading } = useNavigationLoader();
  const { subscriptionStatus } = useAuth();
  const [loadingHref, setLoadingHref] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [newSummaryCount, setNewSummaryCount] = useState(0);
  const isMobile = useIsMobile();


  useEffect(() => {
    const updateSummaryCount = () => {
        try {
            const storedIds = localStorage.getItem('new-summary-notification-ids');
            const ids = storedIds ? JSON.parse(storedIds) : [];
            setNewSummaryCount(Array.isArray(ids) ? ids.length : 0);
        } catch(e) {
            setNewSummaryCount(0);
        }
    };
    
    updateSummaryCount(); // Initial check

    // Listen for changes from other tabs
    window.addEventListener('storage', updateSummaryCount);

    return () => {
        window.removeEventListener('storage', updateSummaryCount);
    }
  }, []);


  useEffect(() => {
    try {
      const storedProfile = localStorage.getItem('profile-settings');
      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        if (profile.businessName) {
          setBusinessName(profile.businessName);
        }
      }
    } catch (error) {
      console.error('Failed to parse profile from localStorage', error);
    }
  }, []);
  
  // Reset loading state when navigation completes
  useEffect(() => {
    setLoadingHref(null);
    stopLoading();
  }, [pathname, stopLoading]);

  const navItems: NavItem[] = [
    { href: "/dashboard", label: { en: "Dashboard", bn: "ড্যাশবোর্ড", bn_short: "ড্যাশবোর্ড" }, icon: LayoutDashboard },
    { href: "/daily-summary", label: { en: "Daily Summary", bn: "দৈনিক সামারী", bn_short: "সামারী" }, icon: CalendarCheck },
    { href: "/ledger", label: { en: "Ledger", bn: "সংরক্ষিত খাতা", bn_short: "খাতা" }, icon: BookCopy },
    { href: "/monthly-sales", label: { en: "Monthly Sales", bn: "মাসিক বিক্রি", bn_short: "মাসিক" }, icon: BarChart2 },
    { href: "/employees", label: { en: "Employees", bn: "কর্মচারীবৃন্দ", bn_short: "কর্মী" }, icon: Users },
    { href: "/accounts-receivable", label: { en: "Accounts Receivable", bn: "বকেয়া হিসাব", bn_short: "বকেয়া" }, icon: Receipt },
    { href: "/products", label: { en: "Product List", bn: "পণ্য তালিকা", bn_short: "পণ্য" }, icon: Package },
    { href: "/payments-and-products", label: { en: "Payments & Products", bn: "পেমেন্ট ও পণ্য", bn_short: "পেমেন্ট" }, icon: ClipboardList },
    { href: "/damaged-products", label: { en: "Damaged Products", bn: "ক্ষতিগ্রস্ত পণ্য", bn_short: "ক্ষতিগ্রস্ত" }, icon: ShieldX },
    { href: "/rewards", label: { en: "Rewards", bn: "পুরস্কার তালিকা", bn_short: "পুরস্কার" }, icon: Gift },
  ];
  
  const settingsNavItems: NavItem[] = [
    { href: "/subscription", label: { en: "Subscription", bn: "সাবস্ক্রিপশন", bn_short: "সাবস্ক্রিপশন" }, icon: CreditCard },
    { href: "/settings", label: { en: "Settings", bn: "সেটিংস", bn_short: "সেটিংস" }, icon: Settings },
  ];


  const appName = businessName || (language === 'bn' ? 'ডিলারশিপ' : 'Dealership');
  
  const handleNavigate = (href: string) => {
    if (pathname !== href) {
        setLoadingHref(href);
        startLoading();
        router.push(href);
    }
  };

  const renderMenuItem = (item: NavItem) => {
    const isLinkLoading = loadingHref === item.href;
    const isDailySummary = item.href === "/daily-summary";
    const showBadge = isDailySummary && newSummaryCount > 0;
    const isSubscriptionOrSettings = item.href === '/subscription' || item.href === '/settings';
    const isDisabled = subscriptionStatus !== 'active' && !isSubscriptionOrSettings;

    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton
          onClick={() => handleNavigate(item.href)}
          isActive={pathname.startsWith(item.href)}
          tooltip={{ children: isDisabled ? `Please subscribe to access ${item.label[language]}` : item.label[language], side: "right" }}
          className="justify-center group-data-[state=expanded]:justify-start group-data-[state=expanded]:pl-5"
          disabled={isLinkLoading || isDisabled}
        >
          {isLinkLoading ? (
            <Loader2 className={cn("animate-spin", "group-data-[state=collapsed]:h-5 group-data-[state=collapsed]:w-5")} />
          ) : (
            <item.icon className="group-data-[state=collapsed]:h-5 group-data-[state=collapsed]:w-5" />
          )}
          <span className="group-data-[state=collapsed]:hidden">{item.label[language]}</span>
          {showBadge && <SidebarMenuBadge className="bg-destructive text-destructive-foreground">{newSummaryCount}</SidebarMenuBadge>}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const renderMobileMenuItem = (item: NavItem) => {
     const isSubscriptionOrSettings = item.href === '/subscription' || item.href === '/settings';
     const isDisabled = subscriptionStatus !== 'active' && !isSubscriptionOrSettings;

     return (
        <Button
            key={item.href}
            variant="ghost"
            className={cn(
                "flex flex-col h-16 justify-center items-center flex-1 px-1",
                pathname.startsWith(item.href) && "bg-primary/10 text-primary"
            )}
            onClick={() => handleNavigate(item.href)}
            disabled={loadingHref === item.href || isDisabled}
        >
            {loadingHref === item.href ? <Loader2 className="h-5 w-5 animate-spin" /> : <item.icon className="h-5 w-5" />}
            <span className="text-xs mt-1">{item.label.bn_short}</span>
        </Button>
    )
  }

  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
        <div className="flex justify-start items-center h-full px-2 overflow-x-auto">
            {navItems.map(item => renderMobileMenuItem(item))}
            {settingsNavItems.map(item => renderMobileMenuItem(item))}
        </div>
      </div>
    );
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader>
        <Link
          href="/dashboard"
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
          <span className="group-data-[collapsible=icon]:hidden text-glow font-extrabold">{appName}</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="flex flex-col justify-between">
        <SidebarMenu>
          {navItems.map(renderMenuItem)}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {settingsNavItems.map(renderMenuItem)}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
