
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { PlusCircle, Trash2, ShieldX } from "lucide-react";

// Types
type Employee = { id: number; name: string; phone: string; role: string; };
type Product = { id: number; name: string; quantity: number; purchasePrice: number; roundFigurePrice: number; quantityUnit: string; largerUnit?: string; conversionFactor?: number; };
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
type LedgerEntry = {
    id: number;
    date: string;
    day: string;
    market: string;
    salespersonId: number;
    items: LedgerItem[];
    damagedItems?: DamagedItem[];
    totalSale: number;
    amountPaid: number;
    amountDue: number;
    dueAssignedTo: number;
    commission: number;
    commissionAssignedTo: number;
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

export default function EditLedgerEntryPage() {
  const router = useRouter();
  const params = useParams();
  const { language } = useLanguage();
  const ledgerId = Number(params.id);

  // Data from Local Storage
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);

  // Form State
  const [date, setDate] = useState("");
  const [day, setDay] = useState("");
  const [selectedMarket, setSelectedMarket] = useState("");
  const [selectedSalesperson, setSelectedSalesperson] = useState("");
  const [ledgerItems, setLedgerItems] = useState<LedgerItem[]>([]);
  const [damagedItems, setDamagedItems] = useState<DamagedItem[]>([]);
  const [amountPaid, setAmountPaid] = useState<number | string>("");
  const [dueAssignedTo, setDueAssignedTo] = useState("");
  const [commissionAmount, setCommissionAmount] = useState<number | string>("");
  const [commissionAssignedTo, setCommissionAssignedTo] = useState("");

  // Product Dialog State
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [summaryQuantity, setSummaryQuantity] = useState<number | string>("");
  const [quantityReturned, setQuantityReturned] = useState<number | string>(0);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState<number | string>("");

  // Damaged Product Dialog State
  const [isDamagedProductDialogOpen, setIsDamagedProductDialogOpen] = useState(false);
  const [damagedProduct, setDamagedProduct] = useState<Product | null>(null);
  const [damagedQuantity, setDamagedQuantity] = useState<number | string>("");
  const [damagedUnit, setDamagedUnit] = useState("");
  const [damagedPricePerUnit, setDamagedPricePerUnit] = useState<number | string>("");

  const quantitySold = useMemo(() => {
    const summary = Number(summaryQuantity) || 0;
    const returned = Number(quantityReturned) || 0;
    if (summary < returned) return 0;
    return summary - returned;
  }, [summaryQuantity, quantityReturned]);


  useEffect(() => {
    try {
      // Load dependencies
      const storedEmployees = localStorage.getItem('employees');
      if (storedEmployees) setEmployees(JSON.parse(storedEmployees));

      const storedProducts = localStorage.getItem('products');
      if (storedProducts) setProducts(JSON.parse(storedProducts));
      
      const storedMarkets = localStorage.getItem('markets');
      if (storedMarkets) setMarkets(JSON.parse(storedMarkets));

      // Load ledger entry to edit
      if (ledgerId) {
        const storedTransactions = localStorage.getItem("ledger-transactions");
        if (storedTransactions) {
            const transactions: LedgerEntry[] = JSON.parse(storedTransactions);
            const entryToEdit = transactions.find(t => t.id === ledgerId);

            if (entryToEdit) {
                setDate(entryToEdit.date);
                setDay(entryToEdit.day);
                setSelectedMarket(entryToEdit.market);
                setSelectedSalesperson(String(entryToEdit.salespersonId));
                setLedgerItems(entryToEdit.items);
                setDamagedItems(entryToEdit.damagedItems || []);
                setAmountPaid(entryToEdit.amountPaid);
                setDueAssignedTo(String(entryToEdit.dueAssignedTo));
                setCommissionAmount(entryToEdit.commission);
                setCommissionAssignedTo(String(entryToEdit.commissionAssignedTo));
            } else {
                alert(language === 'bn' ? 'খাতা পাওয়া যায়নি।' : 'Ledger entry not found.');
                router.push('/ledger');
            }
        }
      }
    } catch (error) {
      console.error("Failed to parse data from localStorage", error);
      alert(language === 'bn' ? 'তথ্য লোড করতে সমস্যা হয়েছে।' : 'Failed to load data.');
      router.push('/ledger');
    }
  }, [ledgerId, router, language]);

  const grossSale = useMemo(() => {
    return ledgerItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [ledgerItems]);
  
  const totalDamaged = useMemo(() => {
    return damagedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [damagedItems]);
  
  const totalSale = useMemo(() => { // This is the net sale
    return grossSale - totalDamaged;
  }, [grossSale, totalDamaged]);

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

  const t = {
    title: { en: "Edit Ledger Entry", bn: "খাতা সম্পাদনা" },
    description: { en: "Update the details for this ledger entry.", bn: "এই খাতার বিবরণ আপডেট করুন।" },
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
    totalSale: { en: "Total Sale", bn: "সর্বমোট বিক্রয়" },
    paidAmount: { en: "Paid Amount", bn: "জমা" },
    dueAmount: { en: "Due Amount", bn: "বাকি" },
    dueAssignedTo: { en: "Due Assigned To", bn: "বাকি যার নামে" },
    commission: { en: "Commission", bn: "কমিশন" },
    commissionAssignedTo: { en: "Commission Assigned To", bn: "কমিশন যার নামে" },
    save: { en: "Update Entry", bn: "আপডেট করুন" },
    cancel: { en: "Cancel", bn: "বাতিল" },
    damagedProducts: { en: "Damaged Products", bn: "ক্ষতিগ্রস্ত পণ্য" },
    addDamagedProduct: { en: "Add Damaged Product", bn: "ক্ষতিগ্রস্ত পণ্য যোগ করুন" },
    noDamagedProducts: { en: "No damaged products added.", bn: "কোনো ক্ষতিগ্রস্ত পণ্য যোগ করা হয়নি।" },
    quantity: { en: "Quantity", bn: "পরিমাণ" },
    totalDamaged: { en: "Total Damaged", bn: "মোট ক্ষতি" },
  };

  const resetAddProductDialog = () => {
    setSelectedProduct(null);
    setSummaryQuantity("");
    setQuantityReturned(0);
    setSelectedUnit("");
    setPricePerUnit("");
  }

  const handleAddProductToLedger = () => {
    if (!selectedProduct || !selectedUnit || summaryQuantity === "" || Number(summaryQuantity) <= 0) {
      alert(language === 'bn' ? 'অনুগ্রহ করে পণ্য এবং সামারী পরিমাণ সঠিকভাবে দিন।' : 'Please select a product and enter a valid summary quantity.');
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
    setIsProductDialogOpen(false);
    resetAddProductDialog();
  };
  
  const handleRemoveLedgerItem = (productId: number) => {
    setLedgerItems(ledgerItems.filter(item => item.productId !== productId));
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
    setIsDamagedProductDialogOpen(false);
    resetDamagedProductDialog();
  };

  const handleRemoveDamagedItem = (productId: number) => {
    setDamagedItems(damagedItems.filter(item => item.productId !== productId));
  };

  const handleUpdateLedger = () => {
    if (!selectedMarket || !selectedSalesperson || ledgerItems.length === 0) {
      alert(language === 'bn' ? 'অনুগ্রহ করে বাজার, কর্মচারী এবং কমপক্ষে একটি পণ্য যোগ করুন।' : 'Please select a market, salesperson, and add at least one product.');
      return;
    }

    try {
      const storedTransactions = localStorage.getItem("ledger-transactions") || "[]";
      let transactions: LedgerEntry[] = JSON.parse(storedTransactions);
      const entryIndex = transactions.findIndex(t => t.id === ledgerId);
      
      if (entryIndex === -1) {
          alert(language === 'bn' ? 'আপডেট করার জন্য খাতাটি খুঁজে পাওয়া যায়নি।' : 'Ledger entry to update not found.');
          return;
      }
      const originalLedgerEntry = transactions[entryIndex];

      const updatedLedgerEntry: LedgerEntry = {
        id: ledgerId,
        date,
        day,
        market: selectedMarket,
        salespersonId: Number(selectedSalesperson),
        items: ledgerItems,
        damagedItems: damagedItems,
        totalSale,
        amountPaid: Number(amountPaid) || 0,
        amountDue,
        dueAssignedTo: Number(dueAssignedTo),
        commission: Number(commissionAmount) || 0,
        commissionAssignedTo: Number(commissionAssignedTo),
      };

      // Stock update logic
      const storedProducts = localStorage.getItem("products") || "[]";
      let productsList: Product[] = JSON.parse(storedProducts);

      // 1. Revert original stock deduction for sold items
      originalLedgerEntry.items.forEach(originalItem => {
          const productIndex = productsList.findIndex(p => p.id === originalItem.productId);
          if (productIndex > -1) {
              const product = productsList[productIndex];
              let quantityToAddBack = originalItem.quantitySold;
              
              if (product.largerUnit && product.conversionFactor && originalItem.unit === product.largerUnit) {
                  quantityToAddBack = quantityToAddBack / product.conversionFactor;
              }
              productsList[productIndex].quantity += quantityToAddBack;
          }
      });
      // 1b. Revert original stock deduction for damaged items
      if (originalLedgerEntry.damagedItems) {
        originalLedgerEntry.damagedItems.forEach(originalDamaged => {
            const productIndex = productsList.findIndex(p => p.id === originalDamaged.productId);
            if (productIndex > -1) {
                const product = productsList[productIndex];
                let quantityToAddBack = originalDamaged.quantity;
                
                if (product.largerUnit && product.conversionFactor && originalDamaged.unit === product.largerUnit) {
                    quantityToAddBack = quantityToAddBack / product.conversionFactor;
                }
                productsList[productIndex].quantity += quantityToAddBack;
            }
        });
      }
      
      // 2. Deduct new stock quantity for sold items
      updatedLedgerEntry.items.forEach(newItem => {
          const productIndex = productsList.findIndex(p => p.id === newItem.productId);
          if (productIndex > -1) {
              const product = productsList[productIndex];
              let quantityToDeduct = newItem.quantitySold;

              if (product.largerUnit && product.conversionFactor && newItem.unit === product.largerUnit) {
                  quantityToDeduct = quantityToDeduct / product.conversionFactor;
              }
              productsList[productIndex].quantity -= quantityToDeduct;
          }
      });

      // 2b. Deduct new stock for damaged items
      if (updatedLedgerEntry.damagedItems) {
        updatedLedgerEntry.damagedItems.forEach(newDamagedItem => {
            const productIndex = productsList.findIndex(p => p.id === newDamagedItem.productId);
            if (productIndex > -1) {
                const product = productsList[productIndex];
                let quantityToDeduct = newDamagedItem.quantity;
    
                if (product.largerUnit && product.conversionFactor && newDamagedItem.unit === product.largerUnit) {
                    quantityToDeduct = quantityToDeduct / product.conversionFactor;
                }
                productsList[productIndex].quantity -= quantityToDeduct;
            }
        });
      }
      
      localStorage.setItem("products", JSON.stringify(productsList));

      transactions[entryIndex] = updatedLedgerEntry;
      localStorage.setItem("ledger-transactions", JSON.stringify(transactions));

      // Update receivable transactions
      const storedReceivables = localStorage.getItem("receivable-transactions") || "[]";
      let receivables: ReceivableTransaction[] = JSON.parse(storedReceivables);
      
      // First, remove all old receivables for this ledger entry
      receivables = receivables.filter((rec: ReceivableTransaction) => rec.ledgerId !== ledgerId);
      
      // Add due amount if it exists
      if (amountDue > 0 && dueAssignedTo) {
        const newReceivable: ReceivableTransaction = {
          id: `ledger-due-${ledgerId}`,
          ledgerId: ledgerId,
          employeeId: Number(dueAssignedTo),
          date: date,
          type: 'due',
          amount: amountDue,
          note: language === 'bn' ? `খাতা নং ${ledgerId} থেকে বকেয়া` : `Due from Ledger #${ledgerId}`,
        };
        receivables.push(newReceivable);
      }
      
      // Add commission amount if it exists
      if ((Number(commissionAmount) || 0) > 0 && commissionAssignedTo) {
          const newCommissionReceivable: ReceivableTransaction = {
              id: `ledger-commission-${ledgerId}`,
              ledgerId: ledgerId,
              employeeId: Number(commissionAssignedTo),
              date: date,
              type: 'due',
              amount: Number(commissionAmount),
              note: language === 'bn' ? `খাতা নং ${ledgerId} থেকে কমিশন` : `Commission from Ledger #${ledgerId}`,
          };
          receivables.push(newCommissionReceivable);
      }
      
      localStorage.setItem("receivable-transactions", JSON.stringify(receivables));

      alert(language === 'bn' ? 'খাতা সফলভাবে আপডেট হয়েছে।' : 'Ledger entry updated successfully.');
      router.push("/ledger");
    } catch (error) {
      console.error("Failed to update ledger entry", error);
      alert(language === 'bn' ? 'খাতা আপডেট করতে সমস্যা হয়েছে।' : 'Failed to update ledger entry.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">{t.title[language]}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.entryInfo[language]}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date">{t.date[language]}</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
                <Dialog open={isProductDialogOpen} onOpenChange={(open) => {
                    setIsProductDialogOpen(open);
                    if (!open) {
                        resetAddProductDialog();
                    }
                }}>
                    <DialogTrigger asChild>
                       <Button><PlusCircle className="mr-2 h-4 w-4" />{t.addProduct[language]}</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t.addProduct[language]}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid gap-2">
                               <Label>{t.product[language]}</Label>
                               <Select onValueChange={(val) => {
                                 const product = products.find(p => p.id === Number(val)) || null
                                 setSelectedProduct(product);
                                 if (product) {
                                    setSelectedUnit(product.quantityUnit);
                                 } else {
                                    setSelectedUnit('');
                                 }
                               }}>
                                 <SelectTrigger><SelectValue placeholder={t.selectProduct[language]}/></SelectTrigger>
                                 <SelectContent>
                                    {products.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                                 </SelectContent>
                               </Select>
                            </div>
                            {selectedProduct && (
                                <>
                                <div className="grid gap-2">
                                    <Label htmlFor="summary-qty">{t.summaryField[language]}</Label>
                                    <Input id="summary-qty" type="number" value={summaryQuantity} onChange={(e) => setSummaryQuantity(e.target.value)} placeholder="0"/>
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
                                     <Label>{t.pricePerUnit[language]}</Label>
                                     <Input value={Number(pricePerUnit).toFixed(2)} readOnly disabled />
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
                            )}
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="secondary">{t.cancel[language]}</Button></DialogClose>
                            <Button onClick={handleAddProductToLedger}>{t.addProduct[language]}</Button>
                        </DialogFooter>
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
                        {ledgerItems.length > 0 ? (
                            ledgerItems.map(item => (
                                <TableRow key={item.productId}>
                                    <TableCell>{item.productName}</TableCell>
                                    <TableCell className="text-right">{item.summaryQuantity} {item.unit}</TableCell>
                                    <TableCell className="text-right">{item.quantityReturned} {item.unit}</TableCell>
                                    <TableCell className="text-right">{item.quantitySold} {item.unit}</TableCell>
                                    <TableCell className="text-right">{item.pricePerUnit.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-medium">{item.totalPrice.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveLedgerItem(item.productId)}>
                                            <Trash2 className="h-4 w-4 text-destructive"/>
                                        </Button>
                                    </TableCell>
                                </TableRow>
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
              <CardTitle>{t.damagedProducts[language]}</CardTitle>
              <Dialog open={isDamagedProductDialogOpen} onOpenChange={(open) => {
                  setIsDamagedProductDialogOpen(open);
                  if (!open) resetDamagedProductDialog();
              }}>
                  <DialogTrigger asChild>
                     <Button variant="outline"><ShieldX className="mr-2 h-4 w-4" />{t.addDamagedProduct[language]}</Button>
                  </DialogTrigger>
                  <DialogContent>
                      <DialogHeader>
                          <DialogTitle>{t.addDamagedProduct[language]}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                          <div className="grid gap-2">
                             <Label>{t.product[language]}</Label>
                             <Select onValueChange={(val) => {
                               const product = products.find(p => p.id === Number(val)) || null
                               setDamagedProduct(product);
                               if (product) {
                                  setDamagedUnit(product.quantityUnit);
                               } else {
                                  setDamagedUnit('');
                               }
                             }}>
                               <SelectTrigger><SelectValue placeholder={t.selectProduct[language]}/></SelectTrigger>
                               <SelectContent>
                                  {products.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                               </SelectContent>
                             </Select>
                          </div>
                          {damagedProduct && (
                              <>
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
                                    <Label htmlFor="damaged-qty">{t.quantity[language]}</Label>
                                    <Input id="damaged-qty" type="number" value={damagedQuantity} onChange={(e) => setDamagedQuantity(e.target.value)} placeholder="0"/>
                                </div>
                              </div>
                              <div className="grid gap-2">
                                   <Label>{t.pricePerUnit[language]} (Purchase Price)</Label>
                                   <Input value={damagedPricePerUnit} onChange={(e) => setDamagedPricePerUnit(e.target.value)} type="number" />
                              </div>
                              </>
                          )}
                      </div>
                      <DialogFooter>
                          <DialogClose asChild><Button variant="secondary">{t.cancel[language]}</Button></DialogClose>
                          <Button onClick={handleAddDamagedItem}>{t.addDamagedProduct[language]}</Button>
                      </DialogFooter>
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
                        {damagedItems.length > 0 ? (
                            damagedItems.map(item => (
                                <TableRow key={item.productId}>
                                    <TableCell>{item.productName}</TableCell>
                                    <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                                    <TableCell className="text-right">{item.pricePerUnit.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-medium">{item.totalPrice.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveDamagedItem(item.productId)}>
                                            <Trash2 className="h-4 w-4 text-destructive"/>
                                        </Button>
                                    </TableCell>
                                </TableRow>
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
                                <TableCell className="text-right font-bold">{totalDamaged.toFixed(2)}</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </TableFooter>
                    )}
                </Table>
            </CardContent>
          </Card>


          <Card>
            <CardHeader><CardTitle>{t.summary[language]}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="grid gap-2 p-4 border rounded-lg bg-muted">
                <Label>{t.totalSale[language]}</Label>
                <p className="text-2xl font-bold">{totalSale.toFixed(2)}</p>
              </div>
              <div className="grid gap-2 p-4 border rounded-lg bg-muted">
                <Label>{t.paidAmount[language]}</Label>
                <Input type="number" placeholder="0.00" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} className="text-2xl font-bold border-0 h-auto p-0 bg-transparent"/>
              </div>
              <div className="grid gap-2 p-4 border rounded-lg bg-muted">
                <Label>{t.dueAmount[language]}</Label>
                <p className={`text-2xl font-bold ${amountDue > 0 ? 'text-destructive' : ''}`}>{amountDue.toFixed(2)}</p>
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
              <div className="grid gap-2">
                <Label htmlFor="commission">{t.commission[language]}</Label>
                <Input id="commission" type="number" placeholder="0.00" value={commissionAmount} onChange={e => setCommissionAmount(e.target.value)} />
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
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 mt-4">
            <Button variant="outline" size="lg" onClick={() => router.push('/ledger')}>{t.cancel[language]}</Button>
            <Button size="lg" onClick={handleUpdateLedger}>{t.save[language]}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
