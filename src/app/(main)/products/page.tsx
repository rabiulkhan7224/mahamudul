
"use client";

import { useState, useEffect, useMemo } from "react";
import React from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/context/language-context";
import { PlusCircle, Edit, Trash2, Printer, Search } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AnimatedNumber } from "@/components/ui/animated-number";

type Company = {
  name: string;
  profitMargin: number;
};

type Product = {
  id: number;
  name: string;
  company: string;
  purchasePrice: number;
  profitMargin: number;
  sellingPrice: number;
  roundFigurePrice: number;
  quantity: number;
  quantityUnit: string;
  largerUnit?: string;
  conversionFactor?: number;
};

const formatCurrency = (amount: number) => `৳${amount.toFixed(2)}`;

export default function ProductsPage() {
  const { language } = useLanguage();
  const currentLanguage = language;

  const [companies, setCompanies] = useState<Company[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('product-companies');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to parse companies from localStorage', e);
      return [];
    }
  });

  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('products');
      if (stored) {
        const parsedProducts = JSON.parse(stored).map((p: any) => ({...p, quantityUnit: p.quantityUnit || ''}));
        return parsedProducts;
      }
      return [];
    } catch (e) {
      console.error('Failed to parse products from localStorage', e);
      return [];
    }
  });

  const [quantityUnits, setQuantityUnits] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('product-quantity-units');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to parse quantity units from localStorage', e);
      return [];
    }
  });
  
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [hasLedgerEntries, setHasLedgerEntries] = useState(false);

  // Filter state
  const [filterCompany, setFilterCompany] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [productName, setProductName] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [purchasePrice, setPurchasePrice] = useState<number | string>("");
  const [profitMargin, setProfitMargin] = useState<number | string>("");
  const [roundFigurePrice, setRoundFigurePrice] = useState<number | string>("");
  const [quantity, setQuantity] = useState<number | string>("");
  const [selectedQuantityUnit, setSelectedQuantityUnit] = useState("");
  const [productLargerUnit, setProductLargerUnit] = useState("");
  const [productConversionFactor, setProductConversionFactor] = useState<number | string>("");
  
  const [newCompany, setNewCompany] = useState("");
  const [newCompanyProfitMargin, setNewCompanyProfitMargin] = useState<number | string>("");
  const [newQuantityUnit, setNewQuantityUnit] = useState("");
  
  // Print Dialog State
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [reportCompany, setReportCompany] = useState<string>("all");

  const sellingPrice = useMemo(() => {
    const pp = parseFloat(String(purchasePrice));
    const pm = parseFloat(String(profitMargin));
    if (!isNaN(pp) && !isNaN(pm)) {
      return (pp * (1 + pm / 100)).toFixed(2);
    }
    return "";
  }, [purchasePrice, profitMargin]);

  useEffect(() => {
    const storedLedgers = localStorage.getItem('ledger-transactions');
    if (storedLedgers) {
        const ledgers = JSON.parse(storedLedgers);
        setHasLedgerEntries(ledgers.length > 0);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('product-companies', JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem('products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('product-quantity-units', JSON.stringify(quantityUnits));
  }, [quantityUnits]);

  const totalStockValue = useMemo(() => {
    return products.reduce((total, product) => {
      return total + (product.quantity * product.purchasePrice);
    }, 0);
  }, [products]);

  const filteredProducts = useMemo(() => {
    let productsToFilter = products;
    if (filterCompany !== "all") {
      productsToFilter = productsToFilter.filter(p => p.company === filterCompany);
    }
    if (searchQuery.trim() !== "") {
        productsToFilter = productsToFilter.filter(p => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    return productsToFilter;
  }, [products, filterCompany, searchQuery]);

  const groupedProducts = useMemo(() => {
    const groups: { [key: string]: Product[] } = {};
    for (const product of filteredProducts) {
      if (!groups[product.company]) {
        groups[product.company] = [];
      }
      groups[product.company].push(product);
    }
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredProducts]);

  const resetForm = () => {
    setProductName("");
    setSelectedCompany("");
    setPurchasePrice("");
    setProfitMargin("");
    setRoundFigurePrice("");
    setQuantity("");
    setSelectedQuantityUnit("");
    setProductLargerUnit("");
    setProductConversionFactor("");
    setEditingProduct(null);
  };

  const handleAddNewProduct = () => {
    resetForm();
    setIsProductDialogOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductName(product.name);
    setSelectedCompany(product.company);
    setPurchasePrice(product.purchasePrice);
    setProfitMargin(product.profitMargin);
    setRoundFigurePrice(product.roundFigurePrice);
    setQuantity(product.quantity);
    setSelectedQuantityUnit(product.quantityUnit);
    setProductLargerUnit(product.largerUnit || "");
    setProductConversionFactor(product.conversionFactor || "");
    setIsProductDialogOpen(true);
  };

  const handleDeleteProduct = (id: number) => {
    if (hasLedgerEntries) {
      alert(t.cannotDeleteProduct[currentLanguage]);
      return;
    }
    setProducts(products.filter((p) => p.id !== id));
  };

  const handleSaveProduct = () => {
    if (!productName || !selectedCompany || !purchasePrice || !profitMargin || !quantity || !selectedQuantityUnit) {
      alert(currentLanguage === 'bn' ? 'অনুগ্রহ করে সকল আবশ্যক ঘর পূরণ করুন।' : 'Please fill all required fields.');
      return;
    }

    const newProduct: Product = {
      id: editingProduct ? editingProduct.id : Date.now(),
      name: productName,
      company: selectedCompany,
      purchasePrice: Number(purchasePrice),
      profitMargin: Number(profitMargin),
      sellingPrice: Number(sellingPrice),
      roundFigurePrice: Number(roundFigurePrice) || Number(sellingPrice),
      quantity: Number(quantity),
      quantityUnit: selectedQuantityUnit,
      largerUnit: productLargerUnit || undefined,
      conversionFactor: productConversionFactor ? Number(productConversionFactor) : undefined,
    };

    if (editingProduct) {
      setProducts(products.map((p) => (p.id === editingProduct.id ? newProduct : p)));
    } else {
      setProducts([...products, newProduct]);
    }
    setIsProductDialogOpen(false);
  };
  
  const handleAddCompany = () => {
    if (newCompany.trim() && newCompanyProfitMargin !== '' && !companies.some(c => c.name === newCompany.trim())) {
      setCompanies([...companies, { name: newCompany.trim(), profitMargin: Number(newCompanyProfitMargin) }]);
      setNewCompany("");
      setNewCompanyProfitMargin("");
    } else if (companies.some(c => c.name === newCompany.trim())) {
      alert(currentLanguage === 'bn' ? 'এই কোম্পানিটি ইতিমধ্যে বিদ্যমান।' : 'This company already exists.');
    } else {
        alert(t.fillBothFields[currentLanguage]);
    }
  };

  const handleDeleteCompany = (companyToDelete: string) => {
    if (hasLedgerEntries) {
      alert(t.cannotDeleteCompany[currentLanguage]);
      return;
    }
    setCompanies(companies.filter(c => c.name !== companyToDelete));
  };

  const handleAddQuantityUnit = () => {
    if (newQuantityUnit.trim() && !quantityUnits.includes(newQuantityUnit.trim())) {
      setQuantityUnits([...quantityUnits, newQuantityUnit.trim()]);
      setNewQuantityUnit("");
    } else if (quantityUnits.includes(newQuantityUnit.trim())) {
      alert(currentLanguage === 'bn' ? 'এই এককটি ইতিমধ্যে বিদ্যমান।' : 'This unit already exists.');
    }
  };

  const handleDeleteQuantityUnit = (unitToDelete: string) => {
    if (hasLedgerEntries) {
      alert(t.cannotDeleteUnit[currentLanguage]);
      return;
    }
    setQuantityUnits(quantityUnits.filter(u => u !== unitToDelete));
  };
  
  const handleGenerateReport = () => {
    const params = new URLSearchParams();
    if (reportCompany !== 'all') {
      params.set('company', reportCompany);
    }
    
    const url = `/products/print?${params.toString()}`;
    window.open(url, '_blank');
    setIsPrintDialogOpen(false);
  };

  const formatProductQuantity = (product: Product) => {
    if (product.largerUnit && product.conversionFactor && product.conversionFactor > 0) {
      const totalInLargerUnit = product.quantity;
      const largerUnitCount = Math.floor(totalInLargerUnit);
      const remainder = totalInLargerUnit - largerUnitCount;
      const smallerUnitCount = Math.round(remainder * product.conversionFactor);

      const parts = [];
      if (largerUnitCount > 0) {
        parts.push(`${largerUnitCount} ${product.quantityUnit}`);
      }
      if (smallerUnitCount > 0) {
        parts.push(`${smallerUnitCount} ${product.largerUnit}`);
      }
      
      if (parts.length === 0 && product.quantityUnit) {
        return `0 ${product.quantityUnit}`;
      }

      return parts.join(', ');
    }
    return `${product.quantity} ${product.quantityUnit}`;
  };

  const t = {
    products: { en: 'Product List', bn: 'পণ্য তালিকা' },
    manageProducts: { en: 'Manage your product list.', bn: 'আপনার পণ্যের তালিকা পরিচালনা করুন।' },
    addProduct: { en: 'Add Product', bn: 'নতুন পণ্য' },
    productName: { en: 'Product Name', bn: 'পণ্যের নাম' },
    company: { en: 'Company', bn: 'কোম্পানি' },
    purchasePrice: { en: 'Purchase Price', bn: 'ক্রয় মূল্য' },
    profitMargin: { en: 'Profit Margin (%)', bn: 'লাভের হার (%)' },
    sellingPrice: { en: 'Selling Price', bn: 'বিক্রয় মূল্য' },
    roundFigurePrice: { en: 'Round Figure Price', bn: 'রাউন্ড ফিগার মূল্য' },
    profitPerUnit: { en: 'Profit / Unit', bn: 'লাভ / একক' },
    quantity: { en: 'Quantity', bn: 'পরিমাণ' },
    totalValue: { en: 'Total Value', bn: 'মোট মূল্য' },
    actions: { en: 'Actions', bn: 'কার্যকলাপ' },
    edit: { en: 'Edit', bn: 'এডিট' },
    delete: { en: 'Delete', bn: 'মুছুন' },
    save: { en: 'Save', bn: 'সংরক্ষণ' },
    cancel: { en: 'Cancel', bn: 'বাতিল' },
    editProduct: { en: 'Edit Product', bn: 'পণ্য তথ্য পরিবর্তন' },
    addNewProduct: { en: 'Add New Product', bn: 'নতুন পণ্য যোগ' },
    formDescription: { en: 'Fill in the details to add or update a product.', bn: 'পণ্য যোগ বা আপডেট করতে বিবরণ পূরণ করুন।' },
    noProducts: { en: 'No products found.', bn: 'কোনো পণ্য পাওয়া যায়নি।' },
    manageCompaniesAndUnits: { en: 'Manage Companies & Units', bn: 'কোম্পানি ও একক পরিচালনা' },
    manageCompaniesAndUnitsDescription: { en: 'Add or remove companies and quantity units.', bn: 'কোম্পানি এবং পরিমাণ একক যোগ বা মুছে ফেলুন।' },
    companyName: { en: 'Company Name', bn: 'কোম্পানির নাম'},
    addCompany: { en: 'Add Company', bn: 'কোম্পানি যোগ করুন' },
    noCompanies: { en: 'No companies defined.', bn: 'কোনো কোম্পানি যোগ করা হয়নি।' },
    selectCompany: { en: 'Select a company', bn: 'একটি কোম্পানি নির্বাচন করুন' },
    profitMarginCompany: { en: 'Default Profit Margin (%)', bn: 'ডিফল্ট লাভের হার (%)' },
    fillBothFields: { en: 'Please fill both company name and profit margin.', bn: 'অনুগ্রহ করে কোম্পানির নাম এবং লাভের হার উভয়ই পূরণ করুন।' },
    manageQuantityUnits: { en: 'Manage Quantity Units', bn: 'একক পরিচালনা' },
    newUnit: { en: 'New Unit (e.g., Piece, Cartoon)', bn: 'নতুন একক (যেমন: পিস, কার্টুন)' },
    addUnit: { en: 'Add Unit', bn: 'একক যোগ' },
    noUnits: { en: 'No units defined.', bn: 'কোনো একক যোগ করা হয়নি।' },
    quantityUnit: { en: 'Larger Unit', bn: 'বড় একক' },
    selectUnit: { en: 'Select a unit', bn: 'একটি একক নির্বাচন করুন' },
    largerUnit: { en: 'Smaller Unit', bn: 'ছোট একক' },
    conversionFactor: { en: 'Smaller units per larger unit', bn: 'বড় এককে ছোট এককের সংখ্যা' },
    conversion: { en: 'Conversion', bn: 'রূপান্তর' },
    totalStockValue: { en: 'Total Stock Value', bn: 'মোট স্টক মূল্য' },
    printReport: { en: "Print Product List", bn: "পণ্যের তালিকা প্রিন্ট করুন" },
    generateReport: { en: "Generate Report", bn: "রিপোর্ট তৈরি করুন" },
    allCompanies: { en: "All Companies", bn: "সকল কোম্পানি" },
    searchProduct: { en: 'Search product...', bn: 'পণ্য খুঁজুন...' },
    cannotDeleteProduct: { en: 'Cannot delete product while ledger entries exist.', bn: 'সংরক্ষিত খাতা থাকায় পণ্য মুছে ফেলা যাবে না।' },
    cannotDeleteCompany: { en: 'Cannot delete company while ledger entries exist.', bn: 'সংরক্ষিত খাতা থাকায় কোম্পানি মুছে ফেলা যাবে না।' },
    cannotDeleteUnit: { en: 'Cannot delete unit while ledger entries exist.', bn: 'সংরক্ষিত খাতা থাকায় একক মুছে ফেলা যাবে না।' },
  };

  return (
    <div className="flex flex-col gap-6">
       <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">
          {t.products[currentLanguage]}
        </h1>
        <div className="flex items-center gap-4">
            <div className="text-right p-2 rounded-lg border bg-card">
              <div className="text-xs font-medium text-muted-foreground">{t.totalStockValue[currentLanguage]}</div>
              <div className="text-lg sm:text-xl font-bold"><AnimatedNumber value={totalStockValue} formatter={formatCurrency}/></div>
            </div>
            <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon"><Printer className="h-4 w-4"/></Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t.printReport[currentLanguage]}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid gap-2">
                      <Label>{t.company[currentLanguage]}</Label>
                      <Select value={reportCompany} onValueChange={setReportCompany}>
                        <SelectTrigger>
                          <SelectValue placeholder={t.selectCompany[currentLanguage]} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t.allCompanies[currentLanguage]}</SelectItem>
                          {companies.map((company) => (
                            <SelectItem key={company.name} value={company.name}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPrintDialogOpen(false)}>{t.cancel[currentLanguage]}</Button>
                  <Button onClick={handleGenerateReport}>{t.generateReport[currentLanguage]}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full">
        <Card>
          <AccordionItem value="item-1" className="border-b-0">
            <AccordionTrigger className="p-6 hover:no-underline">
              <div className="flex flex-col items-start text-left">
                <CardTitle>{t.manageCompaniesAndUnits[currentLanguage]}</CardTitle>
                <CardDescription className="pt-1">{t.manageCompaniesAndUnitsDescription[currentLanguage]}</CardDescription>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                {/* Column 1: Company Management */}
                <div className="space-y-4">
                  <h3 className="text-base font-medium text-foreground">{language === 'bn' ? 'কোম্পানি' : 'Company'}</h3>
                  <div className="p-4 border rounded-lg space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="newCompany">{t.companyName[currentLanguage]}</Label>
                      <Input
                        id="newCompany"
                        placeholder={t.companyName[currentLanguage]}
                        value={newCompany}
                        onChange={(e) => setNewCompany(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="newCompanyProfitMargin">{t.profitMarginCompany[currentLanguage]}</Label>
                      <Input
                        id="newCompanyProfitMargin"
                        type="number"
                        placeholder="e.g. 10"
                        value={newCompanyProfitMargin}
                        onChange={(e) => setNewCompanyProfitMargin(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleAddCompany} className="w-full">{t.addCompany[currentLanguage]}</Button>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">{currentLanguage === 'bn' ? 'সংরক্ষিত কোম্পানি' : 'Saved Companies'}</h3>
                    <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
                      {companies.length > 0 ? (
                        companies.map((c) => (
                          <div key={c.name} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                            <div>
                              <span className="font-medium">{c.name}</span>
                              <span className="text-xs text-muted-foreground block">{`${t.profitMargin[currentLanguage]}: ${c.profitMargin}%`}</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteCompany(c.name)} disabled={hasLedgerEntries}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-center text-muted-foreground pt-4">{t.noCompanies[currentLanguage]}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Column 2: Quantity Unit Management */}
                <div className="space-y-4">
                  <h3 className="text-base font-medium text-foreground">{t.manageQuantityUnits[currentLanguage]}</h3>
                  <div className="p-4 border rounded-lg space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="newQuantityUnit">{t.newUnit[currentLanguage]}</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="newQuantityUnit"
                          placeholder={currentLanguage === 'bn' ? 'যেমন: পিস, কার্টুন' : 'e.g. Piece, Cartoon'}
                          value={newQuantityUnit}
                          onChange={(e) => setNewQuantityUnit(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddQuantityUnit()}
                        />
                        <Button onClick={handleAddQuantityUnit}>{t.addUnit[currentLanguage]}</Button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">{currentLanguage === 'bn' ? 'সংরক্ষিত একক' : 'Saved Units'}</h3>
                    <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
                      {quantityUnits.length > 0 ? (
                        quantityUnits.map((unit) => (
                          <div key={unit} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                            <span>{unit}</span>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteQuantityUnit(unit)} disabled={hasLedgerEntries}>
                               <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-center text-muted-foreground pt-4">{t.noUnits[currentLanguage]}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Card>
      </Accordion>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <CardTitle>{t.products[currentLanguage]}</CardTitle>
                <CardDescription>{t.manageProducts[currentLanguage]}</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder={t.searchProduct[currentLanguage]}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-full sm:w-[250px]"
                />
                </div>
                <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger id="company-filter" className="w-full sm:w-[200px]">
                    <SelectValue placeholder={t.selectCompany[currentLanguage]} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t.allCompanies[currentLanguage]}</SelectItem>
                    {companies.map(company => (
                    <SelectItem key={company.name} value={company.name}>{company.name}</SelectItem>
                    ))}
                </SelectContent>
                </Select>
                 <Button onClick={handleAddNewProduct}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t.addProduct[currentLanguage]}
                </Button>
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.productName[currentLanguage]}</TableHead>
                <TableHead className="text-right">{t.purchasePrice[currentLanguage]}</TableHead>
                <TableHead className="text-right">{t.sellingPrice[currentLanguage]}</TableHead>
                <TableHead className="text-right">{t.roundFigurePrice[currentLanguage]}</TableHead>
                <TableHead className="text-right">{t.profitPerUnit[currentLanguage]}</TableHead>
                <TableHead className="text-right">{t.quantity[currentLanguage]}</TableHead>
                <TableHead>{t.conversion[currentLanguage]}</TableHead>
                <TableHead className="text-right">{t.totalValue[currentLanguage]}</TableHead>
                <TableHead className="text-right">{t.actions[currentLanguage]}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedProducts.length > 0 ? (
                groupedProducts.map(([company, companyProducts]) => (
                  <React.Fragment key={company}>
                    <TableRow className="border-b-0 bg-primary/10 hover:bg-primary/10">
                        <TableCell colSpan={9} className="font-bold text-primary py-2 px-4">
                            {company}
                        </TableCell>
                    </TableRow>
                    {companyProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.purchasePrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.sellingPrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.roundFigurePrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.roundFigurePrice - product.purchasePrice)}</TableCell>
                        <TableCell className="text-right">{formatProductQuantity(product)}</TableCell>
                        <TableCell>
                            {product.largerUnit && product.conversionFactor 
                                ? `1 ${product.quantityUnit} = ${product.conversionFactor} ${product.largerUnit}` 
                                : '-'}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(product.purchasePrice * product.quantity)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(product.id)} disabled={hasLedgerEntries}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center h-24">
                    {t.noProducts[currentLanguage]}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? t.editProduct[currentLanguage] : t.addNewProduct[currentLanguage]}
            </DialogTitle>
            <DialogDescription>
             {t.formDescription[currentLanguage]}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="productName">{t.productName[currentLanguage]}</Label>
              <Input id="productName" value={productName} onChange={(e) => setProductName(e.target.value)} />
            </div>
             <div className="grid gap-2">
                <Label htmlFor="company">{t.company[currentLanguage]}</Label>
                <Select 
                  value={selectedCompany} 
                  onValueChange={(companyName) => {
                    setSelectedCompany(companyName);
                    const company = companies.find(c => c.name === companyName);
                    if (company) {
                        setProfitMargin(company.profitMargin);
                    }
                }}>
                  <SelectTrigger>
                      <SelectValue placeholder={t.selectCompany[currentLanguage]} />
                  </SelectTrigger>
                  <SelectContent>
                      {companies.map((c) => (
                          <SelectItem key={c.name} value={c.name}>
                              {c.name}
                          </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="purchasePrice">{t.purchasePrice[currentLanguage]}</Label>
              <Input id="purchasePrice" type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profitMargin">{t.profitMargin[currentLanguage]}</Label>
              <Input id="profitMargin" type="number" value={profitMargin} onChange={(e) => setProfitMargin(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sellingPrice">{t.sellingPrice[currentLanguage]}</Label>
              <Input id="sellingPrice" value={formatCurrency(Number(sellingPrice))} readOnly disabled className="bg-muted" />
            </div>
             <div className="grid gap-2">
              <Label htmlFor="roundFigurePrice">{t.roundFigurePrice[currentLanguage]}</Label>
              <Input id="roundFigurePrice" type="number" value={roundFigurePrice} onChange={(e) => setRoundFigurePrice(e.target.value)} placeholder={currentLanguage === 'bn' ? `ঐচ্ছিক, ডিফল্ট: ${sellingPrice || '0.00'}` : `Optional, defaults to: ${sellingPrice || '0.00'}`} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantity">{`${t.quantity[currentLanguage]}${selectedQuantityUnit ? ` / ${selectedQuantityUnit}` : ''}`}</Label>
              <Input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantityUnit">{t.quantityUnit[currentLanguage]}</Label>
              <Select value={selectedQuantityUnit} onValueChange={setSelectedQuantityUnit}>
                <SelectTrigger>
                    <SelectValue placeholder={t.selectUnit[currentLanguage]} />
                </SelectTrigger>
                <SelectContent>
                    {quantityUnits.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                            {unit}
                        </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="largerUnit">{t.largerUnit[currentLanguage]}</Label>
                <Select value={productLargerUnit} onValueChange={setProductLargerUnit}>
                    <SelectTrigger>
                        <SelectValue placeholder={t.selectUnit[currentLanguage]} />
                    </SelectTrigger>
                    <SelectContent>
                        {quantityUnits.filter(u => u !== selectedQuantityUnit).map((unit) => (
                            <SelectItem key={unit} value={unit}>
                                {unit}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="conversionFactor">{t.conversionFactor[currentLanguage]}</Label>
                <Input id="conversionFactor" type="number" value={productConversionFactor} onChange={(e) => setProductConversionFactor(e.target.value)} placeholder="e.g. 12" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" onClick={() => setIsProductDialogOpen(false)}>
                {t.cancel[currentLanguage]}
              </Button>
            </DialogClose>
            <Button type="submit" onClick={handleSaveProduct}>{t.save[currentLanguage]}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
