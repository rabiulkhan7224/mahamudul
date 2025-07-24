
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/context/language-context";
import { PlusCircle, Edit, Trash2, ChevronLeft, ChevronRight, FileText, Loader2, Link2, Copy, Send } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfMonth, endOfMonth, isWithinInterval, addMonths, subMonths, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { sendSms } from "@/ai/flows/sms-flow";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


const formatCurrency = (amount: number) => `৳${amount.toFixed(2)}`;

type Employee = {
  id: number;
  name: string;
  phone: string;
  role: string;
  dailySalary?: number;
};

type ReceivableTransaction = {
  employeeId: number;
  type: 'due' | 'payment';
  amount: number;
};

type Market = string;

type LedgerEntry = {
  id: number;
  date: string; // "YYYY-MM-DD"
  salespersonId: number;
};

type DailySummaryEntry = {
    date: string;
    salespersonId: number;
};

type ProfileData = {
  businessName?: string;
};

export default function EmployeesPage() {
  const { language } = useLanguage();
  const currentLanguage = language;
  const { toast } = useToast();
  
  const defaultRoles = ['সেলসকর্মী', 'ডেলিভারি কর্মী'];

  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem('employees');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Failed to parse employees from localStorage', e);
        return [];
    }
  });
  const [markets, setMarkets] = useState<Market[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem('markets');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Failed to parse markets from localStorage', e);
        return [];
    }
  });
  const [ledgerTransactions, setLedgerTransactions] = useState<LedgerEntry[]>([]);
  const [dailySummaries, setDailySummaries] = useState<DailySummaryEntry[]>([]);
  const [receivables, setReceivables] = useState<ReceivableTransaction[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [displayMonth, setDisplayMonth] = useState(new Date());


  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  // Delete Dialog states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [userInputOtp, setUserInputOtp] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [dailySalary, setDailySalary] = useState<number | string>("");

  const [newMarket, setNewMarket] = useState("");
  
  const [hasLedgerEntries, setHasLedgerEntries] = useState(false);
  
  // Link Dialog states
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [selectedEmployeeForLink, setSelectedEmployeeForLink] = useState<Employee | null>(null);
  const [isSendingSms, setIsSendingSms] = useState(false);


  useEffect(() => {
    let hasEntries = false;
    const storedLedgers = localStorage.getItem('ledger-transactions');
    if (storedLedgers) {
        const ledgers: LedgerEntry[] = JSON.parse(storedLedgers);
        setLedgerTransactions(ledgers);
        if (ledgers.length > 0) hasEntries = true;
    }
    const storedSummaries = localStorage.getItem('daily-summaries');
    if (storedSummaries) {
        const summaries: DailySummaryEntry[] = JSON.parse(storedSummaries);
        setDailySummaries(summaries);
        if (summaries.length > 0) hasEntries = true;
    }
    const storedReceivables = localStorage.getItem('receivable-transactions');
    if (storedReceivables) {
        setReceivables(JSON.parse(storedReceivables));
    }
    setHasLedgerEntries(hasEntries);
  }, []);

  useEffect(() => {
    localStorage.setItem('employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('markets', JSON.stringify(markets));
  }, [markets]);

  const employeeBalances = useMemo(() => {
    const balanceMap = new Map<number, number>();
    employees.forEach(emp => {
        const totalBalance = receivables
            .filter(r => r.employeeId === emp.id)
            .reduce((sum, txn) => sum + (txn.type === 'due' ? txn.amount : -txn.amount), 0);
        balanceMap.set(emp.id, totalBalance);
    });
    return balanceMap;
  }, [employees, receivables]);

  const employeeAttendance = useMemo(() => {
    const attendanceMap = new Map<number, number>();
    const monthStart = startOfMonth(displayMonth);
    const monthEnd = endOfMonth(displayMonth);

    employees.forEach(emp => {
      const uniqueDates = new Set<string>();
      
      ledgerTransactions.forEach(txn => {
        if (txn.salespersonId === emp.id) {
            const txnDate = parseISO(txn.date);
            if (isWithinInterval(txnDate, { start: monthStart, end: monthEnd })) {
                uniqueDates.add(txn.date);
            }
        }
      });

      dailySummaries.forEach(summary => {
        if (summary.salespersonId === emp.id) {
            const summaryDate = parseISO(summary.date);
            if (isWithinInterval(summaryDate, { start: monthStart, end: monthEnd })) {
                uniqueDates.add(summary.date);
            }
        }
      });

      attendanceMap.set(emp.id, uniqueDates.size);
    });
    return attendanceMap;
  }, [employees, ledgerTransactions, dailySummaries, displayMonth]);
  
  const attendedDates = useMemo(() => {
    if (!selectedEmployee) return [];
    
    const uniqueDates = new Set<string>();

    ledgerTransactions
      .filter(txn => txn.salespersonId === selectedEmployee.id)
      .forEach(txn => uniqueDates.add(txn.date));
      
    dailySummaries
      .filter(summary => summary.salespersonId === selectedEmployee.id)
      .forEach(summary => uniqueDates.add(summary.date));
      
    return Array.from(uniqueDates).map(dateStr => parseISO(dateStr));
  }, [selectedEmployee, ledgerTransactions, dailySummaries]);


  const handleAddNewEmployee = () => {
    setEditingEmployee(null);
    setName("");
    setPhone("");
    setRole("");
    setDailySalary("");
    setIsEmployeeDialogOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setName(employee.name);
    setPhone(employee.phone);
    setRole(employee.role);
    setDailySalary(employee.dailySalary || "");
    setIsEmployeeDialogOpen(true);
  };

  const handleSaveEmployee = () => {
    if (!name || !phone || !role || dailySalary === "") {
      alert(currentLanguage === 'bn' ? 'অনুগ্রহ করে সকল ঘর পূরণ করুন।' : 'Please fill all fields.');
      return;
    }

    if (editingEmployee) {
      setEmployees(
        employees.map((emp) =>
          emp.id === editingEmployee.id
            ? { ...emp, name, phone, role, dailySalary: Number(dailySalary) }
            : emp
        )
      );
    } else {
      const newEmployee: Employee = {
        id: Date.now(),
        name,
        phone,
        role,
        dailySalary: Number(dailySalary),
      };
      setEmployees([...employees, newEmployee]);
    }
    setIsEmployeeDialogOpen(false);
  };
  
  const handleAddMarket = () => {
    if (newMarket.trim() && !markets.includes(newMarket.trim())) {
      setMarkets([...markets, newMarket.trim()]);
      setNewMarket("");
    } else if (markets.includes(newMarket.trim())) {
        alert(currentLanguage === 'bn' ? 'এই বাজারটি ইতিমধ্যে বিদ্যমান।' : 'This market already exists.');
    }
  };

  const handleDeleteMarket = (marketToDelete: string) => {
    if (hasLedgerEntries) {
      alert(t.cannotDeleteMarket[currentLanguage]);
      return;
    }
    setMarkets(markets.filter(m => m !== marketToDelete));
  };
  
  const handleDeleteEmployeeRequest = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setIsDeleteDialogOpen(true);
  };
  
  const handleSendOtp = async () => {
    if (!employeeToDelete) return;
    setDeleteError("");
    setIsSendingOtp(true);

    if (!employeeToDelete.phone) {
        setDeleteError(t.phoneMissingError[currentLanguage]);
        setIsSendingOtp(false);
        return;
    }

    const otp = String(Math.floor(1000 + Math.random() * 9000));
    setGeneratedOtp(otp);

    const storedSmsSettings = localStorage.getItem('sms-settings');
    const { apiKey, senderId } = storedSmsSettings ? JSON.parse(storedSmsSettings) : { apiKey: '', senderId: '' };

    if (!apiKey || !senderId) {
        setDeleteError(t.smsSettingsMissing[currentLanguage]);
        setIsSendingOtp(false);
        return;
    }
    
    const businessName = (JSON.parse(localStorage.getItem('profile-settings') || '{}') as ProfileData).businessName || '';
    const message = `${businessName} - Your OTP for employee deletion is: ${otp}`;
    
    try {
        const result = await sendSms({
            apiKey,
            senderId,
            phoneNumber: employeeToDelete.phone,
            message: message,
        });
        
        if (result.success) {
            setOtpSent(true);
            toast({ title: t.otpSent[currentLanguage] });
        } else {
            setDeleteError(result.message);
        }
    } catch (e: any) {
        setDeleteError(e.message || t.genericError[currentLanguage]);
    } finally {
        setIsSendingOtp(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!employeeToDelete) return;

    if (userInputOtp !== generatedOtp) {
        setDeleteError(t.invalidOtp[currentLanguage]);
        return;
    }
    
    setEmployees(employees.filter(emp => emp.id !== employeeToDelete.id));
    
    // Close and reset dialog
    setIsDeleteDialogOpen(false);
  };
  
  const closeDeleteDialog = () => {
    setEmployeeToDelete(null);
    setOtpSent(false);
    setGeneratedOtp("");
    setUserInputOtp("");
    setDeleteError("");
    setIsSendingOtp(false);
    setIsDeleteDialogOpen(false);
  };
  
  const handleOpenLinkDialog = (employee: Employee) => {
    setSelectedEmployeeForLink(employee);
    setIsLinkDialogOpen(true);
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
        toast({ title: t.linkCopied[language] });
    });
  };
  
  const handleSendLinkSms = async (employee: Employee | null) => {
    if (!employee) return;
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
     if (!employee.phone) {
        toast({ variant: 'destructive', title: t.phoneMissingError[language] });
        return;
    }
    
    setIsSendingSms(true);
    const portalUrl = `${window.location.origin}/portal/${employee.id}`;
    const businessName = (JSON.parse(localStorage.getItem('profile-settings') || '{}') as ProfileData).businessName || 'Your Business';
    const message = `Dear ${employee.name}, please use this link to access your portal: ${portalUrl} - ${businessName}`;
    
    try {
        const result = await sendSms({ apiKey, senderId, phoneNumber: employee.phone, message });
        if (result.success) {
            toast({ title: t.smsSuccess[language] });
            setIsLinkDialogOpen(false);
        } else {
            toast({ variant: 'destructive', title: t.smsFailed[language], description: result.message });
        }
    } catch(e: any) {
         toast({ variant: 'destructive', title: t.smsFailed[language], description: e.message });
    } finally {
        setIsSendingSms(false);
    }
  };


  const t = {
    title: { en: 'Employees', bn: 'কর্মচারীবৃন্দ' },
    description: { en: 'Manage your employees and their roles.', bn: 'আপনার কর্মচারীবৃন্দ এবং তাদের ভূমিকা পরিচালনা করুন।' },
    addEmployee: { en: 'Add Employee', bn: 'নতুন কর্মচারী' },
    name: { en: 'Name', bn: 'নাম' },
    phone: { en: 'Mobile Number', bn: 'মোবাইল নাম্বার' },
    role: { en: 'Role', bn: 'ধরণ' },
    dailySalary: { en: 'Daily Salary', bn: 'দৈনিক বেতন' },
    actions: { en: 'Actions', bn: 'কার্যকলাপ' },
    edit: { en: 'Edit', bn: 'এডিট' },
    delete: { en: 'Delete', bn: 'মুছুন' },
    save: { en: 'Save', bn: 'সংরক্ষণ' },
    cancel: { en: 'Cancel', bn: 'বাতিল' },
    editEmployee: { en: 'Edit Employee', bn: 'কর্মচারী তথ্য পরিবর্তন' },
    addNewEmployee: { en: 'Add New Employee', bn: 'নতুন কর্মচারী যোগ' },
    formDescription: { en: 'Fill in the details to add or update an employee.', bn: 'কর্মচারী যোগ বা আপডেট করতে বিবরণ পূরণ করুন।' },
    noEmployees: { en: 'No employees found.', bn: 'কোনো কর্মচারী পাওয়া যায়নি।' },
    manageRoles: { en: 'Manage Roles', bn: 'ধরণ পরিচালনা' },
    manageRolesDescription: { en: 'Default roles available for employees.', bn: 'কর্মচারীদের জন্য ডিফল্ট ধরণসমূহ।' },
    noRoles: { en: 'No roles defined.', bn: 'কোনো ধরণ যোগ করা হয়নি।' },
    selectRole: { en: 'Select a role', bn: 'একটি ধরণ নির্বাচন করুন' },
    manageMarkets: { en: 'Manage Markets', bn: 'বাজার ব্যবস্থাপনা' },
    manageMarketsDescription: { en: 'Add or remove markets.', bn: 'বাজার যোগ বা মুছে ফেলুন।' },
    newMarket: { en: 'New Market', bn: 'নতুন বাজার' },
    addMarket: { en: 'Add Market', bn: 'বাজার যোগ করুন' },
    noMarkets: { en: 'No markets defined.', bn: 'কোনো বাজার যোগ করা হয়নি।' },
    cannotDeleteWithDues: { en: 'This employee has outstanding dues and cannot be deleted.', bn: 'এই কর্মচারীর বকেয়া থাকায় তাকে মুছে ফেলা যাবে না।' },
    cannotDeleteMarket: { en: 'Cannot delete market while ledger entries exist.', bn: 'সংরক্ষিত খাতা থাকায় বাজার মুছে ফেলা যাবে না।' },
    attendanceCurrentMonth: { en: 'Attendance (Current Month)', bn: 'উপস্থিতি (চলতি মাস)' },
    attendanceCalendar: { en: 'Attendance Calendar', bn: 'উপস্থিতির ক্যালেন্ডার' },
    selectEmployeeForAttendance: { en: 'Select an employee from the list or dropdown to see their attendance.', bn: 'তালিকা বা ড্রপডাউন থেকে একজন কর্মচারী নির্বাচন করে তার উপস্থিতি দেখুন।' },
    selectEmployee: { en: 'Select Employee', bn: 'কর্মচারী নির্বাচন করুন' },
    generateReport: { en: 'Generate Report', bn: 'রিপোর্ট তৈরি করুন' },
    copyLink: { en: 'Copy Portal Link', bn: 'পোর্টাল লিঙ্ক কপি' },
    linkCopied: { en: 'Link copied!', bn: 'লিঙ্ক কপি হয়েছে!' },
    // Link Dialog
    linkDialogTitle: { en: "Employee Portal Link", bn: "কর্মচারী পোর্টাল লিঙ্ক" },
    linkDialogDesc: { en: "Share this link with", bn: "এর সাথে এই লিঙ্কটি শেয়ার করুন" },
    sendSms: { en: "Send as SMS", bn: "এসএমএস হিসাবে পাঠান" },
    smsServiceDisabled: { en: 'SMS Service Disabled', bn: 'এসএমএস সার্ভিস বন্ধ' },
    enableSmsServiceFirst: { en: 'Please enable the global SMS service in settings first.', bn: 'অনুগ্রহ করে প্রথমে সেটিংসে গিয়ে গ্লোবাল এসএমএস সার্ভিস চালু করুন।' },
    smsSettingsMissingDesc: { en: 'Please configure API Key and Sender ID in settings.', bn: 'অনুগ্রহ করে সেটিংসে API কী এবং প্রেরক আইডি কনফিগার করুন।' },
    smsSuccess: { en: 'SMS Sent!', bn: 'এসএমএস পাঠানো হয়েছে!' },
    smsFailed: { en: 'SMS Failed', bn: 'এসএমএস ব্যর্থ হয়েছে' },
    // Delete Dialog
    deleteDialogTitle: { en: 'Delete Employee', bn: 'কর্মচারী মুছুন' },
    deleteDialogDesc: { en: 'To delete this employee, an OTP will be sent to their mobile number for verification. This action cannot be undone.', bn: 'এই কর্মচারীকে মুছে ফেলার জন্য, তার মোবাইল নম্বরে একটি ওটিপি পাঠানো হবে। এই কাজটি ফিরিয়ে আনা যাবে না।' },
    deleteDialogDescOtp: { en: 'An OTP has been sent. Please enter it below to confirm deletion.', bn: 'একটি ওটিপি পাঠানো হয়েছে। মুছে ফেলা নিশ্চিত করতে দয়া করে নিচে এটি লিখুন।' },
    sendOtp: { en: 'Send OTP', bn: 'ওটিপি পাঠান' },
    otpPlaceholder: { en: '4-Digit OTP', bn: '৪-ডিজিটের ওটিপি' },
    phoneMissingError: { en: 'Employee phone number is missing.', bn: 'কর্মচারীর ফোন নম্বর নেই।' },
    smsSettingsMissing: { en: 'SMS settings are not configured.', bn: 'এসএমএস সেটিংস কনফিগার করা নেই।' },
    otpSent: { en: 'OTP sent successfully!', bn: 'ওটিপি সফলভাবে পাঠানো হয়েছে!' },
    invalidOtp: { en: 'Invalid OTP. Please try again.', bn: 'অবৈধ ওটিপি। আবার চেষ্টা করুন.' },
    genericError: { en: 'An unknown error occurred.', bn: 'একটি অজানা ত্রুটি ঘটেছে।' }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold font-headline">
        {t.title[currentLanguage]}
      </h1>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>{t.attendanceCalendar[currentLanguage]}</CardTitle>
            <CardDescription>{t.selectEmployeeForAttendance[currentLanguage]}</CardDescription>
          </div>
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Select value={selectedEmployee ? String(selectedEmployee.id) : ""} onValueChange={(id) => {
                    const emp = employees.find(e => e.id === Number(id));
                    setSelectedEmployee(emp || null);
                }}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder={t.selectEmployee[currentLanguage]} />
                    </SelectTrigger>
                    <SelectContent>
                        {employees.map(emp => (
                            <SelectItem key={emp.id} value={String(emp.id)}>{emp.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button asChild disabled={!selectedEmployee} variant="outline">
                  <Link href={`/employees/print-attendance?employeeId=${selectedEmployee?.id}&month=${format(displayMonth, 'yyyy-MM')}`} target="_blank">
                    <FileText className="mr-2 h-4 w-4" /> {t.generateReport[currentLanguage]}
                  </Link>
                </Button>
              </div>
              <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setDisplayMonth(subMonths(displayMonth, 1))}>
                      <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-base font-semibold whitespace-nowrap">{format(displayMonth, 'MMMM yyyy')}</span>
                  <Button variant="outline" size="icon" onClick={() => setDisplayMonth(addMonths(displayMonth, 1))}>
                      <ChevronRight className="h-4 w-4" />
                  </Button>
              </div>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center">
            {selectedEmployee ? (
                <Calendar
                    month={displayMonth}
                    onMonthChange={setDisplayMonth}
                    selected={attendedDates}
                    modifiers={{
                       selected: attendedDates,
                       ... (attendedDates.length > 0 && { highlighted: { from: attendedDates[0], to: attendedDates[attendedDates.length-1] }})
                    }}
                    modifiersClassNames={{
                        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
                    }}
                    showOutsideDays
                />
            ) : (
                <div className="text-center text-muted-foreground py-20">
                    <p>{t.selectEmployeeForAttendance[currentLanguage]}</p>
                </div>
            )}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t.manageRoles[currentLanguage]}</CardTitle>
            <CardDescription>{t.manageRolesDescription[currentLanguage]}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
              {defaultRoles.map((r) => (
                <div key={r} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                  <span>{r}</span>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.manageMarkets[currentLanguage]}</CardTitle>
            <CardDescription>{t.manageMarketsDescription[currentLanguage]}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex space-x-2">
                <Input
                  placeholder={t.newMarket[currentLanguage]}
                  value={newMarket}
                  onChange={(e) => setNewMarket(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddMarket()}
                />
                <Button onClick={handleAddMarket}>{t.addMarket[currentLanguage]}</Button>
              </div>
              <div className="space-y-2">
                {markets.length > 0 ? (
                    markets.map((m) => (
                      <div key={m} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                        <span>{m}</span>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteMarket(m)} disabled={hasLedgerEntries}>
                           <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                ) : (
                    <p className="text-sm text-center text-muted-foreground pt-4">{t.noMarkets[currentLanguage]}</p>
                )}
              </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>{t.title[currentLanguage]}</CardTitle>
            <CardDescription>{t.description[currentLanguage]}</CardDescription>
          </div>
          <Button onClick={handleAddNewEmployee}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {t.addEmployee[currentLanguage]}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.name[currentLanguage]}</TableHead>
                <TableHead>{t.phone[currentLanguage]}</TableHead>
                <TableHead>{t.role[currentLanguage]}</TableHead>
                <TableHead className="text-right">{t.dailySalary[currentLanguage]}</TableHead>
                <TableHead className="text-center">{t.attendanceCurrentMonth[currentLanguage]}</TableHead>
                <TableHead className="text-right">{t.actions[currentLanguage]}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length > 0 ? (
                employees.map((employee) => {
                  const hasDues = (employeeBalances.get(employee.id) || 0) > 0;
                  return (
                    <TableRow 
                      key={employee.id} 
                      onClick={() => setSelectedEmployee(employee)}
                      className={cn(
                        "cursor-pointer hover:bg-muted",
                        selectedEmployee?.id === employee.id && "bg-accent"
                      )}
                    >
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.phone}</TableCell>
                      <TableCell>{employee.role}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(employee.dailySalary || 0)}</TableCell>
                      <TableCell className="text-center font-medium">{employeeAttendance.get(employee.id) || 0}</TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenLinkDialog(employee); }}>
                                        <Link2 className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>{t.copyLink[currentLanguage]}</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={(e) => {e.stopPropagation(); handleEditEmployee(employee);}}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>{t.edit[currentLanguage]}</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                  <span tabIndex={0}>
                                    <Button variant="ghost" size="icon" onClick={(e) => {e.stopPropagation(); handleDeleteEmployeeRequest(employee);}} disabled={hasDues}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                {hasDues && <TooltipContent><p>{t.cannotDeleteWithDues[currentLanguage]}</p></TooltipContent>}
                            </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    {t.noEmployees[currentLanguage]}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? t.editEmployee[currentLanguage] : t.addNewEmployee[currentLanguage]}
            </DialogTitle>
            <DialogDescription>
             {t.formDescription[currentLanguage]}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                {t.name[currentLanguage]}
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                {t.phone[currentLanguage]}
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                {t.role[currentLanguage]}
              </Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={t.selectRole[currentLanguage]} />
                </SelectTrigger>
                <SelectContent>
                    {defaultRoles.map((r) => (
                        <SelectItem key={r} value={r}>
                            {r}
                        </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dailySalary" className="text-right">
                {t.dailySalary[currentLanguage]}
              </Label>
              <Input
                id="dailySalary"
                type="number"
                value={dailySalary}
                onChange={(e) => setDailySalary(e.target.value)}
                className="col-span-3"
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                {t.cancel[currentLanguage]}
              </Button>
            </DialogClose>
            <Button type="submit" onClick={handleSaveEmployee}>{t.save[currentLanguage]}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isLinkDialogOpen} onOpenChange={(open) => {if (!open) setSelectedEmployeeForLink(null); setIsLinkDialogOpen(open); }}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>{t.linkDialogTitle[language]}</DialogTitle>
                  <DialogDescription>
                      {t.linkDialogDesc[language]} {selectedEmployeeForLink?.name}
                  </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="portal-link">{t.copyLink[language]}</Label>
                    <div className="flex gap-2">
                        <Input
                            id="portal-link"
                            value={typeof window !== 'undefined' ? `${window.location.origin}/portal/${selectedEmployeeForLink?.id}` : ''}
                            readOnly
                        />
                        <Button size="icon" onClick={() => handleCopyLink(`${window.location.origin}/portal/${selectedEmployeeForLink?.id}`)}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                  </div>
                   <Button onClick={() => handleSendLinkSms(selectedEmployeeForLink)} disabled={isSendingSms} className="w-full">
                        {isSendingSms && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Send className="mr-2 h-4 w-4"/>
                        {t.sendSms[language]}
                   </Button>
              </div>
          </DialogContent>
      </Dialog>
      
      <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {if (!open) closeDeleteDialog();}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.deleteDialogTitle[currentLanguage]}</DialogTitle>
             <DialogDescription>
                {otpSent ? t.deleteDialogDescOtp[currentLanguage] : t.deleteDialogDesc[currentLanguage]}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {!otpSent ? (
              <Button onClick={handleSendOtp} disabled={isSendingOtp} className="w-full">
                {isSendingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t.sendOtp[currentLanguage]}
              </Button>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="otp">{t.otpPlaceholder[currentLanguage]}</Label>
                <Input
                    id="otp"
                    value={userInputOtp}
                    onChange={(e) => setUserInputOtp(e.target.value)}
                    placeholder="1234"
                    maxLength={4}
                />
              </div>
            )}
            {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteDialog}>{t.cancel[currentLanguage]}</Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={!otpSent || userInputOtp.length !== 4 || userInputOtp !== generatedOtp}
            >
              {t.delete[currentLanguage]}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    