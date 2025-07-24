
"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "./theme-toggle";
import { useNavigationLoader } from "@/context/navigation-loader-context";
import { EmployeeUserNav } from "./employee-user-nav";
import { useLanguage } from "@/context/language-context";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";


export function PortalHeader() {
  const { isLoading } = useNavigationLoader();
  const { language, toggleLanguage } = useLanguage();
  const isMobile = useIsMobile();

  const t = {
    english: { en: 'English', bn: 'English' },
    bengali: { en: 'বাংলা', bn: 'বাংলা' },
  };
  
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-6">
      <div className="absolute top-full left-0 w-full h-0.5 bg-transparent overflow-hidden">
        <div className={`h-full bg-primary loading-bar ${isLoading ? 'loading' : ''}`}></div>
      </div>
      <div className="flex items-center gap-2">
          {!isMobile && <SidebarTrigger />}
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
            <Label htmlFor="language-switch" className="hidden text-sm font-medium sm:block">{language === 'bn' ? t.bengali.bn : t.english.en}</Label>
            <Switch
                id="language-switch"
                checked={language === 'bn'}
                onCheckedChange={toggleLanguage}
                aria-label="Toggle Language"
            />
        </div>
        <ThemeToggle />
        <EmployeeUserNav />
      </div>
    </header>
  );
}
