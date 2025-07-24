
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/language-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

// Types
type ProfileSettings = { businessName: string; ownerName: string; mobile: string; email: string; };
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

export default function PrintMonthlySalesPage() {
    const searchParams = useSearchParams();
    const { language } = useLanguage();

    const [companySales, setCompanySales] = useState<LedgerCompanySale[]>([]);
    const [profile, setProfile] = useState<Partial<ProfileSettings>>({});
    const [isLoading, setIsLoading] = useState(true);

    const companyName = searchParams.get('company');
    const fromDateStr = searchParams.get('from');
    const toDateStr = searchParams.get('to');

    useEffect(() => {
      if (!companyName) {
        setIsLoading(false);
        return;
      }

      try {
        const storedProfile = localStorage.getItem('profile-settings');
        if (storedProfile) setProfile(JSON.parse(storedProfile));

        const storedCompanies: Company[] = JSON.parse(localStorage.getItem('product-companies') || '[]');
        const storedProducts: Product[] = JSON.parse(localStorage.getItem('products') || '[]');
        const storedLedgers: LedgerEntry[] = JSON.parse(localStorage.getItem('ledger-transactions') || '[]');
  
        const productMap = new Map<number, Product>(storedProducts.map(p => [p.id, p]));
        const companyMap = new Map<string, Company>(storedCompanies.map(c => [c.name, c]));
        
        const fromDate = fromDateStr ? parseISO(fromDateStr) : null;
        const toDate = toDateStr ? parseISO(toDateStr) : null;

        const filteredLedgers = storedLedgers.filter(ledger => {
            if (!isValid(new Date(ledger.date))) return false;
            const ledgerDate = new Date(ledger.date);
            if (fromDate && ledgerDate < fromDate) return false;
            if (toDate) {
              const inclusiveToDate = new Date(toDate);
              inclusiveToDate.setDate(inclusiveToDate.getDate() + 1);
              if (ledgerDate >= inclusiveToDate) return false;
            }
            return true;
        });
        
        const processedSales: LedgerCompanySale[] = [];
  
        for (const ledger of filteredLedgers) {
          let ledgerSaleWithProfit = 0;
          let ledgerSaleWithoutProfit = 0;
          let companyForThisLedger = '';
          
          for (const item of ledger.items) {
            const product = productMap.get(item.productId);
            if (!product || product.company !== companyName) continue;

            companyForThisLedger = product.company;

            let purchasePricePerSoldUnit = product.purchasePrice;
            if (product.largerUnit && product.conversionFactor && item.unit === product.largerUnit) {
              purchasePricePerSoldUnit = product.purchasePrice / product.conversionFactor;
            }
            
            ledgerSaleWithProfit += item.totalPrice;
            ledgerSaleWithoutProfit += item.quantitySold * purchasePricePerSoldUnit;
          }

          if (companyForThisLedger) {
            processedSales.push({
              ledgerId: ledger.id,
              date: ledger.date,
              day: ledger.day,
              companyName: companyForThisLedger,
              totalSaleWithProfit: ledgerSaleWithProfit,
              totalSaleWithoutProfit: ledgerSaleWithoutProfit,
              companyProfitMargin: companyMap.get(companyForThisLedger)?.profitMargin || 0,
            });
          }
        }
  
        const aggregatedSales = processedSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setCompanySales(aggregatedSales);

      } catch (e) {
        console.error("Failed to load or filter data", e);
      } finally {
        setIsLoading(false);
      }
    }, [companyName, fromDateStr, toDateStr]);

    const { totalSaleWithProfit, totalSaleWithoutProfit } = useMemo(() => {
        return companySales.reduce((acc, curr) => {
            acc.totalSaleWithProfit += curr.totalSaleWithProfit;
            acc.totalSaleWithoutProfit += curr.totalSaleWithoutProfit;
            return acc;
        }, { totalSaleWithProfit: 0, totalSaleWithoutProfit: 0 });
    }, [companySales]);
    
    const handlePrint = () => window.print();
    
    const t = {
        title: { en: "Company Sales Report", bn: "কোম্পানির বিক্রয় রিপোর্ট" },
        company: { en: "Company", bn: "কোম্পানি" },
        dateRange: { en: "Date Range", bn: "তারিখ সীমা" },
        allTime: { en: 'All Time', bn: 'সর্বদা' },
        ledgerNo: { en: 'Ledger No.', bn: 'খাতা নং' },
        date: { en: 'Date', bn: 'তারিখ' },
        day: { en: 'Day', bn: 'বার' },
        profitMargin: { en: 'Profit Margin', bn: 'লাভের হার' },
        totalSale: { en: 'Total Sale', bn: 'মোট বিক্রয়' },
        actualSale: { en: 'Actual Sale (Cost)', bn: 'প্রকৃত বিক্রয় (ক্রয়মূল্য)' },
        grandTotal: { en: "Grand Total", bn: "সর্বমোট" },
        noData: { en: "No data found for the selected criteria.", bn: "এই মানদণ্ডের জন্য কোনো তথ্য পাওয়া যায়নি।" },
        print: { en: "Print", bn: "প্রিন্ট" },
    };
    
    const formatDateRange = () => {
        if (!fromDateStr) return t.allTime[language];
        const from = format(parseISO(fromDateStr), 'P');
        const to = toDateStr ? format(parseISO(toDateStr), 'P') : (language === 'bn' ? 'আজ' : 'Today');
        return `${from} - ${to}`;
    }

    if (isLoading) {
        return (
            <div className="p-8 bg-white">
                <Skeleton className="h-8 w-1/2 mb-4" />
                <Skeleton className="h-4 w-1/4 mb-8" />
                <Skeleton className="h-96 w-full" />
            </div>
        )
    }

    if (!companyName) {
        return <div className="p-8 text-center text-red-500">Company name not provided.</div>
    }

    return (
        <div className="p-4 bg-white">
             <div id="printable-monthly-sales-report">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold">{profile.businessName || 'Business Name'}</h1>
                    <p>{profile.ownerName}</p>
                    <p>{profile.mobile}</p>
                    <p>{profile.email}</p>
                </header>
                
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold underline">{t.title[language]}</h2>
                </div>
                
                <div className="text-sm mb-4">
                    <p><strong>{t.company[language]}:</strong> {companyName}</p>
                    <p><strong>{t.dateRange[language]}:</strong> {formatDateRange()}</p>
                </div>

                <Separator className="my-4" />
                
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
                        {companySales.length > 0 ? companySales.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell>{item.ledgerId}</TableCell>
                                <TableCell>{format(new Date(item.date), 'P')}</TableCell>
                                <TableCell>{language === 'bn' ? new Date(item.date).toLocaleDateString('bn-BD', { weekday: 'long' }) : item.day}</TableCell>
                                <TableCell>{item.companyProfitMargin}%</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.totalSaleWithProfit)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.totalSaleWithoutProfit)}</TableCell>
                            </TableRow>
                        )) : (
                           <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">{t.noData[language]}</TableCell>
                           </TableRow>
                        )}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={4} className="text-right font-bold">{t.grandTotal[language]}</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(totalSaleWithProfit)}</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(totalSaleWithoutProfit)}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
            <div className="mt-8 text-center no-print">
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    {t.print[language]}
                </Button>
            </div>
        </div>
    );
}
