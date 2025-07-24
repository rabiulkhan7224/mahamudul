
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
type ProfileSettings = { businessName: string; ownerName: string; mobile: string; email: string; };
type ReceivableTransaction = { id: string; ledgerId?: number; employeeId: number; date: string; type: 'due' | 'payment'; amount: number; note: string; };
type Employee = { id: number; name: string; };

const formatCurrency = (amount: number) => `৳${amount.toFixed(2)}`;

export default function PrintReceivablePage() {
    const searchParams = useSearchParams();
    const { language } = useLanguage();

    const [allTransactions, setAllTransactions] = useState<ReceivableTransaction[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [profile, setProfile] = useState<Partial<ProfileSettings>>({});
    const [isLoading, setIsLoading] = useState(true);

    const employeeId = searchParams.get('employeeId');
    const fromDateStr = searchParams.get('from');
    const toDateStr = searchParams.get('to');

    useEffect(() => {
        try {
            const storedProfile = localStorage.getItem('profile-settings');
            if (storedProfile) setProfile(JSON.parse(storedProfile));

            const storedEmployees = localStorage.getItem('employees');
            if(storedEmployees) setEmployees(JSON.parse(storedEmployees));

            const storedTransactions = localStorage.getItem("receivable-transactions");
            if(storedTransactions) setAllTransactions(JSON.parse(storedTransactions));

        } catch (e) {
            console.error("Failed to load data", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e.name])), [employees]);
    const targetEmployeeName = employeeId ? employeeMap.get(Number(employeeId)) : null;

    const { reportData, openingBalance, totalDueInPeriod, totalPaidInPeriod, closingBalance } = useMemo(() => {
        const fromDate = fromDateStr ? parseISO(fromDateStr) : null;
        const toDate = toDateStr ? parseISO(toDateStr) : null;

        let filteredTransactions = allTransactions;
        if (employeeId) {
            filteredTransactions = allTransactions.filter(t => String(t.employeeId) === employeeId);
        }

        let openingBalance = 0;
        const periodTransactions: (ReceivableTransaction & { balance: number })[] = [];
        let totalDueInPeriod = 0;
        let totalPaidInPeriod = 0;

        const sorted = [...filteredTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        sorted.forEach(txn => {
            const txnDate = new Date(txn.date);
            if (isValid(fromDate) && txnDate < fromDate) {
                openingBalance += (txn.type === 'due' ? txn.amount : -txn.amount);
            }
        });
        
        let currentBalance = openingBalance;

        sorted.forEach(txn => {
            const txnDate = new Date(txn.date);
            let inPeriod = true;
            if (isValid(fromDate) && txnDate < fromDate) inPeriod = false;
            // Add 1 day to toDate to include the whole day
            if (isValid(toDate)) {
                const inclusiveToDate = new Date(toDate);
                inclusiveToDate.setDate(inclusiveToDate.getDate() + 1);
                if (txnDate >= inclusiveToDate) inPeriod = false;
            }


            if (inPeriod) {
                currentBalance += (txn.type === 'due' ? txn.amount : -txn.amount);
                if (txn.type === 'due') totalDueInPeriod += txn.amount;
                if (txn.type === 'payment') totalPaidInPeriod += txn.amount;
                
                periodTransactions.push({ ...txn, balance: currentBalance });
            }
        });
        
        return { 
            reportData: periodTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), // sort ascending for display
            openingBalance, 
            totalDueInPeriod, 
            totalPaidInPeriod, 
            closingBalance: currentBalance 
        };
    }, [allTransactions, employeeId, fromDateStr, toDateStr]);
    
    const handlePrint = () => window.print();
    
    const t = {
        title: { en: "Statement of Account", bn: "হিসাবের বিবরণী" },
        employee: { en: "Employee", bn: "কর্মচারী" },
        allEmployees: { en: "All Employees", bn: "সকল কর্মচারী" },
        dateRange: { en: "Date Range", bn: "তারিখ সীমা" },
        date: { en: "Date", bn: "তারিখ" },
        note: { en: "Note", bn: "নোট" },
        due: { en: "Due", bn: "বকেয়া" },
        paid: { en: "Paid", bn: "জমা" },
        balance: { en: "Balance", bn: "ব্যালেন্স" },
        openingBalance: { en: "Opening Balance", bn: "প্রারম্ভিক ব্যালেন্স" },
        total: { en: "Total", bn: "সর্বমোট" },
        closingBalance: { en: "Closing Balance", bn: "সমাপনী ব্যালেন্স" },
        noData: { en: "No data found for the selected criteria.", bn: "নির্বাচিত মানদণ্ডের জন্য কোনো তথ্য পাওয়া যায়নি।" },
        print: { en: "Print", bn: "প্রিন্ট" },
    };
    
    const formatDateRange = () => {
        if (!fromDateStr) return 'All Time';
        const from = format(parseISO(fromDateStr), 'P');
        const to = toDateStr ? format(parseISO(toDateStr), 'P') : 'Today';
        return `${from} - ${to}`;
    }

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
             <div id="printable-receivable-report">
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
                    <p><strong>{t.employee[language]}:</strong> {targetEmployeeName || t.allEmployees[language]}</p>
                    <p><strong>{t.dateRange[language]}:</strong> {formatDateRange()}</p>
                </div>

                <Separator className="my-4" />
                
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t.date[language]}</TableHead>
                            <TableHead>{t.note[language]}</TableHead>
                            <TableHead className="text-right">{t.due[language]}</TableHead>
                            <TableHead className="text-right">{t.paid[language]}</TableHead>
                            <TableHead className="text-right">{t.balance[language]}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell colSpan={4} className="font-medium">{t.openingBalance[language]}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(openingBalance)}</TableCell>
                        </TableRow>
                        {reportData.length > 0 ? reportData.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>{format(new Date(item.date), 'P')}</TableCell>
                                <TableCell>{item.note}</TableCell>
                                <TableCell className="text-right text-destructive">{item.type === 'due' ? formatCurrency(item.amount) : '-'}</TableCell>
                                <TableCell className="text-right text-green-600">{item.type === 'payment' ? formatCurrency(item.amount) : '-'}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.balance)}</TableCell>
                            </TableRow>
                        )) : (
                           <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">{t.noData[language]}</TableCell>
                           </TableRow>
                        )}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={2} className="text-right font-bold">{t.total[language]}</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(totalDueInPeriod)}</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(totalPaidInPeriod)}</TableCell>
                            <TableCell />
                        </TableRow>
                        <TableRow>
                            <TableCell colSpan={4} className="text-right font-bold text-base">{t.closingBalance[language]}</TableCell>
                            <TableCell className="text-right font-bold text-base">{formatCurrency(closingBalance)}</TableCell>
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
