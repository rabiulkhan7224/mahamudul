
"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/language-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

// Types
type ProfileSettings = { businessName: string; ownerName: string; mobile: string; email: string; };
type Employee = { id: number; name:string; };
type LedgerItem = { productId: number; productName: string; unit: string; pricePerUnit: number; summaryQuantity: number; quantitySold: number; quantityReturned: number; totalPrice: number; };
type LedgerRewardItem = { rewardId: number; rewardName: string; unit: string; pricePerUnit: number; quantity: number; totalPrice: number; };
type DailySummary = { id: number; date: string; day: string; market: string; salespersonId: number; items: LedgerItem[]; rewardItems?: LedgerRewardItem[]; totalSale: number; };

const formatCurrency = (amount: number) => `৳${amount.toFixed(2)}`;

export default function PrintDailySummaryPage() {
    const searchParams = useSearchParams();
    const { language } = useLanguage();

    const [summary, setSummary] = useState<DailySummary | null>(null);
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [profile, setProfile] = useState<Partial<ProfileSettings>>({});
    const [isLoading, setIsLoading] = useState(true);

    const summaryId = searchParams.get('summaryId');

    useEffect(() => {
        if (!summaryId) {
            setIsLoading(false);
            return;
        }
        
        try {
            const storedProfile = localStorage.getItem('profile-settings');
            if (storedProfile) setProfile(JSON.parse(storedProfile));

            const storedSummaries = localStorage.getItem('daily-summaries');
            const summaries: DailySummary[] = storedSummaries ? JSON.parse(storedSummaries) : [];
            const targetSummary = summaries.find(s => String(s.id) === summaryId);
            setSummary(targetSummary || null);

            if (targetSummary) {
                const storedEmployees = localStorage.getItem('employees');
                const employees: Employee[] = storedEmployees ? JSON.parse(storedEmployees) : [];
                const targetEmployee = employees.find(e => e.id === targetSummary.salespersonId);
                setEmployee(targetEmployee || null);
            }

        } catch (e) {
            console.error("Failed to load data for printing", e);
        } finally {
            setIsLoading(false);
        }
    }, [summaryId]);

    const handlePrint = () => window.print();

    const t = {
        title: { en: "Daily Summary Report", bn: "দৈনিক সামারী রিপোর্ট" },
        date: { en: "Date", bn: "তারিখ" },
        day: { en: "Day", bn: "বার" },
        market: { en: "Market", bn: "বাজার" },
        salesperson: { en: "Salesperson", bn: "সেলসকর্মী" },
        products: { en: "Products", bn: "পণ্যসমূহ" },
        productName: { en: "Product", bn: "পণ্য" },
        quantity: { en: "Quantity", bn: "পরিমাণ" },
        unit: { en: "Unit", bn: "একক" },
        price: { en: "Price", bn: "মূল্য" },
        total: { en: "Total", bn: "মোট" },
        rewards: { en: "Rewards", bn: "পুরস্কারসমূহ" },
        grandTotal: { en: "Grand Total", bn: "সর্বমোট" },
        noData: { en: "Summary not found.", bn: "সামারী পাওয়া যায়নি।" },
        print: { en: "Print", bn: "প্রিন্ট" },
    };

    if (isLoading) {
        return (
            <div className="p-8 bg-white">
                <Skeleton className="h-8 w-1/2 mb-4" />
                <Skeleton className="h-4 w-1/4 mb-8" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!summary) {
        return <div className="p-8 text-center text-red-500">{t.noData[language]}</div>;
    }

    return (
        <div className="p-4 bg-white">
             <div id="printable-daily-summary">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold">{profile.businessName || 'Business Name'}</h1>
                    <p>{profile.ownerName}</p>
                    <p>{profile.mobile}</p>
                    <p>{profile.email}</p>
                </header>
                
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold underline">{t.title[language]}</h2>
                </div>
                
                <div className="grid grid-cols-2 gap-x-4 mb-4 text-sm">
                    <p><strong>{t.date[language]}:</strong> {new Date(summary.date).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-GB')}</p>
                    <p><strong>{t.day[language]}:</strong> {summary.day}</p>
                    <p><strong>{t.market[language]}:</strong> {summary.market}</p>
                    <p><strong>{t.salesperson[language]}:</strong> {employee?.name || 'N/A'}</p>
                </div>

                <Separator className="my-4" />
                
                <h3 className="text-lg font-semibold mb-2">{t.products[language]}</h3>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t.productName[language]}</TableHead>
                            <TableHead className="text-center">{t.quantity[language]}</TableHead>
                            <TableHead className="text-right">{t.price[language]}</TableHead>
                            <TableHead className="text-right">{t.total[language]}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {summary.items.map(item => (
                            <TableRow key={item.productId}>
                                <TableCell>{item.productName}</TableCell>
                                <TableCell className="text-center">{item.summaryQuantity} {item.unit}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.pricePerUnit)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {summary.rewardItems && summary.rewardItems.length > 0 && (
                     <>
                        <h3 className="text-lg font-semibold mt-6 mb-2">{t.rewards[language]}</h3>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t.productName[language]}</TableHead>
                                    <TableHead className="text-center">{t.quantity[language]}</TableHead>
                                    <TableHead className="text-right">{t.price[language]}</TableHead>
                                    <TableHead className="text-right">{t.total[language]}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {summary.rewardItems.map(item => (
                                    <TableRow key={item.rewardId}>
                                        <TableCell>{item.rewardName}</TableCell>
                                        <TableCell className="text-center">{item.quantity} {item.unit}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.pricePerUnit)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     </>
                )}

                <div className="flex justify-end mt-6">
                    <div className="w-64 space-y-2">
                        <div className="flex justify-between items-center font-bold text-lg">
                            <span>{t.grandTotal[language]}:</span>
                            <span>{formatCurrency(summary.totalSale)}</span>
                        </div>
                    </div>
                </div>
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
