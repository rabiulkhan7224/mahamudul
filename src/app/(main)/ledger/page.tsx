
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Plus, Edit, Trash2, CircleDollarSign, Printer, Search, Loader2, MoreHorizontal, FileText, FileCheck, Send, BookCopy, Mail } from "lucide-react";
import { sendSms } from "@/ai/flows/sms-flow";
import { getSmsBalance } from "@/ai/flows/sms-balance-flow";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useNavigationLoader } from "@/context/navigation-loader-context";

type Employee = {
  id: number;
  name: string;
  phone: string;
};

type Product = {
  id: number;
  quantity: number;
  quantityUnit: string;
  largerUnit?: string;
  conversionFactor?: number;
};

type Reward = {
  id: number;
  quantity: number;
};

type LedgerItem = {
  productId: number;
  productName: string;
  unit: string;
  pricePerUnit: number;
  summaryQuantity: number;
  quantitySold: number;
  quantityReturned: number;
  totalPrice: number;
};

type DamagedItem = {
  productId: number;
  productName: string;
  unit: string;
  pricePerUnit: number;
  quantity: number;
  totalPrice: number;
};

type LedgerRewardItem = {
  rewardId: number;
  rewardName: string;
  mainProductId?: number;
  mainProductName?: string;
  unit: string;
  pricePerUnit: number;
  purchasePricePerUnit?: number;
  summaryQuantity: number;
  quantityReturned: number;
  quantitySold: number;
  totalPrice: number;
};

type LedgerEntry = {
  id: number;
  date: string;
  day: string;
  market: string;
  salespersonId: number;
  items: LedgerItem[];
  damagedItems?: DamagedItem[];
  rewardItems?: LedgerRewardItem[];
  totalSale: number;
  amountPaid: number;
  amountDue: number;
  dueAssignedTo: number;
  commission: number;
  commissionAssignedTo: number;
};

type DailySummary = {
  id: number;
  date: string;
  day: string;
  market: string;
  salespersonId: number;
  items: LedgerItem[];
  rewardItems?: LedgerRewardItem[];
  totalSale: number;
  status: 'pending' | 'used';
  ledgerId?: number;
};


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
    employeeId: number;
    employeeName: string;
    phoneNumber: string;
    type: 'বকেয়া পরিশোধ' | 'কমিশন পরিশোধ';
    paymentAmount: number;
    newTotalDue: number;
    message: string;
};

type AnimationStep = 'idle' | 'processing' | 'paymentDone' | 'smsDone';

const formatCurrency = (amount: number) => `৳${amount.toFixed(2)}`;

