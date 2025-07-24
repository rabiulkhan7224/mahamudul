
"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLanguage } from '@/context/language-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

// Types
type ProfileSettings = {
  businessName: string;
  ownerName: string;
  mobile: string;
  email: string;
};

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

type LedgerRewardItem = {
  rewardId: number;
  rewardName: string;
  mainProductId?: number;
  mainProductName?: string;
  unit: string;
  pricePerUnit: number;
  purchasePricePerUnit?: number;
  summaryQuantity: number;
  quantityReturned: number;
  quantitySold: number;
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
  rewardItems?: LedgerRewardItem[];
  totalSale: number;
  amountPaid: number;
  amountDue: number;
  dueAssignedTo: number;
  commission: number;
  commissionAssignedTo: number;
  note?: string;
};

type Employee = {
    id: number;
    name: string;
};

const formatCurrency = (amount: number) => `৳${amount.toFixed(2)}`;

export default function PrintLedgerPage() {
    const params = useParams();
    const { language } = useLanguage();
    const ledgerId = Number(params.id);

    const [ledger, setLedger] = useState<LedgerEntry | null>(null);
    const [profile, setProfile] = useState<Partial<ProfileSettings>>({});
    const [salesperson, setSalesperson] = useState<string>('');
    const [dueEmployee, setDueEmployee] = useState<string>('');
    const [commissionEmployee, setCommissionEmployee] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!ledgerId) return;

        try {
            const storedLedgers = localStorage.getItem('ledger-transactions');
            const ledgers: LedgerEntry[] = storedLedgers ? JSON.parse(storedLedgers) : [];
            const entry = ledgers.find(l => l.id === ledgerId);

            if (entry) {
                setLedger(entry);
                const storedProfile = localStorage.getItem('profile-settings');
                if (storedProfile) setProfile(JSON.parse(storedProfile));

                const storedEmployees = localStorage.getItem('employees');
                const employees: Employee[] = storedEmployees ? JSON.parse(storedEmployees) : [];
                const empMap = new Map(employees.map(e => [e.id, e.name]));
                
                setSalesperson(empMap.get(entry.salespersonId) || '');
                setDueEmployee(empMap.get(entry.dueAssignedTo) || '');
                setCommissionEmployee(empMap.get(entry.commissionAssignedTo) || '');

            }
        } catch (e) {
            console.error('Failed to load data for printing', e);
        } finally {
            setIsLoading(false);
        }
    }, [ledgerId]);
    
    useEffect(() => {
        if (!isLoading && ledger) {
            // Timeout to allow content to render before printing
            const timer = setTimeout(() => {
                window.print();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isLoading, ledger]);
    
    if (isLoading) {
        return (
            <div className="p-8">
                <Skeleton className="h-8 w-1/2 mb-4" />
                <Skeleton className="h-4 w-1/4 mb-8" />
                <Skeleton className="h-96 w-full" />
            </div>
        )
    }

    if (!ledger) {
        return <div className="p-8 text-center text-red-500">Ledger not found.</div>;
    }
    
    const grossSale = ledger.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalRewardsValue = ledger.rewardItems?.reduce((sum, item) => sum + item.totalPrice, 0) || 0;
    const totalDamaged = ledger.damagedItems?.reduce((sum, item) => sum + item.totalPrice, 0) || 0;
    
    const t = {
        invoice: { en: 'Invoice', bn: 'চালান' },
        ledgerNo: { en: 'Ledger No.', bn: 'খাতা নং' },
        date: { en: 'Date', bn: 'তারিখ' },
        market: { en: 'Market', bn: 'বাজার' },
        salesperson: { en: 'Delivery Person', bn: 'ডেলিভারি কর্মী' },
        
        productsSold: { en: 'Products Sold', bn: 'বিক্রিত পণ্য' },
        product: { en: 'Product', bn: 'পণ্য' },
        summary: { en: 'Summary', bn: 'সামারী' },
        returned: { en: 'Returned', bn: 'ফেরত' },
        sold: { en: 'Sold', bn: 'বিক্রয়' },
        price: { en: 'Price', bn: 'মূল্য' },
        total: { en: 'Total', bn: 'মোট' },

        rewards: { en: 'Rewards Given', bn: 'প্রদত্ত পুরস্কার' },
        reward: { en: 'Reward', bn: 'পুরস্কার' },
        custom: { en: 'Custom', bn: 'কাস্টম' },

        damagedProducts: { en: 'Damaged Products', bn: 'ক্ষতিগ্রস্ত পণ্য' },
        quantity: { en: 'Quantity', bn: 'পরিমাণ' },

        summaryTitle: { en: 'Summary', bn: 'সারসংক্ষেপ' },
        grossSale: { en: 'Gross Sale', bn: 'মোট বিক্রয়' },
        totalRewards: { en: 'Total Rewards', bn: 'মোট পুরস্কার' },
        totalDamaged: { en: 'Total Damaged', bn: 'মোট ক্ষতি' },
        netSale: { en: 'Net Sale', bn: 'নীট বিক্রয়' },
        paidAmount: { en: 'Paid Amount', bn: 'জমা' },
        dueAmount: { en: 'Due Amount', bn: 'বাকি' },
        commission: { en: 'Commission', bn: 'কমিশন' },
        note: { en: 'Note', bn: 'নোট' },
    };

    return (
        <div id="printable-ledger">
            <header className="mb-8">
                <h1 className="text-3xl font-bold">{profile.businessName || 'Business Name'}</h1>
                <p>{profile.ownerName}</p>
                <p>{profile.mobile}</p>
                <p>{profile.email}</p>
            </header>
            
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold underline">{t.invoice[language]}</h2>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
                <div><strong>{t.ledgerNo[language]}:</strong> {ledger.id}</div>
                <div><strong>{t.date[language]}:</strong> {new Date(ledger.date).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-CA')}</div>
                <div><strong>{t.market[language]}:</strong> {ledger.market}</div>
                <div className="col-span-3"><strong>{t.salesperson[language]}:</strong> {salesperson}</div>
            </div>

            <Separator className="my-4" />

            <h3 className="text-lg font-semibold mb-2">{t.productsSold[language]}</h3>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t.product[language]}</TableHead>
                        <TableHead className="text-center">{t.summary[language]}</TableHead>
                        <TableHead className="text-center">{t.returned[language]}</TableHead>
                        <TableHead className="text-center">{t.sold[language]}</TableHead>
                        <TableHead className="text-right">{t.price[language]}</TableHead>
                        <TableHead className="text-right">{t.total[language]}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {ledger.items.map(item => (
                        <TableRow key={item.productId}>
                            <TableCell>{item.productName}</TableCell>
                            <TableCell className="text-center">{item.summaryQuantity} {item.unit}</TableCell>
                            <TableCell className="text-center">{item.quantityReturned} {item.unit}</TableCell>
                            <TableCell className="text-center">{item.quantitySold} {item.unit}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.pricePerUnit)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            
            {ledger.rewardItems && ledger.rewardItems.length > 0 && (
                <>
                    <h3 className="text-lg font-semibold mt-6 mb-2">{t.rewards[language]}</h3>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t.reward[language]}</TableHead>
                                <TableHead className="text-center">{t.sold[language]}</TableHead>
                                <TableHead className="text-right">{t.price[language]}</TableHead>
                                <TableHead className="text-right">{t.total[language]}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ledger.rewardItems.map(item => (
                                <TableRow key={item.rewardId}>
                                    <TableCell>
                                        {item.rewardName}
                                        {item.mainProductName ? (
                                            <span className="text-xs text-slate-500 block">(For {item.mainProductName})</span>
                                        ) : (
                                            <span className="text-xs text-slate-500 block">({t.custom[language]})</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">{item.quantitySold} {item.unit}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.pricePerUnit)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </>
            )}

            {ledger.damagedItems && ledger.damagedItems.length > 0 && (
                <>
                    <h3 className="text-lg font-semibold mt-6 mb-2">{t.damagedProducts[language]}</h3>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t.product[language]}</TableHead>
                                <TableHead className="text-center">{t.quantity[language]}</TableHead>
                                <TableHead className="text-right">{t.price[language]}</TableHead>
                                <TableHead className="text-right">{t.total[language]}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ledger.damagedItems.map(item => (
                                <TableRow key={item.productId}>
                                    <TableCell>{item.productName}</TableCell>
                                    <TableCell className="text-center">{item.quantity} {item.unit}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.pricePerUnit)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </>
            )}

            <div className="flex justify-between mt-8 items-start">
                 {ledger.note && (
                    <div className="w-1/2 pr-4">
                        <h3 className="text-base font-semibold mb-2">{t.note[language]}</h3>
                        <p className="text-xs whitespace-pre-wrap border p-2 rounded-md bg-slate-50 min-h-[100px]">{ledger.note}</p>
                    </div>
                )}
                <div className="w-1/2 max-w-sm space-y-2 text-sm ml-auto">
                    <h3 className="text-lg font-semibold border-b pb-2 mb-2">{t.summaryTitle[language]}</h3>
                    <div className="flex justify-between"><span>{t.grossSale[language]}:</span><span>{formatCurrency(grossSale)}</span></div>
                    {totalRewardsValue > 0 && <div className="flex justify-between"><span>{t.totalRewards[language]}:</span><span>+ {formatCurrency(totalRewardsValue)}</span></div>}
                    {totalDamaged > 0 && <div className="flex justify-between"><span>{t.totalDamaged[language]}:</span><span>- {formatCurrency(totalDamaged)}</span></div>}
                    <Separator/>
                    <div className="flex justify-between font-bold"><span>{t.netSale[language]}:</span><span>{formatCurrency(ledger.totalSale)}</span></div>
                    <div className="flex justify-between"><span>{t.paidAmount[language]}:</span><span>- {formatCurrency(ledger.amountPaid)}</span></div>
                    {ledger.commission > 0 && <div className="flex justify-between"><span>{t.commission[language]} ({commissionEmployee}):</span><span>- {formatCurrency(ledger.commission)}</span></div>}
                    <Separator/>
                    <div className="flex justify-between font-bold text-base"><span>{t.dueAmount[language]} ({dueEmployee}):</span><span>{formatCurrency(ledger.amountDue)}</span></div>
                </div>
            </div>
        </div>
    );
}
