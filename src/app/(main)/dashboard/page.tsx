
"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/language-context";
import { AlertTriangle, Printer, Eye, EyeOff } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { format } from "date-fns";


// Types
type Company = { name: string; profitMargin: number; };
type Product = {
  id: number;
  name: string;
  company: string;
  purchasePrice: number;
  quantity: number;
  quantityUnit: string;
  largerUnit?: string;
  conversionFactor?: number;
};

type LedgerItem = {
  productId: number;
  unit: string;
  quantitySold: number;
  totalPrice: number;
};

type LedgerRewardItem = {
  rewardId: number;
  rewardName: string;
  mainProductId?: number;
  mainProductName?: string;
  unit: string;
  pricePerUnit: number; // Selling Price
  purchasePricePerUnit?: number;
  summaryQuantity: number;
  quantityReturned: number;
  quantitySold: number;
  totalPrice: number; // Total Selling Price
};

type LedgerEntry = {
  id: number;
  date: string; // Format: "YYYY-MM-DD"
  items: LedgerItem[];
  rewardItems?: LedgerRewardItem[];
  totalSale: number;
  commission: number;
};

type Employee = {
    id: number;
    name: string;
};

type ReceivableTransaction = {
    employeeId: number;
    type: 'due' | 'payment';
    amount: number;
};

type EmployeeDue = {
    id: number;
    name: string;
    balance: number;
};

type PurchaseOrderItem = {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  purchasePrice: number;
  totalPrice: number;
  availableUnits: string[];
  basePurchasePrice: number; // Price of the larger unit
  baseUnit: string;
  smallerUnit?: string;
  conversion: number;
};

type ProfileSettings = {
  businessName: string;
  ownerName: string;
  mobile: string;
  email: string;
};

type Reward = {
  id: number;
  pricePerUnit: number; // This is purchase price
};

type DailySale = {
  date: string;
  totalSale: number;
};

const formatCurrency = (amount: number) => `৳${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;
const formatChartCurrency = (value: number) => {
  if (value >= 1000000) {
    return `৳${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `৳${(value / 1000).toFixed(0)}K`;
  }
  return `৳${value}`;
};


type ProfitCardProps = {
  title: string;
  data: { title: { en: string; bn: string }; amount: number }[];
  isVisible: boolean;
  onToggle: () => void;
  language: 'en' | 'bn';
};

