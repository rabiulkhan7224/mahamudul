
"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlusCircle, Trash2, Loader2, Check, Edit, Gift, Search, Calendar as CalendarIcon, X, MoreHorizontal, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from 'date-fns';
import { useNavigationLoader } from "@/context/navigation-loader-context";


// Types
type Employee = { id: number; name: string; };
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
type Reward = {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  pricePerUnit: number; // This is the purchase price
  sellingPrice: number;
  profitMargin: number;
};
type LedgerRewardItem = {
  rewardId: number;
  rewardName: string;
  mainProductId?: number;
  mainProductName?: string;
  unit: string;
  pricePerUnit: number; // Selling price
  purchasePricePerUnit?: number;
  quantity: number;
  totalPrice: number;
};
// New type for isolated summary
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
type RewardRule = {
    id: number;
    mainProductId: number;
    mainProductQuantity: number;
    mainProductUnit: string;
    rewardId: number;
    rewardQuantity: number;
};

const formatCurrency = (amount: number) => `৳${amount.toFixed(2)}`;

// Main page component
export default function DailySummaryPage() {
    const { language } = useLanguage();
    const router = useRouter();
    const { startLoading } = useNavigationLoader();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [allSummaries, setAllSummaries] = useState<DailySummary[]>(() => {
        if (typeof window === 'undefined') {
            return [];
        }
        try {
            const storedSummaries = localStorage.getItem('daily-summaries');
            const parsedSummaries = storedSummaries ? JSON.parse(storedSummaries) : [];
            // Add default status to old summaries
            return parsedSummaries.map((s: any) => ({ ...s, status: s.status || 'pending' }));
        } catch (error) {
            console.error("Failed to load data from localStorage", error);
            return [];
        }
    });
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [markets, setMarkets] = useState<Market[]>([]);
    const [summaryToDelete, setSummaryToDelete] = useState<DailySummary | null>(null);
    const [editingSummary, setEditingSummary] = useState<DailySummary | null>(null);
    const [loadingLedgerId, setLoadingLedgerId] = useState<number | null>(null);


    // Filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [filterMarket, setFilterMarket] = useState("all");
    const [filterSalesperson, setFilterSalesperson] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterDate, setFilterDate] = useState<Date | undefined>();

    useEffect(() => {
        try {
            const storedEmployees = localStorage.getItem('employees');
            if (storedEmployees) setEmployees(JSON.parse(storedEmployees));
            const storedMarkets = localStorage.getItem('markets');
            if (storedMarkets) setMarkets(JSON.parse(storedMarkets));
            
            // Clear notifications on page load
            localStorage.removeItem('new-summary-notification-ids');
            window.dispatchEvent(new Event('storage')); // Notify sidebar to update
        } catch (error) {
            console.error("Failed to load data from localStorage", error);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('daily-summaries', JSON.stringify(allSummaries));
    }, [allSummaries]);

    const employeeMap = useMemo(() => {
        return new Map(employees.map(e => [e.id, e.name]));
    }, [employees]);

    const filteredSummaries = useMemo(() => {
        const localEmployeeMap = new Map(employees.map(e => [e.id, e.name]));
        return allSummaries
          .filter(summary => {
            const lowerCaseQuery = searchQuery.toLowerCase().trim();
            if (lowerCaseQuery) {
              const salespersonName = localEmployeeMap.get(summary.salespersonId)?.toLowerCase() || '';
              const match =
                summary.market.toLowerCase().includes(lowerCaseQuery) ||
                salespersonName.includes(lowerCaseQuery) ||
                (summary.ledgerId && String(summary.ledgerId).includes(lowerCaseQuery)) ||
                new Date(summary.date).toLocaleDateString('en-GB').includes(lowerCaseQuery);
              if (!match) return false;
            }
            if (filterMarket !== 'all' && summary.market !== filterMarket) return false;
            if (filterSalesperson !== 'all' && String(summary.salespersonId) !== filterSalesperson) return false;
            if (filterStatus !== 'all' && summary.status !== filterStatus) return false;
            if (filterDate && summary.date !== format(filterDate, 'yyyy-MM-dd')) return false;
            
            return true;
          })
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [allSummaries, searchQuery, filterMarket, filterSalesperson, filterStatus, filterDate, employees]);


    const handleSaveSummary = (summaryToSave: DailySummary) => {
        setAllSummaries(prev => {
            const index = prev.findIndex(s => s.id === summaryToSave.id);
            if (index > -1) {
                // Update existing
                const updatedSummaries = [...prev];
                updatedSummaries[index] = summaryToSave;
                return updatedSummaries;
            } else {
                // Add new
                return [summaryToSave, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            }
        });
        setIsDialogOpen(false);
    };
    
    const handleDeleteRequest = (summary: DailySummary) => {
      setSummaryToDelete(summary);
    };
    
    const handleEditRequest = (summary: DailySummary) => {
        setEditingSummary(summary);
        setIsDialogOpen(true);
    };

    const handleConfirmDelete = () => {
      if (!summaryToDelete) return;
      setAllSummaries(prev => prev.filter(s => s.id !== summaryToDelete.id));
      setSummaryToDelete(null);
    };
    
    const resetFilters = () => {
        setSearchQuery("");
        setFilterMarket("all");
        setFilterSalesperson("all");
        setFilterStatus("all");
        setFilterDate(undefined);
    };

    const handleNavigateToLedger = (ledgerId: number) => {
        setLoadingLedgerId(ledgerId);
        startLoading();
        router.push(`/ledger/${ledgerId}/edit`);
    };

    const t = {
        title: { en: "Daily Summary", bn: "দৈনিক সামারী" },
        description: { en: "Create and view isolated daily sales summaries.", bn: "আলাদাভাবে দৈনিক বিক্রির সারসংক্ষেপ তৈরি এবং দেখুন।" },
        addNewSummary: { en: "Add New Summary", bn: "নতুন সামারী যোগ করুন" },
        date: { en: "Date", bn: "তারিখ" },
        day: { en: "Day", bn: "বার" },
        market: { en: "Market", bn: "বাজার" },
        salesperson: { en: "Salesperson", bn: "সেলসকর্মী" },
        totalOrder: { en: "Total Order", bn: "মোট অর্ডার" },
        status: { en: 'Status', bn: 'স্ট্যাটাস' },
        pending: { en: 'Pending', bn: 'অমীমাংসিত' },
        used: { en: 'Used', bn: 'ব্যবহৃত' },
        actions: { en: "Actions", bn: "কার্যকলাপ" },
        noSummaries: { en: "No daily summaries created yet.", bn: "এখনও কোনো দৈনিক সামারী তৈরি করা হয়নি।" },
        delete: { en: "Delete", bn: "মুছুন" },
        edit: { en: "Edit", bn: "এডিট" },
        print: { en: 'Print', bn: 'প্রিন্ট' },
        deleteTitle: { en: 'Are you sure?', bn: 'আপনি কি নিশ্চিত?' },
        deleteDescription: { en: 'This action will permanently delete this summary. This cannot be undone.', bn: 'এই কাজটি সারসংক্ষেপটি স্থায়ীভাবে মুছে ফেলবে। এটি ফিরিয়ে আনা যাবে না।' },
        cancel: { en: 'Cancel', bn: 'বাতিল' },
        confirm: { en: 'Confirm', bn: 'নিশ্চিত করুন' },
        ledgerNo: { en: 'Ledger No.', bn: 'খাতা নং' },
        searchPlaceholder: { en: 'Search by ID, market, salesperson, date...', bn: 'আইডি, বাজার, সেলসকর্মী, তারিখ দিয়ে খুঁজুন...' },
        filterMarket: { en: 'Filter by market', bn: 'বাজার দিয়ে ফিল্টার' },
        allMarkets: { en: 'All Markets', bn: 'সকল বাজার' },
        filterSalesperson: { en: 'Filter by salesperson', bn: 'সেলসকর্মী দিয়ে ফিল্টার' },
        allSalespersons: { en: 'All Salespersons', bn: 'সকল সেলসকর্মী' },
        filterStatus: { en: 'Filter by status', bn: 'স্ট্যাটাস দিয়ে ফিল্টার' },
        allStatuses: { en: 'All Statuses', bn: 'সকল স্ট্যাটাস' },
        pickDate: { en: 'Pick a date', bn: 'তারিখ বাছুন' },
        resetFilters: { en: 'Reset', bn: 'রিসেট' },
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold font-headline">{t.title[language]}</h1>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) {
                        setEditingSummary(null);
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button size="lg" onClick={() => {
                            setEditingSummary(null); // Ensure we are adding new
                            setIsDialogOpen(true);
                        }}>
                            <PlusCircle className="mr-2 h-5 w-5" />
                            {t.addNewSummary[language]}
                        </Button>
                    </DialogTrigger>
                    <NewSummaryDialog onSave={handleSaveSummary} editingSummary={editingSummary} />
                </Dialog>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>{t.title[language]}</CardTitle>
                    <CardDescription>{t.description[language]}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-center gap-2 pb-4 mb-4 border-b">
                        <div className="relative flex-grow min-w-[200px] max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t.searchPlaceholder[language]}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 w-full"
                            />
                        </div>
                        <Select value={filterMarket} onValueChange={setFilterMarket}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder={t.filterMarket[language]} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t.allMarkets[language]}</SelectItem>
                                {markets.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={filterSalesperson} onValueChange={setFilterSalesperson}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder={t.filterSalesperson[language]} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t.allSalespersons[language]}</SelectItem>
                                {employees.map(emp => <SelectItem key={emp.id} value={String(emp.id)}>{emp.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-full sm:w-[150px]">
                                <SelectValue placeholder={t.filterStatus[language]} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t.allStatuses[language]}</SelectItem>
                                <SelectItem value="pending">{t.pending[language]}</SelectItem>
                                <SelectItem value="used">{t.used[language]}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full sm:w-auto justify-start text-left font-normal", !filterDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {filterDate ? format(filterDate, "dd/MM/yyyy") : <span>{t.pickDate[language]}</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={filterDate}
                                    onSelect={setFilterDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <Button variant="ghost" onClick={resetFilters}>
                            <X className="mr-2 h-4 w-4" /> {t.resetFilters[language]}
                        </Button>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t.date[language]}</TableHead>
                                <TableHead>{t.day[language]}</TableHead>
                                <TableHead>{t.market[language]}</TableHead>
                                <TableHead>{t.salesperson[language]}</TableHead>
                                <TableHead className="text-right">{t.totalOrder[language]}</TableHead>
                                <TableHead className="text-center">{t.status[language]}</TableHead>
                                <TableHead>{t.ledgerNo[language]}</TableHead>
                                <TableHead className="text-right">{t.actions[language]}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSummaries.length > 0 ? (
                                filteredSummaries.map(summary => (
                                    <TableRow key={summary.id}>
                                        <TableCell>{new Date(summary.date).toLocaleDateString('en-GB')}</TableCell>
                                        <TableCell>{summary.day}</TableCell>
                                        <TableCell>{summary.market}</TableCell>
                                        <TableCell>{employeeMap.get(summary.salespersonId) || 'N/A'}</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(summary.totalSale)}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={summary.status === 'used' ? 'secondary' : 'destructive'}>
                                                {summary.status === 'used' ? t.used[language] : t.pending[language]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {summary.ledgerId ? (
                                                <Button variant="link" onClick={() => handleNavigateToLedger(summary.ledgerId!)} className="p-0 h-auto text-sm" disabled={loadingLedgerId === summary.ledgerId}>
                                                    {loadingLedgerId === summary.ledgerId ? <Loader2 className="h-4 w-4 animate-spin"/> : summary.ledgerId}
                                                </Button>
                                            ) : '-'}
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
                                              <DropdownMenuItem onSelect={() => window.open(`/daily-summary/print?summaryId=${summary.id}`, '_blank')}>
                                                <Printer className="mr-2 h-4 w-4" />
                                                <span>{t.print[language]}</span>
                                              </DropdownMenuItem>
                                              <DropdownMenuItem
                                                onSelect={() => handleEditRequest(summary)}
                                                disabled={summary.status === 'used'}
                                              >
                                                <Edit className="mr-2 h-4 w-4" />
                                                <span>{t.edit[language]}</span>
                                              </DropdownMenuItem>
                                              <DropdownMenuItem
                                                onSelect={() => handleDeleteRequest(summary)}
                                                disabled={summary.status === 'used'}
                                                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                              >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                <span>{t.delete[language]}</span>
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-24">{t.noSummaries[language]}</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AlertDialog open={!!summaryToDelete} onOpenChange={(open) => !open && setSummaryToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t.deleteTitle[language]}</AlertDialogTitle>
                        <AlertDialogDescription>{t.deleteDescription[language]}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSummaryToDelete(null)}>{t.cancel[language]}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete}>{t.confirm[language]}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// The dialog content as a separate component to encapsulate the logic
function NewSummaryDialog({ onSave, editingSummary }: { onSave: (summary: DailySummary) => void, editingSummary: DailySummary | null }) {
  const { language } = useLanguage();
  const { toast } = useToast();
  
  const isEditing = !!editingSummary;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [rules, setRules] = useState<RewardRule[]>([]);
  const [quantityUnits, setQuantityUnits] = useState<string[]>([]);

  const [date, setDate] = useState("");
  const [day, setDay] = useState("");
  const [selectedMarket, setSelectedMarket] = useState("");
  const [selectedSalesperson, setSelectedSalesperson] = useState("");
  const [ledgerItems, setLedgerItems] = useState<LedgerItem[]>([]);
  const [ledgerRewards, setLedgerRewards] = useState<LedgerRewardItem[]>([]);
  
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isQuantityDialogOpen, setIsQuantityDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [summaryQuantity, setSummaryQuantity] = useState<number | string>("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState<number | string>("");

  const [isCustomRewardDialogOpen, setIsCustomRewardDialogOpen] = useState(false);
  const [customRewardSelection, setCustomRewardSelection] = useState<string>("");
  const [customRewardNameInput, setCustomRewardNameInput] = useState("");
  const [customRewardUnitInput, setCustomRewardUnitInput] = useState("");
  const [customRewardPurchasePrice, setCustomRewardPurchasePrice] = useState<number | string>("");
  const [customRewardProfitMargin, setCustomRewardProfitMargin] = useState<number | string>("");
  const [customRewardSellingPrice, setCustomRewardSellingPrice] = useState<number | string>("");
  const [customRewardSummaryQty, setCustomRewardSummaryQty] = useState<number | string>("");


  const [isSaving, setIsSaving] = useState(false);

  // Stock tracking states
  const [productStockInfo, setProductStockInfo] = useState({ available: 0, required: 0, unit: '' });
  const [rewardStockInfo, setRewardStockInfo] = useState({ available: 0, unit: '' });
  const [displayStock, setDisplayStock] = useState({ quantity: 0, unit: '' });
  const [displayRewardStock, setDisplayRewardStock] = useState({ quantity: 0, unit: ''});


   useEffect(() => {
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
    }
  }, []);

  useEffect(() => {
    if (isEditing && editingSummary) {
        setDate(editingSummary.date);
        setDay(editingSummary.day);
        setSelectedMarket(editingSummary.market);
        setSelectedSalesperson(String(editingSummary.salespersonId));
        setLedgerItems(editingSummary.items);
        setLedgerRewards(editingSummary.rewardItems || []);
    } else {
        const today = new Date();
        setDate(today.toLocaleDateString('en-CA'));
        setDay(today.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'long' }));
        setSelectedMarket("");
        setSelectedSalesperson("");
        setLedgerItems([]);
        setLedgerRewards([]);
    }
  }, [editingSummary, language, isEditing]);

  const rewardMap = useMemo(() => new Map(rewards.map(r => [r.id, r])), [rewards]);
  const ruleMap = useMemo(() => {
      const map = new Map<number, RewardRule>();
      rules.forEach(rule => map.set(rule.mainProductId, rule));
      return map;
  }, [rules]);


  useEffect(() => {
    // We don't want this to run while a dialog is open and potentially changing things.
    if (isProductDialogOpen || isCustomRewardDialogOpen) return;

    // 1. Calculate all potential automatic rewards based on ledgerItems
    const calculatedAutomaticRewards: LedgerRewardItem[] = [];
    ledgerItems.forEach(item => {
        const rule = ruleMap.get(item.productId);
        // For a summary, quantitySold is the same as summaryQuantity
        if (rule && rule.mainProductUnit === item.unit) {
            const reward = rewardMap.get(rule.rewardId);
            if (reward) {
                const numRewardsGiven = Math.floor(item.summaryQuantity / rule.mainProductQuantity) * rule.rewardQuantity;
                if (numRewardsGiven > 0) {
                    calculatedAutomaticRewards.push({
                        rewardId: reward.id,
                        rewardName: reward.name,
                        mainProductId: item.productId,
                        mainProductName: item.productName,
                        unit: reward.unit,
                        pricePerUnit: reward.sellingPrice,
                        purchasePricePerUnit: reward.pricePerUnit, // purchase price
                        quantity: numRewardsGiven, // In summary, quantity = summaryQuantity
                        totalPrice: numRewardsGiven * reward.sellingPrice,
                    });
                }
            }
        }
    });

    // 2. Reconcile with current state. Keep custom rewards, replace automatic ones.
    setLedgerRewards(prevRewards => {
        const customRewards = prevRewards.filter(r => !r.mainProductId);
        // In summary dialog, we don't edit auto-rewards, so we can just replace them.
        return [...customRewards, ...calculatedAutomaticRewards];
    });

  }, [ledgerItems, ruleMap, rewardMap, isProductDialogOpen, isCustomRewardDialogOpen]);


  const grossSale = useMemo(() => {
    const productsTotal = ledgerItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const rewardsTotal = ledgerRewards.reduce((sum, item) => sum + item.totalPrice, 0);
    return productsTotal + rewardsTotal;
  }, [ledgerItems, ledgerRewards]);
  
  const groupedProducts = useMemo(() => {
    const groups: { [key: string]: Product[] } = {};
    for (const product of products) {
      if (!groups[product.company]) groups[product.company] = [];
      groups[product.company].push(product);
    }
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [products]);

  useEffect(() => {
    if (!selectedProduct) { setPricePerUnit(""); return; }
    const { largerUnit, conversionFactor, roundFigurePrice, quantityUnit } = selectedProduct;
    if (selectedUnit === quantityUnit) setPricePerUnit(roundFigurePrice);
    else if (selectedUnit === largerUnit) setPricePerUnit(conversionFactor ? roundFigurePrice / conversionFactor : 0);
  }, [selectedProduct, selectedUnit]);

  const availableUnits = useMemo(() => {
    if (!selectedProduct) return [];
    const units = [selectedProduct.quantityUnit];
    if (selectedProduct.largerUnit) units.push(selectedProduct.largerUnit);
    return units.filter(Boolean);
  }, [selectedProduct]);

  const formatProductQuantity = (product: Product) => {
    if (product.largerUnit && product.conversionFactor && product.conversionFactor > 0) {
      const totalInBaseUnit = product.quantity;
      const largerUnitCount = Math.floor(totalInBaseUnit);
      const remainder = totalInBaseUnit - largerUnitCount;
      const smallerUnitCount = Math.round(remainder * product.conversionFactor);
      const parts = [];
      if (largerUnitCount > 0) parts.push(`${largerUnitCount} ${product.quantityUnit}`);
      if (smallerUnitCount > 0) parts.push(`${smallerUnitCount} ${product.largerUnit}`);
      if (parts.length === 0) return `0 ${product.quantityUnit}`;
      return parts.join(', ');
    }
    return `${product.quantity.toFixed(2)} ${product.quantityUnit}`;
  };

  const groupedLedgerItems = useMemo(() => {
    if (ledgerItems.length === 0) return [];
    const productCompanyMap = new Map(products.map(p => [p.id, p.company]));
    const groups: { [key: string]: LedgerItem[] } = {};
    for (const item of ledgerItems) {
      const company = productCompanyMap.get(item.productId) || 'Unknown Company';
      if (!groups[company]) groups[company] = [];
      groups[company].push(item);
    }
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [ledgerItems, products]);
  
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    if (product) {
      setSelectedUnit(product.quantityUnit);
      setProductStockInfo({ available: product.quantity, required: 0, unit: product.quantityUnit });
      setDisplayStock({ quantity: product.quantity, unit: product.quantityUnit });
    }
    else {
      setSelectedUnit('');
      setProductStockInfo({ available: 0, required: 0, unit: '' });
      setDisplayStock({ quantity: 0, unit: '' });
    }
  };

  const resetAddProductDialog = () => {
    setSelectedProduct(null);
    setSummaryQuantity("");
    setSelectedUnit("");
    setPricePerUnit("");
  };

  const handleAddProductToLedger = () => {
    if (!selectedProduct || !selectedUnit || summaryQuantity === "" || Number(summaryQuantity) <= 0) {
      toast({ variant: "destructive", title: t.error[language], description: t.productQtyError[language] });
      return;
    }
    if(productStockInfo.required > productStockInfo.available) {
      toast({ variant: "destructive", title: t.error[language], description: t.notEnoughStock[language] });
      return;
    }
    const summaryQty = Number(summaryQuantity);

    const newItem: LedgerItem = {
      productId: selectedProduct.id, productName: selectedProduct.name, unit: selectedUnit,
      pricePerUnit: Number(pricePerUnit), summaryQuantity: summaryQty, quantitySold: summaryQty,
      quantityReturned: 0, totalPrice: summaryQty * Number(pricePerUnit),
    };

    setLedgerItems(prev => [...prev, newItem]);
    setIsQuantityDialogOpen(false);
  };
  
  const handleRemoveLedgerItem = (productId: number) => {
    setLedgerItems(ledgerItems.filter(item => item.productId !== productId));
  };
  
  const handleSaveSummary = () => {
    if (!selectedMarket || !selectedSalesperson || ledgerItems.length === 0) {
      toast({ variant: "destructive", title: t.error[language], description: t.formError[language] });
      return;
    }

    setIsSaving(true);
    try {
        const summaryToSave: DailySummary = {
            id: isEditing && editingSummary ? editingSummary.id : Date.now(),
            date,
            day,
            market: selectedMarket,
            salespersonId: Number(selectedSalesperson),
            items: ledgerItems,
            rewardItems: ledgerRewards,
            totalSale: grossSale,
            status: isEditing && editingSummary ? editingSummary.status : 'pending',
        };
        
        onSave(summaryToSave);

        toast({ title: t.success[language], description: isEditing ? t.updateSuccessDesc[language] : t.saveSuccessDesc[language] });

    } catch (e) {
        toast({ variant: "destructive", title: t.error[language], description: t.saveError[language] });
        console.error(e);
    } finally {
        setIsSaving(false);
    }
  };

  // Reward Handlers
  const isManualReward = customRewardSelection === "manual";
  const selectedRewardDetails = useMemo(() => {
    if (isManualReward || !customRewardSelection) return null;
    return rewards.find(r => r.id === Number(customRewardSelection));
  }, [customRewardSelection, rewards, isManualReward]);
  
  const finalRewardName = isManualReward ? customRewardNameInput : selectedRewardDetails?.name || "";
  const finalRewardUnit = isManualReward ? customRewardUnitInput : selectedRewardDetails?.unit || "";
  const finalRewardPrice = Number(customRewardSellingPrice) || 0;
  const customRewardTotalPrice = useMemo(() => (Number(customRewardSummaryQty) || 0) * finalRewardPrice, [customRewardSummaryQty, finalRewardPrice]);

  useEffect(() => {
    if (!isManualReward) return;
    const pp = parseFloat(String(customRewardPurchasePrice));
    const pm = parseFloat(String(customRewardProfitMargin));
    if (!isNaN(pp) && !isNaN(pm)) {
      setCustomRewardSellingPrice(pp * (1 + pm / 100));
    }
  }, [customRewardPurchasePrice, customRewardProfitMargin, isManualReward]);

  const resetCustomRewardDialog = () => {
    setCustomRewardSelection("");
    setCustomRewardNameInput("");
    setCustomRewardUnitInput("");
    setCustomRewardPurchasePrice("");
    setCustomRewardProfitMargin("");
    setCustomRewardSellingPrice("");
    setCustomRewardSummaryQty("");
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
      resetCustomRewardDialog();
      setCustomRewardSelection('manual');
      setRewardStockInfo({ available: Infinity, unit: '' }); // Manual reward has no stock limit
      setDisplayRewardStock({ quantity: Infinity, unit: '' });
    }
    setCustomRewardSummaryQty("");
  };

  const handleAddCustomReward = () => {
    const qty = Number(customRewardSummaryQty) || 0;
    if (!finalRewardName || !finalRewardUnit || finalRewardPrice <= 0 || qty <= 0) {
      toast({ variant: 'destructive', title: t.error[language], description: t.rewardFormError[language]});
      return;
    }
    
    if (rewardStockInfo.available < qty) {
      toast({ variant: 'destructive', title: t.error[language], description: t.notEnoughStock[language]});
      return;
    }

    const purchasePrice = isManualReward ? Number(customRewardPurchasePrice) : selectedRewardDetails?.pricePerUnit || 0;

    const newCustomReward: LedgerRewardItem = {
        rewardId: isManualReward ? Date.now() : Number(customRewardSelection),
        rewardName: finalRewardName,
        unit: finalRewardUnit,
        pricePerUnit: finalRewardPrice,
        purchasePricePerUnit: purchasePrice,
        quantity: qty,
        totalPrice: customRewardTotalPrice,
    };
    
    if (!isManualReward && ledgerRewards.some(r => r.rewardId === newCustomReward.rewardId)) {
      toast({ variant: 'destructive', title: t.error[language], description: t.rewardExistsError[language]});
      return;
    }

    setLedgerRewards([...ledgerRewards, newCustomReward]);
    setIsCustomRewardDialogOpen(false);
  };
  
  const handleRemoveRewardItem = (rewardId: number) => {
    setLedgerRewards(prev => prev.filter(item => item.rewardId !== rewardId));
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


  // Stock validation useEffects
  useEffect(() => {
    if (!isQuantityDialogOpen || !selectedProduct) return;
    const summaryQty = Number(summaryQuantity) || 0;
    let requiredInBase = summaryQty;

    if (selectedUnit === selectedProduct.largerUnit && selectedProduct.conversionFactor) {
        requiredInBase = summaryQty / selectedProduct.conversionFactor;
    }
    setProductStockInfo(prev => ({ ...prev, required: requiredInBase }));
    const remainingStockInBase = productStockInfo.available - requiredInBase;
    setDisplayStock(prev => ({...prev, quantity: remainingStockInBase}));
  }, [summaryQuantity, selectedUnit, selectedProduct, isQuantityDialogOpen, productStockInfo.available]);
  
  useEffect(() => {
    if (!isCustomRewardDialogOpen || isManualReward || !selectedRewardDetails) return;
    const summaryQty = Number(customRewardSummaryQty) || 0;
    const remainingStock = rewardStockInfo.available - summaryQty;
    setDisplayRewardStock(prev => ({ ...prev, quantity: remainingStock }));
  }, [customRewardSummaryQty, isCustomRewardDialogOpen, isManualReward, selectedRewardDetails, rewardStockInfo.available]);


  const isProductStockInsufficient = productStockInfo.required > productStockInfo.available;
  const isRewardStockInsufficient = rewardStockInfo.available < (Number(customRewardSummaryQty) || 0);

  const t = {
    addNewSummary: { en: "Add New Summary", bn: "নতুন সামারী যোগ করুন" },
    editSummaryTitle: { en: "Edit Summary", bn: "সামারী এডিট" },
    entryInfo: { en: "Entry Information", bn: "খাতার তথ্য" },
    date: { en: "Date", bn: "তারিখ" },
    day: { en: "Day", bn: "বার" },
    market: { en: "Market", bn: "বাজার" },
    selectMarket: { en: "Select a market", bn: "একটি বাজার নির্বাচন করুন" },
    salesperson: { en: "Salesperson", bn: "সেলসকর্মী" },
    selectSalesperson: { en: "Select a salesperson", bn: "একজন সেলসকর্মী নির্বাচন করুন" },
    products: { en: "Products", bn: "পণ্যসমূহ" },
    addProduct: { en: "Add Product", bn: "পণ্য যোগ করুন" },
    selectProduct: { en: "Select a product", bn: "একটি পণ্য নির্বাচন করুন" },
    noProductsInStock: { en: "No products in stock", bn: "স্টকে কোনো পণ্য নেই" },
    productQtyError: { en: "Please select a product and enter a valid summary quantity.", bn: "অনুগ্রহ করে পণ্য এবং সামারী পরিমাণ সঠিকভাবে দিন।" },
    error: { en: "Error", bn: "ত্রুটি" },
    product: { en: "Product", bn: "পণ্য" },
    summaryField: { en: "Quantity", bn: "পরিমাণ"},
    unit: { en: "Unit", bn: "একক" },
    pricePerUnit: { en: "Price/Unit", bn: "প্রতি এককের মূল্য" },
    total: { en: "Total", bn: "মোট" },
    noProductsAdded: { en: "No products added yet.", bn: "এখনো কোনো পণ্য যোগ করা হয়নি।" },
    summary: { en: "Summary", bn: "সারসংক্ষেপ" },
    grossSale: { en: 'Total Order', bn: 'মোট অর্ডার' },
    cancel: { en: 'Cancel', bn: 'বাতিল' },
    save: { en: 'Save', bn: 'সংরক্ষণ' },
    update: { en: "Update", bn: "আপডেট" },
    quantityDesc: {en: "Enter quantity", bn: "পরিমাণ লিখুন"},
    selectUnit: {en: "Select unit", bn: "একক বাছুন"},
    formError: { en: "Please select market, salesperson, and add at least one product.", bn: "অনুগ্রহ করে বাজার, সেলসকর্মী এবং কমপক্ষে একটি পণ্য যোগ করুন।" },
    saveSuccessDesc: { en: "Daily summary saved successfully.", bn: "দৈনিক সারসংক্ষেপ সফলভাবে সংরক্ষিত হয়েছে।" },
    updateSuccessDesc: { en: "Summary updated successfully.", bn: "সামারী সফলভাবে আপডেট করা হয়েছে।" },
    success: { en: "Success", bn: "সফল" },
    saveError: { en: "Failed to save summary.", bn: "সারসংক্ষেপ সংরক্ষণ করতে ব্যর্থ হয়েছে।" },
    rewards: { en: 'Rewards', bn: 'পুরস্কার' },
    addCustomReward: { en: 'Add Custom Reward', bn: 'কাস্টম পুরস্কার যোগ' },
    noRewardsAdded: { en: 'No rewards added yet.', bn: 'এখনো কোনো পুরস্কার যোগ করা হয়নি।' },
    reward: { en: 'Reward', bn: 'পুরস্কার' },
    selectReward: { en: 'Select Reward', bn: 'পুরস্কার নির্বাচন করুন' },
    enterManually: { en: 'Enter Manually', bn: 'ম্যানুয়ালি প্রবেশ করুন' },
    rewardFormError: { en: 'Please fill all required reward fields.', bn: 'অনুগ্রহ করে পুরস্কারের সকল আবশ্যক তথ্য পূরণ করুন।' },
    rewardExistsError: { en: 'This reward has already been added.', bn: 'এই পুরস্কারটি ইতিমধ্যে যোগ করা হয়েছে।' },
    name: { en: 'Name', bn: 'নাম' },
    purchasePrice: { en: 'Purchase Price', bn: 'ক্রয় মূল্য' },
    profitMargin: { en: 'Profit Margin (%)', bn: 'লাভের হার (%)' },
    sellingPrice: { en: 'Selling Price', bn: 'বিক্রয় মূল্য' },
    selectOrEnterReward: { en: 'Select or Enter a Reward', bn: 'পুরস্কার নির্বাচন বা প্রবেশ করুন' },
    addReward: { en: 'Add Reward', bn: 'পুরস্কার যোগ' },
    notEnoughStock: { en: 'Not enough stock available.', bn: 'পর্যাপ্ত স্টক নেই।' },
    stock: { en: 'Stock', bn: 'স্টক' },
  };

  return (
    <DialogContent className="max-w-7xl h-[95vh] flex flex-col">
        <DialogHeader>
            <DialogTitle>{isEditing ? t.editSummaryTitle[language] : t.addNewSummary[language]}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto pr-4 -mr-6 space-y-4">
            <Card>
                <CardHeader><CardTitle>{t.entryInfo[language]}</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="grid gap-2"><Label htmlFor="date">{t.date[language]}</Label><Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                  <div className="grid gap-2"><Label htmlFor="day">{t.day[language]}</Label><Input id="day" value={day} readOnly disabled /></div>
                  <div className="grid gap-2"><Label htmlFor="market">{t.market[language]}</Label><Select value={selectedMarket} onValueChange={setSelectedMarket}><SelectTrigger><SelectValue placeholder={t.selectMarket[language]} /></SelectTrigger><SelectContent>{markets.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
                  <div className="grid gap-2"><Label htmlFor="salesperson">{t.salesperson[language]}</Label><Select value={selectedSalesperson} onValueChange={setSelectedSalesperson}><SelectTrigger><SelectValue placeholder={t.selectSalesperson[language]} /></SelectTrigger><SelectContent>{employees.map(emp => <SelectItem key={emp.id} value={String(emp.id)}>{emp.name}</SelectItem>)}</SelectContent></Select></div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>{t.products[language]}</CardTitle>
                    <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                        <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" />{t.addProduct[language]}</Button></DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader><DialogTitle>{t.selectProduct[language]}</DialogTitle></DialogHeader>
                            <div className="py-4"><div className="border rounded-md p-2 h-[60vh] overflow-y-auto">
                                {products.length > 0 ? (
                                    <Tabs defaultValue={groupedProducts[0]?.[0]} className="w-full">
                                        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 gap-1 h-auto mb-2">{groupedProducts.map(([company]) => (<TabsTrigger key={company} value={company}>{company}</TabsTrigger>))}</TabsList>
                                        {groupedProducts.map(([company, companyProducts]) => (<TabsContent key={company} value={company}><div className="space-y-1">{companyProducts.map(p => (
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
                                        ))}</div></TabsContent>))}
                                    </Tabs>
                                ) : (<div className="p-4 text-sm text-center text-muted-foreground flex items-center justify-center h-full">{t.noProductsInStock[language]}</div>)}
                            </div></div>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t.product[language]}</TableHead>
                                <TableHead className="text-right">{t.summaryField[language]}</TableHead>
                                <TableHead className="text-right">{t.pricePerUnit[language]}</TableHead>
                                <TableHead className="text-right">{t.total[language]}</TableHead>
                                <TableHead className="text-right"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {groupedLedgerItems.length > 0 ? (
                              groupedLedgerItems.map(([company, items]) => (
                                <React.Fragment key={company}>
                                  <TableRow className="border-b-0 bg-muted/10 hover:bg-muted/10"><TableCell colSpan={5} className="font-semibold text-primary py-2 px-4">{company}</TableCell></TableRow>
                                  {items.map(item => (<TableRow key={item.productId}><TableCell>{item.productName}</TableCell><TableCell className="text-right">{item.summaryQuantity} {item.unit}</TableCell><TableCell className="text-right">{formatCurrency(item.pricePerUnit)}</TableCell><TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleRemoveLedgerItem(item.productId)}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell></TableRow>))}
                                </React.Fragment>
                              ))
                            ) : (<TableRow><TableCell colSpan={5} className="text-center h-24">{t.noProductsAdded[language]}</TableCell></TableRow>)}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>{t.rewards[language]}</CardTitle>
                    <Dialog open={isCustomRewardDialogOpen} onOpenChange={(open) => { if(!open) resetCustomRewardDialog(); setIsCustomRewardDialogOpen(open); }}>
                        <DialogTrigger asChild><Button variant="outline"><Gift className="mr-2 h-4 w-4" />{t.addCustomReward[language]}</Button></DialogTrigger>
                        <DialogContent className="sm:max-w-2xl">
                            <DialogHeader><DialogTitle>{t.addCustomReward[language]}</DialogTitle></DialogHeader>
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
                                                    <span className={cn("text-xs font-medium ml-4", r.quantity > 0 ? 'text-green-600' : 'text-destructive')}>{r.quantity} {r.unit}</span>
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
                                            <div className="grid gap-2"><Label>{t.total[language]}</Label><Input value={formatCurrency(customRewardTotalPrice)} readOnly disabled /></div>
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
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t.reward[language]}</TableHead>
                                <TableHead className="text-right">{t.summaryField[language]}</TableHead>
                                <TableHead className="text-right">{t.pricePerUnit[language]}</TableHead>
                                <TableHead className="text-right">{t.total[language]}</TableHead>
                                <TableHead className="text-right"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ledgerRewards.length > 0 ? (
                                ledgerRewards.map(item => (
                                    <TableRow key={item.rewardId}>
                                        <TableCell>{item.rewardName}</TableCell>
                                        <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.pricePerUnit)}</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveRewardItem(item.rewardId)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={5} className="text-center h-24">{t.noRewardsAdded[language]}</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>{t.summary[language]}</CardTitle></CardHeader>
                <CardContent>
                   <div className="space-y-2 rounded-lg border bg-card p-4">
                        <div className="flex justify-between font-semibold text-lg">
                            <span>{t.grossSale[language]}</span>
                            <span>{formatCurrency(grossSale)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
        
        <DialogFooter className="border-t pt-4">
            <DialogClose asChild><Button variant="outline">{t.cancel[language]}</Button></DialogClose>
            <Button onClick={handleSaveSummary} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? t.update[language] : t.save[language]}
            </Button>
        </DialogFooter>

        <Dialog open={isQuantityDialogOpen} onOpenChange={(open) => { if (!open) resetAddProductDialog(); setIsQuantityDialogOpen(open); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{selectedProduct?.name || t.addProduct[language]}</DialogTitle>
                    {selectedProduct && (
                        <div className="flex justify-between items-center pt-2">
                            <DialogDescription>
                                {t.quantityDesc[language]}
                            </DialogDescription>
                        </div>
                    )}
                </DialogHeader>
                <div className="space-y-4 py-4">{selectedProduct ? (<>
                    <div className="grid grid-cols-2 gap-4 items-end">
                        <div className="grid gap-2">
                          <Label htmlFor="summary-qty">{t.summaryField[language]}</Label>
                          <Input id="summary-qty" type="number" value={summaryQuantity} onChange={(e) => setSummaryQuantity(e.target.value)} placeholder="0"/>
                           {isProductStockInsufficient && <p className="text-xs text-destructive">{t.notEnoughStock[language]}</p>}
                        </div>
                        <div className={cn("text-lg text-right font-semibold", isProductStockInsufficient ? 'text-destructive' : 'text-green-600')}>
                            <div className="text-sm font-medium text-muted-foreground">{t.stock[language]}</div>
                            <span>{formatDetailedStock(displayStock.quantity, selectedProduct)}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                          <Label>{t.unit[language]}</Label>
                          <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                              <SelectTrigger><SelectValue placeholder={t.selectUnit[language]} /></SelectTrigger>
                              <SelectContent>{availableUnits.map(unit => (<SelectItem key={unit} value={unit}>{unit}</SelectItem>))}</SelectContent>
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
                </>) : null}</div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="secondary" onClick={() => setIsQuantityDialogOpen(false)}>{t.cancel[language]}</Button>
                    </DialogClose>
                    <Button onClick={handleAddProductToLedger} disabled={!selectedProduct || isProductStockInsufficient}>{t.addProduct[language]}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </DialogContent>
  );
}
