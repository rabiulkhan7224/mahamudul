
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from '@/context/language-context';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Wallet, TrendingUp, TrendingDown, HandCoins } from 'lucide-react';
import { parseISO, isToday, isYesterday, isThisMonth, subMonths } from 'date-fns';

type Employee = {
  id: number;
  name: string;
  role: string;
  dailySalary?: number;
};

type ReceivableTransaction = {
    employeeId: number;
    date: string;
    type: 'due' | 'payment';
    amount: number;
};

type LedgerEntry = { date: string; salespersonId: number; };
type DailySummaryEntry = { date: string; salespersonId: number; };

const formatCurrency = (amount: number) => `৳${amount.toFixed(2)}`;

export default function EmployeePortalPage({ params }: { params: { employeeId: string } }) {
  const { language } = useLanguage();
  const employeeId = Number(params.employeeId);
  const [employee, setEmployee] = useState<Employee | null>(null);

  // Data states
  const [salaryData, setSalaryData] = useState({ today: 0, yesterday: 0, thisMonth: 0, lastMonth: 0 });
  const [dueData, setDueData] = useState({ today: 0, thisMonth: 0, total: 0 });
  const [paymentData, setPaymentData] = useState({ today: 0, thisMonth: 0, total: 0 });

  useEffect(() => {
    try {
        // Fetch all necessary data from localStorage
        const storedEmployees = localStorage.getItem('employees');
        const allEmployees: Employee[] = storedEmployees ? JSON.parse(storedEmployees) : [];
        const currentEmployee = allEmployees.find(e => e.id === employeeId);
        setEmployee(currentEmployee || null);

        if (!currentEmployee) return;

        const storedReceivables: ReceivableTransaction[] = JSON.parse(localStorage.getItem('receivable-transactions') || '[]');
        const employeeReceivables = storedReceivables.filter(r => r.employeeId === employeeId);

        // Calculate Dues and Payments
        let todayDue = 0, thisMonthDue = 0, totalDue = 0;
        let todayPayment = 0, thisMonthPayment = 0, totalPayment = 0;

        employeeReceivables.forEach(txn => {
            const txnDate = parseISO(txn.date);
            if (txn.type === 'due') {
                totalDue += txn.amount;
                if(isToday(txnDate)) todayDue += txn.amount;
                if(isThisMonth(txnDate)) thisMonthDue += txn.amount;
            } else {
                totalPayment += txn.amount;
                if(isToday(txnDate)) todayPayment += txn.amount;
                if(isThisMonth(txnDate)) thisMonthPayment += txn.amount;
            }
        });
        setDueData({ today: todayDue, thisMonth: thisMonthDue, total: totalDue });
        setPaymentData({ today: todayPayment, thisMonth: thisMonthPayment, total: totalPayment });
        
        // Calculate Salary only for 'ডেলিভারি কর্মী'
        if (currentEmployee.role === 'ডেলিভারি কর্মী') {
            const storedLedgers: LedgerEntry[] = JSON.parse(localStorage.getItem('ledger-transactions') || '[]');
            const storedSummaries: DailySummaryEntry[] = JSON.parse(localStorage.getItem('daily-summaries') || '[]');
            
            const attendanceDates = new Set<string>();
            storedLedgers.filter(l => l.salespersonId === employeeId).forEach(l => attendanceDates.add(l.date));
            storedSummaries.filter(s => s.salespersonId === employeeId).forEach(s => attendanceDates.add(s.date));

            const dailySalary = currentEmployee.dailySalary || 0;
            let todaySalary = 0, yesterdaySalary = 0, thisMonthSalary = 0, lastMonthSalary = 0;
            
            const today = new Date();
            const lastMonth = subMonths(today, 1);
            
            attendanceDates.forEach(dateStr => {
                const date = parseISO(dateStr);
                if (isToday(date)) todaySalary += dailySalary;
                if (isYesterday(date)) yesterdaySalary += dailySalary;
                if (isThisMonth(date)) thisMonthSalary += dailySalary;
                if (date.getFullYear() === lastMonth.getFullYear() && date.getMonth() === lastMonth.getMonth()) {
                    lastMonthSalary += dailySalary;
                }
            });
            setSalaryData({ today: todaySalary, yesterday: yesterdaySalary, thisMonth: thisMonthSalary, lastMonth: lastMonthSalary });
        }

    } catch (e) {
      console.error("Failed to load employee data", e);
    }
  }, [employeeId]);

  const isSalesperson = employee?.role === 'সেলসকর্মী';

  const t = {
    welcome: { en: 'Welcome', bn: 'স্বাগতম' },
    dashboard: { en: 'Dashboard', bn: 'ড্যাশবোর্ড' },
    role: { en: 'Role', bn: 'ভূমিকা' },
    salary: { en: 'Salary', bn: 'বেতন' },
    dues: { en: 'Dues', bn: 'বকেয়া' },
    commission: { en: 'Commission', bn: 'কমিশন' },
    payments: { en: 'Payments', bn: 'পরিশোধ' },
    today: { en: "Today's", bn: 'আজকের' },
    yesterday: { en: "Yesterday's", bn: 'গতকালের' },
    thisMonth: { en: 'This Month', bn: 'চলতি মাস' },
    lastMonth: { en: 'Last Month', bn: 'গত মাস' },
    total: { en: 'Total', bn: 'মোট' },
  };
  
  const dueLabel = isSalesperson ? t.commission[language] : t.dues[language];
  
  const salaryCards = [
      { title: `${t.today[language]} ${t.salary[language]}`, value: salaryData.today, icon: Wallet },
      { title: `${t.yesterday[language]} ${t.salary[language]}`, value: salaryData.yesterday, icon: Wallet },
      { title: `${t.thisMonth[language]} ${t.salary[language]}`, value: salaryData.thisMonth, icon: Wallet },
      { title: `${t.lastMonth[language]} ${t.salary[language]}`, value: salaryData.lastMonth, icon: Wallet },
  ];
  
  const dueCards = [
      { title: `${t.today[language]} ${dueLabel}`, value: dueData.today, icon: TrendingUp },
      { title: `${t.thisMonth[language]} ${dueLabel}`, value: dueData.thisMonth, icon: TrendingUp },
      { title: `${t.total[language]} ${dueLabel}`, value: dueData.total, icon: TrendingUp },
  ];
  
  const paymentCards = [
      { title: `${t.today[language]} ${t.payments[language]}`, value: paymentData.today, icon: TrendingDown },
      { title: `${t.thisMonth[language]} ${t.payments[language]}`, value: paymentData.thisMonth, icon: TrendingDown },
      { title: `${t.total[language]} ${t.payments[language]}`, value: paymentData.total, icon: TrendingDown },
  ];

  return (
    <div className="flex flex-col gap-6">
       <h1 className="text-3xl font-bold font-headline">
         {t.welcome[language]}, {employee?.name || '...'}
      </h1>
      
      {employee?.role === 'ডেলিভারি কর্মী' && (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <HandCoins className="text-primary"/>
                    {t.salary[language]}
                </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-4">
               {salaryCards.map(card => (
                   <div key={card.title} className="p-4 bg-muted rounded-lg text-center">
                       <p className="text-sm text-muted-foreground">{card.title}</p>
                       <p className="text-2xl font-bold"><AnimatedNumber value={card.value} formatter={formatCurrency} /></p>
                   </div>
               ))}
            </CardContent>
        </Card>
      )}

       <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="text-destructive"/>
                    {dueLabel}
                </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {dueCards.map(card => (
                   <div key={card.title} className="p-4 bg-muted rounded-lg text-center">
                       <p className="text-sm text-muted-foreground">{card.title}</p>
                       <p className="text-2xl font-bold text-destructive"><AnimatedNumber value={card.value} formatter={formatCurrency} /></p>
                   </div>
               ))}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="text-green-600"/>
                    {t.payments[language]}
                </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {paymentCards.map(card => (
                   <div key={card.title} className="p-4 bg-muted rounded-lg text-center">
                       <p className="text-sm text-muted-foreground">{card.title}</p>
                       <p className="text-2xl font-bold text-green-600"><AnimatedNumber value={card.value} formatter={formatCurrency} /></p>
                   </div>
               ))}
            </CardContent>
        </Card>

    </div>
  );
}
