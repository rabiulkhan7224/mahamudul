
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/language-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
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
import { PlusCircle, Trash2, ShieldX, Gift, Edit, Loader2, Check, Info } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { sendSms } from "@/ai/flows/sms-flow";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


// Types
type Employee = { id: number; name: string; phone: string; role: string; };
type Product = { id: number; name: string; company: string; quantity: number; purchasePrice: number; roundFigurePrice: number; quantityUnit: string; largerUnit?: string; conversionFactor?: number; };
type Market = string;
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
type ReceivableTransaction = {
  id: string;
  ledgerId?: number;
  employeeId: number;
  date: string;
  type: 'due' | 'payment';
  amount: number;
  note: string;
};
type Reward = {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  pricePerUnit: number; // This is the purchase price
  sellingPrice: number;
  profitMargin: number;
};
type RewardRule = {
  id: number;
  mainProductId: number;
  mainProductQuantity: number;
  mainProductUnit: string;
  rewardId: number;
  rewardQuantity: number;
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
type DailySummary = {
  id: number;
  date: string;
  day: string;
  market: string;
  salespersonId: number;
  items: LedgerItem[];
  rewardItems?: (Omit<LedgerRewardItem, 'summaryQuantity' | 'quantityReturned' | 'quantitySold'> & { quantity: number })[];
  totalSale: number;
  status: 'pending' | 'used';
  ledgerId?: number;
};
type ProfileData = {
  businessName?: string;
};
type SmsNotification = {
    employeeId: number;
    employeeName: string;
    phoneNumber: string;
    type: 'বকেয়া' | 'কমিশন'; // 'Due' | 'Commission'
    newAmount: number;
    totalDue: number;
    message: string;
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

const formatCurrency = (amount: number) => `৳${amount.toFixed(2)}`;

export default function NewLedgerEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const { toast } = useToast();

  const [isFromSummary, setIsFromSummary] = useState(false);
  const [summaryId, setSummaryId] = useState<string | null>(null);

  // Data from Local Storage
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [rules, setRules] = useState<RewardRule[]>([]);
  const [quantityUnits, setQuantityUnits] = useState<string[]>([]);

  // Form State
  const [date, setDate] = useState("");
  const [day, setDay] = useState("");
  const [selectedMarket, setSelectedMarket] = useState("");
  const [selectedSalesperson, setSelectedSalesperson] = useState("");
  const [ledgerItems, setLedgerItems] = useState<LedgerItem[]>([]);
  const [damagedItems, setDamagedItems] = useState<DamagedItem[]>([]);
  const [ledgerRewards, setLedgerRewards] = useState<LedgerRewardItem[]>([]);
  const [amountPaid, setAmountPaid] = useState<number | string>("");
  const [dueAssignedTo, setDueAssignedTo] = useState("");
  const [commissionAmount, setCommissionAmount] = useState<number | string>("");
  const [commissionAssignedTo, setCommissionAssignedTo] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Product Dialog State
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isQuantityDialogOpen, setIsQuantityDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [summaryQuantity, setSummaryQuantity] = useState<number | string>("");
  const [quantityReturned, setQuantityReturned] = useState<number | string>("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState<number | string>("");

  // Damaged Product Dialog State
  const [isDamagedProductSelectionOpen, setIsDamagedProductSelectionOpen] = useState(false);
  const [isDamagedQuantityDialogOpen, setIsDamagedQuantityDialogOpen] = useState(false);
  const [damagedProduct, setDamagedProduct] = useState<Product | null>(null);
  const [damagedQuantity, setDamagedQuantity] = useState<number | string>("");
  const [damagedUnit, setDamagedUnit] = useState("");
  const [damagedPricePerUnit, setDamagedPricePerUnit] = useState<number | string>("");

  // Custom Reward Dialog State
  const [isCustomRewardDialogOpen, setIsCustomRewardDialogOpen] = useState(false);
  const [customRewardSelection, setCustomRewardSelection] = useState<string>(""); // reward id or "manual"
  const [customRewardNameInput, setCustomRewardNameInput] = useState("");
  const [customRewardUnitInput, setCustomRewardUnitInput] = useState("");
  const [customRewardPurchasePrice, setCustomRewardPurchasePrice] = useState<number | string>("");
  const [customRewardProfitMargin, setCustomRewardProfitMargin] = useState<number | string>("");
  const [customRewardSellingPrice, setCustomRewardSellingPrice] = useState<number | string>("");
  const [customRewardSummaryQty, setCustomRewardSummaryQty] = useState<number | string>("");
  const [customRewardReturnedQty, setCustomRewardReturnedQty] = useState<number | string>("");

  // Edit Reward Dialog State
  const [isEditRewardDialogOpen, setIsEditRewardDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<LedgerRewardItem | null>(null);
  const [editRewardSummaryQty, setEditRewardSummaryQty] = useState<number | string>('');
  const [editRewardReturnedQty, setEditRewardReturnedQty] = useState<number | string>("");
  const [modifiedAutoRewards, setModifiedAutoRewards] = useState<Set<number>>(new Set());
  
  // SMS Confirmation Dialog State
  const [isSmsConfirmDialogOpen, setIsSmsConfirmDialogOpen] = useState(false);
  const [smsNotifications, setSmsNotifications] = useState<SmsNotification[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Stock tracking states
  const [productStockInfo, setProductStockInfo] = useState({ available: 0, required: 0, unit: '' });
  const [damagedStockInfo, setDamagedStockInfo] = useState({ available: 0, required: 0, unit: '' });
  const [rewardStockInfo, setRewardStockInfo] = useState({ available: 0, unit: '' });
  const [displayStock, setDisplayStock] = useState({ quantity: 0, unit: '' });
  const [displayDamagedStock, setDisplayDamagedStock] = useState({ quantity: 0, unit: '' });
  const [displayRewardStock, setDisplayRewardStock] = useState({ quantity: 0, unit: ''});


  useEffect(() => {
    const summaryIdFromParams = searchParams.get('summaryId');
    if (summaryIdFromParams) {
        setIsFromSummary(true);
        setSummaryId(summaryIdFromParams);
    } else {
        const today = new Date();
        setDate(today.toLocaleDateString('en-CA')); // YYYY-MM-DD
        setDay(today.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'long' }));
        setIsLoading(false);
    }

    // Load data from localStorage
    try {
      const storedEmployees = localStorage.getItem('employees');
      if (storedEmployees) setEmployees(JSON.parse(storedEmployees));

      const storedProducts = localStorage.getItem('products');
      if (storedProducts) setProducts(JSON.parse(storedProducts));
      
      const storedMarkets = localStorage.getItem('markets');
      if (storedMarkets) setMarkets(JSON.parse(storedMarkets));
      
      const storedRewards = localStorage.getItem('rewards-list');
      if (storedRewards) setRewards(JSON.parse(storedRewards));
      
      const storedRules = localStorage.getItem('reward-rules');
      if (storedRules) setRules(JSON.parse(storedRules));

      const storedQuantityUnits = localStorage.getItem('product-quantity-units');
      if (storedQuantityUnits) setQuantityUnits(JSON.parse(storedQuantityUnits));

    } catch (error) {
      console.error("Failed to parse data from localStorage", error);
      setIsLoading(false);
    }
  }, [searchParams, language]);

  useEffect(() => {
    if (isFromSummary && summaryId) {
        try {
            const storedSummaries = localStorage.getItem('daily-summaries');
            const allSummaries: DailySummary[] = storedSummaries ? JSON.parse(storedSummaries) : [];
            const summaryToLoad = allSummaries.find(s => String(s.id) === summaryId);

            if (summaryToLoad) {
                // User wants to select date, day, and salesperson manually
                const today = new Date();
                setDate(today.toLocaleDateString('en-CA'));
                setDay(today.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'long' }));
                
                setSelectedMarket(summaryToLoad.market);
                setSelectedSalesperson(String(summaryToLoad.salespersonId));

                const initialLedgerItems = summaryToLoad.items.map(item => ({
                    ...item,
                    quantityReturned: 0,
                    quantitySold: item.summaryQuantity,
                    totalPrice: item.summaryQuantity * item.pricePerUnit,
                }));
                setLedgerItems(initialLedgerItems);
                
                const initialRewardItems = (summaryToLoad.rewardItems || []).map(item => {
                    const summaryQty = item.quantity || 0;
                    const quantityReturned = 0;
                    const quantitySold = summaryQty - quantityReturned;
                    const totalPrice = quantitySold * item.pricePerUnit;

                    return {
                      ...item,
                      summaryQuantity: summaryQty,
                      quantityReturned: quantityReturned,
                      quantitySold: quantitySold,
                      totalPrice: totalPrice,
                    };
                });
                setLedgerRewards(initialRewardItems);

            } else {
                toast({ variant: 'destructive', title: 'Summary not found!' });
                router.push('/ledger');
            }
        } catch (error) {
            console.error("Failed to load from summary", error);
            toast({ variant: 'destructive', title: 'Error loading summary!' });
        } finally {
            setIsLoading(false);
        }
    }
  }, [isFromSummary, summaryId, router, toast, language]);

  const isManualReward = customRewardSelection === "manual";

  const selectedRewardDetails = useMemo(() => {
      if (isManualReward || !customRewardSelection) return null;
      return rewards.find(r => r.id === Number(customRewardSelection));
  }, [customRewardSelection, rewards, isManualReward]);

  const finalRewardName = isManualReward ? customRewardNameInput : selectedRewardDetails?.name || "";
  const finalRewardUnit = isManualReward ? customRewardUnitInput : selectedRewardDetails?.unit || "";
  const finalRewardPrice = Number(customRewardSellingPrice) || 0;
  
  const customRewardSoldQty = useMemo(() => {
    const summary = Number(customRewardSummaryQty) || 0;
    const returned = Number(customRewardReturnedQty) || 0;
    return Math.max(0, summary - returned);
  }, [customRewardSummaryQty, customRewardReturnedQty]);

  const customRewardTotalPrice = useMemo(() => {
      return customRewardSoldQty * finalRewardPrice;
  }, [customRewardSoldQty, finalRewardPrice]);

  useEffect(() => {
    if (!isManualReward) return;
    const pp = parseFloat(String(customRewardPurchasePrice));
    const pm = parseFloat(String(customRewardProfitMargin));
    if (!isNaN(pp) && !isNaN(pm)) {
      const calculatedSellingPrice = pp * (1 + pm / 100);
      setCustomRewardSellingPrice(calculatedSellingPrice);
    }
  }, [customRewardPurchasePrice, customRewardProfitMargin, isManualReward]);

  const quantitySold = useMemo(() => {
    const summary = Number(summaryQuantity) || 0;
    const returned = Number(quantityReturned) || 0;
    if (summary < returned) return 0;
    return summary - returned;
  }, [summaryQuantity, quantityReturned]);

  const groupedProducts = useMemo(() => {
    const groups: { [key: string]: Product[] } = {};
    for (const product of products) {
      if (!groups[product.company]) {
        groups[product.company] = [];
      }
      groups[product.company].push(product);
    }
    // Sort groups by company name
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [products]);
  
  const rewardMap = useMemo(() => new Map(rewards.map(r => [r.id, r])), [rewards]);
  const ruleMap = useMemo(() => {
      const map = new Map<number, RewardRule>();
      rules.forEach(rule => map.set(rule.mainProductId, rule));
      return map;
  }, [rules]);

  const grossSale = useMemo(() => {
    return ledgerItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [ledgerItems]);

  const totalRewardsValue = useMemo(() => {
    return ledgerRewards.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [ledgerRewards]);
  
  const totalDamaged = useMemo(() => {
    return damagedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [damagedItems]);
  
  const totalSale = useMemo(() => { // This is the net sale
    return grossSale + totalRewardsValue - totalDamaged;
  }, [grossSale, totalRewardsValue, totalDamaged]);

  const amountDue = useMemo(() => {
    const paid = Number(amountPaid) || 0;
    const commission = Number(commissionAmount) || 0;
    return totalSale - paid - commission;
  }, [totalSale, amountPaid, commissionAmount]);

  useEffect(() => {
    if (!selectedProduct) {
      setPricePerUnit("");
      return;
    }

    const smallerUnitName = selectedProduct.largerUnit;
    const largerUnitName = selectedProduct.quantityUnit;
    const conversion = selectedProduct.conversionFactor || 1;
    const priceOfLargerUnit = selectedProduct.roundFigurePrice;

    if (selectedUnit === largerUnitName) {
      setPricePerUnit(priceOfLargerUnit);
    } else if (selectedUnit === smallerUnitName) {
      const priceOfSmallerUnit = conversion > 0 ? priceOfLargerUnit / conversion : 0;
      setPricePerUnit(priceOfSmallerUnit);
    }
  }, [selectedProduct, selectedUnit]);

  const availableUnits = useMemo(() => {
    if (!selectedProduct) return [];
    const units = [selectedProduct.quantityUnit];
    if (selectedProduct.largerUnit) {
      units.push(selectedProduct.largerUnit);
    }
    return units.filter(Boolean);
  }, [selectedProduct]);
  
  useEffect(() => {
    if (!damagedProduct) {
      setDamagedPricePerUnit("");
      return;
    }
    const smallerUnitName = damagedProduct.largerUnit;
    const largerUnitName = damagedProduct.quantityUnit;
    const conversion = damagedProduct.conversionFactor || 1;
    const priceOfLargerUnit = damagedProduct.purchasePrice; // Use purchase price

    if (damagedUnit === largerUnitName) {
      setDamagedPricePerUnit(priceOfLargerUnit);
    } else if (damagedUnit === smallerUnitName) {
      const priceOfSmallerUnit = conversion > 0 ? priceOfLargerUnit / conversion : 0;
      setDamagedPricePerUnit(priceOfSmallerUnit);
    }
  }, [damagedProduct, damagedUnit]);

  const availableUnitsForDamaged = useMemo(() => {
    if (!damagedProduct) return [];
    const units = [damagedProduct.quantityUnit];
    if (damagedProduct.largerUnit) {
      units.push(damagedProduct.largerUnit);
    }
    return units.filter(Boolean);
  }, [damagedProduct]);
  
  useEffect(() => {
    if (isProductDialogOpen || isCustomRewardDialogOpen || isEditRewardDialogOpen) return;

    // 1. Calculate all potential automatic rewards
    const calculatedAutomaticRewards: LedgerRewardItem[] = [];
    ledgerItems.forEach(item => {
        const rule = ruleMap.get(item.productId);
        if (rule && rule.mainProductUnit === item.unit) {
            const reward = rewardMap.get(rule.rewardId);
            if (reward) {
                const numRewardsGiven = Math.floor(item.quantitySold / rule.mainProductQuantity) * rule.rewardQuantity;
                if (numRewardsGiven > 0) {
                    calculatedAutomaticRewards.push({
                        rewardId: reward.id,
                        rewardName: reward.name,
                        mainProductId: item.productId,
                        mainProductName: item.productName,
                        unit: reward.unit,
                        pricePerUnit: reward.sellingPrice,
                        purchasePricePerUnit: reward.pricePerUnit, // purchase price
                        summaryQuantity: numRewardsGiven,
                        quantityReturned: 0,
                        quantitySold: numRewardsGiven,
                        totalPrice: numRewardsGiven * reward.sellingPrice,
                    });
                }
            }
        }
    });

    // 2. Reconcile with current state
    setLedgerRewards(prevRewards => {
        const customRewards = prevRewards.filter(r => !r.mainProductId);
        const manuallyModifiedRewards = prevRewards.filter(r => r.mainProductId && modifiedAutoRewards.has(r.rewardId));
        const newUntouchedAutoRewards = calculatedAutomaticRewards.filter(r => !modifiedAutoRewards.has(r.rewardId));

        return [...customRewards, ...manuallyModifiedRewards, ...newUntouchedAutoRewards];
    });

}, [ledgerItems, ruleMap, rewardMap, isProductDialogOpen, isCustomRewardDialogOpen, isEditRewardDialogOpen, modifiedAutoRewards]);

  const formatProductQuantity = (product: Product) => {
    if (product.largerUnit && product.conversionFactor && product.conversionFactor > 0) {
      const totalInBaseUnit = product.quantity;
      const largerUnitCount = Math.floor(totalInBaseUnit);
      const remainder = totalInBaseUnit - largerUnitCount;
      const smallerUnitCount = Math.round(remainder * product.conversionFactor);

      const parts = [];
      if (largerUnitCount > 0) {
        parts.push(`${largerUnitCount} ${product.quantityUnit}`);
      }
      if (smallerUnitCount > 0) {
        parts.push(`${smallerUnitCount} ${product.largerUnit}`);
      }
      
      if (parts.length === 0) {
        return `0 ${product.quantityUnit}`;
      }

      return parts.join(', ');
    }
    return `${product.quantity.toFixed(2)} ${product.quantityUnit}`;
  };

  const formatDetailedStock = (quantityInBaseUnit: number, product: Product) => {
    if (!product) return '';
    if (product.largerUnit && product.conversionFactor && product.conversionFactor > 0) {
      const totalInBaseUnit = quantityInBaseUnit;
      const largerUnitCount = Math.floor(totalInBaseUnit);
      const remainder = totalInBaseUnit - largerUnitCount;
      const smallerUnitCount = Math.round(remainder * product.conversionFactor);

      const parts = [];
      if (largerUnitCount > 0) {
        parts.push(`${largerUnitCount} ${product.quantityUnit}`);
      }
      if (smallerUnitCount > 0) {
        parts.push(`${smallerUnitCount} ${product.largerUnit}`);
      }
      
      if (parts.length === 0) {
        return `0 ${product.quantityUnit}`;
      }

      return parts.join(', ');
    }
    return `${quantityInBaseUnit.toFixed(2)} ${product.quantityUnit}`;
  }


  const groupedLedgerItems = useMemo(() => {
    if (ledgerItems.length === 0) return [];

    const productCompanyMap = new Map(products.map(p => [p.id, p.company]));

    const groups: { [key: string]: LedgerItem[] } = {};
    for (const item of ledgerItems) {
      const company = productCompanyMap.get(item.productId) || 'Unknown Company';
      if (!groups[company]) {
        groups[company] = [];
      }
      groups[company].push(item);
    }
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [ledgerItems, products]);

  const groupedDamagedItems = useMemo(() => {
    if (damagedItems.length === 0) return [];

    const productCompanyMap = new Map(products.map(p => [p.id, p.company]));

    const groups: { [key: string]: DamagedItem[] } = {};
    for (const item of damagedItems) {
      const company = productCompanyMap.get(item.productId) || 'Unknown Company';
      if (!groups[company]) {
        groups[company] = [];
      }
      groups[company].push(item);
    }
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [damagedItems, products]);

  const t = {
    title: { en: "New Ledger Entry", bn: "নতুন খাতা যোগ" },
    description: { en: "Fill in the details for the new ledger entry.", bn: "নতুন খাতার জন্য বিবরণ পূরণ করুন।" },
    entryInfo: { en: "Entry Information", bn: "খাতার তথ্য" },
    date: { en: "Date", bn: "তারিখ" },
    day: { en: "Day", bn: "বার" },
    market: { en: "Market", bn: "বাজার" },
    selectMarket: { en: "Select a market", bn: "একটি বাজার নির্বাচন করুন" },
    salesperson: { en: "Delivery Person", bn: "ডেলিভারি কর্মী" },
    selectSalesperson: { en: "Select a salesperson", bn: "একজন কর্মচারী নির্বাচন করুন" },
    products: { en: "Products", bn: "পণ্যসমূহ" },
    addProduct: { en: "Add Product", bn: "পণ্য যোগ করুন" },
    product: { en: "Product", bn: "পণ্য" },
    selectProduct: { en: "Select a product", bn: "একটি পণ্য নির্বাচন করুন" },
    unit: { en: "Unit", bn: "একক" },
    selectUnit: { en: "Select a unit", bn: "একটি একক নির্বাচন করুন" },
    pricePerUnit: { en: "Price/Unit", bn: "প্রতি এককের মূল্য" },
    summaryField: { en: "Summary", bn: "সামারী"},
    sold: { en: "Sold", bn: "বিক্রয়" },
    returned: { en: "Returned", bn: "ফেরত" },
    total: { en: "Total", bn: "মোট" },
    noProducts: { en: "No products added yet.", bn: "এখনো কোনো পণ্য যোগ করা হয়নি।" },
    summary: { en: "Summary", bn: "সারসংক্ষেপ" },
    grossSale: { en: 'Gross Sale', bn: 'মোট বিক্রয়' },
    netSale: { en: 'Net Sale', bn: 'নীট বিক্রয়' },
    paidAmount: { en: "Paid Amount", bn: "জমা" },
    dueAmount: { en: "Due Amount", bn: "বাকি" },
    dueAssignedTo: { en: "Due Assigned To", bn: "বাকি যার নামে" },
    commission: { en: "Commission", bn: "কমিশন" },
    commissionAssignedTo: { en: "Commission Assigned To", bn: "কমিশন যার নামে" },
    save: { en: "Save Entry", bn: "সংরক্ষণ করুন" },
    cancel: { en: "Cancel", bn: "বাতিল" },
    damagedProducts: { en: "Damaged Products", bn: "ক্ষতিগ্রস্ত পণ্য" },
    addDamagedProduct: { en: "Add Damaged Product", bn: "ক্ষতিগ্রস্ত পণ্য যোগ করুন" },
    noDamagedProducts: { en: "No damaged products added.", bn: "কোনো ক্ষতিগ্রস্ত পণ্য যোগ করা হয়নি।" },
    quantity: { en: "Quantity", bn: "পরিমাণ" },
    quantityDesc: { en: 'Enter the quantities for the selected product.', bn: 'নির্বাচিত পণ্যের পরিমাণ লিখুন।' },
    totalDamaged: { en: "Total Damaged", bn: "মোট ক্ষতি" },
    noProductsInStock: { en: "No products in stock", bn: "স্টকে কোনো পণ্য নেই" },
    note: { en: 'Note', bn: 'নোট' },
    notePlaceholder: { en: 'Add a note here...', bn: 'এখানে একটি নোট যোগ করুন...' },
    rewards: { en: 'Rewards', bn: 'পুরস্কারসমূহ' },
    reward: { en: 'Reward', bn: 'পুরস্কার' },
    noRewards: { en: 'No rewards added.', bn: 'কোনো পুরস্কার যোগ করা হয়নি।' },
    addCustomReward: { en: 'Add Custom Reward', bn: 'কাস্টম পুরস্কার যোগ' },
    editReward: { en: 'Edit Reward', bn: 'পুরস্কার সম্পাদনা' },
    addReward: { en: 'Add Reward', bn: 'পুরস্কার যোগ' },
    updateReward: { en: 'Update Reward', bn: 'পুরস্কার আপডেট' },
    custom: { en: 'Custom', bn: 'কাস্টম' },
    selectReward: { en: 'Select Reward', bn: 'পুরস্কার নির্বাচন করুন' },
    selectOrEnterReward: { en: 'Select or Enter a Reward', bn: 'পুরস্কার নির্বাচন বা প্রবেশ করুন' },
    enterManually: { en: 'Enter Manually', bn: 'ম্যানুয়ালি প্রবেশ করুন' },
    name: { en: 'Name', bn: 'নাম' },
    purchasePrice: { en: 'Purchase Price', bn: 'ক্রয় মূল্য' },
    profitMargin: { en: 'Profit Margin (%)', bn: 'লাভের হার (%)' },
    sellingPrice: { en: 'Selling Price', bn: 'বিক্রয় মূল্য' },
    smsConfirmTitle: { en: 'Confirm Ledger and Send SMS', bn: 'খাতা নিশ্চিত করুন এবং এসএমএস পাঠান' },
    smsConfirmDesc: { en: 'The following SMS will be sent to the employees. Please review and confirm.', bn: 'নিম্নলিখিত এসএমএস কর্মচারীদের কাছে পাঠানো হবে। অনুগ্রহ করে পর্যালোচনা করে নিশ্চিত করুন।' },
    smsConfirmSend: { en: 'Confirm & Send', bn: 'নিশ্চিত ও প্রেরণ করুন' },
    fromSummaryAlert: { en: 'This ledger is being created from a Daily Summary. Only return quantities are editable.', bn: 'এই খাতাটি একটি দৈনিক সামারী থেকে তৈরি করা হচ্ছে। শুধুমাত্র ফেরতকৃত পরিমাণ সম্পাদনা করা যাবে।' },
    notEnoughStock: { en: 'Not enough stock available.', bn: 'পর্যাপ্ত স্টক নেই।' },
    stock: { en: 'Stock', bn: 'স্টক' },
  };
  
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    if (product) {
        setSelectedUnit(product.quantityUnit);
        setProductStockInfo({ available: product.quantity, required: 0, unit: product.quantityUnit });
        setDisplayStock({ quantity: product.quantity, unit: product.quantityUnit });
    } else {
        setSelectedUnit('');
        setProductStockInfo({ available: 0, required: 0, unit: '' });
        setDisplayStock({ quantity: 0, unit: '' });
    }
  };

  const handleDamagedProductSelect = (product: Product) => {
    setDamagedProduct(product);
    if (product) {
        setDamagedUnit(product.quantityUnit);
        setDamagedStockInfo({ available: product.quantity, required: 0, unit: product.quantityUnit });
        setDisplayDamagedStock({ quantity: product.quantity, unit: product.quantityUnit });
    } else {
        setDamagedUnit('');
        setDamagedStockInfo({ available: 0, required: 0, unit: '' });
        setDisplayDamagedStock({ quantity: 0, unit: '' });
    }
  };

  const resetAddProductDialog = () => {
    setSelectedProduct(null);
    setSummaryQuantity("");
    setQuantityReturned("");
    setSelectedUnit("");
    setPricePerUnit("");
  }

  const handleAddProductToLedger = () => {
    if (!selectedProduct || !selectedUnit || summaryQuantity === "" || Number(summaryQuantity) <= 0) {
      alert(language === 'bn' ? 'অনুগ্রহ করে পণ্য এবং সামারী পরিমাণ সঠিকভাবে দিন।' : 'Please select a product and enter a valid summary quantity.');
      return;
    }
    if (isProductStockInsufficient) {
      toast({ variant: 'destructive', title: "Error", description: t.notEnoughStock[language] });
      return;
    }
    const summaryQty = Number(summaryQuantity);
    const returnedQty = Number(quantityReturned);
    const netSoldQty = summaryQty - returnedQty;

    if (netSoldQty < 0) {
        alert(language === 'bn' ? 'ফেরত পরিমাণ সামারী পরিমাণের চেয়ে বেশি হতে পারে না।' : 'Returned quantity cannot be greater than summary quantity.');
        return;
    }

    const newItem: LedgerItem = {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      unit: selectedUnit,
      pricePerUnit: Number(pricePerUnit),
      summaryQuantity: summaryQty,
      quantitySold: netSoldQty,
      quantityReturned: returnedQty,
      totalPrice: netSoldQty * Number(pricePerUnit),
    };

    setLedgerItems([...ledgerItems, newItem]);
    setIsQuantityDialogOpen(false);
  };
  
  const handleRemoveLedgerItem = (productId: number) => {
    setLedgerItems(ledgerItems.filter(item => item.productId !== productId));
  };
  
  const handleProductReturnChange = (productId: number, returnedValue: string) => {
    const returnedQty = Number(returnedValue);
    if (isNaN(returnedQty)) return;

    setLedgerItems(prevItems =>
        prevItems.map(item => {
            if (item.productId === productId) {
                const soldQty = item.summaryQuantity - returnedQty;
                return {
                    ...item,
                    quantityReturned: returnedQty,
                    quantitySold: Math.max(0, soldQty),
                    totalPrice: Math.max(0, soldQty) * item.pricePerUnit,
                };
            }
            return item;
        })
    );
  };

  const handleRewardReturnChange = (rewardId: number, returnedValue: string) => {
    const returnedQty = Number(returnedValue);
    if (isNaN(returnedQty)) return;

    setLedgerRewards(prevRewards =>
      prevRewards.map(item => {
        if (item.rewardId === rewardId) {
            const soldQty = item.summaryQuantity - returnedQty;
            return {
                ...item,
                quantityReturned: returnedQty,
                quantitySold: Math.max(0, soldQty),
                totalPrice: Math.max(0, soldQty) * item.pricePerUnit,
            };
        }
        return item;
      })
    );
  };


  const resetDamagedProductDialog = () => {
    setDamagedProduct(null);
    setDamagedQuantity("");
    setDamagedUnit("");
    setDamagedPricePerUnit("");
  }

  const handleAddDamagedItem = () => {
    if (!damagedProduct || !damagedUnit || !damagedQuantity || Number(damagedQuantity) <= 0 || !damagedPricePerUnit) {
      alert(language === 'bn' ? 'অনুগ্রহ করে সব ঘর পূরণ করুন।' : 'Please fill all fields.');
      return;
    }
    if(isDamagedStockInsufficient) {
       toast({ variant: 'destructive', title: "Error", description: t.notEnoughStock[language] });
       return;
    }
    const qty = Number(damagedQuantity);
    const price = Number(damagedPricePerUnit);

    const newItem: DamagedItem = {
      productId: damagedProduct.id,
      productName: damagedProduct.name,
      unit: damagedUnit,
      pricePerUnit: price,
      quantity: qty,
      totalPrice: qty * price,
    };

    setDamagedItems([...damagedItems, newItem]);
    setIsDamagedQuantityDialogOpen(false);
  };

  const handleRemoveDamagedItem = (productId: number) => {
    setDamagedItems(damagedItems.filter(item => item.productId !== productId));
  };
  
  const resetCustomRewardDialog = () => {
    setCustomRewardSelection("");
    setCustomRewardNameInput("");
    setCustomRewardUnitInput("");
    setCustomRewardPurchasePrice("");
    setCustomRewardProfitMargin("");
    setCustomRewardSellingPrice("");
    setCustomRewardSummaryQty("");
    setCustomRewardReturnedQty("");
  };

  const handleRewardSelectionChange = (value: string) => {
      setCustomRewardSelection(value);
      if (value !== "manual") {
          const reward = rewards.find(r => r.id === Number(value));
          if (reward) {
              setCustomRewardNameInput(reward.name);
              setCustomRewardUnitInput(reward.unit);
              setCustomRewardPurchasePrice(reward.pricePerUnit);
              setCustomRewardProfitMargin(reward.profitMargin);
              setCustomRewardSellingPrice(reward.sellingPrice);
              setRewardStockInfo({ available: reward.quantity, unit: reward.unit });
              setDisplayRewardStock({ quantity: reward.quantity, unit: reward.unit });
          }
      } else {
          setCustomRewardNameInput("");
          setCustomRewardUnitInput("");
          setCustomRewardPurchasePrice("");
          setCustomRewardProfitMargin("");
          setCustomRewardSellingPrice("");
          setRewardStockInfo({ available: Infinity, unit: '' }); // Manual entry has no stock limit
          setDisplayRewardStock({ quantity: Infinity, unit: '' });
      }
      setCustomRewardSummaryQty("");
      setCustomRewardReturnedQty("");
  }

  const handleAddCustomReward = () => {
    if (!finalRewardName || !finalRewardUnit || finalRewardPrice <= 0 || customRewardSummaryQty === "") {
        alert(language === 'bn' ? 'অনুগ্রহ করে পুরস্কারের সকল আবশ্যক তথ্য পূরণ করুন।' : 'Please fill all required reward fields.');
        return;
    }
    
    if (isRewardStockInsufficient) {
        toast({ variant: 'destructive', title: "Error", description: t.notEnoughStock[language] });
        return;
    }

    const purchasePrice = isManualReward ? Number(customRewardPurchasePrice) : selectedRewardDetails?.pricePerUnit || 0;

    const newCustomReward: LedgerRewardItem = {
        rewardId: isManualReward ? Date.now() : Number(customRewardSelection),
        rewardName: finalRewardName,
        unit: finalRewardUnit,
        pricePerUnit: finalRewardPrice,
        purchasePricePerUnit: purchasePrice,
        summaryQuantity: Number(customRewardSummaryQty),
        quantityReturned: Number(customRewardReturnedQty),
        quantitySold: customRewardSoldQty,
        totalPrice: customRewardTotalPrice,
    };

    if (!isManualReward && ledgerRewards.some(r => r.rewardId === newCustomReward.rewardId && !r.mainProductId)) {
        alert(language === 'bn' ? 'এই পুরস্কারটি ইতিমধ্যে কাস্টম হিসাবে যোগ করা হয়েছে।' : 'This reward has already been added as a custom reward.');
        return;
    }

    setLedgerRewards([...ledgerRewards, newCustomReward]);
    setIsCustomRewardDialogOpen(false);
  };

  const handleRemoveRewardItem = (rewardId: number) => {
    const rewardToRemove = ledgerRewards.find(r => r.rewardId === rewardId);
    if (rewardToRemove && rewardToRemove.mainProductId) {
        setModifiedAutoRewards(prev => new Set(prev).add(rewardId));
    }
    setLedgerRewards(prev => prev.filter(item => item.rewardId !== rewardId));
  };

  const handleOpenEditRewardDialog = (reward: LedgerRewardItem) => {
    setEditingReward(reward);
    setEditRewardSummaryQty(reward.summaryQuantity);
    setEditRewardReturnedQty(reward.quantityReturned);
    setIsEditRewardDialogOpen(true);
  };

  const handleUpdateReward = () => {
    if (!editingReward) return;

    const summaryQty = Number(editRewardSummaryQty) || 0;
    const returnedQty = Number(editRewardReturnedQty) || 0;
    const soldQty = Math.max(0, summaryQty - returnedQty);
    
    const updatedReward: LedgerRewardItem = {
        ...editingReward,
        summaryQuantity: summaryQty,
        quantityReturned: returnedQty,
        quantitySold: soldQty,
        totalPrice: soldQty * editingReward.pricePerUnit,
    };

    if (updatedReward.mainProductId) {
        setModifiedAutoRewards(prev => new Set(prev).add(updatedReward.rewardId));
    }
    
    setLedgerRewards(prev => prev.map(r => r.rewardId === updatedReward.rewardId ? updatedReward : r));
    setIsEditRewardDialogOpen(false);
    setEditingReward(null);
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

  const executeSave = () => {
    try {
        const lastId = Number(localStorage.getItem("ledger-id-counter") || "9999");
        const newId = lastId + 1;

        const newLedgerEntry = {
            id: newId, date, day, market: selectedMarket, salespersonId: Number(selectedSalesperson), items: ledgerItems,
            damagedItems, rewardItems: ledgerRewards, totalSale, amountPaid: Number(amountPaid) || 0, amountDue,
            dueAssignedTo: Number(dueAssignedTo), commission: Number(commissionAmount) || 0,
            commissionAssignedTo: Number(commissionAssignedTo), note, modifiedRewardIds: Array.from(modifiedAutoRewards),
        };

        const storedTransactions = localStorage.getItem("ledger-transactions") || "[]";
        const transactions = JSON.parse(storedTransactions);
        transactions.push(newLedgerEntry);
        localStorage.setItem("ledger-transactions", JSON.stringify(transactions));
        localStorage.setItem("ledger-id-counter", String(newId));

        const storedProductsText = localStorage.getItem('products') || '[]';
        let allProducts: Product[] = JSON.parse(storedProductsText);
        ledgerItems.forEach(item => {
            const idx = allProducts.findIndex(p => p.id === item.productId);
            if (idx !== -1) {
                let qtyToDeduct = item.quantitySold;
                if (allProducts[idx].largerUnit && allProducts[idx].conversionFactor && item.unit === allProducts[idx].largerUnit) {
                    qtyToDeduct /= allProducts[idx].conversionFactor!;
                }
                allProducts[idx].quantity -= qtyToDeduct;
            }
        });
        damagedItems.forEach(item => {
            const idx = allProducts.findIndex(p => p.id === item.productId);
            if (idx !== -1) {
                let qtyToDeduct = item.quantity;
                if (allProducts[idx].largerUnit && allProducts[idx].conversionFactor && item.unit === allProducts[idx].largerUnit) {
                    qtyToDeduct /= allProducts[idx].conversionFactor!;
                }
                allProducts[idx].quantity -= qtyToDeduct;
            }
        });
        localStorage.setItem('products', JSON.stringify(allProducts));

        const storedRewardsText = localStorage.getItem('rewards-list') || '[]';
        let allRewards: Reward[] = JSON.parse(storedRewardsText);
        ledgerRewards.forEach(item => {
            const idx = allRewards.findIndex(r => r.id === item.rewardId);
            if (idx !== -1) allRewards[idx].quantity -= item.quantitySold;
        });
        localStorage.setItem('rewards-list', JSON.stringify(allRewards));

        const storedReceivables = localStorage.getItem("receivable-transactions") || "[]";
        const receivables: ReceivableTransaction[] = JSON.parse(storedReceivables);
        if (amountDue > 0 && dueAssignedTo) {
            receivables.push({
                id: `ledger-due-${newId}`, ledgerId: newId, employeeId: Number(dueAssignedTo), date,
                type: 'due', amount: amountDue,
                note: language === 'bn' ? `খাতা নং ${newId} থেকে বকেয়া` : `Due from Ledger #${newId}`,
            });
        }
        if ((Number(commissionAmount) || 0) > 0 && commissionAssignedTo) {
            receivables.push({
                id: `ledger-commission-${newId}`, ledgerId: newId, employeeId: Number(commissionAssignedTo), date,
                type: 'due', amount: Number(commissionAmount),
                note: language === 'bn' ? `খাতা নং ${newId} থেকে কমিশন` : `Commission from Ledger #${newId}`,
            });
        }
        localStorage.setItem("receivable-transactions", JSON.stringify(receivables));

        if (isFromSummary && summaryId) {
            const storedSummaries = localStorage.getItem('daily-summaries') || '[]';
            const summaries = JSON.parse(storedSummaries);
            const summaryIndex = summaries.findIndex((s: DailySummary) => String(s.id) === summaryId);
            if (summaryIndex > -1) {
                summaries[summaryIndex].status = 'used';
                summaries[summaryIndex].ledgerId = newId;
                localStorage.setItem('daily-summaries', JSON.stringify(summaries));
            }
        }

        return true;
    } catch (error) {
        console.error("Failed to save ledger entry", error);
        alert(language === 'bn' ? 'খাতা সংরক্ষণ করতে সমস্যা হয়েছে।' : 'Failed to save ledger entry.');
        return false;
    }
  };

  const prepareAndShowSmsConfirmation = async () => {
    if (!selectedMarket || !selectedSalesperson || ledgerItems.length === 0) {
      alert(language === 'bn' ? 'অনুগ্রহ করে বাজার, কর্মচারী এবং কমপক্ষে একটি পণ্য যোগ করুন।' : 'Please select a market, salesperson, and add at least one product.');
      return;
    }
    
    const isSmsEnabledGlobally = JSON.parse(localStorage.getItem('sms-service-enabled') ?? 'true');
    const hasDueOrCommission = (amountDue > 0 && dueAssignedTo) || (Number(commissionAmount) > 0 && commissionAssignedTo);

    if (!isSmsEnabledGlobally || !hasDueOrCommission) {
        if(executeSave()) {
            toast({
                title: language === 'bn' ? 'খাতা সংরক্ষিত হয়েছে' : 'Ledger entry saved',
            });
            router.push("/ledger");
        }
        return;
    }

    try {
        const storedReceivables = localStorage.getItem("receivable-transactions") || "[]";
        const allReceivables: ReceivableTransaction[] = JSON.parse(storedReceivables);
        
        const storedSmsSettings = localStorage.getItem('sms-settings');
        const { apiKey, senderId } = storedSmsSettings ? JSON.parse(storedSmsSettings) : { apiKey: '', senderId: '' };
        
        const template = localStorage.getItem('sms-template-ledger') || "{business_name}: প্রিয় {employee_name}, {date} তারিখে খাতা নং #{ledger_no} থেকে {new_amount} টাকার একটি নতুন {amount_type} যোগ করা হয়েছে। আপনার নতুন মোট বকেয়া এখন {total_due} টাকা।";
        const businessName = (JSON.parse(localStorage.getItem('profile-settings') || '{}') as ProfileData).businessName || '';

        const notifications: SmsNotification[] = [];
        const employeeMap = new Map(employees.map(e => [e.id, e]));

        const calculateTotalDue = (employeeId: number): number => {
            return allReceivables.filter(r => r.employeeId === employeeId).reduce((total, txn) => txn.type === 'due' ? total + txn.amount : total - txn.amount, 0);
        };
        
        const lastId = Number(localStorage.getItem("ledger-id-counter") || "9999");
        const newId = lastId + 1;

        if (amountDue > 0 && dueAssignedTo) {
            const emp = employeeMap.get(Number(dueAssignedTo));
            if (emp) {
                const currentDue = calculateTotalDue(emp.id);
                const newTotalDue = currentDue + amountDue;
                const message = template.replace('{employee_name}', emp.name).replace('{date}', new Date(date).toLocaleDateString('bn-BD')).replace('{ledger_no}', String(newId)).replace('{amount_type}', 'বকেয়া').replace('{new_amount}', formatCurrency(amountDue)).replace('{total_due}', formatCurrency(newTotalDue)).replace('{business_name}', businessName);
                notifications.push({ employeeId: emp.id, employeeName: emp.name, phoneNumber: emp.phone, type: 'বকেয়া', newAmount: amountDue, totalDue: newTotalDue, message });
            }
        }

        if (Number(commissionAmount) > 0 && commissionAssignedTo) {
            const emp = employeeMap.get(Number(commissionAssignedTo));
            if (emp) {
                const currentDue = calculateTotalDue(emp.id);
                const newTotalDue = currentDue + Number(commissionAmount);
                const message = template.replace('{employee_name}', emp.name).replace('{date}', new Date(date).toLocaleDateString('bn-BD')).replace('{ledger_no}', String(newId)).replace('{amount_type}', 'কমিশন').replace('{new_amount}', formatCurrency(Number(commissionAmount))).replace('{total_due}', formatCurrency(newTotalDue)).replace('{business_name}', businessName);
                notifications.push({ employeeId: emp.id, employeeName: emp.name, phoneNumber: emp.phone, type: 'কমিশন', newAmount: Number(commissionAmount), totalDue: newTotalDue, message });
            }
        }
        setSmsNotifications(notifications);
        setIsSmsConfirmDialogOpen(true);

    } catch (error) {
        console.error("Error preparing SMS notifications", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not prepare SMS notifications.' });
    }
  };

  const handleConfirmSaveAndSend = async () => {
    setIsSaving(true);
    if (!executeSave()) {
        setIsSaving(false);
        return;
    }
    
    try {
        const storedSmsSettings = localStorage.getItem('sms-settings');
        const { apiKey, senderId } = storedSmsSettings ? JSON.parse(storedSmsSettings) : { apiKey: '', senderId: '' };

        if (!apiKey || !senderId) {
            if (smsNotifications.length > 0) {
               toast({ variant: 'destructive', title: 'SMS Skipped', description: 'API Key or Sender ID is not configured.' });
            }
        } else {
            const smsPromises = smsNotifications.map(notification => 
                sendSms({
                    apiKey,
                    senderId,
                    phoneNumber: notification.phoneNumber,
                    message: notification.message,
                })
            );

            const results = await Promise.allSettled(smsPromises);
            
            const newHistoryEntries: SmsRecord[] = [];
            results.forEach((result, index) => {
                const notification = smsNotifications[index];
                const success = result.status === 'fulfilled' && result.value.success;
                const statusMessage = success ? result.value.message : (result.status === 'rejected' ? 'Failed to send' : (result.value as any).message);

                newHistoryEntries.push({
                    id: `sms-${Date.now()}-${notification.employeeId}`,
                    date: new Date().toISOString(),
                    recipientName: notification.employeeName,
                    recipientPhone: notification.phoneNumber,
                    message: notification.message,
                    status: success ? 'success' : 'failed',
                    statusMessage: statusMessage,
                    smsCount: getSmsCount(notification.message),
                });
                
                if (success) {
                    toast({ title: `SMS Sent to ${notification.employeeName}`, description: statusMessage });
                } else {
                    toast({ variant: 'destructive', title: `SMS Failed for ${notification.employeeName}`, description: statusMessage });
                }
            });

            if(newHistoryEntries.length > 0) {
                try {
                    const history = JSON.parse(localStorage.getItem('sms-history') || '[]');
                    history.unshift(...newHistoryEntries.reverse());
                    localStorage.setItem('sms-history', JSON.stringify(history.slice(0, 200)));
                } catch (e) { console.error("Failed to save SMS to history", e) }
            }
        }
    } catch (error: any) {
        console.error("Error sending SMS notifications", error);
        toast({ variant: 'destructive', title: 'SMS Error', description: error.message || 'An unexpected error occurred while sending SMS.' });
    }
    
    setIsSaving(false);
    setIsSmsConfirmDialogOpen(false);
    alert(language === 'bn' ? 'খাতা সফলভাবে সংরক্ষিত হয়েছে।' : 'Ledger entry saved successfully.');
    router.push("/ledger");
  };
  
  // Stock validation useEffects
  useEffect(() => {
    if (!isQuantityDialogOpen || !selectedProduct) return;
    
    const summaryQty = Number(summaryQuantity) || 0;
    let requiredInBase = summaryQty;

    if (selectedUnit === selectedProduct.largerUnit && selectedProduct.conversionFactor) {
        requiredInBase /= selectedProduct.conversionFactor;
    }
    setProductStockInfo(prev => ({ ...prev, required: requiredInBase }));
    const remainingStockInBase = productStockInfo.available - requiredInBase;
    setDisplayStock(prev => ({ ...prev, quantity: remainingStockInBase }));

  }, [summaryQuantity, selectedUnit, selectedProduct, isQuantityDialogOpen, productStockInfo.available]);
  
  useEffect(() => {
    if (!isDamagedQuantityDialogOpen || !damagedProduct) return;
    
    const qty = Number(damagedQuantity) || 0;
    let requiredInBase = qty;

    if (damagedUnit === damagedProduct.largerUnit && damagedProduct.conversionFactor) {
        requiredInBase /= damagedProduct.conversionFactor;
    }
    setDamagedStockInfo(prev => ({ ...prev, required: requiredInBase }));
    const remainingStockInBase = damagedStockInfo.available - requiredInBase;
    setDisplayDamagedStock(prev => ({ ...prev, quantity: remainingStockInBase }));

  }, [damagedQuantity, damagedUnit, damagedProduct, isDamagedQuantityDialogOpen, damagedStockInfo.available]);

  useEffect(() => {
    if (!isCustomRewardDialogOpen || isManualReward || !selectedRewardDetails) return;
    const summaryQty = Number(customRewardSummaryQty) || 0;
    const remainingStock = rewardStockInfo.available - summaryQty;
    setDisplayRewardStock(prev => ({ ...prev, quantity: remainingStock }));
  }, [customRewardSummaryQty, isCustomRewardDialogOpen, isManualReward, selectedRewardDetails, rewardStockInfo.available]);

  
  const isProductStockInsufficient = productStockInfo.required > productStockInfo.available;
  const isDamagedStockInsufficient = damagedStockInfo.required > damagedStockInfo.available;
  const isRewardStockInsufficient = rewardStockInfo.available < (Number(customRewardSummaryQty) || 0);
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">{t.title[language]}</h1>
      </div>
      
      {isFromSummary && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Creating from Summary</AlertTitle>
          <AlertDescription>
            {t.fromSummaryAlert[language]}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.entryInfo[language]}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date">{t.date[language]}</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)}/>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="day">{t.day[language]}</Label>
                <Input id="day" value={day} readOnly disabled />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="market">{t.market[language]}</Label>
                <Select value={selectedMarket} onValueChange={setSelectedMarket}>
                  <SelectTrigger><SelectValue placeholder={t.selectMarket[language]} /></SelectTrigger>
                  <SelectContent>
                    {markets.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="salesperson">{t.salesperson[language]}</Label>
                <Select value={selectedSalesperson} onValueChange={setSelectedSalesperson}>
                  <SelectTrigger><SelectValue placeholder={t.selectSalesperson[language]} /></SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => <SelectItem key={emp.id} value={String(emp.id)}>{emp.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
             <CardHeader className="flex-row items-center justify-between">
                <div>
                    <CardTitle>{t.products[language]}</CardTitle>
                </div>
                <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                    <DialogTrigger asChild>
                       <Button disabled={isFromSummary}><PlusCircle className="mr-2 h-4 w-4" />{t.addProduct[language]}</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{t.selectProduct[language]}</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                           <div className="border rounded-md p-2 h-[60vh] overflow-y-auto">
                                {products.length > 0 ? (
                                    <Tabs defaultValue={groupedProducts[0]?.[0]} className="w-full">
                                        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 gap-1 h-auto mb-2">
                                            {groupedProducts.map(([company]) => (
                                                <TabsTrigger key={company} value={company}>{company}</TabsTrigger>
                                            ))}
                                        </TabsList>
                                        {groupedProducts.map(([company, companyProducts]) => (
                                            <TabsContent key={company} value={company}>
                                                <div className="space-y-1">
                                                    {companyProducts.map(p => (
                                                        <button
                                                            key={p.id}
                                                            onClick={() => {
                                                              handleSelectProduct(p);
                                                              setIsProductDialogOpen(false);
                                                              setIsQuantityDialogOpen(true);
                                                            }}
                                                            disabled={p.quantity <= 0}
                                                            className={cn(
                                                                "w-full text-left p-2 rounded-md hover:bg-accent flex items-center justify-between text-sm",
                                                                p.quantity <= 0 && "opacity-50 cursor-not-allowed"
                                                            )}
                                                        >
                                                            <span>{p.name}</span>
                                                            <div className="flex items-center gap-2 ml-4">
                                                                {(() => {
                                                                    const rule = ruleMap.get(p.id);
                                                                    if (rule) {
                                                                        const reward = rewardMap.get(rule.rewardId);
                                                                        if (reward) {
                                                                            return (
                                                                                <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                                                                    🎁 {reward.name} {rule.rewardQuantity} {reward.unit}
                                                                                </span>
                                                                            );
                                                                        }
                                                                    }
                                                                    return null;
                                                                })()}
                                                                <span className={cn("text-xs font-medium", p.quantity > 0 ? 'text-green-600' : 'text-destructive')}>
                                                                    {formatProductQuantity(p)}
                                                                </span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </TabsContent>
                                        ))}
                                    </Tabs>
                                ) : (
                                    <div className="p-4 text-sm text-center text-muted-foreground flex items-center justify-center h-full">
                                        {t.noProductsInStock[language]}
                                    </div>
                                )}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t.product[language]}</TableHead>
                            <TableHead className="text-right">{t.summaryField[language]}</TableHead>
                            <TableHead className="text-right">{t.returned[language]}</TableHead>
                            <TableHead className="text-right">{t.sold[language]}</TableHead>
                            <TableHead className="text-right">{t.pricePerUnit[language]}</TableHead>
                            <TableHead className="text-right">{t.total[language]}</TableHead>
                            <TableHead className="text-right"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {groupedLedgerItems.length > 0 ? (
                          groupedLedgerItems.map(([company, items]) => (
                            <React.Fragment key={company}>
                              <TableRow className="border-b-0 bg-primary/10 hover:bg-primary/10">
                                <TableCell colSpan={7} className="font-bold text-primary py-2 px-4">
                                  {company}
                                </TableCell>
                              </TableRow>
                              {items.map(item => {
                                const soldQty = isFromSummary ? (item.summaryQuantity - item.quantityReturned) : item.quantitySold;
                                const total = isFromSummary ? (soldQty * item.pricePerUnit) : item.totalPrice;
                                return (
                                <TableRow key={item.productId}>
                                  <TableCell>{item.productName}</TableCell>
                                  <TableCell className="text-right">{item.summaryQuantity} {item.unit}</TableCell>
                                  <TableCell className="text-right w-32">
                                    <Input
                                        type="number"
                                        value={item.quantityReturned}
                                        onChange={(e) => handleProductReturnChange(item.productId, e.target.value)}
                                        className="text-right"
                                      />
                                  </TableCell>
                                  <TableCell className="text-right">{soldQty} {item.unit}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(item.pricePerUnit)}</TableCell>
                                  <TableCell className="text-right font-medium">{formatCurrency(total)}</TableCell>
                                  <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveLedgerItem(item.productId)} disabled={isFromSummary}>
                                      <Trash2 className="h-4 w-4 text-destructive"/>
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              )})}
                            </React.Fragment>
                          ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center h-24">{t.noProducts[language]}</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle>{t.rewards[language]}</CardTitle>
                 <Dialog open={isCustomRewardDialogOpen} onOpenChange={(open) => { if(!open) resetCustomRewardDialog(); setIsCustomRewardDialogOpen(open); }}>
                    <DialogTrigger asChild>
                       <Button variant="outline"><Gift className="mr-2 h-4 w-4" />{t.addCustomReward[language]}</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{t.addCustomReward[language]}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid gap-2">
                               <Label>{t.reward[language]}</Label>
                               <Select value={customRewardSelection} onValueChange={handleRewardSelectionChange}>
                                 <SelectTrigger><SelectValue placeholder={t.selectOrEnterReward[language]}/></SelectTrigger>
                                 <SelectContent>
                                    <SelectItem value="manual">{t.enterManually[language]}</SelectItem>
                                    <Separator />
                                    {rewards.map(r => (
                                        <SelectItem key={r.id} value={String(r.id)} disabled={r.quantity <= 0 || ledgerRewards.some(lr => lr.rewardId === r.id)}>
                                            <div className="flex justify-between w-full items-center">
                                                <span>{r.name}</span>
                                                <span className={cn("text-xs font-medium ml-4", r.quantity > 0 ? 'text-green-600' : 'text-destructive')}>
                                                    {r.quantity} {r.unit}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                 </SelectContent>
                               </Select>
                            </div>
                            {customRewardSelection && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2"><Label>{t.name[language]}</Label><Input value={finalRewardName} onChange={e => setCustomRewardNameInput(e.target.value)} disabled={!isManualReward} /></div>
                                        <div className="grid gap-2"><Label>{t.unit[language]}</Label><Select value={customRewardUnitInput} onValueChange={setCustomRewardUnitInput} disabled={!isManualReward}><SelectTrigger><SelectValue placeholder={t.selectUnit[language]}/></SelectTrigger><SelectContent>{quantityUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="grid gap-2"><Label>{t.purchasePrice[language]}</Label><Input type="number" value={customRewardPurchasePrice} onChange={e => setCustomRewardPurchasePrice(e.target.value)} disabled={!isManualReward} placeholder="0.00" /></div>
                                        <div className="grid gap-2"><Label>{t.profitMargin[language]}</Label><Input type="number" value={customRewardProfitMargin} onChange={e => setCustomRewardProfitMargin(e.target.value)} disabled={!isManualReward} placeholder="0" /></div>
                                        <div className="grid gap-2"><Label>{t.sellingPrice[language]}</Label><Input type="number" value={customRewardSellingPrice} onChange={e => setCustomRewardSellingPrice(e.target.value)} placeholder="0.00"/></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 items-end">
                                      <div className="grid gap-2">
                                          <Label>{t.summaryField[language]}</Label>
                                          <Input type="number" value={customRewardSummaryQty} onChange={e => setCustomRewardSummaryQty(e.target.value)} placeholder="0"/>
                                          {isRewardStockInsufficient && <p className="text-xs text-destructive">{t.notEnoughStock[language]}</p>}
                                      </div>
                                      {!isManualReward && selectedRewardDetails ? (
                                        <div className={cn("text-lg text-right font-semibold", isRewardStockInsufficient ? 'text-destructive' : 'text-green-600')}>
                                            <div className="text-sm font-medium text-muted-foreground">{t.stock[language]}</div>
                                            <span>{displayRewardStock.quantity} {selectedRewardDetails.unit}</span>
                                        </div>
                                      ) : <div/>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div className="grid gap-2">
                                          <Label>{t.returned[language]}</Label>
                                          <Input type="number" value={customRewardReturnedQty} onChange={e => setCustomRewardReturnedQty(e.target.value)} placeholder="0"/>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div className="grid gap-2">
                                            <Label>{t.sold[language]}</Label>
                                            <Input value={customRewardSoldQty} readOnly disabled />
                                        </div>
                                         <div className="grid gap-2">
                                            <Label>{t.total[language]}</Label>
                                            <Input value={formatCurrency(customRewardTotalPrice)} readOnly disabled />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="secondary">{t.cancel[language]}</Button></DialogClose>
                            <Button onClick={handleAddCustomReward} disabled={isRewardStockInsufficient}>{t.addReward[language]}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {ledgerRewards.length > 0 ? (
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>{t.reward[language]}</TableHead>
                              <TableHead className="text-right">{t.summaryField[language]}</TableHead>
                              <TableHead className="text-right">{t.returned[language]}</TableHead>
                              <TableHead className="text-right">{t.sold[language]}</TableHead>
                              <TableHead className="text-right">{t.pricePerUnit[language]}</TableHead>
                              <TableHead className="text-right">{t.total[language]}</TableHead>
                              <TableHead className="text-right"></TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {ledgerRewards.map(item => {
                            const soldQty = isFromSummary ? (item.summaryQuantity - item.quantityReturned) : item.quantitySold;
                            const total = isFromSummary ? (soldQty * item.pricePerUnit) : item.totalPrice;
                            return (
                              <TableRow key={item.rewardId}>
                                  <TableCell>
                                    {item.rewardName}
                                    {item.mainProductName ? (
                                      <span className="text-xs text-muted-foreground block">(For {item.mainProductName})</span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground block">({t.custom[language]})</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">{item.summaryQuantity} {item.unit}</TableCell>
                                  <TableCell className="text-right w-32">
                                      <Input
                                          type="number"
                                          value={item.quantityReturned}
                                          onChange={(e) => handleRewardReturnChange(item.rewardId, e.target.value)}
                                          className="text-right"
                                      />
                                  </TableCell>
                                  <TableCell className="text-right">{soldQty} {item.unit}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(item.pricePerUnit)}</TableCell>
                                  <TableCell className="text-right font-medium">{formatCurrency(total)}</TableCell>
                                  <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenEditRewardDialog(item)} disabled={isFromSummary}><Edit className="h-4 w-4"/></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveRewardItem(item.rewardId)} disabled={isFromSummary}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                  </TableCell>
                              </TableRow>
                          )})}
                      </TableBody>
                  </Table>
                ) : (
                    <div className="text-center h-24 flex items-center justify-center text-muted-foreground">
                        <p>{t.noRewards[language]}</p>
                    </div>
                )}
              </CardContent>
            </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>{t.damagedProducts[language]}</CardTitle>
                <Dialog open={isDamagedProductSelectionOpen} onOpenChange={setIsDamagedProductSelectionOpen}>
                    <DialogTrigger asChild>
                       <Button variant="outline"><ShieldX className="mr-2 h-4 w-4" />{t.addDamagedProduct[language]}</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{t.selectProduct[language]}</DialogTitle>
                        </DialogHeader>
                         <div className="py-4">
                           <div className="border rounded-md p-2 h-[60vh] overflow-y-auto">
                                {products.length > 0 ? (
                                    <Tabs defaultValue={groupedProducts[0]?.[0]} className="w-full">
                                        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 gap-1 h-auto mb-2">
                                            {groupedProducts.map(([company]) => (
                                                <TabsTrigger key={company} value={company}>{company}</TabsTrigger>
                                            ))}
                                        </TabsList>
                                        {groupedProducts.map(([company, companyProducts]) => (
                                            <TabsContent key={company} value={company}>
                                                <div className="space-y-1">
                                                    {companyProducts.map(p => (
                                                        <button
                                                            key={p.id}
                                                            onClick={() => {
                                                                handleDamagedProductSelect(p);
                                                                setIsDamagedProductSelectionOpen(false);
                                                                setIsDamagedQuantityDialogOpen(true);
                                                            }}
                                                            className="w-full text-left p-2 rounded-md hover:bg-accent flex items-center justify-between text-sm"
                                                        >
                                                            <span>{p.name}</span>
                                                             <span className={cn("text-xs font-medium", p.quantity > 0 ? 'text-green-600' : 'text-destructive')}>
                                                                {formatProductQuantity(p)}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </TabsContent>
                                        ))}
                                    </Tabs>
                                ) : (
                                    <div className="p-4 text-sm text-center text-muted-foreground flex items-center justify-center h-full">
                                        {t.noProducts[language]}
                                    </div>
                                )}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t.product[language]}</TableHead>
                            <TableHead className="text-right">{t.quantity[language]}</TableHead>
                            <TableHead className="text-right">{t.pricePerUnit[language]}</TableHead>
                            <TableHead className="text-right">{t.total[language]}</TableHead>
                            <TableHead className="text-right"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {groupedDamagedItems.length > 0 ? (
                            groupedDamagedItems.map(([company, items]) => (
                                <React.Fragment key={company}>
                                    <TableRow className="border-b-0 bg-primary/10 hover:bg-primary/10">
                                        <TableCell colSpan={5} className="font-bold text-primary py-2 px-4">
                                            {company}
                                        </TableCell>
                                    </TableRow>
                                    {items.map(item => (
                                        <TableRow key={item.productId}>
                                            <TableCell>{item.productName}</TableCell>
                                            <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.pricePerUnit)}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveDamagedItem(item.productId)}>
                                                    <Trash2 className="h-4 w-4 text-destructive"/>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </React.Fragment>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">{t.noDamagedProducts[language]}</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                     {damagedItems.length > 0 && (
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={3} className="text-right font-bold">{t.totalDamaged[language]}</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(totalDamaged)}</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </TableFooter>
                    )}
                </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle>{t.summary[language]}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="space-y-2 rounded-lg border bg-card p-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t.grossSale[language]}</span>
                            <span className="font-medium">{formatCurrency(grossSale)}</span>
                        </div>
                        {totalRewardsValue > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">(+) {t.reward[language]}</span>
                                <span className="font-medium">{formatCurrency(totalRewardsValue)}</span>
                            </div>
                        )}
                        {totalDamaged > 0 && (
                            <div className="flex justify-between text-sm text-destructive">
                                <span className="text-muted-foreground">(-) {t.totalDamaged[language]}</span>
                                <span className="font-medium">{formatCurrency(totalDamaged)}</span>
                            </div>
                        )}
                        <Separator className="my-2 bg-muted-foreground/20" />
                        <div className="flex justify-between font-semibold text-lg">
                            <span>{t.netSale[language]}</span>
                            <span>{formatCurrency(totalSale)}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="paidAmount">{t.paidAmount[language]}</Label>
                            <Input id="paidAmount" type="number" placeholder="0.00" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.dueAmount[language]}</Label>
                            <p className={cn("text-xl font-bold pt-2", amountDue > 0 ? 'text-destructive' : 'text-green-600')}>{formatCurrency(amountDue)}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="grid gap-2">
                            <Label htmlFor="commission">{t.commission[language]}</Label>
                            <Input id="commission" type="number" placeholder="0.00" value={commissionAmount} onChange={e => setCommissionAmount(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="due-assigned">{t.dueAssignedTo[language]}</Label>
                            <Select value={dueAssignedTo} onValueChange={setDueAssignedTo}>
                                <SelectTrigger id="due-assigned"><SelectValue placeholder={t.selectSalesperson[language]} /></SelectTrigger>
                                <SelectContent>
                                    {employees.map(emp => <SelectItem key={emp.id} value={String(emp.id)}>{emp.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="commission-assigned">{t.commissionAssignedTo[language]}</Label>
                        <Select value={commissionAssignedTo} onValueChange={setCommissionAssignedTo}>
                            <SelectTrigger id="commission-assigned"><SelectValue placeholder={t.selectSalesperson[language]} /></SelectTrigger>
                            <SelectContent>
                                {employees.map(emp => <SelectItem key={emp.id} value={String(emp.id)}>{emp.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="note">{t.note[language]}</Label>
                    <Textarea 
                        id="note" 
                        value={note} 
                        onChange={e => setNote(e.target.value)}
                        className="h-full min-h-[150px]"
                        placeholder={t.notePlaceholder[language]}
                    />
                </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 mt-4">
            <Button variant="outline" size="lg" onClick={() => router.push('/ledger')}>{t.cancel[language]}</Button>
            <Button size="lg" onClick={prepareAndShowSmsConfirmation} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.save[language]}
            </Button>
          </div>
        </div>
      </div>

      {/* Quantity Dialog */}
      <Dialog open={isQuantityDialogOpen} onOpenChange={(open) => {
          if (!open) resetAddProductDialog();
          setIsQuantityDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{selectedProduct?.name || t.addProduct[language]}</DialogTitle>
                {selectedProduct && (
                    <div className="flex justify-between items-center pt-2">
                         <DialogDescription>
                            {t.quantityDesc[language]}
                        </DialogDescription>
                         <div className={cn("text-lg font-semibold", isProductStockInsufficient ? 'text-destructive' : 'text-green-600')}>
                            <span className="text-sm font-medium text-muted-foreground">{t.stock[language]}: </span>
                            <span>{formatDetailedStock(displayStock.quantity, selectedProduct)}</span>
                        </div>
                    </div>
                )}
            </DialogHeader>
            <div className="space-y-4 py-4">
                {selectedProduct ? (
                    <>
                         <div className="grid grid-cols-2 gap-4 items-end">
                            <div className="grid gap-2">
                                <Label htmlFor="summary-qty">{t.summaryField[language]}</Label>
                                <Input id="summary-qty" type="number" value={summaryQuantity} onChange={(e) => setSummaryQuantity(e.target.value)} placeholder="0"/>
                                {isProductStockInsufficient && <p className="text-xs text-destructive">{t.notEnoughStock[language]}</p>}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>{t.unit[language]}</Label>
                                <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                                    <SelectTrigger><SelectValue placeholder={t.selectUnit[language]} /></SelectTrigger>
                                    <SelectContent>
                                        {availableUnits.map(unit => (
                                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="pricePerUnit">
                                  {language === 'bn' 
                                      ? `প্রতি ${selectedUnit || 'একক'} এর মূল্য` 
                                      : `Price / ${selectedUnit || 'Unit'}`
                                  }
                                </Label>
                                <Input id="pricePerUnit" value={formatCurrency(Number(pricePerUnit))} readOnly disabled />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="qty-returned">{t.returned[language]}</Label>
                                <Input id="qty-returned" type="number" value={quantityReturned} onChange={(e) => setQuantityReturned(e.target.value)} placeholder="0"/>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="qty-sold">{t.sold[language]}</Label>
                                <Input id="qty-sold" type="number" value={quantitySold} placeholder="0" readOnly disabled/>
                            </div>
                        </div>
                    </>
                ) : null}
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={() => setIsQuantityDialogOpen(false)}>{t.cancel[language]}</Button>
                <Button onClick={handleAddProductToLedger} disabled={!selectedProduct || isProductStockInsufficient}>{t.addProduct[language]}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
       {/* Edit Reward Dialog */}
       <Dialog open={isEditRewardDialogOpen} onOpenChange={(open) => { if (!open) setEditingReward(null); setIsEditRewardDialogOpen(open); }}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t.editReward[language]}</DialogTitle>
                <DialogDescription>{editingReward?.rewardName}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label>{t.summaryField[language]}</Label>
                        <Input type="number" value={editRewardSummaryQty} onChange={e => setEditRewardSummaryQty(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label>{t.returned[language]}</Label>
                        <Input type="number" value={editRewardReturnedQty} onChange={e => setEditRewardReturnedQty(e.target.value)} />
                    </div>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="secondary">{t.cancel[language]}</Button></DialogClose>
                <Button onClick={handleUpdateReward}>{t.updateReward[language]}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Damaged Product Quantity Dialog */}
      <Dialog open={isDamagedQuantityDialogOpen} onOpenChange={(open) => {
          if (!open) resetDamagedProductDialog();
          setIsDamagedQuantityDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{damagedProduct?.name || t.addDamagedProduct[language]}</DialogTitle>
                {damagedProduct && (
                    <div className="flex justify-between items-center pt-2">
                        <DialogDescription>
                            {t.quantityDesc[language]}
                        </DialogDescription>
                        <div className={cn("text-lg font-semibold", isDamagedStockInsufficient ? 'text-destructive' : 'text-green-600')}>
                            <span className="text-sm font-medium text-muted-foreground">{t.stock[language]}: </span>
                            <span>{formatDetailedStock(displayDamagedStock.quantity, damagedProduct)}</span>
                        </div>
                    </div>
                )}
            </DialogHeader>
            <div className="space-y-4 py-4">
                {damagedProduct ? (
                    <>
                        <div className="grid grid-cols-2 gap-4 items-end">
                            <div className="grid gap-2">
                                <Label htmlFor="damaged-qty">{t.quantity[language]}</Label>
                                <Input id="damaged-qty" type="number" value={damagedQuantity} onChange={(e) => setDamagedQuantity(e.target.value)} placeholder="0"/>
                                {isDamagedStockInsufficient && <p className="text-xs text-destructive">{t.notEnoughStock[language]}</p>}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>{t.unit[language]}</Label>
                                <Select value={damagedUnit} onValueChange={setDamagedUnit}>
                                    <SelectTrigger><SelectValue placeholder={t.selectUnit[language]} /></SelectTrigger>
                                    <SelectContent>
                                        {availableUnitsForDamaged.map(unit => (
                                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="grid gap-2">
                                <Label htmlFor="damagedPricePerUnit">
                                  {language === 'bn' 
                                      ? `প্রতি ${damagedUnit || 'একক'} এর ক্রয়মূল্য` 
                                      : `Purchase Price / ${damagedUnit || 'Unit'}`
                                  }
                                </Label>
                                <Input id="damagedPricePerUnit" value={damagedPricePerUnit} onChange={(e) => setDamagedPricePerUnit(e.target.value)} type="number" />
                            </div>
                        </div>
                    </>
                ) : null}
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={() => setIsDamagedQuantityDialogOpen(false)}>{t.cancel[language]}</Button>
                <Button onClick={handleAddDamagedItem} disabled={!damagedProduct || isDamagedStockInsufficient}>{t.addDamagedProduct[language]}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* SMS Confirmation Dialog */}
      <Dialog open={isSmsConfirmDialogOpen} onOpenChange={setIsSmsConfirmDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.smsConfirmTitle[language]}</DialogTitle>
            <DialogDescription>{t.smsConfirmDesc[language]}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-4 p-1">
            {smsNotifications.map((notification, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {notification.employeeName} - {notification.type} ({formatCurrency(notification.newAmount)})
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
