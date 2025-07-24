
"use client";

import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/context/language-context";
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
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, parseISO, getDaysInMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";


type Employee = { id: number; name: string; role: string; dailySalary?: number; };
type LedgerEntry = { date: string; salespersonId: number; };
type DailySummaryEntry = { date: string; salespersonId: number; };

type SalaryPayment = {
  id: string;
  employeeId: number;
  paymentMonth: string; // YYYY-MM format
  startDate: string;
  endDate: string;
  presentDays: number;
  absentDays: number;
  dailyRate: number;
  totalSalary: number;
  paymentDate: string;
  status: 'Paid';
};

const formatCurrency = (amount: number) => `৳${amount.toFixed(2)}`;

export default function MonthlySalaryPage({ params }: { params: { employeeId: string } }) {
  const { language } = useLanguage();
  const employeeId = Number(params.employeeId);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendedDates, setAttendedDates] = useState<Date[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<SalaryPayment[]>([]);
  const [displayMonth, setDisplayMonth] = useState(new Date());

  useEffect(() => {
    try {
        const storedEmployees = localStorage.getItem('employees');
        if (storedEmployees) {
            const employees: Employee[] = JSON.parse(storedEmployees);
            const currentEmployee = employees.find(e => e.id === employeeId);
            setEmployee(currentEmployee || null);
        }

        const storedLedgers: LedgerEntry[] = JSON.parse(localStorage.getItem('ledger-transactions') || '[]');
        const storedSummaries: DailySummaryEntry[] = JSON.parse(localStorage.getItem('daily-summaries') || '[]');
        const storedSalaryHistory: SalaryPayment[] = JSON.parse(localStorage.getItem('salary-payments') || '[]');

        const allAttendanceDates = new Set<string>();
        storedLedgers.filter(l => l.salespersonId === employeeId).forEach(l => allAttendanceDates.add(l.date));
        storedSummaries.filter(s => s.salespersonId === employeeId).forEach(s => allAttendanceDates.add(s.date));
        
        setAttendedDates(Array.from(allAttendanceDates).map(dateStr => parseISO(dateStr)));
        setSalaryHistory(storedSalaryHistory.filter(p => p.employeeId === employeeId));

    } catch (e) {
      console.error("Failed to load data", e);
    }
  }, [employeeId]);

  const currentMonthStats = useMemo(() => {
    const monthStart = startOfMonth(displayMonth);
    const monthEnd = endOfMonth(displayMonth);
    
    const presentDays = attendedDates.filter(date => 
        isWithinInterval(date, { start: monthStart, end: monthEnd })
    ).length;

    const totalDaysInMonth = getDaysInMonth(displayMonth);
    const absentDays = totalDaysInMonth - presentDays;
    
    const estimatedSalary = (employee?.dailySalary || 0) * presentDays;

    return { presentDays, absentDays, estimatedSalary };
  }, [attendedDates, displayMonth, employee]);

  const sortedSalaryHistory = useMemo(() => {
    return [...salaryHistory].sort((a, b) => new Date(b.paymentMonth).getTime() - new Date(a.paymentMonth).getTime());
  }, [salaryHistory]);

  const t = {
    title: { en: 'Monthly Salary', bn: 'মাসিক বেতন' },
    salarySummary: { en: 'Salary Summary', bn: 'বেতনের সারসংক্ষেপ' },
    dailySalary: { en: 'Daily Salary', bn: 'দৈনিক বেতন' },
    estimatedThisMonth: { en: 'Estimated This Month', bn: 'চলতি মাসের আনুমানিক বেতন' },
    attendanceCalendar: { en: 'Attendance Calendar', bn: 'উপস্থিতির ক্যালেন্ডার' },
    salaryHistory: { en: 'Salary Payment History', bn: 'বেতন পরিশোধের ইতিহাস' },
    month: { en: 'Month', bn: 'মাস' },
    period: { en: 'Period', bn: 'সময়কাল' },
    present: { en: 'Present', bn: 'উপস্থিত' },
    absent: { en: 'Absent', bn: 'অনুপস্থিত' },
    rate: { en: 'Rate', bn: 'হার' },
    totalSalary: { en: 'Total Salary', bn: 'মোট বেতন' },
    status: { en: 'Status', bn: 'স্ট্যাটাস' },
    paid: { en: 'Paid', bn: 'পরিশোধিত' },
    noHistory: { en: 'No salary payment history found.', bn: 'বেতন পরিশোধের কোনো ইতিহাস পাওয়া যায়নি।' },
    days: { en: 'days', bn: 'দিন' },
  };

  if (!employee) {
      return <div>Loading...</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold font-headline">{t.title[language]}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>{t.salarySummary[language]}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-baseline p-4 bg-muted rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground">{t.dailySalary[language]}</span>
                    <span className="text-2xl font-bold text-primary"><AnimatedNumber value={employee.dailySalary || 0} formatter={formatCurrency} /></span>
                </div>
                 <div className="flex justify-between items-baseline p-4 bg-muted rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground">{t.estimatedThisMonth[language]} ({format(displayMonth, 'MMMM')})</span>
                    <span className="text-2xl font-bold text-green-600"><AnimatedNumber value={currentMonthStats.estimatedSalary} formatter={formatCurrency} /></span>
                </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle>{t.attendanceCalendar[language]}</CardTitle>
                 <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setDisplayMonth(prev => new Date(prev.setMonth(prev.getMonth() - 1)))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-base font-semibold whitespace-nowrap">{format(displayMonth, 'MMMM yyyy')}</span>
                    <Button variant="outline" size="icon" onClick={() => setDisplayMonth(prev => new Date(prev.setMonth(prev.getMonth() + 1)))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex justify-center">
                 <Calendar
                    month={displayMonth}
                    onMonthChange={setDisplayMonth}
                    selected={attendedDates}
                    modifiers={{ selected: attendedDates }}
                    modifiersClassNames={{
                        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
                    }}
                    showOutsideDays
                />
            </CardContent>
          </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{t.salaryHistory[language]}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.month[language]}</TableHead>
                <TableHead>{t.present[language]}</TableHead>
                <TableHead>{t.absent[language]}</TableHead>
                <TableHead className="text-right">{t.rate[language]}</TableHead>
                <TableHead className="text-right">{t.totalSalary[language]}</TableHead>
                <TableHead className="text-center">{t.status[language]}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSalaryHistory.length > 0 ? (
                sortedSalaryHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{format(parseISO(item.paymentMonth + '-01'), 'MMMM, yyyy')}</TableCell>
                    <TableCell>{item.presentDays} {t.days[language]}</TableCell>
                    <TableCell>{item.absentDays} {t.days[language]}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.dailyRate)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(item.totalSalary)}</TableCell>
                    <TableCell className="text-center">
                        <Badge variant="secondary" className="text-green-700 border-green-300">{t.paid[language]}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">{t.noHistory[language]}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
