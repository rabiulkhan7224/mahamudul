
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/language-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format, parse, isValid, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";

// Types
type ProfileSettings = { businessName: string; ownerName: string; mobile: string; email: string; };
type Employee = { id: number; name: string; role: string; dailySalary?: number; };
type LedgerEntry = { id: number; date: string; salespersonId: number; };
type AttendanceRecord = { date: string; day: string; ledgerIds: number[]; rate: number; };

const formatCurrency = (amount: number) => `৳${amount.toFixed(2)}`;

export default function PrintAttendancePage() {
    const searchParams = useSearchParams();
    const { language } = useLanguage();

    const [employee, setEmployee] = useState<Employee | null>(null);
    const [profile, setProfile] = useState<Partial<ProfileSettings>>({});
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [monthlySalary, setMonthlySalary] = useState<number|string>('');

    const employeeId = searchParams.get('employeeId');
    const monthStr = searchParams.get('month'); // YYYY-MM

    useEffect(() => {
        if (!employeeId || !monthStr) {
            setIsLoading(false);
            return;
        }

        try {
            const storedProfile = localStorage.getItem('profile-settings');
            if (storedProfile) setProfile(JSON.parse(storedProfile));

            const storedEmployees = localStorage.getItem('employees');
            const employees: Employee[] = storedEmployees ? JSON.parse(storedEmployees) : [];
            const targetEmployee = employees.find(e => String(e.id) === employeeId);
            setEmployee(targetEmployee || null);

            const storedLedgers = localStorage.getItem("ledger-transactions");
            const allLedgers: LedgerEntry[] = storedLedgers ? JSON.parse(storedLedgers) : [];
            
            const monthDate = parse(monthStr, 'yyyy-MM', new Date());
            const monthStart = startOfMonth(monthDate);
            const monthEnd = endOfMonth(monthDate);

            const employeeLedgers = allLedgers.filter(l => {
                const ledgerDate = new Date(l.date);
                return String(l.salespersonId) === employeeId && isWithinInterval(ledgerDate, { start: monthStart, end: monthEnd });
            });

            const dailyAttendanceMap = new Map<string, { date: string, day: string, ledgerIds: number[], rate: number }>();

            employeeLedgers.forEach(ledger => {
                if (dailyAttendanceMap.has(ledger.date)) {
                    dailyAttendanceMap.get(ledger.date)!.ledgerIds.push(ledger.id);
                } else {
                    const dateObj = new Date(ledger.date);
                    dailyAttendanceMap.set(ledger.date, {
                        date: ledger.date,
                        day: format(dateObj, 'EEEE'),
                        ledgerIds: [ledger.id],
                        rate: targetEmployee?.dailySalary || 0,
                    });
                }
            });
            
            const records = Array.from(dailyAttendanceMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setAttendanceRecords(records);

        } catch (e) {
            console.error("Failed to load data", e);
        } finally {
            setIsLoading(false);
        }
    }, [employeeId, monthStr]);
    
    const handleRateChange = (date: string, newRate: string) => {
        setAttendanceRecords(prevRecords => 
            prevRecords.map(rec => 
                rec.date === date ? { ...rec, rate: Number(newRate) || 0 } : rec
            )
        );
    };

    const totalCalculatedSalary = useMemo(() => {
        return attendanceRecords.reduce((sum, record) => sum + record.rate, 0);
    }, [attendanceRecords]);
    
    const handlePrint = () => window.print();
    
    const t = {
        title: { en: "Attendance Report", bn: "হাজিরা রিপোর্ট" },
        employee: { en: "Employee", bn: "কর্মচারী" },
        role: { en: "Role", bn: "পদ" },
        month: { en: "Month", bn: "মাস" },
        date: { en: "Date", bn: "তারিখ" },
        day: { en: "Day", bn: "বার" },
        ledgerNo: { en: "Ledger No.", bn: "খাতা নং" },
        dailyRate: { en: "Daily Rate", bn: "দৈনিক হাজিরা" },
        monthlySalary: { en: "Fixed Monthly Salary", bn: "মাসিক বেতন" },
        totalAttendance: { en: "Total Days", bn: "মোট উপস্থিতি" },
        totalCalculatedSalary: { en: "Total Calculated Salary", bn: "হিসাব অনুযায়ী মোট বেতন" },
        noData: { en: "No attendance found for this employee in the selected month.", bn: "নির্বাচিত মাসে এই কর্মচারীর কোনো উপস্থিতি পাওয়া যায়নি।" },
        print: { en: "Print", bn: "প্রিন্ট" },
    };
    
    if (isLoading) {
        return (
            <div className="p-8 bg-white">
                <Skeleton className="h-8 w-1/2 mb-4" />
                <Skeleton className="h-4 w-1/4 mb-8" />
                <Skeleton className="h-96 w-full" />
            </div>
        )
    }

    if (!employee) {
        return <div className="p-8 text-center text-red-500">Employee not found.</div>;
    }

    return (
        <div className="p-4 bg-white">
             <div id="printable-attendance-report">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold">{profile.businessName || 'Business Name'}</h1>
                    <p>{profile.ownerName}</p>
                    <p>{profile.mobile}</p>
                    <p>{profile.email}</p>
                </header>
                
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold underline">{t.title[language]}</h2>
                </div>
                
                <div className="text-sm mb-4 grid grid-cols-2 gap-x-4">
                    <p><strong>{t.employee[language]}:</strong> {employee.name}</p>
                    <p><strong>{t.role[language]}:</strong> {employee.role}</p>
                    <p><strong>{t.month[language]}:</strong> {format(parse(monthStr!, 'yyyy-MM', new Date()), 'MMMM, yyyy')}</p>
                </div>
                
                <div className="grid grid-cols-4 gap-4 items-end my-4 no-print">
                    <div className="grid gap-2">
                        <Label htmlFor='monthly-salary'>{t.monthlySalary[language]}</Label>
                        <Input 
                            id="monthly-salary"
                            type="number" 
                            placeholder='0'
                            value={monthlySalary} 
                            onChange={e => setMonthlySalary(e.target.value)}
                        />
                    </div>
                </div>

                <Separator className="my-4" />
                
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t.date[language]}</TableHead>
                            <TableHead>{t.day[language]}</TableHead>
                            <TableHead>{t.ledgerNo[language]}</TableHead>
                            <TableHead className="text-right">{t.dailyRate[language]}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {attendanceRecords.length > 0 ? attendanceRecords.map((item) => (
                            <TableRow key={item.date}>
                                <TableCell>{format(new Date(item.date), 'P')}</TableCell>
                                <TableCell>{language === 'bn' ? new Date(item.date).toLocaleDateString('bn-BD', { weekday: 'long' }) : item.day}</TableCell>
                                <TableCell>{item.ledgerIds.join(', ')}</TableCell>
                                <TableCell className="text-right">
                                    <Input 
                                      type="number"
                                      value={item.rate}
                                      onChange={(e) => handleRateChange(item.date, e.target.value)}
                                      className="w-28 text-right ml-auto no-print"
                                    />
                                    <span className="print-only text-right block">{formatCurrency(item.rate)}</span>
                                </TableCell>
                            </TableRow>
                        )) : (
                           <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">{t.noData[language]}</TableCell>
                           </TableRow>
                        )}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={3} className="text-right font-bold">{t.totalAttendance[language]}</TableCell>
                            <TableCell className="text-right font-bold">{attendanceRecords.length}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell colSpan={3} className="text-right font-bold">{t.totalCalculatedSalary[language]}</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(totalCalculatedSalary)}</TableCell>
                        </TableRow>
                        {Number(monthlySalary) > 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-right font-bold">{t.monthlySalary[language]}</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(Number(monthlySalary))}</TableCell>
                            </TableRow>
                        )}
                    </TableFooter>
                </Table>
                
                 <div className="print-only">
                    {Number(monthlySalary) > 0 && (
                        <div className="flex justify-end mt-4">
                            <div className="w-64 space-y-2">
                                <div className="flex justify-between font-bold text-lg">
                                  <span>{t.monthlySalary[language]}:</span>
                                  <span>{formatCurrency(Number(monthlySalary))}</span>
                                </div>
                            </div>
                        </div>
                    )}
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
