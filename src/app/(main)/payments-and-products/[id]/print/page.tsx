
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useLanguage } from '@/context/language-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

// Types
type ProfileSettings = { businessName: string; ownerName: string; mobile: string; email: string; };
type SupplierPaymentItem = { id: number; productId: number; productName: string; quantity: number; unit: string; pricePerUnit: number; totalPrice: number; };
type SupplierPayment = { id: number; companyName: string; paymentDate: string; paymentMethod: string; advancePayment?: number; items: SupplierPaymentItem[]; status: 'pending' | 'received'; receivedDate?: string; note?: string; actualReceivedItems?: SupplierPaymentItem[]; };


const formatCurrency = (amount: number) => `৳${amount.toFixed(2)}`;

export default function PrintPaymentPage() {
    const params = useParams();
    const { language } = useLanguage();
    const paymentId = Number(params.id);

    const [payment, setPayment] = useState<SupplierPayment | null>(null);
    const [profile, setProfile] = useState<Partial<ProfileSettings>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!paymentId) return;

        try {
            const storedPayments = localStorage.getItem('supplier-payments');
            const payments: SupplierPayment[] = storedPayments ? JSON.parse(storedPayments) : [];
            const entry = payments.find(p => p.id === paymentId);

            if (entry) {
                setPayment(entry);
                const storedProfile = localStorage.getItem('profile-settings');
                if (storedProfile) setProfile(JSON.parse(storedProfile));
            }
        } catch (e) {
            console.error('Failed to load data for printing', e);
        } finally {
            setIsLoading(false);
        }
    }, [paymentId]);

    const reportData = useMemo(() => {
        if (!payment) return { items: [], totalOrdered: 0, totalReceived: 0 };
    
        const totalOrdered = payment.items.reduce((sum, item) => sum + item.totalPrice, 0);
    
        // Case for pending payments or payments before the "actualReceivedItems" feature was added
        if (payment.status === 'pending' || !payment.actualReceivedItems) {
            const items = payment.items.map(item => ({
                ...item,
                receivedQuantity: 0,
                difference: -item.quantity,
                receivedTotalPrice: 0, // In pending state, received value is 0
                orderedQuantity: item.quantity,
            }));
            return { items, totalOrdered, totalReceived: 0 };
        }
    
        const receivedItemsMap = new Map(payment.actualReceivedItems.map(item => [item.productId, item]));
        const orderedItemsMap = new Map(payment.items.map(item => [item.productId, item]));
        const allProductIds = new Set([...orderedItemsMap.keys(), ...receivedItemsMap.keys()]);
    
        const items = Array.from(allProductIds).map(productId => {
            const orderedItem = orderedItemsMap.get(productId);
            const receivedItem = receivedItemsMap.get(productId);
            
            const displayItem = receivedItem || orderedItem;
            if (!displayItem) return null;
    
            const orderedQuantity = orderedItem?.quantity ?? 0;
            const receivedQuantity = receivedItem?.quantity ?? 0;
            const difference = receivedQuantity - orderedQuantity;
            const pricePerUnit = receivedItem?.pricePerUnit || orderedItem?.pricePerUnit || 0;
            const receivedTotalPrice = receivedQuantity * pricePerUnit;
    
            return {
                id: displayItem.id,
                productName: displayItem.productName,
                orderedQuantity: orderedQuantity,
                receivedQuantity: receivedQuantity,
                unit: displayItem.unit,
                difference: difference,
                pricePerUnit: pricePerUnit,
                receivedTotalPrice: receivedTotalPrice,
            };
        }).filter((item): item is NonNullable<typeof item> => item !== null);
    
        const totalReceived = items.reduce((sum, item) => sum + item.receivedTotalPrice, 0);
    
        return { items, totalOrdered, totalReceived };
    
    }, [payment]);

    const finalBalance = useMemo(() => {
        if (!payment) return 0;
        return (payment.advancePayment || 0) - reportData.totalReceived;
    }, [payment, reportData]);


    const handlePrint = () => window.print();
    
    if (isLoading) {
        return (
            <div className="p-8 bg-white">
                <Skeleton className="h-8 w-1/2 mb-4" />
                <Skeleton className="h-4 w-1/4 mb-8" />
                <Skeleton className="h-96 w-full" />
            </div>
        )
    }

    if (!payment) {
        return <div className="p-8 text-center text-red-500">Payment record not found.</div>;
    }
        
    const t = {
        invoice: { en: 'Supplier Payment Invoice', bn: 'সরবরাহকারী পেমেন্ট চালান' },
        paymentId: { en: 'Record No.', bn: 'রেকর্ড নং' },
        date: { en: 'Date', bn: 'তারিখ' },
        company: { en: 'Company', bn: 'কোম্পানি' },
        paymentMethod: { en: 'Payment Method', bn: 'পেমেন্ট পদ্ধতি' },
        
        products: { en: 'Products', bn: 'পণ্য' },
        productName: { en: 'Product', bn: 'পণ্য' },
        pricePerUnit: { en: 'Price/Unit', bn: 'একক মূল্য' },
        total: { en: 'Total', bn: 'মোট' },

        summaryTitle: { en: 'Summary', bn: 'সারসংক্ষেপ' },
        totalAmount: { en: 'Total Ordered Value', bn: 'মোট অর্ডারের মূল্য' },
        advancePayment: { en: 'Advance Payment', bn: 'অগ্রিম পেমেন্ট' },
        note: { en: 'Note', bn: 'নোট' },
        print: { en: 'Print', bn: 'প্রিন্ট' },
        receivedQty: { en: 'Received Qty', bn: 'প্রাপ্ত পরিমাণ' },
        difference: { en: 'Difference', bn: 'পার্থক্য' },
        orderedQty: { en: 'Ordered Qty', bn: 'অর্ডারকৃত পরিমাণ' },
        receivedValue: { en: 'Total Received Value', bn: 'প্রাপ্ত পণ্যের মোট মূল্য'},
        finalBalance: { en: 'Final Balance', bn: 'চূড়ান্ত ব্যালেন্স' },
        supplierOwes: { en: "Supplier Owes You", bn: "সরবরাহকারীর কাছে পাওনা" },
        youOwe: { en: "You Owe Supplier", bn: "আপনার কাছে দেনা" },
    };

    return (
        <div className="p-4 bg-white">
            <div id="printable-supplier-payment-report">
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
                    <div><strong>{t.paymentId[language]}:</strong> {payment.id}</div>
                    <div><strong>{t.date[language]}:</strong> {new Date(payment.paymentDate).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-CA')}</div>
                    <div><strong>{t.company[language]}:</strong> {payment.companyName}</div>
                    <div className="col-span-3"><strong>{t.paymentMethod[language]}:</strong> {payment.paymentMethod}</div>
                </div>

                <Separator className="my-4" />

                <h3 className="text-lg font-semibold mb-2">{t.products[language]}</h3>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t.productName[language]}</TableHead>
                            <TableHead className="text-center">{t.orderedQty[language]}</TableHead>
                            {payment.status === 'received' && <TableHead className="text-center">{t.receivedQty[language]}</TableHead>}
                            {payment.status === 'received' && <TableHead className="text-center">{t.difference[language]}</TableHead>}
                            <TableHead className="text-right">{t.pricePerUnit[language]}</TableHead>
                            <TableHead className="text-right">{t.total[language]}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reportData.items.map(item => (
                            <TableRow key={item.id}>
                                <TableCell>{item.productName}</TableCell>
                                <TableCell className="text-center">{item.orderedQuantity} {item.unit}</TableCell>
                                {payment.status === 'received' && <TableCell className="text-center">{item.receivedQuantity} {item.unit}</TableCell>}
                                {payment.status === 'received' && (
                                    <TableCell className={`text-center font-medium ${item.difference > 0 ? 'text-green-600' : item.difference < 0 ? 'text-destructive' : ''}`}>
                                        {item.difference > 0 ? `+${item.difference}` : item.difference} {item.unit}
                                    </TableCell>
                                )}
                                <TableCell className="text-right">{formatCurrency(item.pricePerUnit)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.receivedTotalPrice)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                <div className="flex justify-between mt-8 items-start">
                    {payment.note && (
                        <div className="w-1/2 pr-4">
                            <h3 className="text-base font-semibold mb-2">{t.note[language]}</h3>
                            <p className="text-xs whitespace-pre-wrap border p-2 rounded-md bg-slate-50 min-h-[100px]">{payment.note}</p>
                        </div>
                    )}
                    <div className="w-1/2 max-w-sm space-y-2 text-sm ml-auto">
                        <h3 className="text-lg font-semibold border-b pb-2 mb-2">{t.summaryTitle[language]}</h3>
                        <div className="flex justify-between"><span>{t.totalAmount[language]}:</span><span>{formatCurrency(reportData.totalOrdered)}</span></div>
                        <div className="flex justify-between"><span>{t.advancePayment[language]}:</span><span>- {formatCurrency(payment.advancePayment || 0)}</span></div>
                         <Separator/>
                        <div className="flex justify-between font-bold"><span>{t.receivedValue[language]}:</span><span>{formatCurrency(reportData.totalReceived)}</span></div>
                        <Separator/>
                        <div className="flex justify-between font-bold text-base">
                            <span>{t.finalBalance[language]}:</span>
                            <span>
                                {formatCurrency(Math.abs(finalBalance))}
                                 {finalBalance > 0 && <span className="text-xs ml-1">({t.supplierOwes[language]})</span>}
                                 {finalBalance < 0 && <span className="text-xs ml-1">({t.youOwe[language]})</span>}
                            </span>
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
