
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/context/language-context';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { Printer, Calendar as CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, subMonths, addDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';


// Types
type Company = { name: string; profitMargin: number; };
type Product = { id: number; name: string; company: string; purchasePrice: number; quantityUnit: string; largerUnit?: string; conversionFactor?: number; };
type LedgerItem = { productId: number; unit: string; quantitySold: number; totalPrice: number; };
type LedgerEntry = { id: number; date: string; day: string; items: LedgerItem[]; };
type LedgerCompanySale = {
  ledgerId: number;
  date: string;
  day: string;
  companyName: string;
  totalSaleWithProfit: number;
  totalSaleWithoutProfit: number;
  companyProfitMargin: number;
};

const formatCurrency = (amount: number) => `৳${amount.toFixed(2)}`;

export default function MonthlySalesPage() {
  const { language } = useLanguage();
  const [salesData, setSalesData] = useState<LedgerCompanySale[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  
  // Print Dialog State
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [printCompany, setPrintCompany] = useState('');
  const [reportDate, setReportDate] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    try {
      const storedCompanies: Company[] = JSON.parse(localStorage.getItem('product-companies') || '[]');
      const storedProducts: Product[] = JSON.parse(localStorage.getItem('products') || '[]');
      const storedLedgers: LedgerEntry[] = JSON.parse(localStorage.getItem('ledger-transactions') || '[]');

      setCompanies(storedCompanies);

      const productMap = new Map<number, Product>(storedProducts.map(p => [p.id, p]));
      const companyMap = new Map<string, Company>(storedCompanies.map(c => [c.name, c]));
      
      const processedSales: LedgerCompanySale[] = [];

      for (const ledger of storedLedgers) {
        const salesInLedgerByCompany: Record<string, { totalSaleWithProfit: number, totalSaleWithoutProfit: number }> = {};
        
        for (const item of ledger.items) {
          const product = productMap.get(item.productId);
          if (!product) continue;

          const companyName = product.company;

          if (!salesInLedgerByCompany[companyName]) {
            salesInLedgerByCompany[companyName] = {
              totalSaleWithProfit: 0,
              totalSaleWithoutProfit: 0,
            };
          }

          let purchasePriceOfSoldItems = 0;
          let purchasePricePerSoldUnit = product.purchasePrice;
          
          if (product.largerUnit && product.conversionFactor && item.unit === product.largerUnit) {
            purchasePricePerSoldUnit = product.purchasePrice / product.conversionFactor;
          }
          purchasePriceOfSoldItems = item.quantitySold * purchasePricePerSoldUnit;

          salesInLedgerByCompany[companyName].totalSaleWithProfit += item.totalPrice;
          salesInLedgerByCompany[companyName].totalSaleWithoutProfit += purchasePriceOfSoldItems;
        }

        for(const [companyName, sales] of Object.entries(salesInLedgerByCompany)) {
            processedSales.push({
                ledgerId: ledger.id,
                date: ledger.date,
                day: ledger.day,
                companyName: companyName,
                totalSaleWithProfit: sales.totalSaleWithProfit,
                totalSaleWithoutProfit: sales.totalSaleWithoutProfit,
                companyProfitMargin: companyMap.get(companyName)?.profitMargin || 0,
            });
        }
      }

      const salesArray = processedSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setSalesData(salesArray);

    } catch (e) {
      console.error("Failed to load sales data", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const companySummaries = useMemo(() => {
    const dataToSummarize = selectedCompany === 'all' 
      ? salesData
      : salesData.filter(d => d.companyName === selectedCompany);

    const companyData: Record<string, {
      totalSaleWithProfit: number;
      totalSaleWithoutProfit: number;
      sales: LedgerCompanySale[];
    }> = {};

    for (const sale of dataToSummarize) {
      if (!companyData[sale.companyName]) {
        companyData[sale.companyName] = {
          totalSaleWithProfit: 0,
          totalSaleWithoutProfit: 0,
          sales: []
        };
      }
      companyData[sale.companyName].totalSaleWithProfit += sale.totalSaleWithProfit;
      companyData[sale.companyName].totalSaleWithoutProfit += sale.totalSaleWithoutProfit;
      companyData[sale.companyName].sales.push(sale);
    }
    
    // Sort sales within each company by date descending
    for (const companyName in companyData) {
        companyData[companyName].sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    
    const sortedCompanyNames = Object.keys(companyData).sort((a,b) => a.localeCompare(b));
  
    return sortedCompanyNames.map(companyName => ({
      companyName,
      ...companyData[companyName]
    }));
  }, [selectedCompany, salesData]);

  const grandTotals = useMemo(() => {
      const dataForTotals = selectedCompany === 'all'
        ? salesData
        : salesData.filter(d => d.companyName === selectedCompany);

      return dataForTotals.reduce((acc, curr) => {
          acc.totalSaleWithProfit += curr.totalSaleWithProfit;
          acc.totalSaleWithoutProfit += curr.totalSaleWithoutProfit;
          return acc;
      }, { totalSaleWithProfit: 0, totalSaleWithoutProfit: 0 });
  }, [selectedCompany, salesData]);

  const handlePrintClick = (companyName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setPrintCompany(companyName);
    setIsPrintDialogOpen(true);
  };

  const handleGenerateReport = () => {
    if (!printCompany) return;
    const params = new URLSearchParams();
    params.set('company', printCompany);
    if (reportDate?.from) {
      params.set('from', format(reportDate.from, 'yyyy-MM-dd'));
    }
    if (reportDate?.to) {
      params.set('to', format(reportDate.to, 'yyyy-MM-dd'));
    }
    
    const url = `/monthly-sales/print?${params.toString()}`;
    window.open(url, '_blank');
    setIsPrintDialogOpen(false);
  };

  const setDateShortcut = (shortcut: 'today' | 'yesterday' | 'this_month' | 'last_month') => {
    const today = new Date();
    switch (shortcut) {
      case 'today':
        setReportDate({ from: today, to: today });
        break;
      case 'yesterday':
        const yesterday = addDays(today, -1);
        setReportDate({ from: yesterday, to: yesterday });
        break;
      case 'this_month':
        setReportDate({ from: startOfMonth(today), to: endOfMonth(today) });
        break;
      case 'last_month':
        const lastMonthStart = startOfMonth(subMonths(today, 1));
        const lastMonthEnd = endOfMonth(subMonths(today, 1));
        setReportDate({ from: lastMonthStart, to: lastMonthEnd });
        break;
    }
  };


  const t = {
    title: { en: 'Monthly Sales', bn: 'মাসিক বিক্রি' },
    description: { en: 'View daily sales breakdown by company.', bn: 'কোম্পানি অনুযায়ী দৈনিক বিক্রির হিসাব দেখুন।' },
    allCompanies: { en: 'All Companies', bn: 'সকল কোম্পানি' },
    selectCompany: { en: 'Select a company', bn: 'কোম্পানি নির্বাচন করুন' },
    ledgerNo: { en: 'Ledger No.', bn: 'খাতা নং' },
    company: { en: 'Company', bn: 'কোম্পানি' },
    date: { en: 'Date', bn: 'তারিখ' },
    day: { en: 'Day', bn: 'বার' },
    profitMargin: { en: 'Profit Margin', bn: 'লাভের হার' },
    totalSale: { en: 'Total Sale', bn: 'মোট বিক্রয়' },
    actualSale: { en: 'Actual Sale (Cost)', bn: 'প্রকৃত বিক্রয় (ক্রয়মূল্য)' },
    total: { en: 'Total', bn: 'সর্বমোট' },
    noSales: { en: 'No sales data found.', bn: 'কোনো বিক্রির তথ্য পাওয়া যায়নি।' },
    print: { en: 'Print', bn: 'প্রিন্ট' },
    printReport: { en: "Print Report for", bn: "রিপোর্ট প্রিন্ট করুন" },
    generateReport: { en: "Generate Report", bn: "রিপোর্ট তৈরি করুন" },
    dateRange: { en: "Date Range", bn: "তারিখ সীমা" },
    pickDate: { en: "Pick a date range", bn: "একটি তারিখ সীমা বাছুন" },
    cancel: { en: "Cancel", bn: "বাতিল" },
    today: { en: 'Today', bn: 'আজ' },
    yesterday: { en: 'Yesterday', bn: 'গতকাল' },
    thisMonth: { en: 'This Month', bn: 'চলতি মাস' },
    lastMonth: { en: 'Last Month', bn: 'গত মাস' },
  };

  if (isLoading) {
      return <div>Loading...</div>;
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold font-headline">{t.title[language]}</h1>
        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>{t.title[language]}</CardTitle>
              <CardDescription>{t.description[language]}</CardDescription>
            </div>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder={t.selectCompany[language]} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allCompanies[language]}</SelectItem>
                {companies.map(company => (
                  <SelectItem key={company.name} value={company.name}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="px-4 py-2 border-b">
                  <div className="grid grid-cols-[1fr,auto,150px,150px] items-center">
                      <div className="font-semibold text-muted-foreground">{t.company[language]}</div>
                      <div></div>
                      <div className="text-right font-semibold text-muted-foreground">{t.totalSale[language]}</div>
                      <div className="text-right font-semibold text-muted-foreground">{t.actualSale[language]}</div>
                  </div>
              </div>
            <Accordion type="single" collapsible className="w-full">
              {companySummaries.length > 0 ? (
                  companySummaries.map(({ companyName, totalSaleWithProfit, totalSaleWithoutProfit, sales }) => (
                  <AccordionItem value={companyName} key={companyName}>
                      <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 hover:no-underline text-sm">
                          <div className="grid grid-cols-[1fr,auto,150px,150px] w-full items-center">
                              <div className="text-primary font-medium text-left">{companyName}</div>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => handlePrintClick(companyName, e)} aria-label={`${t.print[language]} ${companyName}`}>
                                  <Printer className="h-4 w-4" />
                              </Button>
                              <div className="text-right font-medium">{formatCurrency(totalSaleWithProfit)}</div>
                              <div className="text-right font-medium">{formatCurrency(totalSaleWithoutProfit)}</div>
                          </div>
                      </AccordionTrigger>
                      <AccordionContent>
                          <div className="bg-muted/30 p-4 border-t">
                              <Table>
                                  <TableHeader>
                                      <TableRow>
                                          <TableHead>{t.ledgerNo[language]}</TableHead>
                                          <TableHead>{t.date[language]}</TableHead>
                                          <TableHead>{t.day[language]}</TableHead>
                                          <TableHead>{t.profitMargin[language]}</TableHead>
                                          <TableHead className="text-right">{t.totalSale[language]}</TableHead>
                                          <TableHead className="text-right">{t.actualSale[language]}</TableHead>
                                      </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                      {sales.map((sale, index) => (
                                          <TableRow key={`${sale.ledgerId}-${sale.companyName}-${index}`} className="bg-background">
                                              <TableCell>{sale.ledgerId}</TableCell>
                                              <TableCell>{new Date(sale.date).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-CA')}</TableCell>
                                              <TableCell>{sale.day}</TableCell>
                                              <TableCell>{sale.companyProfitMargin}%</TableCell>
                                              <TableCell className="text-right font-medium">{formatCurrency(sale.totalSaleWithProfit)}</TableCell>
                                              <TableCell className="text-right">{formatCurrency(sale.totalSaleWithoutProfit)}</TableCell>
                                          </TableRow>
                                      ))}
                                  </TableBody>
                              </Table>
                          </div>
                      </AccordionContent>
                  </AccordionItem>
                  ))
              ) : (
                  <div className="text-center h-24 flex items-center justify-center text-muted-foreground">
                      {t.noSales[language]}
                  </div>
              )}
              </Accordion>
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-[1fr,150px,150px] w-full px-4 text-lg font-bold">
                    <div className="text-right col-span-1">{t.total[language]}</div>
                    <div className="text-right">{formatCurrency(grandTotals.totalSaleWithProfit)}</div>
                    <div className="text-right">{formatCurrency(grandTotals.totalSaleWithoutProfit)}</div>
                </div>
              </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.printReport[language]} {printCompany}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
              <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDateShortcut('today')}>{t.today[language]}</Button>
                  <Button variant="outline" size="sm" onClick={() => setDateShortcut('yesterday')}>{t.yesterday[language]}</Button>
                  <Button variant="outline" size="sm" onClick={() => setDateShortcut('this_month')}>{t.thisMonth[language]}</Button>
                  <Button variant="outline" size="sm" onClick={() => setDateShortcut('last_month')}>{t.lastMonth[language]}</Button>
              </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPrintDialogOpen(false)}>{t.cancel[language]}</Button>
            <Button onClick={handleGenerateReport}>{t.generateReport[language]}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
