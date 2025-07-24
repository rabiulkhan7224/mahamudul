
"use client";

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/language-context";


export function ThemeToggle() {
  const { language } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };
  
  const t = {
    lightMode: { en: 'Light Mode', bn: 'লাইট মোড' },
    darkMode: { en: 'Dark Mode', bn: 'ডার্ক মোড' },
  };
  
  if (!isMounted) {
    return (
      <Button variant="outline" size="icon" disabled={true} className="rounded-full h-12 w-12 shadow-lg">
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  return (
      <Button variant="outline" size="icon" onClick={toggleTheme} className="rounded-full h-12 w-12 shadow-lg">
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>
  )
}
