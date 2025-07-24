
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "./user-nav";
import { useLanguage } from "@/context/language-context";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator, MessageSquarePlus, Loader2, History, Wallet, Banknote, RefreshCcw, Send, Bell, MoreVertical, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { sendSms } from "@/ai/flows/sms-flow";
import { getSmsBalance } from "@/ai/flows/sms-balance-flow";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useCalculator } from "@/context/calculator-context";
import { CashCalculatorDialog } from "@/components/cash-calculator-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigationLoader } from "@/context/navigation-loader-context";
import { ThemeToggle } from "./theme-toggle";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/context/auth-context";
import { differenceInDays } from "date-fns";


type Employee = {
  id: number;
  name: string;
  phone: string;
};

type SmsRecord = {
  id: string;
  date: string;
  recipientName: string;
  recipientPhone: string;
  message: string;
  status: 'success' | 'failed' | 'pending';
  statusMessage: string;
  smsCount: number;
};

type DailySummary = {
  id: number;
  date: string;
  market: string;
  salespersonId: number;
  totalSale: number;
};

const TruncatedMessage = ({ text }: { text: string }) => {
  const { language } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 50;

  const t = {
    seeMore: { en: 'See more', bn: 'আরও দেখুন' },
    seeLess: { en: 'See less', bn: 'কম দেখুন' },
  }

  if (text.length <= maxLength) {
    return <span>{text}</span>;
  }
  return (
    <div>
      <span>
        {isExpanded ? text : `${text.substring(0, maxLength)}...`}
      </span>
      <Button
        variant="link"
        className="h-auto p-0 ml-2 text-xs"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? t.seeLess[language] : t.seeMore[language]}
      </Button>
    </div>
  );
};

const formatCurrency = (amount: number) => `৳${amount.toFixed(2)}`;