const ProfitCard = ({ title, data, isVisible, onToggle, language }: ProfitCardProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8">
          {isVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </Button>
      </CardHeader>
      <CardContent className={cn("p-0 transition-all", !isVisible && "blur-md select-none pointer-events-none")}>
        <div className="grid grid-cols-2">
          <div className="p-4 border-r border-b">
            <p className="text-sm text-muted-foreground">{data[0].title[language]}</p>
            <p className="text-2xl font-bold text-primary"><AnimatedNumber value={data[0].amount} formatter={formatCurrency} start={isVisible}/></p>
          </div>
          <div className="p-4 border-b">
            <p className="text-sm text-muted-foreground">{data[1].title[language]}</p>
            <p className="text-2xl font-bold text-primary"><AnimatedNumber value={data[1].amount} formatter={formatCurrency} start={isVisible}/></p>
          </div>
          <div className="p-4 border-r">
            <p className="text-sm text-muted-foreground">{data[2].title[language]}</p>
            <p className="text-2xl font-bold text-primary"><AnimatedNumber value={data[2].amount} formatter={formatCurrency} start={isVisible}/></p>
          </div>
          <div className="p-4">
            <p className="text-sm text-muted-foreground">{data[3].title[language]}</p>
            <p className="text-2xl font-bold text-primary"><AnimatedNumber value={data[3].amount} formatter={formatCurrency} start={isVisible}/></p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


export default function DashboardPage() {
  const { language } = useLanguage();
  const currentLanguage = language;

  // Filter state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');

  // Data state
  const [salesData, setSalesData] = useState({ today: 0, yesterday: 0, thisMonth: 0, lastMonth: 0 });
  const [profitData, setProfitData] = useState({ today: 0, yesterday: 0, thisMonth: 0, lastMonth: 0 });
  const [rewardProfitData, setRewardProfitData] = useState({ today: 0, yesterday: 0, thisMonth: 0, lastMonth: 0 });
  const [employeeDues, setEmployeeDues] = useState<EmployeeDue[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [dailySales, setDailySales] = useState<DailySale[]>([]);
  const [isProfitVisible, setIsProfitVisible] = useState(false);
  
  // Purchase Order Dialog State
  const [isPoDialogOpen, setIsPoDialogOpen] = useState(false);
  const [selectedPoCompany, setSelectedPoCompany] = useState('');
  const [purchaseOrderItems, setPurchaseOrderItems] = useState<PurchaseOrderItem[]>([]);
  const [profile, setProfile] = useState<Partial<ProfileSettings>>({});
  
  const chartConfig = {
    totalSale: {
      label: language === 'bn' ? "বিক্রয়" : "Sales",
      color: "hsl(var(--primary))",
    },
  } satisfies React.ComponentProps<typeof ChartContainer>["config"];


  useEffect(() => {
    try {
      const storedProfile = localStorage.getItem('profile-settings');
      if (storedProfile) setProfile(JSON.parse(storedProfile));
    } catch(e) { console.error(e) }

    const calculateMetrics = () => {
      const ledgers: LedgerEntry[] = JSON.parse(localStorage.getItem('ledger-transactions') || '[]');
      const products: Product[] = JSON.parse(localStorage.getItem('products') || '[]');
      const storedCompanies: Company[] = JSON.parse(localStorage.getItem('product-companies') || '[]');
      const allEmployees: Employee[] = JSON.parse(localStorage.getItem('employees') || '[]');
      const receivables: ReceivableTransaction[] = JSON.parse(localStorage.getItem('receivable-transactions') || '[]');
      const allRewards: Reward[] = JSON.parse(localStorage.getItem('rewards-list') || '[]');
      
      setCompanies(storedCompanies);
      setAllProducts(products);

      // --- Global Calculations (Unaffected by Company Filter) ---
      const employeeBalancesMap = new Map<number, number>();
      allEmployees.forEach(emp => employeeBalancesMap.set(emp.id, 0));
      receivables.forEach(txn => {
          let currentBalance = employeeBalancesMap.get(txn.employeeId) || 0;
          if (txn.type === 'due') {
              currentBalance += txn.amount;
          } else {
              currentBalance -= txn.amount;
          }
          employeeBalancesMap.set(txn.employeeId, currentBalance);
      });
      const duesData = allEmployees
          .map(emp => ({
              id: emp.id,
              name: emp.name,
              balance: employeeBalancesMap.get(emp.id) || 0
          }))
          .filter(emp => emp.balance > 0)
          .sort((a, b) => b.balance - a.balance);
      setEmployeeDues(duesData);

      // --- Filtered Calculations (Affected by Company Filter) ---
      const productsForFilter = selectedCompany === 'all'
        ? products
        : products.filter(p => p.company === selectedCompany);
      
      const lowStock = productsForFilter.filter(p => p.quantity <= 0);
      setLowStockProducts(lowStock);
      
      const ledgersToConsider = selectedCompany === 'all' 
        ? ledgers
        : ledgers.filter(ledger => 
            ledger.items.some(item => {
                const product = products.find(p => p.id === item.productId);
                return product?.company === selectedCompany;
            })
        );
      
      const dailySalesMap = new Map<string, number>();

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toLocaleDateString('en-CA');
      
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('en-CA');
      
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      const lastMonthDate = new Date(today);
      lastMonthDate.setMonth(today.getMonth() - 1);
      const lastMonth = lastMonthDate.getMonth();
      const lastMonthYear = lastMonthDate.getFullYear();

      ledgersToConsider.forEach(ledger => {
        const entryDate = new Date(ledger.date + 'T00:00:00');
        const entryDateStr = ledger.date;

        const itemsToConsider = selectedCompany === 'all'
          ? ledger.items
          : ledger.items.filter(item => {
              const product = products.find(p => p.id === item.productId);
              return product?.company === selectedCompany;
            });
        
        let saleForLedger = 0;

        if (itemsToConsider.length > 0) {
            saleForLedger = itemsToConsider.reduce((sum, item) => sum + item.totalPrice, 0);
        }
        
        let rewardSaleForLedger = 0;
        if (ledger.rewardItems) {
            const rewardItemsToConsider = ledger.rewardItems.filter(rewardItem => {
                if (selectedCompany === 'all') return true;
                if (rewardItem.mainProductId) {
                    const mainProduct = products.find(p => p.id === rewardItem.mainProductId);
                    return mainProduct?.company === selectedCompany;
                }
                return false;
            });
            rewardSaleForLedger = rewardItemsToConsider.reduce((sum, item) => sum + item.totalPrice, 0);
        }
        const totalSaleForLedger = saleForLedger + rewardSaleForLedger;

        const currentDailySale = dailySalesMap.get(entryDateStr) || 0;
        dailySalesMap.set(entryDateStr, currentDailySale + totalSaleForLedger);
      });

      const salesArray: DailySale[] = Array.from(dailySalesMap.entries()).map(([date, totalSale]) => ({
        date,
        totalSale
      }));
      salesArray.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const last30DaysSales = salesArray.slice(-30);
      setDailySales(last30DaysSales);

      if (!ledgers.length) {
        setSalesData({ today: 0, yesterday: 0, thisMonth: 0, lastMonth: 0 });
        setProfitData({ today: 0, yesterday: 0, thisMonth: 0, lastMonth: 0 });
        setRewardProfitData({ today: 0, yesterday: 0, thisMonth: 0, lastMonth: 0 });
        return;
      }

      const productMap = new Map<number, Product>(products.map(p => [p.id, p]));
      const rewardMap = new Map<number, Reward>(allRewards.map(r => [r.id, r]));

      let todaySales = 0, yesterdaySales = 0, thisMonthSales = 0, lastMonthSales = 0;
      let todayProfit = 0, yesterdayProfit = 0, thisMonthProfit = 0, lastMonthProfit = 0;
      let todayRewardProfit = 0, yesterdayRewardProfit = 0, thisMonthRewardProfit = 0, lastMonthRewardProfit = 0;

      ledgers.forEach(ledger => {
        const entryDate = new Date(ledger.date + 'T00:00:00');
        const entryDateStr = ledger.date;

        const itemsToConsider = selectedCompany === 'all'
          ? ledger.items
          : ledger.items.filter(item => {
              const product = productMap.get(item.productId);
              return product?.company === selectedCompany;
            });
        
        let saleForLedger = 0;
        let profitForLedger = 0;

        if (itemsToConsider.length > 0) {
            saleForLedger = itemsToConsider.reduce((sum, item) => sum + item.totalPrice, 0);
            
            profitForLedger = itemsToConsider.reduce((sum, item) => {
              const product = productMap.get(item.productId);
              if (!product) {
                  return sum;
              }
          
              let itemPurchaseCost = 0;
              // Check if the item was sold in the smaller unit (product.largerUnit).
              if (product.largerUnit && product.conversionFactor && item.unit === product.largerUnit) {
                  const purchasePricePerSmallerUnit = product.purchasePrice / product.conversionFactor;
                  itemPurchaseCost = item.quantitySold * purchasePricePerSmallerUnit;
              } else {
                  // Assume it was sold in the larger unit (product.quantityUnit).
                  itemPurchaseCost = item.quantitySold * product.purchasePrice;
              }
          
              const itemProfit = item.totalPrice - itemPurchaseCost;
              return sum + itemProfit;
            }, 0);
        }
        
        const netProfit = profitForLedger;

        let rewardProfitForLedger = 0;
        let rewardSaleForLedger = 0;

        if (ledger.rewardItems) {
            const rewardItemsToConsider = ledger.rewardItems.filter(rewardItem => {
                if (selectedCompany === 'all') return true;
                if (rewardItem.mainProductId) {
                    const mainProduct = productMap.get(rewardItem.mainProductId);
                    return mainProduct?.company === selectedCompany;
                }
                // For custom rewards without a main product, only include if 'All Companies' is selected
                return false;
            });

            rewardSaleForLedger = rewardItemsToConsider.reduce((sum, item) => sum + item.totalPrice, 0);
            
            rewardProfitForLedger = rewardItemsToConsider.reduce((sum, rewardItem) => {
                let itemPurchasePrice = 0;
                // For custom/manual rewards, purchase price is stored on the item itself
                if (rewardItem.purchasePricePerUnit !== undefined) {
                    itemPurchasePrice = rewardItem.purchasePricePerUnit;
                } else {
                    // For standard rewards from the list, get it from the main rewards list
                    const originalReward = rewardMap.get(rewardItem.rewardId);
                    if (originalReward) {
                        itemPurchasePrice = originalReward.pricePerUnit; // In rewards-list, pricePerUnit is purchase price
                    } else {
                        return sum; // Cannot calculate profit if we don't know the purchase price
                    }
                }
                
                const purchaseCost = rewardItem.quantitySold * itemPurchasePrice;
                const saleValue = rewardItem.totalPrice; // This is already quantitySold * sellingPrice
                const profit = saleValue - purchaseCost;
                return sum + profit;
            }, 0);
        }

        const totalSaleForLedger = saleForLedger + rewardSaleForLedger;
        
        if (entryDateStr === todayStr) {
          todaySales += totalSaleForLedger;
          todayProfit += netProfit;
          todayRewardProfit += rewardProfitForLedger;
        }
        if (entryDateStr === yesterdayStr) {
          yesterdaySales += totalSaleForLedger;
          yesterdayProfit += netProfit;
          yesterdayRewardProfit += rewardProfitForLedger;
        }
        if (entryDate.getFullYear() === currentYear && entryDate.getMonth() === currentMonth) {
          thisMonthSales += totalSaleForLedger;
          thisMonthProfit += netProfit;
          thisMonthRewardProfit += rewardProfitForLedger;
        }
        if (entryDate.getFullYear() === lastMonthYear && entryDate.getMonth() === lastMonth) {
          lastMonthSales += totalSaleForLedger;
          lastMonthProfit += netProfit;
          lastMonthRewardProfit += rewardProfitForLedger;
        }
      });
      
      setSalesData({ today: todaySales, yesterday: yesterdaySales, thisMonth: thisMonthSales, lastMonth: lastMonthSales });
      setProfitData({ today: todayProfit, yesterday: yesterdayProfit, thisMonth: thisMonthProfit, lastMonth: lastMonthProfit });
      setRewardProfitData({ today: todayRewardProfit, yesterday: yesterdayRewardProfit, thisMonth: thisMonthRewardProfit, lastMonth: lastMonthRewardProfit });
    };

    calculateMetrics();
  }, [selectedCompany]);

  useEffect(() => {
    if (!selectedPoCompany) {
      setPurchaseOrderItems([]);
      return;
    }
    const items = allProducts
      .filter(p => p.company === selectedPoCompany && p.quantity <= 0)
      .map(p => {
        const availableUnits = [p.quantityUnit];
        if (p.largerUnit) availableUnits.push(p.largerUnit);
        return {
          id: p.id,
          name: p.name,
          quantity: 1,
          unit: p.quantityUnit,
          purchasePrice: p.purchasePrice,
          totalPrice: 1 * p.purchasePrice,
          availableUnits: availableUnits,
          basePurchasePrice: p.purchasePrice,
          baseUnit: p.quantityUnit,
          smallerUnit: p.largerUnit,
          conversion: p.conversionFactor || 1,
        };
      });
    setPurchaseOrderItems(items);
  }, [selectedPoCompany, allProducts]);

  const handlePoItemChange = (productId: number, field: 'quantity' | 'purchasePrice' | 'unit', value: string | number) => {
    setPurchaseOrderItems(prevItems => prevItems.map(item => {
      if (item.id === productId) {
        const newItem = { ...item };
        if (field === 'unit') {
          newItem.unit = String(value);
          if (newItem.unit === newItem.smallerUnit) {
            newItem.purchasePrice = newItem.basePurchasePrice / newItem.conversion;
          } else {
            newItem.purchasePrice = newItem.basePurchasePrice;
          }
        } else {
          (newItem as any)[field] = Number(value);
        }
        newItem.totalPrice = newItem.quantity * newItem.purchasePrice;
        return newItem;
      }
      return item;
    }));
  };

  const totalPoAmount = useMemo(() => {
    return purchaseOrderItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [purchaseOrderItems]);

  const handlePrint = () => {
    window.print();
  };

  const salesCardsData = [
    { title: { en: "Today's Sales", bn: "আজকের বিক্রয়" }, amount: salesData.today },
    { title: { en: "Yesterday's Sales", bn: "গতকালকের বিক্রয়" }, amount: salesData.yesterday },
    { title: { en: "This Month's Sales", bn: "চলতি মাসের বিক্রয়" }, amount: salesData.thisMonth },
    { title: { en: "Last Month's Sales", bn: "গতমাসের বিক্রয়" }, amount: salesData.lastMonth },
  ];

  const profitCardsData = [
    { title: { en: "Today's Profit", bn: "আজকের লাভ" }, amount: profitData.today },
    { title: { en: "Yesterday's Profit", bn: "গতকালকের লাভ" }, amount: profitData.yesterday },
    { title: { en: "This Month's Profit", bn: "চলতি মাসের লাভ" }, amount: profitData.thisMonth },
    { title: { en: "Last Month's Profit", bn: "গতমাসের লাভ" }, amount: profitData.lastMonth },
  ];
  
  const rewardProfitCardsData = [
    { title: { en: "Today's Profit", bn: "আজকের লাভ" }, amount: rewardProfitData.today },
    { title: { en: "Yesterday's Profit", bn: "গতকালকের লাভ" }, amount: rewardProfitData.yesterday },
    { title: { en: "This Month's Profit", bn: "চলতি মাসের লাভ" }, amount: rewardProfitData.thisMonth },
    { title: { en: "Last Month's Profit", bn: "গতমাসের লাভ" }, amount: rewardProfitData.lastMonth },
  ];

  const t = {
    poTitle: { en: "Purchase Order", bn: "ক্রয় আদেশ" },
    selectCompanyPo: { en: "Select a company to generate PO", bn: "ক্রয় আদেশ তৈরির জন্য কোম্পানি নির্বাচন করুন" },
    supplier: { en: "Supplier", bn: "সরবরাহকারী" },
    date: { en: "Date", bn: "তারিখ" },
    productName: { en: "Product Name", bn: "পণ্যের নাম" },
    quantity: { en: "Quantity", bn: "পরিমাণ" },
    unit: { en: "Unit", bn: "একক" },
    pricePerUnit: { en: "Price/Unit", bn: "প্রতি এককের মূল্য" },
    totalPrice: { en: "Total Price", bn: "মোট মূল্য" },
    grandTotal: { en: "Grand Total", bn: "সর্বমোট" },
    print: { en: "Print", bn: "প্রিন্ট" },
    cancel: { en: "Cancel", bn: "বাতিল" },
    salesChartTitle: { en: "Last 30 Days Sales", bn: "গত ৩০ দিনের বিক্রয়" },
    salesChartDesc: { en: "A visual summary of daily sales performance.", bn: "দৈনিক বিক্রয় পারফরম্যান্সের একটি ভিজ্যুয়াল সারসংক্ষেপ।" },
  };


  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">
          {language === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard'}
        </h1>
        <div className="flex items-center gap-2">
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger id="company-filter" className="w-full sm:w-[200px]">
                    <SelectValue placeholder={language === 'bn' ? 'কোম্পানি নির্বাচন' : 'Select Company'} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{language === 'bn' ? 'সকল কোম্পানি' : 'All Companies'}</SelectItem>
                    {companies.map(company => (
                        <SelectItem key={company.name} value={company.name}>{company.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Card */}
        <Card>
          <CardHeader>
            <CardTitle>{language === 'bn' ? 'বিক্রয়' : 'Sales'}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-2">
              <div className="p-4 border-r border-b">
                <p className="text-sm text-muted-foreground">{salesCardsData[0].title[currentLanguage]}</p>
                <p className="text-2xl font-bold text-primary"><AnimatedNumber value={salesCardsData[0].amount} formatter={formatCurrency} /></p>
              </div>
              <div className="p-4 border-b">
                <p className="text-sm text-muted-foreground">{salesCardsData[1].title[currentLanguage]}</p>
                <p className="text-2xl font-bold text-primary"><AnimatedNumber value={salesCardsData[1].amount} formatter={formatCurrency} /></p>
              </div>
              <div className="p-4 border-r">
                <p className="text-sm text-muted-foreground">{salesCardsData[2].title[currentLanguage]}</p>
                <p className="text-2xl font-bold text-primary"><AnimatedNumber value={salesCardsData[2].amount} formatter={formatCurrency} /></p>
              </div>
              <div className="p-4">
                <p className="text-sm text-muted-foreground">{salesCardsData[3].title[currentLanguage]}</p>
                <p className="text-2xl font-bold text-primary"><AnimatedNumber value={salesCardsData[3].amount} formatter={formatCurrency} /></p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profit Card */}
        <ProfitCard
          title={language === 'bn' ? 'পণ্যের লাভ' : 'Product Profit'}
          data={profitCardsData}
          isVisible={isProfitVisible}
          onToggle={() => setIsProfitVisible(prev => !prev)}
          language={currentLanguage}
        />

        {/* Reward's Profit Card */}
        <ProfitCard
          title={language === 'bn' ? 'পুরস্কারের লাভ' : 'Reward\'s Profit'}
          data={rewardProfitCardsData}
          isVisible={isProfitVisible}
          onToggle={() => setIsProfitVisible(prev => !prev)}
          language={currentLanguage}
        />
      </div>

       <Card>
        <CardHeader>
          <CardTitle>{t.salesChartTitle[language]}</CardTitle>
          <CardDescription>{t.salesChartDesc[language]}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart accessibilityLayer data={dailySales} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => format(new Date(value + 'T00:00:00'), "d MMM")}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => formatChartCurrency(value)}
              />
              <Tooltip
                cursor={false}
                content={<ChartTooltipContent
                  formatter={(value) => formatCurrency(value as number)}
                  indicator="dot"
                />}
              />
              <Bar dataKey="totalSale" fill="var(--color-totalSale)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
        <Card>
          <CardHeader>
            <CardTitle>{language === 'bn' ? 'কর্মচারীর বকেয়া' : 'Employee Dues'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
              {employeeDues.length > 0 ? (
                employeeDues.map((employee) => (
                  <Link key={employee.id} href={`/accounts-receivable?employeeId=${employee.id}`} className="block rounded-lg hover:bg-muted transition-colors">
                    <div className="flex items-center justify-between p-3 cursor-pointer">
                      <span className="font-medium">{employee.name}</span>
                      <span className="font-bold text-destructive">{formatCurrency(employee.balance)}</span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-10">{language === 'bn' ? 'কোনো বকেয়া নেই।' : 'No outstanding dues.'}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <CardTitle>{language === 'bn' ? 'স্টক শেষ' : 'Low Stock Alert'}</CardTitle>
              </div>
              <Dialog open={isPoDialogOpen} onOpenChange={setIsPoDialogOpen}>
                  <DialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                          <Printer className="h-5 w-5" />
                      </Button>
                  </DialogTrigger>
                  <DialogContent className="w-full max-w-4xl h-[90vh] md:min-h-[80vh] flex flex-col">
                      <DialogHeader className="no-print">
                          <DialogTitle>{t.poTitle[currentLanguage]}</DialogTitle>
                      </DialogHeader>

                      <div className="no-print space-y-4">
                           <div className="grid gap-2">
                                <Label htmlFor="po-company-select">{t.selectCompanyPo[currentLanguage]}</Label>
                                <Select value={selectedPoCompany} onValueChange={setSelectedPoCompany}>
                                    <SelectTrigger id="po-company-select">
                                        <SelectValue placeholder={t.selectCompanyPo[currentLanguage]} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {companies.map(company => (
                                            <SelectItem key={company.name} value={company.name}>{company.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                      </div>

                      <div className="flex-grow overflow-y-auto" id="printable-po">
                        {selectedPoCompany && (
                          <div className="printable-area p-1">
                            <header className="mb-8">
                                <h1 className="text-2xl font-bold">{profile.businessName || 'Business Name'}</h1>
                                <p>{profile.ownerName}</p>
                                <p>{profile.mobile}</p>
                                <p>{profile.email}</p>
                            </header>
                            <Separator className="my-4"/>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="font-bold">{t.supplier[currentLanguage]}:</h2>
                                    <p>{selectedPoCompany}</p>
                                </div>
                                <div>
                                    <h2 className="font-bold">{t.poTitle[currentLanguage]}</h2>
                                    <p>{t.date[currentLanguage]}: {new Date().toLocaleDateString(currentLanguage === 'bn' ? 'bn-BD' : 'en-CA')}</p>
                                </div>
                            </div>
                            
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t.productName[currentLanguage]}</TableHead>
                                        <TableHead className="text-center">{t.quantity[currentLanguage]}</TableHead>
                                        <TableHead className="text-center">{t.unit[currentLanguage]}</TableHead>
                                        <TableHead className="text-right">{t.pricePerUnit[currentLanguage]}</TableHead>
                                        <TableHead className="text-right">{t.totalPrice[currentLanguage]}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {purchaseOrderItems.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell>
                                                <Input 
                                                    type="number" 
                                                    value={item.quantity} 
                                                    onChange={e => handlePoItemChange(item.id, 'quantity', e.target.value)} 
                                                    className="w-24 text-center mx-auto no-print"
                                                />
                                                <span className="print-only text-center block">{item.quantity}</span>
                                            </TableCell>
                                            <TableCell>
                                                 <Select value={item.unit} onValueChange={val => handlePoItemChange(item.id, 'unit', val)}>
                                                    <SelectTrigger className="w-28 mx-auto no-print">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {item.availableUnits.map(unit => (
                                                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <span className="print-only text-center block">{item.unit}</span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                 <Input 
                                                    type="number" 
                                                    value={item.purchasePrice.toFixed(2)} 
                                                    onChange={e => handlePoItemChange(item.id, 'purchasePrice', e.target.value)} 
                                                    className="w-28 text-right ml-auto no-print"
                                                />
                                                 <span className="print-only text-right block">{formatCurrency(item.purchasePrice)}</span>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            <div className="flex justify-end mt-6">
                                <div className="w-64 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold">{t.grandTotal[currentLanguage]}:</span>
                                        <span className="font-bold text-lg">{formatCurrency(totalPoAmount)}</span>
                                    </div>
                                </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <DialogFooter className="no-print pt-4">
                          <Button variant="outline" onClick={() => setIsPoDialogOpen(false)}>{t.cancel[currentLanguage]}</Button>
                          <Button onClick={handlePrint} disabled={!selectedPoCompany || purchaseOrderItems.length === 0}>
                            <Printer className="mr-2 h-4 w-4"/>{t.print[currentLanguage]}
                          </Button>
                      </DialogFooter>
                  </DialogContent>
              </Dialog>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto pr-2">
            {lowStockProducts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'bn' ? 'পণ্য' : 'Product'}</TableHead>
                    <TableHead>{language === 'bn' ? 'কোম্পানি' : 'Company'}</TableHead>
                    <TableHead className="text-right">{language === 'bn' ? 'পরিমাণ' : 'Quantity'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockProducts.map(product => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.company}</TableCell>
                      <TableCell className="text-right font-bold text-destructive">{product.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-10">{language === 'bn' ? 'সব পণ্যের স্টক রয়েছে।' : 'All products are in stock.'}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
