
"use client";

import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/context/language-context";
import {
  Card,
  CardContent,
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
import { AnimatedNumber } from "@/components/ui/animated-number";


type Employee = { id: number; name: string; };
type ReceivableTransaction = {
  id: string;
  ledgerId?: number;
  employeeId: number;
  date: string;
  type: 'due' | 'payment';
  amount: number;
  note: string;
};

const formatCurrency = (amount: number) => `৳${amount.toFixed(2)}`;

export default function EmployeeAccountsReceivablePage({ params }: { params: { employeeId: string } }) {
  const { language } = useLanguage();
  const employeeId = Number(params.employeeId);

  const [transactions, setTransactions] = useState<ReceivableTransaction[]>([]);
  const [employee, setEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    try {
        const storedEmployees = localStorage.getItem('employees');
        if (storedEmployees) {
            const employees: Employee[] = JSON.parse(storedEmployees);
            const currentEmployee = employees.find(e => e.id === employeeId);
            setEmployee(currentEmployee || null);
        }

        const storedTransactions = localStorage.getItem('receivable-transactions');
        if (storedTransactions) {
            const allTransactions: ReceivableTransaction[] = JSON.parse(storedTransactions);
            const employeeTransactions = allTransactions.filter(t => t.employeeId === employeeId);
            setTransactions(employeeTransactions);
        }
    } catch (e) {
      console.error("Failed to load data", e);
    }
  }, [employeeId]);

  const { totalDue, totalPaid, overallBalance } = useMemo(() => {
    return transactions.reduce((acc, txn) => {
        if (txn.type === 'due') {
            acc.totalDue += txn.amount;
        } else {
            acc.totalPaid += txn.amount;
        }
        acc.overallBalance = acc.totalDue - acc.totalPaid;
        return acc;
    }, { totalDue: 0, totalPaid: 0, overallBalance: 0 });
  }, [transactions]);

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);

  const t = {
    title: { en: 'My Dues', bn: 'আমার বকেয়া খাতা' },
    summary: { en: 'Overall Summary', bn: 'সারসংক্ষেপ' },
    totalDue: { en: 'Total Due', bn: 'সর্বমোট বকেয়া' },
    totalPaid: { en: 'Total Paid', bn: 'সর্বমোট জমা' },
    netBalance: { en: 'Current Balance', bn: 'বর্তমান ব্যালেন্স' },
    transactions: { en: 'Transactions', bn: 'লেনদেন' },
    date: { en: 'Date', bn: 'তারিখ' },
    note: { en: 'Note', bn: 'নোট' },
    dueAmount: { en: 'Due Amount', bn: 'বকেয়া' },
    paidAmount: { en: 'Paid Amount', bn: 'পরিশোধ' },
    noTransactions: { en: 'No transactions found.', bn: 'কোনো লেনদেন পাওয়া যায়নি।' },
    ledgerNo: { en: 'Ledger No.', bn: 'খাতা নং' },
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold font-headline">
        {t.title[language]}
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>{t.totalDue[language]}</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-destructive"><AnimatedNumber value={totalDue} formatter={formatCurrency} /></p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t.totalPaid[language]}</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-green-600"><AnimatedNumber value={totalPaid} formatter={formatCurrency} /></p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t.netBalance[language]}</CardTitle></CardHeader>
          <CardContent><p className={`text-3xl font-bold ${overallBalance > 0 ? 'text-destructive' : 'text-green-600'}`}><AnimatedNumber value={overallBalance} formatter={formatCurrency} /></p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.transactions[language]}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.date[language]}</TableHead>
                <TableHead>{t.note[language]}</TableHead>
                <TableHead className="text-right">{t.dueAmount[language]}</TableHead>
                <TableHead className="text-right">{t.paidAmount[language]}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions.length > 0 ? (
                sortedTransactions.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{new Date(item.date).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-CA')}</TableCell>
                    <TableCell className="text-sm">
                      {item.note}
                      {item.ledgerId && <span className="text-xs text-muted-foreground block">{t.ledgerNo[language]} {item.ledgerId}</span>}
                    </TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      {item.type === 'due' ? formatCurrency(item.amount) : '-'}
                    </TableCell>
                     <TableCell className="text-right font-medium text-green-600">
                      {item.type === 'payment' ? formatCurrency(item.amount) : '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    {t.noTransactions[language]}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