export default function LedgerPage() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const { startLoading } = useNavigationLoader();

  const [transactions, setTransactions] = useState<LedgerEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem("ledger-transactions");
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Failed to parse ledger-transactions from localStorage", e);
        return [];
    }
  });
  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem("employees");
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Failed to parse employees from localStorage", e);
        return [];
    }
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [ledgerToDelete, setLedgerToDelete] = useState<LedgerEntry | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("id-desc");

  // Payment Dialog State
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<{
      ledger: LedgerEntry;
      type: 'due' | 'commission';
      employeeName: string;
      maxAmount: number;
  } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  
  // SMS Confirmation Dialog State
  const [isSmsConfirmDialogOpen, setIsSmsConfirmDialogOpen] = useState(false);
  const [smsNotifications, setSmsNotifications] = useState<SmsNotification[]>([]);
  const [animationStep, setAnimationStep] = useState<AnimationStep>('idle');
  
  // New Ledger Dialog State
  const [isNewLedgerDialogOpen, setIsNewLedgerDialogOpen] = useState(false);
  const [pendingSummaries, setPendingSummaries] = useState<DailySummary[]>([]);
  const [loadingSummaryId, setLoadingSummaryId] = useState<number | null>(null);
  const [isCreatingBlank, setIsCreatingBlank] = useState(false);
  
  const [editingLedgerId, setEditingLedgerId] = useState<number | null>(null);


  useEffect(() => {
    if (isNewLedgerDialogOpen) {
      try {
        const storedSummaries = localStorage.getItem('daily-summaries');
        const allSummaries: DailySummary[] = storedSummaries ? JSON.parse(storedSummaries) : [];
        setPendingSummaries(allSummaries.filter(s => s.status === 'pending'));
      } catch (error) {
        console.error('Failed to load daily summaries', error);
      }
    }
  }, [isNewLedgerDialogOpen]);


  useEffect(() => {
    localStorage.setItem("ledger-transactions", JSON.stringify(transactions));
  }, [transactions]);

  const employeeMap = useMemo(() => {
    const map = new Map<number, Employee>();
    employees.forEach(emp => {
        map.set(emp.id, emp);
    });
    return map;
  }, [employees]);
  
  const sortedTransactions = useMemo(() => {
    const filtered = transactions.filter(txn => {
        if (searchQuery.trim() === "") return true;
        const lowerCaseQuery = searchQuery.toLowerCase();
        const salespersonName = employeeMap.get(txn.salespersonId)?.name.toLowerCase() || '';
        
        return (
            String(txn.id).includes(lowerCaseQuery) ||
            txn.market.toLowerCase().includes(lowerCaseQuery) ||
            salespersonName.includes(lowerCaseQuery) ||
            txn.date.toLowerCase().includes(lowerCaseQuery) ||
            txn.day.toLowerCase().includes(lowerCaseQuery)
        );
    });

    const sorted = [...filtered].sort((a, b) => {
        switch (sortOption) {
            case 'id-asc':
                return a.id - b.id;
            case 'date-desc':
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            case 'date-asc':
                return new Date(a.date).getTime() - new Date(b.date).getTime();
            case 'sale-desc': {
                const saleA = (a.items?.reduce((sum, item) => sum + item.totalPrice, 0) || 0) + (a.rewardItems?.reduce((sum, item) => sum + item.totalPrice, 0) || 0);
                const saleB = (b.items?.reduce((sum, item) => sum + item.totalPrice, 0) || 0) + (b.rewardItems?.reduce((sum, item) => sum + item.totalPrice, 0) || 0);
                return saleB - saleA;
            }
            case 'sale-asc': {
                const saleA = (a.items?.reduce((sum, item) => sum + item.totalPrice, 0) || 0) + (a.rewardItems?.reduce((sum, item) => sum + item.totalPrice, 0) || 0);
                const saleB = (b.items?.reduce((sum, item) => sum + item.totalPrice, 0) || 0) + (b.rewardItems?.reduce((sum, item) => sum + item.totalPrice, 0) || 0);
                return saleA - saleB;
            }
            case 'id-desc':
            default:
                return b.id - a.id;
        }
    });

    return sorted;
  }, [transactions, searchQuery, employeeMap, sortOption]);

  const handleDeleteRequest = (ledger: LedgerEntry) => {
    setLedgerToDelete(ledger);
    setIsDeleteDialogOpen(true);
  };
  
  const handleEditLedger = (id: number) => {
    setEditingLedgerId(id);
    startLoading();
    router.push(`/ledger/${id}/edit`);
  };

  const handleConfirmDelete = () => {
    if (!ledgerToDelete) return;

    try {
      // Revert Daily Summary status if linked
      try {
        const storedSummaries = localStorage.getItem('daily-summaries');
        if (storedSummaries) {
          let summaries: DailySummary[] = JSON.parse(storedSummaries);
          const summaryIndex = summaries.findIndex(s => s.ledgerId === ledgerToDelete.id);
          if (summaryIndex > -1) {
            summaries[summaryIndex].status = 'pending';
            delete summaries[summaryIndex].ledgerId;
            localStorage.setItem('daily-summaries', JSON.stringify(summaries));
          }
        }
      } catch (e) {
        console.error("Failed to revert daily summary status", e);
      }
      
      // Revert stock for products
      const storedProducts = localStorage.getItem("products") || "[]";
      let productsList: Product[] = JSON.parse(storedProducts);
      ledgerToDelete.items.forEach(itemToDelete => {
        const productIndex = productsList.findIndex(p => p.id === itemToDelete.productId);
        if (productIndex > -1) {
          const product = productsList[productIndex];
          let quantityToAddBack = itemToDelete.quantitySold;
          if (product.largerUnit && product.conversionFactor && itemToDelete.unit === product.largerUnit) {
            quantityToAddBack = quantityToAddBack / product.conversionFactor;
          }
          productsList[productIndex].quantity += quantityToAddBack;
        }
      });
      (ledgerToDelete.damagedItems || []).forEach(itemToDelete => {
        const productIndex = productsList.findIndex(p => p.id === itemToDelete.productId);
        if (productIndex > -1) {
          const product = productsList[productIndex];
          let quantityToAddBack = itemToDelete.quantity;
          if (product.largerUnit && product.conversionFactor && itemToDelete.unit === product.largerUnit) {
            quantityToAddBack = quantityToAddBack / product.conversionFactor;
          }
          productsList[productIndex].quantity += quantityToAddBack;
        }
      });
      localStorage.setItem("products", JSON.stringify(productsList));
      
      // Revert stock for rewards
      const storedRewards = localStorage.getItem("rewards-list") || "[]";
      let rewardsList: Reward[] = JSON.parse(storedRewards);
      (ledgerToDelete.rewardItems || []).forEach(rewardItem => {
        const rewardIndex = rewardsList.findIndex(r => r.id === rewardItem.rewardId);
        if (rewardIndex > -1) {
          rewardsList[rewardIndex].quantity += rewardItem.quantitySold;
        }
      });
      localStorage.setItem("rewards-list", JSON.stringify(rewardsList));


      // Delete from ledger-transactions
      setTransactions(transactions.filter((txn) => txn.id !== ledgerToDelete.id));

      // Delete from receivable-transactions
      const storedReceivables = localStorage.getItem("receivable-transactions");
      if (storedReceivables) {
        const receivables = JSON.parse(storedReceivables);
        const updatedReceivables = receivables.filter(
          (rec: any) => rec.ledgerId !== ledgerToDelete.id
        );
        localStorage.setItem("receivable-transactions", JSON.stringify(updatedReceivables));
      }

      setLedgerToDelete(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
        console.error("Failed to delete ledger entry", error);
    }
  };
  
  const handleOpenPaymentDialog = (ledger: LedgerEntry, type: 'due' | 'commission') => {
    const employeeId = type === 'due' ? ledger.dueAssignedTo : ledger.commissionAssignedTo;
    const employeeName = employeeMap.get(employeeId)?.name || 'N/A';
    const maxAmount = type === 'due' ? ledger.amountDue : ledger.commission;

    if (maxAmount > 0 && employeeId) {
        setPaymentInfo({ ledger, type, employeeName, maxAmount });
        setPaymentAmount(String(maxAmount.toFixed(2)));
        setIsPaymentDialogOpen(true);
    }
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

  const executePayment = () => {
    if (!paymentInfo || !paymentAmount) return false;
    
    const { ledger, type } = paymentInfo;
    const paidAmount = Number(paymentAmount);
    const employeeId = type === 'due' ? ledger.dueAssignedTo : ledger.commissionAssignedTo;

    const storedReceivables = localStorage.getItem("receivable-transactions") || "[]";
    let receivables: ReceivableTransaction[] = JSON.parse(storedReceivables);

    const newPayment: ReceivableTransaction = {
        id: `payment-${Date.now()}`,
        ledgerId: ledger.id,
        employeeId: employeeId,
        date: new Date().toLocaleDateString('en-CA'),
        type: 'payment',
        amount: paidAmount,
        note: language === 'bn' 
            ? `খাতা নং ${ledger.id} থেকে ${type === 'due' ? 'বকেয়া' : 'কমিশন'} পরিশোধ` 
            : `Payment for ${type} from Ledger #${ledger.id}`,
    };
    receivables.push(newPayment);
    localStorage.setItem("receivable-transactions", JSON.stringify(receivables));

    const updatedLedgers = transactions.map(l => {
        if (l.id === ledger.id) {
            const updatedLedger = { ...l };
            updatedLedger.amountPaid += paidAmount;
            if (type === 'due') {
                updatedLedger.amountDue -= paidAmount;
            } else { // 'commission'
                updatedLedger.commission -= paidAmount;
            }
            return updatedLedger;
        }
        return l;
    });
    setTransactions(updatedLedgers);
    return true;
  }

  const handlePrepareSmsForPayment = () => {
    if (!paymentInfo || !paymentAmount || Number(paymentAmount) <= 0 || Number(paymentAmount) > paymentInfo.maxAmount) {
        alert(language === 'bn' ? 'অনুগ্রহ করে সঠিক পরিমাণ লিখুন।' : 'Please enter a valid amount.');
        return;
    }

    const isSmsServiceEnabled = JSON.parse(localStorage.getItem('sms-service-enabled') || 'true');
    const storedSmsSettings = localStorage.getItem('sms-settings');
    const { apiKey, senderId } = storedSmsSettings ? JSON.parse(storedSmsSettings) : { apiKey: '', senderId: '' };

    if (!isSmsServiceEnabled || !apiKey || !senderId) {
      if(executePayment()) {
          toast({
            title: t.paymentSuccess[language],
            description: `${formatCurrency(Number(paymentAmount))} ${t.paymentSuccessDesc[language]} ${paymentInfo.employeeName}.`
          });
          setIsPaymentDialogOpen(false);
          setPaymentInfo(null);
          setPaymentAmount('');
      }
      return;
    }

    const { ledger, type } = paymentInfo;
    const paidAmount = Number(paymentAmount);
    const employeeId = type === 'due' ? ledger.dueAssignedTo : ledger.commissionAssignedTo;
    const employee = employeeMap.get(employeeId);

    if (!employee) {
        toast({ variant: 'destructive', title: 'Error', description: 'Employee not found.' });
        return;
    }

    const storedReceivables = localStorage.getItem("receivable-transactions") || "[]";
    const allReceivables: ReceivableTransaction[] = JSON.parse(storedReceivables);
    
    const currentDue = allReceivables
        .filter(r => r.employeeId === employeeId)
        .reduce((total, txn) => txn.type === 'due' ? total + txn.amount : total - txn.amount, 0);
    
    const newTotalDue = currentDue - paidAmount;
    
    const template = localStorage.getItem('sms-template-payment') || "Dear {employee_name}, a payment of {payment_amount} for {payment_type} from ledger #{ledger_no} has been recorded. Your new total due is {new_total_due}. -{business_name}";
    const businessName = JSON.parse(localStorage.getItem('profile-settings') || '{}')?.businessName || '';
    const paymentTypeStr = type === 'due' ? 'বকেয়া' : 'কমিশন';
    
    const message = template
        .replace('{employee_name}', employee.name)
        .replace('{payment_amount}', formatCurrency(paidAmount))
        .replace('{payment_type}', paymentTypeStr)
        .replace('{ledger_no}', String(ledger.id))
        .replace('{new_total_due}', formatCurrency(newTotalDue))
        .replace('{business_name}', businessName);

    const notification: SmsNotification = {
        employeeId: employee.id,
        employeeName: employee.name,
        phoneNumber: employee.phone,
        type: `${paymentTypeStr} পরিশোধ`,
        paymentAmount: paidAmount,
        newTotalDue: newTotalDue,
        message: message,
    };

    setSmsNotifications([notification]);
    setIsPaymentDialogOpen(false);
    setIsSmsConfirmDialogOpen(true);
    setAnimationStep('idle');
  };

  const handleConfirmSaveAndSendPayment = async () => {
    setAnimationStep('processing');
    
    const paymentSuccess = executePayment();
    if (!paymentSuccess) {
      setAnimationStep('idle');
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 1500)); // Animate payment success
    setAnimationStep('paymentDone');

    try {
        const storedSmsSettings = localStorage.getItem('sms-settings');
        const { apiKey, senderId } = storedSmsSettings ? JSON.parse(storedSmsSettings) : { apiKey: '', senderId: '' };

        if (apiKey && senderId && smsNotifications.length > 0) {
            const notification = smsNotifications[0];
            const result = await sendSms({
                apiKey,
                senderId,
                phoneNumber: notification.phoneNumber,
                message: notification.message,
            });

            const history = JSON.parse(localStorage.getItem('sms-history') || '[]');
            history.unshift({
                id: `sms-${Date.now()}`,
                date: new Date().toISOString(),
                recipientName: notification.employeeName,
                recipientPhone: notification.phoneNumber,
                message: notification.message,
                status: result.success ? 'success' : 'failed',
                statusMessage: result.message,
                smsCount: getSmsCount(notification.message),
            });
            localStorage.setItem('sms-history', JSON.stringify(history.slice(0, 200)));

            if (!result.success) {
                toast({ variant: 'destructive', title: `SMS Failed for ${notification.employeeName}`, description: result.message });
            }
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'SMS Error', description: error.message || 'An unexpected error occurred while sending SMS.' });
    }
    
    await new Promise(resolve => setTimeout(resolve, 1500)); // Animate SMS success
    setAnimationStep('smsDone');
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Final delay before closing
    
    setIsSmsConfirmDialogOpen(false);
    setPaymentInfo(null);
    setPaymentAmount('');
    setSmsNotifications([]);
  };

  const handleCreateBlankLedger = () => {
    setIsCreatingBlank(true);
    startLoading();
    router.push('/ledger/new');
  };

  const t = {
    title: { en: "Ledger", bn: "সংরক্ষিত খাতা" },
    description: { en: "View and manage your financial records.", bn: "আপনার আর্থিক রেকর্ড দেখুন এবং পরিচালনা করুন।" },
    addEntry: { en: "Add New Entry", bn: "নতুন খাতা যোগ করুন" },
    noEntriesTitle: { en: "No Ledger Entries Found", bn: "কোনো খাতা পাওয়া যায়নি" },
    noEntriesDescription: { en: "Get started by adding your first ledger entry.", bn: "আপনার প্রথম খাতা যোগ করে শুরু করুন।" },
    ledgerNo: { en: 'Ledger No.', bn: 'খাতা নং' },
    date: { en: "Date", bn: "তারিখ" },
    day: { en: "Day", bn: "বার" },
    market: { en: "Market", bn: "বাজার" },
    deliveryPerson: { en: "Delivery Person", bn: "ডেলিভারি কর্মী" },
    totalSale: { en: "Total Sale", bn: "মোট বিক্রয়" },
    paid: { en: "Paid", bn: "জমা" },
    due: { en: "Due", bn: "বাকি" },
    commission: { en: "Commission", bn: "কমিশন" },
    actions: { en: "Actions", bn: "কার্যকলাপ" },
    edit: { en: 'Edit', bn: 'এডিট' },
    delete: { en: 'Delete', bn: 'মুছুন' },
    print: { en: 'Print', bn: 'প্রিন্ট' },
    dialogTitle: { en: 'Are you sure?', bn: 'আপনি কি নিশ্চিত?' },
    dialogDescription: { en: 'This will permanently delete this ledger entry and any associated receivables. This action cannot be undone.', bn: 'এটি এই খাতার এন্ট্রি এবং সম্পর্কিত সমস্ত বকেয়া স্থায়ীভাবে মুছে ফেলবে। এই কাজটি ফিরিয়ে আনা যাবে না।' },
    cancel: { en: 'Cancel', bn: 'বাতিল' },
    confirm: { en: 'Confirm', bn: 'নিশ্চিত করুন' },
    // Payment Dialog
    payDue: { en: 'Pay Due', bn: 'বকেয়া পরিশোধ' },
    payCommission: { en: 'Pay Commission', bn: 'কমিশন পরিশোধ' },
    payTo: { en: 'Pay to', bn: 'পরিশোধ করুন' },
    amountToPay: { en: 'Amount to pay', bn: 'পরিশোধের পরিমাণ' },
    pay: { en: 'Pay', bn: 'পরিশোধ' },
    searchLedger: { en: 'Search by ID, market, person...', bn: 'আইডি, বাজার, ব্যক্তি দিয়ে খুঁজুন...' },
    noResults: { en: "No matching ledger entries found.", bn: "অনুসন্ধানের সাথে মেলে এমন কোনো খাতা পাওয়া যায়নি।" },
    // SMS Dialog
    smsConfirmTitle: { en: 'Confirm Payment and Send SMS', bn: 'পরিশোধ নিশ্চিত করুন এবং এসএমএস পাঠান' },
    smsConfirmDesc: { en: 'The following SMS will be sent. Please review and confirm.', bn: 'নিম্নলিখিত এসএমএস পাঠানো হবে। অনুগ্রহ করে পর্যালোচনা করে নিশ্চিত করুন।' },
    smsConfirmSend: { en: 'Confirm & Send', bn: 'নিশ্চিত ও প্রেরণ করুন' },
    paymentSuccess: { en: 'Payment Recorded', bn: 'পরিশোধ রেকর্ড করা হয়েছে' },
    paymentSuccessDesc: { en: 'was successfully paid to', bn: 'সফলভাবে পরিশোধ করা হয়েছে' },
    paymentFailed: { en: 'Payment Failed', bn: 'পরিশোধ ব্যর্থ হয়েছে' },
    processingPayment: { en: 'Recording Payment...', bn: 'পরিশোধ রেকর্ড করা হচ্ছে...' },
    paymentRecorded: { en: 'Payment Recorded!', bn: 'পরিশোধ রেকর্ড হয়েছে!' },
    sendingSms: { en: 'Sending SMS...', bn: 'এসএমএস পাঠানো হচ্ছে...' },
    smsSent: { en: 'SMS Sent!', bn: 'এসএমএস পাঠানো হয়েছে!' },
    // Sorting
    sortBy: { en: 'Sort by', bn: 'সাজান' },
    ledgerNoDesc: { en: 'Ledger No. (Newest)', bn: 'খাতা নং (নতুন)' },
    ledgerNoAsc: { en: 'Ledger No. (Oldest)', bn: 'খাতা নং (পুরানো)' },
    dateDesc: { en: 'Date (Newest)', bn: 'তারিখ (নতুন)' },
    dateAsc: { en: 'Date (Oldest)', bn: 'তারিখ (পুরানো)' },
    saleDesc: { en: 'Sale (High-Low)', bn: 'বিক্রয় (বেশি-কম)' },
    saleAsc: { en: 'Sale (Low-High)', bn: 'বিক্রয় (কম-বেশি)' },
    // New Ledger Dialog
    newLedgerDialogTitle: { en: 'Create New Ledger', bn: 'নতুন খাতা তৈরি করুন' },
    newLedgerDialogDesc: { en: 'Create a blank ledger or use a pending daily summary.', bn: 'একটি খালি খাতা তৈরি করুন অথবা একটি অমীমাংসিত দৈনিক সামারী ব্যবহার করুন।' },
    createBlankLedger: { en: 'Create Blank Ledger', bn: 'খালি খাতা তৈরি করুন' },
    fromDailySummary: { en: 'From Daily Summary', bn: 'দৈনিক সামারী থেকে' },
    noPendingSummaries: { en: 'No pending summaries available.', bn: 'কোনো অমীমাংসিত সামারী নেই।' },
    select: { en: 'Select', bn: 'নির্বাচন করুন' },
  };

  const renderSmsDialogContent = () => {
    switch (animationStep) {
        case 'processing':
            return (
                <div className="flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="relative animate-pulse">
                        <BookCopy className="h-12 w-12 text-primary" />
                        <CircleDollarSign className="absolute -bottom-2 -right-2 h-6 w-6 text-green-500 bg-background rounded-full p-0.5" />
                    </div>
                    <h3 className="text-lg font-semibold">{t.processingPayment[language]}</h3>
                </div>
            );
        case 'paymentDone':
             return (
                <div className="flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="relative animate-pulse">
                        <Mail className="h-12 w-12 text-blue-500" />
                        <Send className="absolute -bottom-2 -right-2 h-6 w-6 text-blue-400 bg-background rounded-full p-0.5" />
                    </div>
                    <h3 className="text-lg font-semibold">{t.sendingSms[language]}</h3>
                </div>
            );
        case 'smsDone':
            return (
                <div className="flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="relative">
                        <Send className="h-12 w-12 text-green-500"/>
                        <FileCheck className="absolute -bottom-2 -right-2 h-6 w-6 text-green-500 bg-background rounded-full p-0.5"/>
                    </div>
                    <h3 className="text-lg font-semibold">{t.smsSent[language]}</h3>
                </div>
            );
        case 'idle':
        default:
            return (
                <>
                    <DialogHeader>
                        <DialogTitle>{t.smsConfirmTitle[language]}</DialogTitle>
                        <DialogDescription>{t.smsConfirmDesc[language]}</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto space-y-4 p-1">
                        {smsNotifications.map((notification, index) => (
                        <Card key={index}>
                            <CardHeader>
                            <CardTitle className="text-base">
                                {notification.employeeName} - {notification.type} ({formatCurrency(notification.paymentAmount)})
                            </CardTitle>
                            <CardDescription>To: {notification.phoneNumber}</CardDescription>
                            </CardHeader>
                            <CardContent>
                            <p className="text-sm p-3 bg-muted rounded-md whitespace-pre-wrap">{notification.message}</p>
                            </CardContent>
                        </Card>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSmsConfirmDialogOpen(false)}>{t.cancel[language]}</Button>
                        <Button onClick={handleConfirmSaveAndSendPayment}>{t.smsConfirmSend[language]}</Button>
                    </DialogFooter>
                </>
            );
    }
  };


  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">
          {t.title[language]}
        </h1>
      </div>

      {transactions.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>{t.title[language]}</CardTitle>
              <CardDescription>{t.description[language]}</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder={t.searchLedger[language]}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-full sm:w-[280px]"
                    />
                </div>
                <Select value={sortOption} onValueChange={setSortOption}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder={t.sortBy[language]} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="id-desc">{t.ledgerNoDesc[language]}</SelectItem>
                        <SelectItem value="id-asc">{t.ledgerNoAsc[language]}</SelectItem>
                        <SelectItem value="date-desc">{t.dateDesc[language]}</SelectItem>
                        <SelectItem value="date-asc">{t.dateAsc[language]}</SelectItem>
                        <SelectItem value="sale-desc">{t.saleDesc[language]}</SelectItem>
                        <SelectItem value="sale-asc">{t.saleAsc[language]}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.ledgerNo[language]}</TableHead>
                  <TableHead>{t.date[language]}</TableHead>
                  <TableHead>{t.day[language]}</TableHead>
                  <TableHead>{t.market[language]}</TableHead>
                  <TableHead>{t.deliveryPerson[language]}</TableHead>
                  <TableHead className="text-right">{t.totalSale[language]}</TableHead>
                  <TableHead className="text-right">{t.paid[language]}</TableHead>
                  <TableHead className="text-right">{t.due[language]}</TableHead>
                  <TableHead className="text-right">{t.commission[language]}</TableHead>
                  <TableHead className="text-right">{t.actions[language]}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTransactions.length > 0 ? (
                  sortedTransactions.map((txn) => {
                    const grossSale = (txn.items?.reduce((sum, item) => sum + item.totalPrice, 0) || 0) + (txn.rewardItems?.reduce((sum, item) => sum + item.totalPrice, 0) || 0);
                    const isEditing = editingLedgerId === txn.id;
                    return (
                    <TableRow key={txn.id}>
                      <TableCell className="font-medium">
                        <Button variant="link" onClick={() => handleEditLedger(txn.id)} className="p-0 h-auto">
                            {txn.id}
                        </Button>
                      </TableCell>
                      <TableCell>{new Date(txn.date).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-GB')}</TableCell>
                      <TableCell>{txn.day}</TableCell>
                      <TableCell>{txn.market}</TableCell>
                      <TableCell>{employeeMap.get(txn.salespersonId)?.name || 'N/A'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(grossSale)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(txn.amountPaid)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {txn.amountDue > 0 ? (
                            <>
                              <span>
                                {formatCurrency(txn.amountDue)}
                                {employeeMap.get(txn.dueAssignedTo) && (
                                  <div className="text-xs text-muted-foreground">({employeeMap.get(txn.dueAssignedTo)?.name})</div>
                                )}
                              </span>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenPaymentDialog(txn, 'due')}>
                                <CircleDollarSign className="h-4 w-4 text-green-600" />
                              </Button>
                            </>
                          ) : (
                            formatCurrency(txn.amountDue)
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                            {txn.commission > 0 ? (
                              <>
                                <span>
                                  {formatCurrency(txn.commission)}
                                  {employeeMap.get(txn.commissionAssignedTo) && (
                                    <div className="text-xs text-muted-foreground">({employeeMap.get(txn.commissionAssignedTo)?.name})</div>
                                  )}
                                </span>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenPaymentDialog(txn, 'commission')}>
                                  <CircleDollarSign className="h-4 w-4 text-green-600" />
                                </Button>
                              </>
                            ) : (
                              formatCurrency(txn.commission)
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => window.open(`/ledger/${txn.id}/print`, '_blank')} className="cursor-pointer">
                              <Printer className="mr-2 h-4 w-4" />
                              <span>{t.print[language]}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleEditLedger(txn.id)} className="cursor-pointer" disabled={isEditing}>
                              {isEditing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit className="mr-2 h-4 w-4" />}
                              <span>{t.edit[language]}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => handleDeleteRequest(txn)}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>{t.delete[language]}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )})
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                      {t.noResults[language]}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-10">
            <CardHeader className="items-center text-center">
                <CardTitle>{t.noEntriesTitle[language]}</CardTitle>
                <CardDescription>{t.noEntriesDescription[language]}</CardDescription>
            </CardHeader>
        </Card>
      )}
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.dialogTitle[language]}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.dialogDescription[language]}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLedgerToDelete(null)}>{t.cancel[language]}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              {t.confirm[language]}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>
                    {paymentInfo?.type === 'due' ? t.payDue[language] : t.payCommission[language]}
                  </DialogTitle>
                  <DialogDescription>
                    {t.payTo[language]} {paymentInfo?.employeeName}
                  </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  <div className="grid gap-2">
                      <Label htmlFor="paymentAmount">{t.amountToPay[language]}</Label>
                      <Input
                          id="paymentAmount"
                          type="number"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          max={paymentInfo?.maxAmount}
                      />
                  </div>
              </div>
              <DialogFooter>
                  <DialogClose asChild><Button variant="secondary">{t.cancel[language]}</Button></DialogClose>
                  <Button onClick={handlePrepareSmsForPayment}>{t.pay[language]}</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      
      <Dialog open={isSmsConfirmDialogOpen} onOpenChange={setIsSmsConfirmDialogOpen}>
        <DialogContent className="max-w-md">
            {renderSmsDialogContent()}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isNewLedgerDialogOpen} onOpenChange={setIsNewLedgerDialogOpen}>
        <DialogTrigger asChild>
            <Button className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-lg z-50" size="icon" aria-label={t.addEntry[language]}>
                <Plus className="h-8 w-8" />
                <span className="sr-only">{t.addEntry[language]}</span>
            </Button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t.newLedgerDialogTitle[language]}</DialogTitle>
                <DialogDescription>{t.newLedgerDialogDesc[language]}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
                <Button onClick={handleCreateBlankLedger} disabled={isCreatingBlank} className="w-full" size="lg">
                    {isCreatingBlank ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {t.createBlankLedger[language]}
                </Button>
                <Separator />
                <h4 className="text-sm font-medium text-center text-muted-foreground">{t.fromDailySummary[language]}</h4>
                <div className="max-h-60 overflow-y-auto space-y-2 rounded-md border p-2">
                    {pendingSummaries.length > 0 ? pendingSummaries.map(summary => {
                      const isLoading = loadingSummaryId === summary.id;
                      return (
                        <div key={summary.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent">
                            <div>
                                <p className="font-medium">{new Date(summary.date).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-GB')} - {summary.market}</p>
                                <p className="text-sm text-muted-foreground">{employeeMap.get(summary.salespersonId)?.name || 'N/A'}</p>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => {
                                    setLoadingSummaryId(summary.id);
                                    startLoading();
                                    router.push(`/ledger/new?summaryId=${summary.id}`);
                                }}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <FileText className="mr-2 h-4 w-4"/>
                                )}
                                {t.select[language]}
                            </Button>
                        </div>
                      )
                    }) : (
                      <p className="text-center text-sm text-muted-foreground py-8">{t.noPendingSummaries[language]}</p>
                    )}
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
