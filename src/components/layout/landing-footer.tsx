'use client';

import { LandingHeader } from "@/components/layout/landing-header";
import { useLanguage } from "@/context/language-context";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


export default function LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { language, toggleLanguage } = useLanguage();
  
  const t = {
    toggleLanguage: { en: "বাংলা", bn: "English" },
    languageTooltip: { en: "Change Language", bn: "ভাষা পরিবর্তন করুন" },
    themeTooltip: { en: "Toggle Theme", bn: "থিম পরিবর্তন করুন" },
  };

  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader />
      <main className="flex-1">{children}</main>
      {/* Footer is now inside LandingPage component */}
    </div>
  );
}