export function Header() {
  const { language, toggleLanguage } = useLanguage();
  const { toast } = useToast();
  const { toggleCalculator, isOpen } = useCalculator();
  const { isLoading } = useNavigationLoader();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { subscriptionExpiry } = useAuth();


  const [isSmsDialogOpen, setIsSmsDialogOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedMultipleEmployees, setSelectedMultipleEmployees] = useState<Set<number>>(new Set());
  const [sendToAll, setSendToAll] = useState(false);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [smsMode, setSmsMode] = useState<'employee' | 'multiple' | 'manual'>('employee');
  const [manualPhoneNumber, setManualPhoneNumber] = useState("");
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [smsHistory, setSmsHistory] = useState<SmsRecord[]>([]);
  
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceValue, setBalanceValue] = useState<number | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [retryingSmsId, setRetryingSmsId] = useState<string | null>(null);
  const [isResendingAllFailed, setIsResendingAllFailed] = useState(false);
  const [newSummaryNotifications, setNewSummaryNotifications] = useState<DailySummary[]>([]);
  const [employeeMap, setEmployeeMap] = useState<Map<number, Employee>>(new Map());

  const [isCashCalculatorOpen, setIsCashCalculatorOpen] = useState(false);


  useEffect(() => {
    const loadEmployees = () => {
      try {
        const storedEmployees = localStorage.getItem("employees");
        if (storedEmployees) {
          const allEmployees: Employee[] = JSON.parse(storedEmployees);
          setEmployees(allEmployees);
          setEmployeeMap(new Map(allEmployees.map(e => [e.id, e])));
        }
      } catch (e) {
        console.error("Failed to load employees for header", e);
      }
    }
    loadEmployees();

    const checkNotification = () => {
        try {
            const notificationIds: number[] = JSON.parse(localStorage.getItem('new-summary-notification-ids') || '[]');
            if (notificationIds.length > 0) {
                const allSummaries: DailySummary[] = JSON.parse(localStorage.getItem('daily-summaries') || '[]');
                const notifications = allSummaries.filter(s => notificationIds.includes(s.id));
                setNewSummaryNotifications(notifications);
            } else {
                setNewSummaryNotifications([]);
            }
        } catch(e) { console.error(e); }
    };
    
    checkNotification();
    window.addEventListener('storage', checkNotification);
    window.addEventListener('focus', checkNotification);
    return () => {
        window.removeEventListener('storage', checkNotification);
        window.removeEventListener('focus', checkNotification);
    };
  }, []);

  useEffect(() => {
    if (isSmsDialogOpen) {
      try {
        const storedProfile = localStorage.getItem("profile-settings");
        if (storedProfile) {
            const profile = JSON.parse(storedProfile);
            setMessage(profile.businessName ? `${profile.businessName} - ` : "");
        } else {
            setMessage("");
        }

      } catch (e) {
        console.error("Failed to load data for custom SMS", e);
      }
    } else {
        setSelectedEmployeeId("");
        setSelectedMultipleEmployees(new Set());
        setSendToAll(false);
        setMessage("");
        setSmsMode('employee');
        setManualPhoneNumber("");
    }
  }, [isSmsDialogOpen]);
  
  useEffect(() => {
    if (isHistoryOpen) {
        try {
            const stored = localStorage.getItem('sms-history');
            setSmsHistory(stored ? JSON.parse(stored) : []);
        } catch (e) {
            console.error('Failed to load sms-history', e);
            setSmsHistory([]);
        }
    }
  }, [isHistoryOpen]);

  useEffect(() => {
    if (balance) {
      const timer = setTimeout(() => {
        setBalance(null);
        setBalanceValue(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [balance]);
  
  const handleMultipleEmployeeToggle = (employeeId: number) => {
    setSelectedMultipleEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId);
      } else {
        newSet.add(employeeId);
      }
      return newSet;
    });
  };

  const handleToggleSendToAll = () => {
    setSendToAll(prev => {
        const newSendToAll = !prev;
        if (newSendToAll) {
            const allEmployeeIds = new Set(employees.map(e => e.id));
            setSelectedMultipleEmployees(allEmployeeIds);
        } else {
            setSelectedMultipleEmployees(new Set());
        }
        return newSendToAll;
    });
  };


  const getSmsCount = (message: string): number => {
    const isUnicode = Array.from(message).some(char => char.charCodeAt(0) > 127);
    if (isUnicode) {
        if (message.length <= 70) return 1;
        return Math.ceil(message.length / 67);
    } else {
        if (message.length <= 160) return 1;
        return Math.ceil(message.length / 153);
    }
  };

  const t = {
    dailyReport: { en: 'Daily Report', bn: 'দৈনিক রিপোর্ট' },
    english: { en: 'English', bn: 'English' },
    bengali: { en: 'বাংলা', bn: 'বাংলা' },
    customSmsTitle: { en: 'Send Custom SMS', bn: 'কাস্টম এসএমএস পাঠান' },
    customSmsDesc: { en: 'Select an employee and write a message to send.', bn: 'একজন কর্মচারী নির্বাচন করুন এবং পাঠানোর জন্য একটি বার্তা লিখুন।' },
    employee: { en: 'Employee', bn: 'কর্মচারী' },
    selectEmployee: { en: 'Select an employee', bn: 'কর্মচারী নির্বাচন করুন' },
    message: { en: 'Message', bn: 'বার্তা' },
    messagePlaceholder: { en: 'Write your message here...', bn: 'আপনার বার্তা এখানে লিখুন...' },
    send: { en: 'Send SMS', bn: 'এসএমএস পাঠান' },
    cancel: { en: 'Cancel', bn: 'বাতিল' },
    smsServiceDisabled: { en: 'SMS Service Disabled', bn: 'এসএমএস সার্ভিস বন্ধ' },
    enableSmsServiceFirst: { en: 'Please enable the global SMS service in settings first.', bn: 'অনুগ্রহ করে প্রথমে সেটিংসে গিয়ে গ্লোবাল এসএমএস সার্ভিস চালু করুন।' },
    smsSettingsMissing: { en: 'SMS Settings Missing', bn: 'এসএমএস সেটিংস নেই' },
    smsSettingsMissingDesc: { en: 'Please configure API Key and Sender ID in settings.', bn: 'অনুগ্রহ করে সেটিংসে API কী এবং প্রেরক আইডি কনফিগার করুন।' },
    smsFormError: { en: 'Incomplete Information', bn: 'অসম্পূর্ণ তথ্য' },
    smsFormErrorDesc: { en: 'Please select an employee and enter a message.', bn: 'অনুগ্রহ করে একজন কর্মচারী নির্বাচন করুন এবং একটি বার্তা লিখুন।' },
    phoneMissingError: { en: 'Phone Number Missing', bn: 'ফোন নম্বর নেই' },
    phoneMissingErrorDesc: { en: 'The selected employee does not have a phone number.', bn: 'নির্বাচিত কর্মচারীর কোনো ফোন নম্বর নেই।' },
    smsSuccess: { en: 'SMS Sent!', bn: 'এসএমএস পাঠানো হয়েছে!' },
    smsFailed: { en: 'SMS Failed', bn: 'এসএমএস ব্যর্থ হয়েছে' },
    balanceCheck: { en: 'Check Balance', bn: 'ব্যালেন্স দেখুন' },
    balanceCheckFailed: { en: 'Balance Check Failed', bn: 'ব্যালেন্স দেখতে সমস্যা হয়েছে' },
    cashCalculator: { en: 'Cash Calculator', bn: 'টাকা হিসাবকারী' },
    calculator: { en: 'Calculator', bn: 'ক্যালকুলেটর' },
    selectEmployeeTab: { en: 'Select Employee', bn: 'কর্মচারী নির্বাচন' },
    multipleEmployeesTab: { en: 'Multiple Employees', bn: 'একাধিক কর্মচারী' },
    manualEntryTab: { en: 'Manual Entry', bn: 'ম্যানুয়াল এন্ট্রি' },
    manualPhoneNumber: { en: 'Phone Number', bn: 'ফোন নম্বর' },
    manualPhoneMissingError: { en: 'Please enter a phone number.', bn: 'অনুগ্রহ করে একটি ফোন নম্বর লিখুন।' },
    messageMissingError: { en: 'Please enter a message.', bn: 'অনুগ্রহ করে একটি বার্তা লিখুন।' },
    sendToAll: { en: 'Send to all', bn: 'সবাইকে পাঠান' },
    notifications: { en: 'Notifications', bn: 'নোটিফিকেশন' },
    noNotifications: { en: 'No new notifications.', bn: 'কোনো নতুন নোটিফিকেশন নেই।' },
    newSummaryNotification: { en: 'New Daily Summary Submitted', bn: 'নতুন দৈনিক সামারী জমা হয়েছে' },
    from: { en: 'From', bn: 'প্রেরক' },
    amount: { en: 'Amount', bn: 'পরিমাণ' },
    market: { en: 'Market', bn: 'বাজার' },
    // History
    smsHistory: { en: 'SMS History', bn: 'এসএমএস হিস্টোরি' },
    smsHistoryDesc: { en: 'A log of all SMS messages sent from the application.', bn: 'অ্যাপ্লিকেশন থেকে পাঠানো সমস্ত এসএমএস বার্তার একটি লগ।' },
    date: { en: "Date", bn: "তারিখ" },
    day: { en: "Day", bn: "বার" },
    recipient: { en: "Recipient", bn: "প্রাপক" },
    mobile: { en: "Mobile", bn: "মোবাইল" },
    status: { en: "Status", bn: "স্ট্যাটাস" },
    smsCount: { en: "SMS Count", bn: "এসএমএস সংখ্যা" },
    noSmsHistory: { en: 'No SMS history found.', bn: 'কোনো এসএমএস হিস্টোরি পাওয়া যায়নি।' },
    actions: { en: 'Actions', bn: 'কার্যকলাপ' },
    tryAgain: { en: 'Try Again', bn: 'আবার চেষ্টা করুন' },
    smsResentSuccess: { en: 'SMS Resent Successfully!', bn: 'এসএমএস সফলভাবে আবার পাঠানো হয়েছে!' },
    smsResendFailed: { en: 'SMS Resend Failed', bn: 'এসএমএস আবার পাঠাতে ব্যর্থ হয়েছে' },
    resendAllFailed: { en: 'Resend All Failed', bn: 'সব ব্যর্থ পুনরায় পাঠান' },
    noFailedSms: { en: 'No failed messages to resend.', bn: 'পুনরায় পাঠানোর জন্য কোনো ব্যর্থ বার্তা নেই।' },
    resendAllSuccess: { en: 'All failed messages have been queued for resending.', bn: 'সমস্ত ব্যর্থ বার্তা পুনরায় পাঠানোর জন্য সারিবদ্ধ করা হয়েছে।' },
    renewalReminder: { en: 'Your subscription is expiring soon! Renew now to avoid service interruption.', bn: 'আপনার সাবস্ক্রিপশনের মেয়াদ শীঘ্রই শেষ হচ্ছে! পরিষেবা বাধা এড়াতে এখনই রিনিউ করুন।' },
    renew: { en: 'Renew', bn: 'রিনিউ' },
  };

  const handleSendCustomSms = async () => {
    const isSmsEnabledGlobally = JSON.parse(localStorage.getItem('sms-service-enabled') ?? 'true');
    const storedSmsSettings = localStorage.getItem('sms-settings');
    const { apiKey, senderId } = storedSmsSettings ? JSON.parse(storedSmsSettings) : { apiKey: '', senderId: '' };

    if (!isSmsEnabledGlobally) {
        toast({ variant: 'destructive', title: t.smsServiceDisabled[language], description: t.enableSmsServiceFirst[language] });
        return;
    }
    if (!apiKey || !senderId) {
        toast({ variant: 'destructive', title: t.smsSettingsMissing[language], description: t.smsSettingsMissingDesc[language] });
        return;
    }
    
    if (!message.trim()) {
        toast({ variant: 'destructive', title: t.smsFormError[language], description: t.messageMissingError[language] });
        return;
    }
    
    let recipients: {name: string, phone: string, id: string}[] = [];

    if (smsMode === 'employee') {
      const selectedEmployee = employees.find(e => String(e.id) === selectedEmployeeId);
      if (!selectedEmployee) {
        toast({ variant: 'destructive', title: t.smsFormError[language], description: t.smsFormErrorDesc[language] });
        return;
      }
      if (!selectedEmployee.phone) {
        toast({ variant: 'destructive', title: t.phoneMissingError[language], description: t.phoneMissingErrorDesc[language] });
        return;
      }
      recipients.push({ name: selectedEmployee.name, phone: selectedEmployee.phone, id: String(selectedEmployee.id) });
    } else if (smsMode === 'multiple') {
        if (selectedMultipleEmployees.size === 0) {
            toast({ variant: 'destructive', title: t.smsFormError[language], description: t.smsFormErrorDesc[language] });
            return;
        }
        employees.forEach(emp => {
            if (selectedMultipleEmployees.has(emp.id) && emp.phone) {
                recipients.push({ name: emp.name, phone: emp.phone, id: String(emp.id) });
            }
        });
        if (recipients.length === 0) {
            toast({ variant: 'destructive', title: t.phoneMissingError[language], description: "None of the selected employees have a phone number." });
            return;
        }
    } else {
      if (!manualPhoneNumber.trim()) {
        toast({ variant: 'destructive', title: t.smsFormError[language], description: t.manualPhoneMissingError[language] });
        return;
      }
      recipients.push({ name: `Manual (${manualPhoneNumber})`, phone: manualPhoneNumber, id: manualPhoneNumber });
    }
    
    setIsSending(true);
    try {
        const smsPromises = recipients.map(recipient => 
            sendSms({
                apiKey,
                senderId,
                phoneNumber: recipient.phone,
                message,
            })
        );
        
        const results = await Promise.allSettled(smsPromises);
        
        const historyEntries: SmsRecord[] = [];
        let allSucceeded = true;
        
        results.forEach((result, index) => {
            const recipient = recipients[index];
            const success = result.status === 'fulfilled' && result.value.success;
            const statusMessage = success ? result.value.message : (result.status === 'rejected' ? 'Failed to send' : (result.value as any).message);

            if (!success) {
                allSucceeded = false;
                toast({ variant: 'destructive', title: `${t.smsFailed[language]} for ${recipient.name}`, description: statusMessage });
            }

            historyEntries.push({
                id: `sms-${Date.now()}-${recipient.id}`,
                date: new Date().toISOString(),
                recipientName: recipient.name,
                recipientPhone: recipient.phone,
                message: message,
                status: success ? 'success' : 'failed',
                statusMessage: statusMessage,
                smsCount: getSmsCount(message),
            });
        });

        try {
          const history = JSON.parse(localStorage.getItem('sms-history') || '[]');
          history.unshift(...historyEntries);
          localStorage.setItem('sms-history', JSON.stringify(history.slice(0, 200)));
        } catch (e) { console.error("Failed to save SMS to history", e) }

        if (allSucceeded) {
            toast({ title: t.smsSuccess[language], description: `Sent to ${recipients.length} recipients.` });
            setIsSmsDialogOpen(false);
        }

    } catch (e: any) {
        toast({ variant: 'destructive', title: t.smsFailed[language], description: e.message });
    } finally {
        setIsSending(false);
    }
  };

  const handleCheckBalance = async () => {
    setIsBalanceLoading(true);
    setBalance(null);
    setBalanceValue(null);
    try {
        const storedSmsSettings = localStorage.getItem('sms-settings');
        if (!storedSmsSettings) {
            toast({ variant: 'destructive', title: t.smsSettingsMissing[language], description: t.smsSettingsMissingDesc[language] });
            return;
        }
        const { apiKey } = JSON.parse(storedSmsSettings);
        if (!apiKey) {
            toast({ variant: 'destructive', title: t.smsSettingsMissing[language], description: t.smsSettingsMissingDesc[language] });
            return;
        }

        const result = await getSmsBalance({ apiKey });
        setBalance(result);

        const numericValue = parseFloat(result.replace(/[^0-9.-]+/g,""));
        if (!isNaN(numericValue)) {
            setBalanceValue(numericValue);
        }

    } catch (e: any) {
        toast({ variant: "destructive", title: t.balanceCheckFailed[language], description: e.message });
    } finally {
        setIsBalanceLoading(false);
    }
  };
  
  const formatBalance = (value: number) => {
    return `৳${value.toFixed(2)}`;
  };

  const handleRetrySms = async (recordToRetry: SmsRecord) => {
    setRetryingSmsId(recordToRetry.id);

    const storedSmsSettings = localStorage.getItem('sms-settings');
    const { apiKey, senderId } = storedSmsSettings ? JSON.parse(storedSmsSettings) : { apiKey: '', senderId: '' };

    if (!apiKey || !senderId) {
        toast({ variant: 'destructive', title: t.smsSettingsMissing[language], description: t.smsSettingsMissingDesc[language] });
        setRetryingSmsId(null);
        return;
    }

    try {
        const result = await sendSms({
            apiKey,
            senderId,
            phoneNumber: recordToRetry.recipientPhone,
            message: recordToRetry.message,
        });

        const newStatus = result.success ? 'success' : 'failed';
        const newStatusMessage = result.message;

        const updatedHistory = smsHistory.map(record => {
            if (record.id === recordToRetry.id) {
                return { ...record, status: newStatus, statusMessage: newStatusMessage };
            }
            return record;
        });
        setSmsHistory(updatedHistory);
        localStorage.setItem('sms-history', JSON.stringify(updatedHistory));
        
        if (result.success) {
            toast({ title: t.smsResentSuccess[language], description: result.message });
        } else {
            toast({ variant: 'destructive', title: t.smsResendFailed[language], description: result.message });
        }

    } catch (e: any) {
        toast({ variant: 'destructive', title: t.smsResendFailed[language], description: e.message });
        const updatedHistory = smsHistory.map(record => {
            if (record.id === recordToRetry.id) {
                return { ...record, status: 'failed', statusMessage: e.message || 'Unknown error' };
            }
            return record;
        });
        setSmsHistory(updatedHistory);
        localStorage.setItem('sms-history', JSON.stringify(updatedHistory));
    } finally {
        setRetryingSmsId(null);
    }
  };

  const handleResendAllFailed = async () => {
    const failedMessages = smsHistory.filter(record => record.status === 'failed');
    if (failedMessages.length === 0) {
        toast({ description: t.noFailedSms[language] });
        return;
    }

    setIsResendingAllFailed(true);

    const storedSmsSettings = localStorage.getItem('sms-settings');
    const { apiKey, senderId } = storedSmsSettings ? JSON.parse(storedSmsSettings) : { apiKey: '', senderId: '' };

    if (!apiKey || !senderId) {
        toast({ variant: 'destructive', title: t.smsSettingsMissing[language], description: t.smsSettingsMissingDesc[language] });
        setIsResendingAllFailed(false);
        return;
    }

    const resendPromises = failedMessages.map(record => 
        sendSms({
            apiKey,
            senderId,
            phoneNumber: record.recipientPhone,
            message: record.message,
        }).then(result => ({ ...result, originalId: record.id }))
    );

    const results = await Promise.allSettled(resendPromises);
    
    let updatedHistory = [...smsHistory];
    let allSucceeded = true;

    results.forEach(settledResult => {
        if (settledResult.status === 'fulfilled') {
            const { originalId, success, message } = settledResult.value;
            const newStatus = success ? 'success' : 'failed';
            updatedHistory = updatedHistory.map(record => 
                record.id === originalId ? { ...record, status: newStatus, statusMessage: message } : record
            );
            if (!success) allSucceeded = false;
        } else {
            allSucceeded = false;
        }
    });
    
    setSmsHistory(updatedHistory);
    localStorage.setItem('sms-history', JSON.stringify(updatedHistory));

    if (allSucceeded) {
        toast({ title: t.resendAllSuccess[language] });
    } else {
        toast({ variant: 'destructive', title: t.smsResendFailed[language], description: 'Some messages could not be resent.' });
    }

    setIsResendingAllFailed(false);
  };
  
  const hasFailedSms = smsHistory.some(r => r.status === 'failed');
  const daysLeft = subscriptionExpiry ? differenceInDays(subscriptionExpiry, new Date()) : Infinity;
  const showRenewalNotice = daysLeft <= 5;

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-6">
        <div className="absolute top-full left-0 w-full h-0.5 bg-transparent overflow-hidden">
          <div className={`h-full bg-primary loading-bar ${isLoading ? 'loading' : ''}`}></div>
        </div>
        <div className="flex items-center gap-2">
            {!isMobile && <SidebarTrigger />}
        </div>
        
        <div className="flex items-center gap-2">
          {isMobile ? (
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                          <MoreVertical className="h-5 w-5" />
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={handleCheckBalance} disabled={isBalanceLoading}>
                          {isBalanceLoading ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                              <Wallet className="mr-2 h-4 w-4" />
                          )}
                          <span>{t.balanceCheck[language]}</span>
                          {balance && <span className="ml-auto text-muted-foreground">{balance}</span>}
                      </DropdownMenuItem>
                       <Dialog open={isCashCalculatorOpen} onOpenChange={setIsCashCalculatorOpen}>
                          <DialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Banknote className="mr-2 h-4 w-4" />
                              <span>{t.cashCalculator[language]}</span>
                            </DropdownMenuItem>
                          </DialogTrigger>
                          <CashCalculatorDialog isOpen={isCashCalculatorOpen} onOpenChange={setIsCashCalculatorOpen} />
                      </Dialog>
                      <DropdownMenuItem onSelect={toggleCalculator}>
                          <Calculator className="mr-2 h-4 w-4" />
                          <span>{t.calculator[language]}</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator/>
                       <Dialog open={isSmsDialogOpen} onOpenChange={setIsSmsDialogOpen}>
                        <DialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <MessageSquarePlus className="mr-2 h-4 w-4" />
                            <span>{t.customSmsTitle[language]}</span>
                          </DropdownMenuItem>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t.customSmsTitle[language]}</DialogTitle>
                                <DialogDescription>{t.customSmsDesc[language]}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <Tabs value={smsMode} onValueChange={(value) => setSmsMode(value as 'employee' | 'multiple' | 'manual')}>
                                    <TabsList className="grid w-full grid-cols-3">
                                        <TabsTrigger value="employee">{t.selectEmployeeTab[language]}</TabsTrigger>
                                        <TabsTrigger value="multiple">{t.multipleEmployeesTab[language]}</TabsTrigger>
                                        <TabsTrigger value="manual">{t.manualEntryTab[language]}</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="employee">
                                        <div className="grid gap-2 pt-2">
                                        <Label htmlFor="sms-employee">{t.employee[language]}</Label>
                                        <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                                            <SelectTrigger id="sms-employee">
                                                <SelectValue placeholder={t.selectEmployee[language]} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {employees.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name} ({e.phone})</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="multiple">
                                       <div className="pt-2 space-y-2">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox id="send-to-all" checked={sendToAll} onCheckedChange={() => handleToggleSendToAll()} />
                                                <Label htmlFor="send-to-all">{t.sendToAll[language]}</Label>
                                            </div>
                                            <ScrollArea className="h-48 rounded-md border p-2">
                                              <div className="space-y-1">
                                                {employees.map(employee => (
                                                    <div key={employee.id} className="flex items-center space-x-2 p-1 rounded-md hover:bg-muted">
                                                        <Checkbox
                                                            id={`emp-${employee.id}`}
                                                            checked={selectedMultipleEmployees.has(employee.id)}
                                                            onCheckedChange={() => handleMultipleEmployeeToggle(employee.id)}
                                                        />
                                                        <Label htmlFor={`emp-${employee.id}`} className="w-full cursor-pointer">
                                                            {employee.name} <span className="text-muted-foreground">({employee.phone})</span>
                                                        </Label>
                                                    </div>
                                                ))}
                                              </div>
                                            </ScrollArea>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="manual">
                                        <div className="grid gap-2 pt-2">
                                            <Label htmlFor="manual-phone">{t.manualPhoneNumber[language]}</Label>
                                            <Input
                                                id="manual-phone"
                                                type="tel"
                                                value={manualPhoneNumber}
                                                onChange={(e) => setManualPhoneNumber(e.target.value)}
                                                placeholder="01..."
                                            />
                                        </div>
                                    </TabsContent>
                                </Tabs>
                                <div className="grid gap-2">
                                    <Label htmlFor="sms-message">{t.message[language]}</Label>
                                    <Textarea
                                        id="sms-message"
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        placeholder={t.messagePlaceholder[language]}
                                        rows={5}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild><Button variant="secondary">{t.cancel[language]}</Button></DialogClose>
                                <Button onClick={handleSendCustomSms} disabled={isSending}>
                                    {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {t.send[language]}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                          <DialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <History className="mr-2 h-4 w-4" />
                                  <span>{t.smsHistory[language]}</span>
                              </DropdownMenuItem>
                          </DialogTrigger>
                          {/* History Dialog Content remains the same */}
                      </Dialog>
                  </DropdownMenuContent>
              </DropdownMenu>
          ) : (
            <TooltipProvider>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-9 hidden sm:flex"
                    onClick={handleCheckBalance}
                    disabled={isBalanceLoading}
                >
                    {isBalanceLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : balanceValue !== null ? (
                        <span className="font-semibold">
                            <AnimatedNumber value={balanceValue} formatter={formatBalance} />
                        </span>
                    ) : (
                        <>
                            <Wallet className="mr-2 h-4 w-4" />
                            <span>{t.balanceCheck[language]}</span>
                        </>
                    )}
                </Button>
                <Dialog open={isCashCalculatorOpen} onOpenChange={setIsCashCalculatorOpen}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon" aria-label={t.cashCalculator[language]}>
                            <Banknote className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t.cashCalculator[language]}</p>
                    </TooltipContent>
                  </Tooltip>
                  <CashCalculatorDialog isOpen={isCashCalculatorOpen} onOpenChange={setIsCashCalculatorOpen} />
                </Dialog>
                <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                    variant={isOpen ? "secondary" : "outline"}
                    size="icon"
                    aria-label={t.calculator[language]}
                    onClick={toggleCalculator}
                    >
                    <Calculator className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{t.calculator[language]}</p>
                </TooltipContent>
                </Tooltip>
                <Dialog open={isSmsDialogOpen} onOpenChange={setIsSmsDialogOpen}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon" aria-label={t.customSmsTitle[language]}>
                                <MessageSquarePlus className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                        <p>{t.customSmsTitle[language]}</p>
                        </TooltipContent>
                    </Tooltip>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t.customSmsTitle[language]}</DialogTitle>
                            <DialogDescription>{t.customSmsDesc[language]}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <Tabs value={smsMode} onValueChange={(value) => setSmsMode(value as 'employee' | 'multiple' | 'manual')}>
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="employee">{t.selectEmployeeTab[language]}</TabsTrigger>
                                    <TabsTrigger value="multiple">{t.multipleEmployeesTab[language]}</TabsTrigger>
                                    <TabsTrigger value="manual">{t.manualEntryTab[language]}</TabsTrigger>
                                </TabsList>
                                <TabsContent value="employee">
                                    <div className="grid gap-2 pt-2">
                                    <Label htmlFor="sms-employee-desktop">{t.employee[language]}</Label>
                                    <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                                        <SelectTrigger id="sms-employee-desktop">
                                            <SelectValue placeholder={t.selectEmployee[language]} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {employees.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name} ({e.phone})</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    </div>
                                </TabsContent>
                                <TabsContent value="multiple">
                                   <div className="pt-2 space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="send-to-all-desktop" checked={sendToAll} onCheckedChange={() => handleToggleSendToAll()} />
                                            <Label htmlFor="send-to-all-desktop">{t.sendToAll[language]}</Label>
                                        </div>
                                        <ScrollArea className="h-48 rounded-md border p-2">
                                          <div className="space-y-1">
                                            {employees.map(employee => (
                                                <div key={`desktop-${employee.id}`} className="flex items-center space-x-2 p-1 rounded-md hover:bg-muted">
                                                    <Checkbox
                                                        id={`desktop-emp-${employee.id}`}
                                                        checked={selectedMultipleEmployees.has(employee.id)}
                                                        onCheckedChange={() => handleMultipleEmployeeToggle(employee.id)}
                                                    />
                                                    <Label htmlFor={`desktop-emp-${employee.id}`} className="w-full cursor-pointer">
                                                        {employee.name} <span className="text-muted-foreground">({employee.phone})</span>
                                                    </Label>
                                                </div>
                                            ))}
                                          </div>
                                        </ScrollArea>
                                    </div>
                                </TabsContent>
                                <TabsContent value="manual">
                                    <div className="grid gap-2 pt-2">
                                        <Label htmlFor="manual-phone-desktop">{t.manualPhoneNumber[language]}</Label>
                                        <Input
                                            id="manual-phone-desktop"
                                            type="tel"
                                            value={manualPhoneNumber}
                                            onChange={(e) => setManualPhoneNumber(e.target.value)}
                                            placeholder="01..."
                                        />
                                    </div>
                                </TabsContent>
                            </Tabs>
                            <div className="grid gap-2">
                                <Label htmlFor="sms-message-desktop">{t.message[language]}</Label>
                                <Textarea
                                    id="sms-message-desktop"
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    placeholder={t.messagePlaceholder[language]}
                                    rows={5}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="secondary">{t.cancel[language]}</Button></DialogClose>
                            <Button onClick={handleSendCustomSms} disabled={isSending}>
                                {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t.send[language]}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                  <Tooltip>
                      <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                          <Button variant="outline" size="icon" aria-label={t.smsHistory[language]}>
                              <History className="h-4 w-4" />
                          </Button>
                      </DialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                      <p>{t.smsHistory[language]}</p>
                      </TooltipContent>
                  </Tooltip>
                   <DialogContent className="max-w-6xl h-[80vh] flex flex-col">
                      <DialogHeader className="flex-row items-center justify-between">
                          <div>
                              <DialogTitle>{t.smsHistory[language]}</DialogTitle>
                              <DialogDescription>{t.smsHistoryDesc[language]}</DialogDescription>
                          </div>
                          {hasFailedSms && (
                              <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={handleResendAllFailed}
                                  disabled={isResendingAllFailed}
                              >
                                  {isResendingAllFailed ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                                  {t.resendAllFailed[language]}
                              </Button>
                          )}
                      </DialogHeader>
                      <div className="flex-grow overflow-y-auto pr-2">
                          <Table className="table-fixed w-full">
                              <TableHeader>
                                  <TableRow>
                                      <TableHead style={{width: '120px'}}>{t.date[language]}</TableHead>
                                      <TableHead style={{width: '150px'}}>{t.recipient[language]}</TableHead>
                                      <TableHead style={{width: '110px'}}>{t.mobile[language]}</TableHead>
                                      <TableHead style={{width: '450px'}}>{t.message[language]}</TableHead>
                                      <TableHead style={{width: '90px'}}>{t.status[language]}</TableHead>
                                      <TableHead className="text-right" style={{width: '100px'}}>{t.smsCount[language]}</TableHead>
                                      <TableHead className="text-right" style={{width: '60px'}}>{t.actions[language]}</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {smsHistory.length > 0 ? smsHistory.map(record => {
                                      const recordDate = new Date(record.date);
                                      return (
                                          <TableRow key={record.id}>
                                              <TableCell>
                                                  {recordDate.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-CA')}
                                                  <div className="text-xs text-muted-foreground">{recordDate.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US')}</div>
                                              </TableCell>
                                              <TableCell>{record.recipientName}</TableCell>
                                              <TableCell>{record.recipientPhone}</TableCell>
                                              <TableCell className="break-words"><TruncatedMessage text={record.message} /></TableCell>
                                              <TableCell>
                                                  <Badge variant={record.status === 'success' ? 'secondary' : 'destructive'} className={record.status === 'success' ? 'text-green-700 border-green-300' : ''}>
                                                      {record.status}
                                                  </Badge>
                                              </TableCell>
                                              <TableCell className="text-right">{record.smsCount}</TableCell>
                                              <TableCell className="text-right">
                                                  {record.status === 'failed' && (
                                                      <Tooltip>
                                                      <TooltipTrigger asChild>
                                                          <Button 
                                                              variant="ghost" 
                                                              size="icon" 
                                                              onClick={() => handleRetrySms(record)}
                                                              disabled={retryingSmsId === record.id}
                                                          >
                                                              {retryingSmsId === record.id ? (
                                                                  <Loader2 className="h-4 w-4 animate-spin" />
                                                              ) : (
                                                                  <RefreshCcw className="h-4 w-4" />
                                                              )}
                                                          </Button>
                                                      </TooltipTrigger>
                                                      <TooltipContent>
                                                          <p>{t.tryAgain[language]}</p>
                                                      </TooltipContent>
                                                      </Tooltip>
                                                  )}
                                              </TableCell>
                                          </TableRow>
                                      );
                                  }) : (
                                      <TableRow><TableCell colSpan={7} className="h-24 text-center">{t.noSmsHistory[language]}</TableCell></TableRow>
                                  )}
                              </TableBody>
                          </Table>
                      </div>
                  </DialogContent>
                </Dialog>
            </TooltipProvider>
          )}
          
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
          
          <UserNav />
        </div>
      </header>
      {showRenewalNotice && (
        <div className="bg-amber-100 dark:bg-amber-900/50 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 py-2 px-6 text-sm flex items-center justify-center gap-4">
            <AlertTriangle className="h-4 w-4"/>
            <p>{t.renewalReminder[language]}</p>
            <Button size="sm" variant="link" className="text-amber-800 dark:text-amber-200 h-auto p-0" onClick={() => router.push('/subscription')}>
                {t.renew[language]}
            </Button>
        </div>
      )}
    </>
  );
}
