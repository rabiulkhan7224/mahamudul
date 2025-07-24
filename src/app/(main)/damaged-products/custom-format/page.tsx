
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/context/language-context";
import { PlusCircle, Trash2, Printer, ArrowLeft } from "lucide-react";


// Types
type FullProduct = {
  id: number;
  name: string;
  company: string;
  purchasePrice: number;
  quantityUnit: string;
  largerUnit?: string;
  conversionFactor?: number;
};

type CustomDamagedItem = {
  id: number;
  productId: string;
  productName: string;
  unit: string;
  quantity: number | string;
  pricePerUnit: number | string;
  totalPrice: number;
  availableUnits: string[];
};

type ProfileSettings = {
  businessName: string;
  ownerName: string;
  mobile: string;
  email: string;
};

const formatCurrency = (amount: number) => `৳${amount.toFixed(2)}`;

export default function CustomDamagedFormatPage() {
  const router = useRouter();
  const { language } = useLanguage();

  const [allProducts, setAllProducts] = useState<FullProduct[]>([]);
  const [customItems, setCustomItems] = useState<CustomDamagedItem[]>([]);
  const [profile, setProfile] = useState<Partial<ProfileSettings>>({});

  useEffect(() => {
    try {
      const storedProducts = localStorage.getItem("products");
      const products: FullProduct[] = storedProducts ? JSON.parse(storedProducts) : [];
      setAllProducts(products);

      const storedProfile = localStorage.getItem('profile-settings');
      if (storedProfile) setProfile(JSON.parse(storedProfile));
    } catch (e) {
      console.error("Failed to load data for custom format", e);
    }
  }, []);
  
  const handleAddCustomItem = () => {
    const newItem: CustomDamagedItem = {
      id: Date.now(),
      productId: "",
      productName: "",
      unit: "",
      quantity: 1,
      pricePerUnit: 0,
      totalPrice: 0,
      availableUnits: [],
    };
    setCustomItems(prev => [...prev, newItem]);
  };
  
  const handleCustomItemChange = (id: number, field: keyof CustomDamagedItem, value: any) => {
    setCustomItems(prevItems => prevItems.map(item => {
      if (item.id === id) {
        const newItem = { ...item };
        
        if (field === 'productId') {
          const product = allProducts.find(p => p.id === Number(value));
          if (product) {
            newItem.productId = String(product.id);
            newItem.productName = product.name;
            newItem.pricePerUnit = product.purchasePrice;
            const units = [product.quantityUnit];
            if (product.largerUnit) units.push(product.largerUnit);
            newItem.availableUnits = units.filter(Boolean);
            newItem.unit = product.quantityUnit;
          }
        } else {
          (newItem as any)[field] = value;
        }
        
        const quantity = Number(newItem.quantity) || 0;
        const price = Number(newItem.pricePerUnit) || 0;
        newItem.totalPrice = quantity * price;

        return newItem;
      }
      return item;
    }));
  };

  const handleRemoveCustomItem = (id: number) => {
    setCustomItems(prev => prev.filter(item => item.id !== id));
  };
  
  const customTotalValue = useMemo(() => {
    return customItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [customItems]);

  const handlePrintCustom = () => {
    window.print();
  };

  const t = {
    title: { en: "Custom Damaged Format", bn: "কাস্টম ক্ষতিগ্রস্ত ফর্মেট" },
    addDamagedItem: { en: "Add Item", bn: "পণ্য যোগ" },
    print: { en: "Print", bn: "প্রিন্ট" },
    back: { en: "Back", bn: "ফিরে যান" },
    selectProduct: { en: "Select Product", bn: "পণ্য নির্বাচন" },
    unit: { en: "Unit", bn: "একক" },
    quantity: { en: "Quantity", bn: "পরিমাণ" },
    pricePerUnit: { en: "Price / Unit", bn: "একক মূল্য" },
    totalPrice: { en: "Total Price", bn: "মোট মূল্য" },
    productName: { en: "Product Name", bn: "পণ্যের নাম" },
    grandTotal: { en: "Grand Total", bn: "সর্বমোট" },
    damagedReport: { en: "Damaged Product Report", bn: "ক্ষতিগ্রস্ত পণ্যের প্রতিবেদন" },
    date: { en: "Date", bn: "তারিখ" },
  };

  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center justify-between no-print">
         <h1 className="text-3xl font-bold font-headline">{t.title[language]}</h1>
         <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t.back[language]}
            </Button>
            <Button onClick={handlePrintCustom} disabled={customItems.length === 0}>
                <Printer className="mr-2 h-4 w-4"/>{t.print[language]}
            </Button>
         </div>
       </div>

      <div id="printable-custom-damaged">
          <div className="printable-area p-1">
            <header className="mb-8 text-center">
              <h1 className="text-2xl font-bold">{profile.businessName || 'Business Name'}</h1>
              <p className="font-semibold">{t.damagedReport[language]}</p>
              <p>{t.date[language]}: {new Date().toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-CA')}</p>
            </header>
            <Separator className="my-4"/>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.productName[language]}</TableHead>
                  <TableHead className="text-center">{t.quantity[language]}</TableHead>
                  <TableHead className="text-center">{t.unit[language]}</TableHead>
                  <TableHead className="text-right">{t.pricePerUnit[language]}</TableHead>
                  <TableHead className="text-right">{t.totalPrice[language]}</TableHead>
                  <TableHead className="text-right no-print"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="w-[40%]">
                      <Select
                        value={String(item.productId)}
                        onValueChange={val => handleCustomItemChange(item.id, 'productId', val)}
                      >
                        <SelectTrigger className="no-print"><SelectValue placeholder={t.selectProduct[language]}/></SelectTrigger>
                        <SelectContent>
                          {allProducts.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <span className="print-only block">{item.productName}</span>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={e => handleCustomItemChange(item.id, 'quantity', e.target.value)}
                        className="w-24 text-center mx-auto no-print"
                      />
                      <span className="print-only text-center block">{item.quantity}</span>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.unit}
                        onValueChange={val => handleCustomItemChange(item.id, 'unit', val)}
                        disabled={!item.productId}
                      >
                        <SelectTrigger className="w-28 mx-auto no-print"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {item.availableUnits.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <span className="print-only text-center block">{item.unit}</span>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.pricePerUnit}
                        onChange={e => handleCustomItemChange(item.id, 'pricePerUnit', e.target.value)}
                        className="w-28 text-right ml-auto no-print"
                      />
                      <span className="print-only text-right block">{formatCurrency(Number(item.pricePerUnit))}</span>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                    <TableCell className="text-right no-print">
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveCustomItem(item.id)}>
                        <Trash2 className="h-4 w-4 text-destructive"/>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <Button onClick={handleAddCustomItem} variant="outline" className="mt-4 no-print">
              <PlusCircle className="mr-2 h-4 w-4" />
              {t.addDamagedItem[language]}
            </Button>
            
            <div className="flex justify-end mt-6">
              <div className="w-64 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold">{t.grandTotal[language]}:</span>
                  <span className="font-bold text-lg">{formatCurrency(customTotalValue)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
