"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useLanguage } from "@/context/language-context";
import { useAuth } from "@/context/auth-context";
import { LogOut, Settings, User } from "lucide-react";
import { ProfileSettingsDialog } from "@/components/profile-settings-dialog";

type ProfileData = {
  logo: string;
  ownerPhoto: string;
  ownerName: string;
  email: string;
};

export function UserNav() {
  const { language } = useLanguage();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Partial<ProfileData>>({});

  useEffect(() => {
    try {
      const storedProfile = localStorage.getItem("profile-settings");
      if (storedProfile) {
        setProfile(JSON.parse(storedProfile));
      }
    } catch (error) {
      console.error("Failed to parse profile from localStorage", error);
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const t = {
    profile: { en: 'Profile', bn: 'প্রোফাইল' },
    settings: { en: 'Settings', bn: 'সেটিংস' },
    logOut: { en: 'Log out', bn: 'লগ আউট' },
    userName: { en: 'User Name', bn: 'ব্যবহারকারীর নাম' },
    confirmLogoutTitle: { en: 'Are you sure?', bn: 'আপনি কি নিশ্চিত?' },
    confirmLogoutDesc: { en: 'You will be logged out of your account.', bn: 'আপনি আপনার অ্যাকাউন্ট থেকে লগ আউট হয়ে যাবেন।' },
    cancel: { en: 'Cancel', bn: 'বাতিল' },
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={profile.ownerPhoto || profile.logo || "https://placehold.co/100x100.png"}
              alt="User avatar"
              data-ai-hint="profile picture"
            />
            <AvatarFallback>
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{profile.ownerName || t.userName[language]}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email || 'user@example.com'}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <ProfileSettingsDialog>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <User className="mr-2 h-4 w-4" />
              <span>{t.profile[language]}</span>
            </DropdownMenuItem>
          </ProfileSettingsDialog>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="mr-2 h-4 w-4" />
              <span>{t.settings[language]}</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t.logOut[language]}</span>
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.confirmLogoutTitle[language]}</AlertDialogTitle>
              <AlertDialogDescription>
                {t.confirmLogoutDesc[language]}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.cancel[language]}</AlertDialogCancel>
              <AlertDialogAction onClick={handleLogout}>{t.logOut[language]}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
