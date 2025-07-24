
"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
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
  DialogTrigger,
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
import { PlusCircle, Trash2, ArrowUpCircle, ArrowDownCircle, Printer, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { useToast } from "@/hooks/use-toast";
import { sendSms } from "@/ai/flows/sms-flow";
import { AnimatedNumber } from "@/components/ui/animated-number";

// Types
type Employee = { id: number; name: string; phone: string; };
type ReceivableTransaction = {
  id: string;
  ledgerId?: number;
  employeeId: number;
  date: string;
  type: 'due' | 'payment';
  amount: number;
  note: string;
};
type SmsNotification = {
    employeeName: string;
    phoneNumber: string;
    message: string;
};
type ProfileData = {
  businessName?: string;
};

const formatCurrency = (amount: number) => `৳${amount.toFixed(2)}`;

export default function AccountsReceivablePage() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [transactions, setTransactions] = useState<ReceivableTransaction[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('receivable-transactions');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to parse receivable-transactions from localStorage', e);
      return [];
    }
  });
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
  
  // Dialog states
  const [isTxnDialogOpen, setIsTxnDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<ReceivableTransaction | null>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isSmsConfirmDialogOpen, setIsSmsConfirmDialogOpen] = useState(false);

  // Filter state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

  // New Transaction Form State
  const [txnEmployee, setTxnEmployee] = useState("");
  const [txnType, setTxnType] = useState<'due' | 'payment'>('payment');
  const [txnAmount, setTxnAmount] = useState<number | string>("");
  const [txnDate, setTxnDate] = useState("");
  const [txnPaymentMethod, setTxnPaymentMethod] = useState("ক্যাশ");
  const [txnNote, setTxnNote] = useState("");
  
  // Print Dialog State
  const [reportEmployeeId, setReportEmployeeId] = useState<string>('all');
  const [reportDate, setReportDate] = useState<DateRange | undefined>(undefined);
  
  // SMS State
  const [smsNotification, setSmsNotification] = useState<SmsNotification | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete Dialog states
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [userInputOtp, setUserInputOtp] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [deleteError, setDeleteError] = useState("");


  useEffect(() => {
    const employeeIdFromQuery = searchParams.get('employeeId');
    if (employeeIdFromQuery) {
      setSelectedEmployeeId(Number(employeeIdFromQuery));
    }
  }, [searchParams]);

  useEffect(() => {
     // Set default date for new transactions
     const today = new Date();
     setTxnDate(today.toLocaleDateString('en-CA'));
  }, []);

  useEffect(() => {
    localStorage.setItem("receivable-transactions", JSON.stringify(transactions));
  }, [transactions]);
  
  const employeeMap = useMemo(() => {
    return new Map(employees.map(e => [e.id, e.name]));
  }, [employees]);

  const { totalDue, totalPaid, overallBalance, employeeBalances } = useMemo(() => {
    const employeeBalancesMap = new Map<number, { due: number; paid: number; balance: number }>();
    let totalDue = 0;
    let totalPaid = 0;

    employees.forEach(emp => {
      employeeBalancesMap.set(emp.id, { due: 0, paid: 0, balance: 0 });
    });

    transactions.forEach(txn => {
      const current = employeeBalancesMap.get(txn.employeeId) || { due: 0, paid: 0, balance: 0 };
      if (txn.type === 'due') {
        current.due += txn.amount;
        totalDue += txn.amount;
      } else if (txn.type === 'payment') {
        current.paid += txn.amount;
        totalPaid += txn.amount;
      }
      current.balance = current.due - current.paid;
      employeeBalancesMap.set(txn.employeeId, current);
    });

    return { 
      totalDue, 
      totalPaid, 
      overallBalance: totalDue - totalPaid,
      employeeBalances: employeeBalancesMap 
    };
  }, [transactions, employees]);

  const sortedTransactions = useMemo(() => {
    const filtered = selectedEmployeeId
      ? transactions.filter((t) => t.employeeId === selectedEmployeeId)
      : transactions;
    return [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedEmployeeId]);


  const resetTxnDialog = () => {
    setTxnEmployee("");
    setTxnType('payment');
    setTxnAmount("");
    setTxnPaymentMethod("ক্যাশ");
    setTxnNote("");
    const today = new Date();
    setTxnDate(today.toLocaleDateString('en-CA'));
  };
  
  const executeSaveTransaction = () => {
    if (!txnEmployee || !txnAmount || !txnDate) return;
    
    const noteForTransaction = txnType === 'payment' 
      ? txnPaymentMethod 
      : (txnNote.trim() || (language === 'bn' ? 'ম্যানুয়াল বকেয়া' : 'Manual Due'));

    const newTransaction: ReceivableTransaction = {
      id: `manual-${Date.now()}`,
      employeeId: Number(txnEmployee),
      date: txnDate,
      type: txnType,
      amount: Number(txnAmount),
      note: noteForTransaction,
    };
    
    setTransactions(prev => [...prev, newTransaction]);
    setIsTxnDialogOpen(false);
  }

  const handleSaveTransaction = async () => {
    if (!txnEmployee || !txnAmount || !txnDate) {
      alert(language === 'bn' ? 'অনুগ্রহ করে কর্মচারী, পরিমাণ এবং তারিখ পূরণ করুন।' : 'Please fill employee, amount, and date.');
      return;
    }

    const isSmsEnabledGlobally = JSON.parse(localStorage.getItem('sms-service-enabled') ?? 'true');
    const storedSmsSettings = localStorage.getItem('sms-settings');
    const { apiKey, senderId } = storedSmsSettings ? JSON.parse(storedSmsSettings) : { apiKey: '', senderId: '' };

    if (!isSmsEnabledGlobally || !apiKey || !senderId) {
        executeSaveTransaction();
        toast({ title: t.transactionSaved[language] });
        return;
    }
    
    const employee = employees.find(e => e.id === Number(txnEmployee));
    if (!employee || !employee.phone) {
      executeSaveTransaction();
      toast({ title: t.transactionSaved[language], description: language === 'bn' ? 'এসএমএস পাঠানো যায়নি কারণ কর্মচারীর ফোন নম্বর নেই।' : 'SMS not sent, employee phone number is missing.' });
      return;
    }

    const currentDue = employeeBalances.get(Number(txnEmployee))?.balance || 0;
    const transactionAmount = Number(txnAmount);
    const newTotalDue = txnType === 'due' ? currentDue + transactionAmount : currentDue - transactionAmount;
    
    const template = localStorage.getItem('sms-template-manual-txn') || "Dear {employee_name}, a transaction of type {transaction_type} for {amount} has been processed. Your new total due is {total_due}. -{business_name}";
    const businessName = (JSON.parse(localStorage.getItem('profile-settings') || '{}') as ProfileData).businessName || '';

    const message = template
      .replace('{employee_name}', employee.name)
      .replace('{transaction_type}', txnType === 'due' ? (language === 'bn' ? 'বকেয়া' : 'Due') : (language === 'bn' ? 'জমা' : 'Payment'))
      .replace('{amount}', formatCurrency(transactionAmount))
      .replace('{total_due}', formatCurrency(newTotalDue))
      .replace('{business_name}', businessName);

    setSmsNotification({
      employeeName: employee.name,
      phoneNumber: employee.phone,
      message,
    });
    
    setIsSmsConfirmDialogOpen(true);
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

  const handleConfirmSaveAndSend = async () => {
    if (!smsNotification) return;

    setIsSaving(true);
    executeSaveTransaction();

    const storedSmsSettings = localStorage.getItem('sms-settings');
    const { apiKey, senderId } = storedSmsSettings ? JSON.parse(storedSmsSettings) : { apiKey: '', senderId: '' };

    try {
      const result = await sendSms({
        apiKey,
        senderId,
        phoneNumber: smsNotification.phoneNumber,
        message: smsNotification.message,
      });

      try {
        const history = JSON.parse(localStorage.getItem('sms-history') || '[]');
        history.unshift({
            id: `sms-${Date.now()}`,
            date: new Date().toISOString(),
            recipientName: smsNotification.employeeName,
            recipientPhone: smsNotification.phoneNumber,
            message: smsNotification.message,
            status: result.success ? 'success' : 'failed',
            statusMessage: result.message,
            smsCount: getSmsCount(smsNotification.message),
        });
        localStorage.setItem('sms-history', JSON.stringify(history.slice(0, 200)));
      } catch (e) { console.error("Failed to save SMS to history", e) }

      if (result.success) {
        toast({ title: `${t.smsSent[language]} to ${smsNotification.employeeName}`, description: result.message });
      } else {
        toast({ variant: 'destructive', title: `${t.smsFailed[language]} for ${smsNotification.employeeName}`, description: result.message });
      }
    } catch(e: any) {
      toast({ variant: 'destructive', title: t.smsFailed[language], description: e.message });
    } finally {
      setIsSaving(false);
      setIsSmsConfirmDialogOpen(false);
      setSmsNotification(null);
    }
  };
  
  const closeDeleteDialog = () => {
    setTransactionToDelete(null);
    setOtpSent(false);
    setGeneratedOtp("");
    setUserInputOtp("");
    setDeleteError("");
    setIsSendingOtp(false);
    setIsDeleteDialogOpen(false);
  };

  const handleDeleteRequest = (transactionId: string) => {
    const txn = transactions.find(t => t.id === transactionId);
    if (txn) {
      setTransactionToDelete(txn);
      setIsDeleteDialogOpen(true);
    }
  };

  const handleSendDeleteOtp = async () => {
    if (!transactionToDelete) return;
    const employee = employees.find(e => e.id === transactionToDelete.employeeId);
    if (!employee) {
        setDeleteError(language === 'bn' ? 'কর্মচারী পাওয়া যায়নি।' : 'Employee not found.');
        return;
    }

    setDeleteError("");
    setIsSendingOtp(true);

    if (!employee.phone) {
        setDeleteError(t.phoneMissingError[language]);
        setIsSendingOtp(false);
        return;
    }

    const otp = String(Math.floor(1000 + Math.random() * 9000));
    setGeneratedOtp(otp);

    const storedSmsSettings = localStorage.getItem('sms-settings');
    const { apiKey, senderId } = storedSmsSettings ? JSON.parse(storedSmsSettings) : { apiKey: '', senderId: '' };

    if (!apiKey || !senderId) {
        setDeleteError(t.smsSettingsMissing[language]);
        setIsSendingOtp(false);
        return;
    }

    const businessName = (JSON.parse(localStorage.getItem('profile-settings') || '{}') as ProfileData).businessName || '';
    const message = `${businessName} - Your OTP for transaction deletion is: ${otp}`;
    
    try {
        const result = await sendSms({
            apiKey,
            senderId,
            phoneNumber: employee.phone,
            message: message,
        });
        
        if (result.success) {
            setOtpSent(true);
            toast({ title: t.otpSent[language] });
        } else {
            setDeleteError(result.message);
        }
    } catch (e: any) {
        setDeleteError(e.message || t.genericError[language]);
    } finally {
        setIsSendingOtp(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!transactionToDelete) return;

    if (userInputOtp !== generatedOtp) {
        setDeleteError(t.invalidOtp[language]);
        return;
    }
    
    setTransactions(prev => prev.filter(t => t.id !== transactionToDelete.id));
    closeDeleteDialog();
  };


  const handleGenerateReport = () => {
    const params = new URLSearchParams();
    if (reportEmployeeId !== 'all') {
      params.set('employeeId', reportEmployeeId);
    }
    if (reportDate?.from) {
      params.set('from', format(reportDate.from, 'yyyy-MM-dd'));
    }
    if (reportDate?.to) {
      params.set('to', format(reportDate.to, 'yyyy-MM-dd'));
    }
    
    const url = `/accounts-receivable/print?${params.toString()}`;
    window.open(url, '_blank');
    setIsPrintDialogOpen(false);
  };

  const t = {
    title: { en: 'Accounts Receivable', bn: 'বকেয়া হিসাব' },
    summary: { en: 'Overall Summary', bn: 'সারসংক্ষেপ' },
    totalDue: { en: 'Total Due', bn: 'সর্বমোট বকেয়া' },
    totalPaid: { en: 'Total Paid', bn: 'সর্বমোট জমা' },
    netBalance: { en: 'Net Balance', bn: 'বর্তমান ব্যালেন্স' },
    employeeDues: { en: "Employee Dues", bn: "কর্মচারীভিত্তিক বকেয়া" },
    employee: { en: 'Employee', bn: 'কর্মচারী' },
    due: { en: 'Due', bn: 'বকেয়া' },
    paid: { en: 'Paid', bn: 'জমা' },
    balance: { en: 'Balance', bn: 'ব্যালেন্স' },
    noEmployees: { en: 'No employees found.', bn: 'কোনো কর্মচারী পাওয়া যায়নি।' },
    transactions: { en: 'Transactions', bn: 'লেনদেন' },
    addTransaction: { en: 'Add Transaction', bn: 'নতুন লেনদেন যোগ' },
    date: { en: 'Date', bn: 'তারিখ' },
    ledgerNo: { en: 'Ledger No.', bn: 'খাতা নং' },
    note: { en: 'Note', bn: 'নোট' },
    dueAmount: { en: 'Due Amount', bn: 'বকেয়া' },
    paidAmount: { en: 'Paid Amount', bn: 'পরিশোধ' },
    actions: { en: 'Actions', bn: 'কার্যকলাপ' },
    noTransactions: { en: 'No transactions found.', bn: 'কোনো লেনদেন পাওয়া যায়নি।' },
    // Dialog
    formTitle: { en: 'Add New Transaction', bn: 'নতুন লেনদেন যোগ করুন' },
    formDescription: { en: 'Manually add a due or payment record.', bn: 'ম্যানুয়ালি একটি বকেয়া বা জমার রেকর্ড যোগ করুন।' },
    selectEmployee: { en: 'Select Employee', bn: 'কর্মচারী নির্বাচন করুন' },
    transactionType: { en: 'Transaction Type', bn: 'লেনদেনের ধরন' },
    payment: { en: 'Payment', bn: 'জমা' },
    amount: { en: 'Amount', bn: 'পরিমাণ' },
    save: { en: 'Save', bn: 'সংরক্ষণ' },
    cancel: { en: 'Cancel', bn: 'বাতিল' },
    paymentMethod: { en: 'Payment Method', bn: 'পেমেন্টের মাধ্যম'},
    selectPaymentMethod: { en: 'Select a method', bn: 'একটি মাধ্যম নির্বাচন করুন' },
    // Delete Dialog
    deleteDialogTitle: { en: 'Delete Transaction', bn: 'লেনদেন মুছুন' },
    deleteDialogDesc: { en: 'To delete this transaction, an OTP will be sent to the associated employee\'s mobile number for verification. This action cannot be undone.', bn: 'এই লেনদেনটি মুছে ফেলার জন্য, সংশ্লিষ্ট কর্মচারীর মোবাইল নম্বরে একটি ওটিপি পাঠানো হবে। এই কাজটি ফিরিয়ে আনা যাবে না।' },
    deleteDialogDescOtp: { en: 'An OTP has been sent. Please enter it below to confirm deletion.', bn: 'একটি ওটিপি পাঠানো হয়েছে। মুছে ফেলা নিশ্চিত করতে দয়া করে নিচে এটি লিখুন।' },
    sendOtp: { en: 'Send OTP', bn: 'ওটিপি পাঠান' },
    otpPlaceholder: { en: '4-Digit OTP', bn: '৪-ডিজিটের ওটিপি' },
    phoneMissingError: { en: 'Employee phone number is missing.', bn: 'কর্মচারীর ফোন নম্বর নেই।' },
    smsSettingsMissing: { en: 'SMS settings are not configured.', bn: 'এসএমএস সেটিংস কনফিগার করা নেই।' },
    otpSent: { en: 'OTP sent successfully!', bn: 'ওটিপি সফলভাবে পাঠানো হয়েছে!' },
    invalidOtp: { en: 'Invalid OTP. Please try again.', bn: 'অবৈধ ওটিপি। আবার চেষ্টা করুন.' },
    genericError: { en: 'An unknown error occurred.', bn: 'একটি অজানা ত্রুটি ঘটেছে।' },
    confirm: { en: 'Confirm', bn: 'নিশ্চিত করুন' },
    delete: { en: 'Delete', bn: 'মুছুন' },
    viewAll: { en: 'View All', bn: 'সব দেখুন' },
    // Print Dialog
    printReport: { en: "Print Report", bn: "রিপোর্ট প্রিন্ট" },
    generateReport: { en: "Generate Report", bn: "রিপোর্ট তৈরি করুন" },
    dateRange: { en: "Date Range", bn: "তারিখ সীমা" },
    pickDate: { en: "Pick a date range", bn: "একটি তারিখ সীমা বাছুন" },
    allEmployees: { en: "All Employees", bn: "সকল কর্মচারী" },
    // SMS Dialog
    smsConfirmTitle: { en: 'Confirm Transaction and Send SMS', bn: 'লেনদেন নিশ্চিত করুন এবং এসএমএস পাঠান' },
    smsConfirmDesc: { en: 'The following SMS will be sent. Please review and confirm.', bn: 'নিম্নলিখিত এসএমএস পাঠানো হবে। অনুগ্রহ করে পর্যালোচনা করে নিশ্চিত করুন।' },
    smsConfirmSend: { en: 'Confirm & Send', bn: 'নিশ্চিত ও প্রেরণ করুন' },
    transactionSaved: { en: 'Transaction Saved', bn: 'লেনদেন সংরক্ষিত হয়েছে' },
    smsSent: { en: 'SMS Sent', bn: 'এসএমএস পাঠানো হয়েছে' },
    smsFailed: { en: 'SMS Failed', bn: 'এসএমএস ব্যর্থ হয়েছে' },
  };

  const selectedEmployeeName = selectedEmployeeId ? employeeMap.get(selectedEmployeeId) : null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold font-headline">
        {t.title[language]}
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>{t.totalDue[language]}</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-destructive"><AnimatedNumber value={totalDue} formatter={formatCurrency} /></p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t.totalPaid[language]}</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-green-600"><AnimatedNumber value={totalPaid} formatter={formatCurrency} /></p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t.netBalance[language]}</CardTitle></CardHeader>
          <CardContent><p className={`text-3xl font-bold ${overallBalance > 0 ? 'text-destructive' : 'text-green-600'}`}><AnimatedNumber value={overallBalance} formatter={formatCurrency} /></p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-1">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t.employeeDues[language]}</CardTitle>
            {selectedEmployeeId && (
                <Button variant="link" className="p-0 h-auto" onClick={() => setSelectedEmployeeId(null)}>
                    {t.viewAll[language]}
                </Button>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.employee[language]}</TableHead>
                  <TableHead className="text-right">{t.balance[language]}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length > 0 ? (
                  employees.map(emp => {
                    const balanceData = employeeBalances.get(emp.id) ?? { due: 0, paid: 0, balance: 0 };
                    return (
                      <TableRow 
                        key={emp.id}
                        onClick={() => setSelectedEmployeeId(emp.id)}
                        className={`cursor-pointer hover:bg-muted ${selectedEmployeeId === emp.id ? 'bg-accent' : ''}`}
                      >
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell className={`text-right font-bold ${balanceData.balance > 0 ? 'text-destructive' : 'text-green-600'}`}>{formatCurrency(balanceData.balance)}</TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow><TableCell colSpan={2} className="text-center">{t.noEmployees[language]}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>
                 {selectedEmployeeName 
                    ? `${t.transactions[language]} - ${selectedEmployeeName}`
                    : t.transactions[language]
                }
            </CardTitle>
            <div className="flex items-center gap-2">
              <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon"><Printer className="h-4 w-4"/></Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t.printReport[language]}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                     <div className="grid gap-2">
                        <Label>{t.employee[language]}</Label>
                        <Select value={reportEmployeeId} onValueChange={setReportEmployeeId}>
                          <SelectTrigger>
                            <SelectValue placeholder={t.selectEmployee[language]} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t.allEmployees[language]}</SelectItem>
                            {employees.map((employee) => (
                              <SelectItem key={employee.id} value={String(employee.id)}>
                                {employee.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                     </div>
                     <div className="grid gap-2">
                       <Label>{t.dateRange[language]}</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "justify-start text-left font-normal",
                                !reportDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {reportDate?.from ? (
                                reportDate.to ? (
                                  <>
                                    {format(reportDate.from, "LLL dd, y")} -{" "}
                                    {format(reportDate.to, "LLL dd, y")}
                                  </>
                                ) : (
                                  format(reportDate.from, "LLL dd, y")
                                )
                              ) : (
                                <span>{t.pickDate[language]}</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                             <Calendar
                              initialFocus
                              mode="range"
                              defaultMonth={reportDate?.from}
                              selected={reportDate}
                              onSelect={setReportDate}
                              numberOfMonths={2}
                            />
                          </PopoverContent>
                        </Popover>
                     </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsPrintDialogOpen(false)}>{t.cancel[language]}</Button>
                    <Button onClick={handleGenerateReport}>{t.generateReport[language]}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog open={isTxnDialogOpen} onOpenChange={(open) => {
                  setIsTxnDialogOpen(open);
                  if (!open) resetTxnDialog();
              }}>
                  <DialogTrigger asChild>
                      <Button><PlusCircle className="mr-2 h-4 w-4"/>{t.addTransaction[language]}</Button>
                  </DialogTrigger>
                  <DialogContent>
                      <DialogHeader>
                          <DialogTitle>{t.formTitle[language]}</DialogTitle>
                          <DialogDescription>{t.formDescription[language]}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                          <div className="grid gap-2">
                              <Label>{t.employee[language]}</Label>
                              <Select value={txnEmployee} onValueChange={setTxnEmployee}>
                                  <SelectTrigger><SelectValue placeholder={t.selectEmployee[language]}/></SelectTrigger>
                                  <SelectContent>
                                      {employees.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
                                  </SelectContent>
                              </Select>
                          </div>
                          <div className="grid gap-2">
                              <Label>{t.transactionType[language]}</Label>
                              <div className="flex gap-4 pt-2">
                                  <Button variant={txnType === 'payment' ? 'default' : 'outline'} onClick={() => setTxnType('payment')} className="flex-1"><ArrowDownCircle className="mr-2"/>{t.payment[language]}</Button>
                                  <Button variant={txnType === 'due' ? 'destructive' : 'outline'} onClick={() => setTxnType('due')} className="flex-1"><ArrowUpCircle className="mr-2"/>{t.due[language]}</Button>
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                  <Label htmlFor="txnAmount">{t.amount[language]}</Label>
                                  <Input id="txnAmount" type="number" value={txnAmount} onChange={e => setTxnAmount(e.target.value)} />
                              </div>
                               <div className="grid gap-2">
                                  <Label htmlFor="txnDate">{t.date[language]}</Label>
                                  <Input id="txnDate" type="date" value={txnDate} onChange={e => setTxnDate(e.target.value)} />
                              </div>
                          </div>
                          {txnType === 'payment' && (
                            <div className="grid gap-2">
                                <Label>{t.paymentMethod[language]}</Label>
                                <Select value={txnPaymentMethod} onValueChange={setTxnPaymentMethod}>
                                    <SelectTrigger><SelectValue placeholder={t.selectPaymentMethod[language]}/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ক্যাশ">ক্যাশ</SelectItem>
                                        <SelectItem value="বিকাশ">বিকাশ</SelectItem>
                                        <SelectItem value="নগদ">নগদ</SelectItem>
                                        <SelectItem value="রকেট">রকেট</SelectItem>
                                        <SelectItem value="উপায়">উপায়</SelectItem>
                                        <SelectItem value="ব্যাংক">ব্যাংক</SelectItem>
                                        <SelectItem value="বিনিময়">বিনিময়</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                          )}
                           {txnType === 'due' && (
                            <div className="grid gap-2">
                                <Label htmlFor="txnNote">{t.note[language]}</Label>
                                <Input 
                                  id="txnNote" 
                                  value={txnNote} 
                                  onChange={e => setTxnNote(e.target.value)}
                                  placeholder={language === 'bn' ? 'নোট যোগ করুন (ঐচ্ছিক)' : 'Add a note (optional)'}
                                />
                            </div>
                          )}
                      </div>
                      <DialogFooter>
                          <DialogClose asChild><Button variant="secondary">{t.cancel[language]}</Button></DialogClose>
                          <Button onClick={handleSaveTransaction}>{t.save[language]}</Button>
                      </DialogFooter>
                  </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.date[language]}</TableHead>
                  <TableHead>{t.employee[language]}</TableHead>
                  <TableHead>{t.note[language]}</TableHead>
                  <TableHead className="text-right">{t.dueAmount[language]}</TableHead>
                  <TableHead className="text-right">{t.paidAmount[language]}</TableHead>
                  <TableHead className="text-right">{t.actions[language]}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTransactions.length > 0 ? (
                  sortedTransactions.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{new Date(item.date).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-CA')}</TableCell>
                      <TableCell>{employeeMap.get(item.employeeId) || 'N/A'}</TableCell>
                      <TableCell className="text-sm">
                        {item.note}
                        {item.ledgerId && <span className="text-xs text-muted-foreground block">{t.ledgerNo[language]} {item.ledgerId}</span>}
                      </TableCell>
                      <TableCell className="text-right font-medium text-destructive">
                        {item.type === 'due' ? formatCurrency(item.amount) : '-'}
                      </TableCell>
                       <TableCell className="text-right font-medium text-green-600">
                        {item.type === 'payment' ? formatCurrency(item.amount) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRequest(item.id)}
                            disabled={item.ledgerId ? true : false}
                        >
                            <Trash2 className="h-4 w-4 text-destructive"/>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      {t.noTransactions[language]}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {if (!open) closeDeleteDialog();}}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t.deleteDialogTitle[language]}</DialogTitle>
                <DialogDescription>
                    {otpSent ? t.deleteDialogDescOtp[language] : t.deleteDialogDesc[language]}
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                {!otpSent ? (
                <Button onClick={handleSendDeleteOtp} disabled={isSendingOtp} className="w-full">
                    {isSendingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t.sendOtp[language]}
                </Button>
                ) : (
                <div className="grid gap-2">
                    <Label htmlFor="otp">{t.otpPlaceholder[language]}</Label>
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
                <Button variant="outline" onClick={closeDeleteDialog}>{t.cancel[language]}</Button>
                <Button
                    variant="destructive"
                    onClick={handleConfirmDelete}
                    disabled={!otpSent || userInputOtp.length !== 4 || userInputOtp !== generatedOtp}
                >
                    {t.delete[language]}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isSmsConfirmDialogOpen} onOpenChange={setIsSmsConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.smsConfirmTitle[language]}</DialogTitle>
            <DialogDescription>{t.smsConfirmDesc[language]}</DialogDescription>
          </DialogHeader>
          {smsNotification && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {smsNotification.employeeName}
                  </CardTitle>
                  <CardDescription>To: {smsNotification.phoneNumber}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm p-3 bg-muted rounded-md whitespace-pre-wrap">{smsNotification.message}</p>
                </CardContent>
              </Card>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSmsConfirmDialogOpen(false)} disabled={isSaving}>
              {t.cancel[language]}
            </Button>
            <Button onClick={handleConfirmSaveAndSend} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.smsConfirmSend[language]}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
