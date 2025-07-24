import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BookCopy,
  Users,
  Receipt,
  Package,
  Settings,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "ড্যাশবোর্ড", icon: LayoutDashboard },
  { href: "/ledger", label: "সংরক্ষিত খাতা", icon: BookCopy },
  { href: "/employees", label: "কর্মচারী", icon: Users },
  { href: "/accounts-receivable", label: "বকেয়া হিসাব", icon: Receipt },
  { href: "/products", label: "পণ্য", icon: Package },
];

export const settingsNavItem: NavItem = {
  href: "/settings",
  label: "সেটিংস",
  icon: Settings,
};
