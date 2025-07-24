
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/context/language-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Printer, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { AnimatedNumber } from "@/components/ui/animated-number";


// Types
type Company = {
  name: string;
};

type DamagedItemRecord = {
  ledgerId: number;
  date: string;
  productName: string;
  company: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
};

type LedgerEntry = {
  id: number;
  date: string;
  damagedItems?: {
    productId: number;
    productName: string;
    unit: string;
    pricePerUnit: number;
    quantity: number;
    totalPrice: number;
  }[];
};

type FullProduct = {
  id: number;
  company: string;
};

const formatCurrency = (amount: number) => `৳${amount.toFixed(2)}`;

export default function DamagedProductsPage() {
  const { language } = useLanguage();
  const [damagedItems, setDamagedItems] = useState<DamagedItemRecord[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  
  // States for Print dialog
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [reportCompany, setReportCompany] = useState<string>("all");
  const [reportDate, setReportDate] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    try {
      const storedCompanies = localStorage.getItem("product-companies");
      if (storedCompanies) {
        setCompanies(JSON.parse(storedCompanies));
      }

      const storedProducts = localStorage.getItem("products");
      const products: FullProduct[] = storedProducts
        ? JSON.parse(storedProducts)
        : [];
      const productMap = new Map<number, FullProduct>(
        products.map((p) => [p.id, p])
      );

      const storedLedgers = localStorage.getItem("ledger-transactions");
      if (storedLedgers) {
        const ledgers: LedgerEntry[] = JSON.parse(storedLedgers);
        const allDamagedItems: DamagedItemRecord[] = [];

        ledgers.forEach((ledger) => {
          if (ledger.damagedItems && ledger.damagedItems.length > 0) {
            ledger.damagedItems.forEach((item) => {
              const product = productMap.get(item.productId);
              allDamagedItems.push({
                ledgerId: ledger.id,
                date: ledger.date,
                productName: item.productName,
                company: product?.company || "N/A",
                quantity: item.quantity,
                unit: item.unit,
                pricePerUnit: item.pricePerUnit,
                totalPrice: item.totalPrice,
              });
            });
          }
        });

        allDamagedItems.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setDamagedItems(allDamagedItems);
      }
    } catch (e) {
      console.error("Failed to load damaged products data", e);
    }
  }, []);

  const filteredDamagedItems = useMemo(() => {
    if (selectedCompany === "all") {
      return damagedItems;
    }
    return damagedItems.filter((item) => item.company === selectedCompany);
  }, [damagedItems, selectedCompany]);

  const totalDamagedValue = useMemo(() => {
    return filteredDamagedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [filteredDamagedItems]);

  const handleGenerateReport = () => {
    const params = new URLSearchParams();
    if (reportCompany !== 'all') {
      params.set('company', reportCompany);
    }
    if (reportDate?.from) {
      params.set('from', format(reportDate.from, 'yyyy-MM-dd'));
    }
    if (reportDate?.to) {
      params.set('to', format(reportDate.to, 'yyyy-MM-dd'));
    }
    
    const url = `/damaged-products/print?${params.toString()}`;
    window.open(url, '_blank');
    setIsPrintDialogOpen(false);
  };


  const t = {
    title: { en: "Damaged Products", bn: "ক্ষতিগ্রস্ত পণ্য" },
    description: {
      en: "A log of all products recorded as damaged.",
      bn: "ক্ষতিগ্রস্ত হিসেবে রেকর্ড করা সমস্ত পণ্যের একটি লগ।",
    },
    ledgerNo: { en: "Ledger No.", bn: "খাতা নং" },
    date: { en: "Date", bn: "তারিখ" },
    productName: { en: "Product Name", bn: "পণ্যের নাম" },
    company: { en: "Company", bn: "কোম্পানি" },
    quantity: { en: "Quantity", bn: "পরিমাণ" },
    pricePerUnit: { en: "Price / Unit", bn: "একক মূল্য" },
    totalPrice: { en: "Total Price", bn: "মোট মূল্য" },
    noDamagedProducts: {
      en: "No damaged products found.",
      bn: "কোনো ক্ষতিগ্রস্ত পণ্য পাওয়া যায়নি।",
    },
    totalDamagedValue: {
      en: "Total Damaged Value",
      bn: "সর্বমোট ক্ষতির পরিমাণ",
    },
    selectCompany: { en: "Select Company", bn: "কোম্পানি নির্বাচন" },
    allCompanies: { en: "All Companies", bn: "সকল কোম্পানি" },
    customFormat: { en: "Custom Format", bn: "কাস্টম ফর্মেট" },
    cancel: { en: "Cancel", bn: "বাতিল" },
    generateReport: { en: "Generate Report", bn: "রিপোর্ট তৈরি করুন" },
    printReport: { en: "Print Report", bn: "রিপোর্ট প্রিন্ট" },
    dateRange: { en: "Date Range", bn: "তারিখ সীমা" },
    pickDate: { en: "Pick a date range", bn: "একটি তারিখ সীমা বাছুন" },
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">{t.title[language]}</h1>
        <Button asChild variant="outline">
          <Link href="/damaged-products/custom-format">{t.customFormat[language]}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>{t.title[language]}</CardTitle>
            <CardDescription>{t.description[language]}</CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Label
              htmlFor="company-filter"
              className="text-sm font-medium whitespace-nowrap"
            >
              {t.company[language]}
            </Label>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger id="company-filter" className="w-full sm:w-[200px]">
                <SelectValue placeholder={t.selectCompany[language]} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allCompanies[language]}</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.name} value={company.name}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                      <Label>{t.company[language]}</Label>
                      <Select value={reportCompany} onValueChange={setReportCompany}>
                        <SelectTrigger>
                          <SelectValue placeholder={t.selectCompany[language]} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t.allCompanies[language]}</SelectItem>
                          {companies.map((company) => (
                            <SelectItem key={company.name} value={company.name}>
                              {company.name}
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
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.ledgerNo[language]}</TableHead>
                <TableHead>{t.date[language]}</TableHead>
                <TableHead>{t.productName[language]}</TableHead>
                <TableHead>{t.company[language]}</TableHead>
                <TableHead className="text-right">
                  {t.quantity[language]}
                </TableHead>
                <TableHead className="text-right">
                  {t.pricePerUnit[language]}
                </TableHead>
                <TableHead className="text-right">
                  {t.totalPrice[language]}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDamagedItems.length > 0 ? (
                filteredDamagedItems.map((item, index) => (
                  <TableRow key={`${item.ledgerId}-${index}`}>
                    <TableCell className="font-medium">{item.ledgerId}</TableCell>
                    <TableCell>
                      {new Date(item.date).toLocaleDateString(
                        language === "bn" ? "bn-BD" : "en-CA"
                      )}
                    </TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>{item.company}</TableCell>
                    <TableCell className="text-right">
                      {item.quantity} {item.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.pricePerUnit)}
                    </TableCell>
                    <TableCell className="text-right text-destructive font-medium">
                      {formatCurrency(item.totalPrice)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    {t.noDamagedProducts[language]}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.totalDamagedValue[language]}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-destructive">
            <AnimatedNumber value={totalDamagedValue} formatter={formatCurrency} />
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
