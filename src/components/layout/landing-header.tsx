
"use client";

import Link from "next/link";
import { useLanguage } from "@/context/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function LandingHeader() {
  const { language } = useLanguage();
  
  const t = {
    login: { en: "Login", bn: "লগইন" },
    signUp: { en: "Sign Up", bn: "সাইন আপ" },
    searchPlaceholder: { en: "Search for anything...", bn: "যেকোনো কিছু খুঁজুন..." },
  }

  const navLinks = [
    // Future links can be added here
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 text-primary"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          <span className="text-glow font-extrabold hidden sm:inline-block">DashManager</span>
        </Link>
        
        <div className="flex-1 max-w-md hidden md:flex">
           <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.searchPlaceholder[language]}
                className="pl-10"
              />
            </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2">
            <Button variant="ghost" asChild>
                <Link href="/login">{t.login[language]}</Link>
            </Button>
            <Button asChild className="bg-gradient-to-r from-primary to-purple-600 text-primary-foreground hover:opacity-90 transition-opacity shadow-lg">
                <Link href="/signup">{t.signUp[language]}</Link>
            </Button>
          </div>
           <div className="sm:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="flex flex-col gap-4 py-6">
                    {navLinks.map((link, index) => (
                        <Link href="#" key={index} className="text-lg font-medium hover:text-primary">
                            {link}
                        </Link>
                    ))}
                    <div className="flex flex-col gap-2 mt-4">
                        <Button variant="outline" asChild>
                            <Link href="/login">{t.login[language]}</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/signup">{t.signUp[language]}</Link>
                        </Button>
                    </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
