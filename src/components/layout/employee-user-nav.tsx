
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { LogOut, User, Loader2 } from "lucide-react";
import { useNavigationLoader } from "@/context/navigation-loader-context";

type Employee = {
  id: number;
  name: string;
  phone: string;
  role: string;
  photo?: string;
};

export function EmployeeUserNav() {
  const { language } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const employeeId = params.employeeId as string;
  const { startLoading } = useNavigationLoader();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (employeeId) {
        try {
          const storedEmployees = localStorage.getItem("employees");
          if (storedEmployees) {
            const employees: Employee[] = JSON.parse(storedEmployees);
            const currentEmployee = employees.find(e => String(e.id) === employeeId);
            setEmployee(currentEmployee || null);
          }
        } catch (error) {
          console.error("Failed to parse employees from localStorage", error);
        }
    }
  }, [employeeId]);
  
  const handleNavigate = (path: string) => {
    setIsNavigating(true);
    startLoading();
    router.push(path);
  };


  const t = {
    profile: { en: 'Profile', bn: 'প্রোফাইল' },
    logOut: { en: 'Log out', bn: 'লগ আউট' },
    userName: { en: 'Employee', bn: 'কর্মচারী' },
    confirmLogoutTitle: { en: 'Are you sure?', bn: 'আপনি কি নিশ্চিত?' },
    confirmLogoutDesc: { en: 'You will be logged out.', bn: 'আপনি লগ আউট হয়ে যাবেন।' },
    cancel: { en: 'Cancel', bn: 'বাতিল' },
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={employee?.photo || "https://placehold.co/100x100.png"}
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
            <p className="text-sm font-medium leading-none">{employee?.name || t.userName[language]}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {employee?.role || ''}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => handleNavigate(`/portal/${employeeId}/profile`)} disabled={isNavigating} className="cursor-pointer">
              {isNavigating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <User className="mr-2 h-4 w-4" />}
              <span>{t.profile[language]}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
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
              <AlertDialogAction onClick={() => router.push('/login')}>{t.logOut[language]}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
