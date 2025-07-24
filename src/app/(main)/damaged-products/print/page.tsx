
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/language-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';

// Types
type ProfileSettings = {
  businessName: string;
  ownerName: string;
  mobile: string;
  email: string;
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

type FullProduct = {
  id: number;
  company: string;
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

const formatCurrency = (amount: number) => `৳${amount.toFixed(2)}`;

export default function PrintDamagedProductsPage() {
    const searchParams = useSearchParams();
    const { language } = useLanguage();

    const [items, setItems] = useState<DamagedItemRecord[]>([]);
    const [profile, setProfile] = useState<Partial<ProfileSettings>>({});
    const [isLoading, setIsLoading] = useState(true);

    const fromDateStr = searchParams.get('from');
    const toDateStr = searchParams.get('to');
    const company = searchParams.get('company');

    useEffect(() => {
      try {
        const storedProfile = localStorage.getItem('profile-settings');
        if (storedProfile) setProfile(JSON.parse(storedProfile));

        const storedProducts = localStorage.getItem("products");
        const products: FullProduct[] = storedProducts ? JSON.parse(storedProducts) : [];
        const productMap = new Map<number, FullProduct>(products.map((p) => [p.id, p]));

        const storedLedgers = localStorage.getItem("ledger-transactions");
        let allDamagedItems: DamagedItemRecord[] = [];
        if (storedLedgers) {
          const ledgers: LedgerEntry[] = JSON.parse(storedLedgers);

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
        }
        
        const fromDate = fromDateStr ? parseISO(fromDateStr) : null;
        const toDate = toDateStr ? parseISO(toDateStr) : null;

        const filtered = allDamagedItems.filter(item => {
            let keep = true;
            if (company && item.company !== company) {
                keep = false;
            }
            if (isValid(fromDate) && new Date(item.date) < fromDate!) {
                keep = false;
            }
            if (isValid(toDate) && new Date(item.date) > toDate!) {
                keep = false;
            }
            return keep;
        });

        setItems(filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      } catch (e) {
        console.error("Failed to load or filter data", e);
      } finally {
        setIsLoading(false);
      }
    }, [fromDateStr, toDateStr, company]);

    const totalValue = useMemo(() => {
        return items.reduce((sum, item) => sum + item.totalPrice, 0);
    }, [items]);
    
    const handlePrint = () => window.print();
    
    const t = {
        title: { en: "Damaged Products Report", bn: "ক্ষতিগ্রস্ত পণ্যের প্রতিবেদন" },
        date: { en: "Date", bn: "তারিখ" },
        company: { en: "Company", bn: "কোম্পানি" },
        allCompanies: { en: "All", bn: "সকল" },
        ledgerNo: { en: "Ledger No.", bn: "খাতা নং" },
        productName: { en: "Product Name", bn: "পণ্যের নাম" },
        quantity: { en: "Quantity", bn: "পরিমাণ" },
        pricePerUnit: { en: "Price / Unit", bn: "একক মূল্য" },
        totalPrice: { en: "Total Price", bn: "মোট মূল্য" },
        grandTotal: { en: "Grand Total", bn: "সর্বমোট" },
        noData: { en: "No data found for the selected criteria.", bn: "নির্বাচিত মানদণ্ডের জন্য কোনো তথ্য পাওয়া যায়নি।" },
        print: { en: "Print", bn: "প্রিন্ট" },
    };

    if (isLoading) {
        return (
            <div className="p-8">
                <Skeleton className="h-8 w-1/2 mb-4" />
                <Skeleton className="h-4 w-1/4 mb-8" />
                <Skeleton className="h-96 w-full" />
            </div>
        )
    }

    return (
        <div className="p-4">
             <div id="printable-damaged-report-filtered">
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
                    <p><strong>{t.company[language]}:</strong> {company || t.allCompanies[language]}</p>
                    {fromDateStr && <p><strong>{t.date[language]}:</strong> {format(parseISO(fromDateStr), 'P')} - {toDateStr ? format(parseISO(toDateStr), 'P') : 'Today'}</p>}
                </div>

                <Separator className="my-4" />
                
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t.ledgerNo[language]}</TableHead>
                            <TableHead>{t.date[language]}</TableHead>
                            <TableHead>{t.productName[language]}</TableHead>
                            <TableHead>{t.company[language]}</TableHead>
                            <TableHead className="text-right">{t.quantity[language]}</TableHead>
                            <TableHead className="text-right">{t.pricePerUnit[language]}</TableHead>
                            <TableHead className="text-right">{t.totalPrice[language]}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length > 0 ? items.map((item, index) => (
                            <TableRow key={`${item.ledgerId}-${index}`}>
                                <TableCell>{item.ledgerId}</TableCell>
                                <TableCell>{format(new Date(item.date), 'P')}</TableCell>
                                <TableCell>{item.productName}</TableCell>
                                <TableCell>{item.company}</TableCell>
                                <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.pricePerUnit)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell>
                            </TableRow>
                        )) : (
                           <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">{t.noData[language]}</TableCell>
                           </TableRow>
                        )}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={6} className="text-right font-bold">{t.grandTotal[language]}</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(totalValue)}</TableCell>
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


    
