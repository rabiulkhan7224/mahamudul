
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useLanguage } from '@/context/language-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

// Types
type ProfileSettings = { businessName: string; ownerName: string; mobile: string; email: string; };
type Product = { id: number; name: string; purchasePrice: number; quantityUnit: string; largerUnit?: string; conversionFactor?: number; };
type Employee = { id: number; name:string; };
type LedgerItem = { productId: number; productName: string; unit: string; pricePerUnit: number; summaryQuantity: number; quantitySold: number; quantityReturned: number; totalPrice: number; };
type LedgerDamagedItem = { productId: number; productName: string; quantity: number; unit: string; pricePerUnit: number; totalPrice: number; };
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
type LedgerEntry = { id: number; date: string; market: string; salespersonId: number; items: LedgerItem[]; damagedItems?: LedgerDamagedItem[]; rewardItems?: LedgerRewardItem[]; totalSale: number; commission: number; amountPaid: number; amountDue: number; dueAssignedTo: number; commissionAssignedTo: number; note?: string; };
type ReceivableTransaction = { date: string; employeeId: number; type: 'due' | 'payment'; amount: number; note: string; };

const formatCurrency = (amount: number) => `৳${amount.toFixed(2)}`;

export default function GlobalPrintPage() {
    const { language } = useLanguage();
    const [isLoading, setIsLoading] = useState(true);
    
    // Data state
    const [profile, setProfile] = useState<Partial<ProfileSettings>>({});
    const [todaysLedgers, setTodaysLedgers] = useState<LedgerEntry[]>([]);
    const [todaysReceivables, setTodaysReceivables] = useState<ReceivableTransaction[]>([]);
    const [todaysProfit, setTodaysProfit] = useState(0);

    const [employeeMap, setEmployeeMap] = useState<Map<number, string>>(new Map());

    useEffect(() => {
        try {
            const todayStr = new Date().toLocaleDateString('en-CA');
            
            // Load all data
            const storedProfile = localStorage.getItem('profile-settings');
            if (storedProfile) setProfile(JSON.parse(storedProfile));

            const storedEmployees = localStorage.getItem('employees');
            const employees: Employee[] = storedEmployees ? JSON.parse(storedEmployees) : [];
            setEmployeeMap(new Map(employees.map(e => [e.id, e.name])));

            const storedProducts = localStorage.getItem('products');
            const products: Product[] = storedProducts ? JSON.parse(storedProducts) : [];
            const productMap = new Map<number, Product>(products.map(p => [p.id, p]));

            const storedLedgers = localStorage.getItem("ledger-transactions");
            const allLedgers: LedgerEntry[] = storedLedgers ? JSON.parse(storedLedgers) : [];
            const ledgersToday = allLedgers.filter(l => l.date === todayStr);
            setTodaysLedgers(ledgersToday);

            // Filter receivable transactions for today
            const storedReceivables = localStorage.getItem('receivable-transactions');
            const allReceivables: ReceivableTransaction[] = storedReceivables ? JSON.parse(storedReceivables) : [];
            const receivablesToday = allReceivables.filter(r => new Date(r.date).toLocaleDateString('en-CA') === todayStr);
            setTodaysReceivables(receivablesToday);

            // Calculate today's profit
            let totalProfit = 0;
            ledgersToday.forEach(ledger => {
                const profitForLedger = ledger.items.reduce((sum, item) => {
                    const product = productMap.get(item.productId);
                    if (!product) return sum;
                    
                    let purchasePricePerSoldUnit = product.purchasePrice;
                    if (product.largerUnit && product.conversionFactor && item.unit === product.largerUnit) {
                       purchasePricePerSoldUnit = product.purchasePrice / product.conversionFactor;
                    } else if (product.largerUnit && product.conversionFactor && item.unit === product.quantityUnit) {
                       purchasePricePerSoldUnit = product.purchasePrice;
                    }

                    const itemPurchaseCost = item.quantitySold * purchasePricePerSoldUnit;
                    const itemProfit = item.totalPrice - itemPurchaseCost;
                    return sum + itemProfit;
                }, 0);
                totalProfit += (profitForLedger - ledger.commission);
            });
            setTodaysProfit(totalProfit);

        } catch (e) {
            console.error("Failed to load data for global report", e);
        } finally {
            setIsLoading(false);
        }
    }, [language]);

    const employeeTransactions = useMemo(() => {
        const grouped = new Map<number, { name: string; transactions: ReceivableTransaction[]; totalDueToday: number }>();
        employeeMap.forEach((name, id) => {
            grouped.set(id, { name, transactions: [], totalDueToday: 0 });
        });

        todaysReceivables.forEach(txn => {
            const group = grouped.get(txn.employeeId);
            if (group) {
                group.transactions.push(txn);
                if (txn.type === 'due') {
                    group.totalDueToday += txn.amount;
                } else if (txn.type === 'payment') {
                    group.totalDueToday -= txn.amount;
                }
            }
        });
        
        return Array.from(grouped.values()).filter(g => g.transactions.length > 0);
    }, [todaysReceivables, employeeMap]);

    const dailySummary = useMemo(() => {
        let grossSale = 0, totalDamaged = 0, totalCommission = 0, totalPaid = 0, totalDue = 0;
        todaysLedgers.forEach(l => {
            grossSale += l.items.reduce((sum, item) => sum + item.totalPrice, 0);
            totalDamaged += l.damagedItems?.reduce((sum, item) => sum + item.totalPrice, 0) || 0;
            totalCommission += l.commission;
            totalPaid += l.amountPaid;
            totalDue += l.amountDue;
        });
        const netSale = grossSale - totalDamaged;

        return { grossSale, totalDamaged, netSale, totalCommission, totalPaid, totalDue };
    }, [todaysLedgers]);

    const handlePrint = () => window.print();

    const t = {
        title: { en: "Daily Detailed Report", bn: "দৈনিক বিস্তারিত রিপোর্ট" },
        date: { en: "Date", bn: "তারিখ" },
        day: { en: "Day", bn: "বার" },
        print: { en: "Print", bn: "প্রিন্ট" },
        
        ledgersTitle: { en: "Detailed Ledger Entries", bn: "বিস্তারিত খাতার বিবরণ" },
        ledgerNo: { en: "Ledger No.", bn: "খাতা নং" },
        market: { en: "Market", bn: "বাজার" },
        salesperson: { en: "Delivery Person", bn: "ডেলিভারি কর্মী" },
        
        productsSold: { en: 'Products Sold', bn: 'বিক্রিত পণ্য' },
        product: { en: 'Product', bn: 'পণ্য' },
        summary: { en: 'Summary', bn: 'সামারী' },
        returned: { en: 'Returned', bn: 'ফেরত' },
        sold: { en: 'Sold', bn: 'বিক্রয়' },
        price: { en: 'Price', bn: 'মূল্য' },

        damagedProducts: { en: 'Damaged Products', bn: 'ক্ষতিগ্রস্ত পণ্য' },
        quantity: { en: 'Quantity', bn: 'পরিমাণ' },
        
        financials: { en: 'Financials', bn: 'আর্থিক বিবরণ' },
        grossSale: { en: 'Gross Sale', bn: 'মোট বিক্রয়' },
        totalDamaged: { en: 'Total Damaged', bn: 'মোট ক্ষতি' },
        netSale: { en: 'Net Sale', bn: 'নীট বিক্রয়' },
        paidAmount: { en: 'Paid Amount', bn: 'জমা' },
        dueAmount: { en: 'Due Amount', bn: 'বাকি' },
        commission: { en: 'Commission', bn: 'কমিশন' },

        noLedgers: { en: "No ledger entries for today.", bn: "আজকের জন্য কোনো খাতা নেই।" },

        transactionsTitle: { en: "Today's Employee Transactions", bn: "আজকের কর্মচারী লেনদেন" },
        employee: { en: "Employee", bn: "কর্মচারী" },
        note: { en: "Note", bn: "নোট" },
        due: { en: "Due Amount", bn: "বাকি" },
        payment: { en: "Paid Amount", bn: "জমা" },
        todaysDue: { en: "Today's Net Due", bn: "আজকের মোট বকেয়া" },
        noTransactions: { en: "No employee transactions for today.", bn: "আজকের জন্য কোনো কর্মচারী লেনদেন নেই।" },

        summaryTitle: { en: "Daily Financial Summary", bn: "দৈনিক আর্থিক সারসংক্ষেপ" },
        profitTitle: { en: "Today's Net Profit", bn: "আজকের নীট লাভ" },
        total: { en: "Total", bn: "সর্বমোট" },
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
    
    return (
      <div className="p-4 bg-white">
           <div id="printable-global-report">
              <header className="mb-8">
                  <h1 className="text-3xl font-bold">{profile.businessName || 'Business Name'}</h1>
                  <p>{profile.ownerName}</p>
                  <p>{profile.mobile}</p>
                  <p>{profile.email}</p>
              </header>
              
              <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold underline">{t.title[language]}</h2>
                  <p>{t.date[language]}: {new Date().toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-CA')}</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2 border-b pb-2">{t.ledgersTitle[language]}</h3>
                {todaysLedgers.length > 0 ? (
                  todaysLedgers.map(ledger => {
                    const ledgerGrossSale = ledger.items.reduce((sum, item) => sum + item.totalPrice, 0);
                    const ledgerTotalDamaged = ledger.damagedItems?.reduce((sum, item) => sum + item.totalPrice, 0) || 0;
                    return (
                        <div key={ledger.id} className="mb-8 p-4 border rounded-lg">
                           <div className="grid grid-cols-2 gap-x-4 mb-4">
                              <p><strong>{t.ledgerNo[language]}:</strong> {ledger.id}</p>
                              <p><strong>{t.market[language]}:</strong> {ledger.market}</p>
                              <p className="col-span-2"><strong>{t.salesperson[language]}:</strong> {employeeMap.get(ledger.salespersonId)}</p>
                           </div>
                           <Separator/>

                           <h4 className="font-semibold mt-4 mb-2">{t.productsSold[language]}</h4>
                           <Table>
                               <TableHeader><TableRow><TableHead>{t.product[language]}</TableHead><TableHead className="text-center">{t.summary[language]}</TableHead><TableHead className="text-center">{t.returned[language]}</TableHead><TableHead className="text-center">{t.sold[language]}</TableHead><TableHead className="text-right">{t.price[language]}</TableHead><TableHead className="text-right">{t.total[language]}</TableHead></TableRow></TableHeader>
                               <TableBody>
                                   {ledger.items.map(item => (
                                       <TableRow key={item.productId}><TableCell>{item.productName}</TableCell><TableCell className="text-center">{item.summaryQuantity} {item.unit}</TableCell><TableCell className="text-center">{item.quantityReturned} {item.unit}</TableCell><TableCell className="text-center">{item.quantitySold} {item.unit}</TableCell><TableCell className="text-right">{formatCurrency(item.pricePerUnit)}</TableCell><TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell></TableRow>
                                   ))}
                               </TableBody>
                           </Table>

                           {ledger.damagedItems && ledger.damagedItems.length > 0 && (
                                <>
                                   <h4 className="font-semibold mt-4 mb-2">{t.damagedProducts[language]}</h4>
                                   <Table>
                                       <TableHeader><TableRow><TableHead>{t.product[language]}</TableHead><TableHead className="text-center">{t.quantity[language]}</TableHead><TableHead className="text-right">{t.price[language]}</TableHead><TableHead className="text-right">{t.total[language]}</TableHead></TableRow></TableHeader>
                                       <TableBody>
                                           {ledger.damagedItems.map(item => (
                                               <TableRow key={item.productId}><TableCell>{item.productName}</TableCell><TableCell className="text-center">{item.quantity} {item.unit}</TableCell><TableCell className="text-right">{formatCurrency(item.pricePerUnit)}</TableCell><TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell></TableRow>
                                           ))}
                                       </TableBody>
                                   </Table>
                               </>
                           )}

                          <div className="flex justify-between items-start mt-4">
                               <div className="w-1/2 pr-4">
                                {ledger.note && (
                                  <>
                                    <h5 className="font-semibold">{t.note[language]}:</h5>
                                    <p className="text-sm whitespace-pre-wrap">{ledger.note}</p>
                                  </>
                                )}
                              </div>
                              <div className="w-full max-w-xs space-y-1 text-sm">
                                  <h4 className="font-semibold border-b pb-1 mb-1">{t.financials[language]}</h4>
                                  <div className="flex justify-between"><span>{t.grossSale[language]}:</span><span>{formatCurrency(ledgerGrossSale)}</span></div>
                                  {ledgerTotalDamaged > 0 && <div className="flex justify-between"><span>{t.totalDamaged[language]}:</span><span>- {formatCurrency(ledgerTotalDamaged)}</span></div>}
                                  <Separator/>
                                  <div className="flex justify-between font-bold"><span>{t.netSale[language]}:</span><span>{formatCurrency(ledger.totalSale)}</span></div>
                                  <div className="flex justify-between"><span>{t.paidAmount[language]}:</span><span>- {formatCurrency(ledger.amountPaid)}</span></div>
                                  {ledger.commission > 0 && <div className="flex justify-between"><span>{t.commission[language]} ({employeeMap.get(ledger.commissionAssignedTo)}):</span><span>- {formatCurrency(ledger.commission)}</span></div>}
                                  <Separator/>
                                  <div className="flex justify-between font-bold text-base"><span>{t.dueAmount[language]} ({employeeMap.get(ledger.dueAssignedTo)}):</span><span>{formatCurrency(ledger.amountDue)}</span></div>
                              </div>
                          </div>
                        </div>
                    )
                  })
                ) : <p className="text-muted-foreground text-center py-4">{t.noLedgers[language]}</p>}
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-2 border-b pb-2">{t.transactionsTitle[language]}</h3>
                {employeeTransactions.length > 0 ? (
                  employeeTransactions.map(emp => (
                      <div key={emp.name} className="mb-6">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold">{t.employee[language]}: {emp.name}</h4>
                            <div className="border rounded-md p-2 text-center bg-slate-50">
                                <div className="text-xs font-medium">{t.todaysDue[language]}</div>
                                <div className="font-bold text-lg">{formatCurrency(emp.totalDueToday)}</div>
                            </div>
                          </div>
                           <Table>
                              <TableHeader><TableRow>
                                <TableHead>{t.date[language]}</TableHead>
                                <TableHead>{t.day[language]}</TableHead>
                                <TableHead>{t.note[language]}</TableHead>
                                <TableHead className="text-right">{t.due[language]}</TableHead>
                                <TableHead className="text-right">{t.payment[language]}</TableHead>
                              </TableRow></TableHeader>
                              <TableBody>
                                {emp.transactions.map((txn, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell>{new Date(txn.date).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-CA')}</TableCell>
                                    <TableCell>{new Date(txn.date).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'long' })}</TableCell>
                                    <TableCell>{txn.note}</TableCell>
                                    <TableCell className="text-right">{txn.type === 'due' ? formatCurrency(txn.amount) : '-'}</TableCell>
                                    <TableCell className="text-right">{txn.type === 'payment' ? formatCurrency(txn.amount) : '-'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                           </Table>
                      </div>
                  ))
                ) : <p className="text-muted-foreground text-center py-4">{t.noTransactions[language]}</p>}
              </div>

              <div className="flex justify-end pt-8">
                  <div className="w-full max-w-sm space-y-2 text-sm border-t pt-4">
                      <h3 className="text-lg font-semibold text-center pb-2 mb-2">{t.summaryTitle[language]}</h3>
                      <div className="flex justify-between"><span>{t.grossSale[language]}:</span><span>{formatCurrency(dailySummary.grossSale)}</span></div>
                      <div className="flex justify-between"><span>{t.totalDamaged[language]}:</span><span>- {formatCurrency(dailySummary.totalDamaged)}</span></div>
                      <Separator/>
                      <div className="flex justify-between font-bold"><span>{t.netSale[language]}:</span><span>{formatCurrency(dailySummary.netSale)}</span></div>
                      <div className="flex justify-between"><span>{t.paidAmount[language]}:</span><span>{formatCurrency(dailySummary.totalPaid)}</span></div>
                      <div className="flex justify-between"><span>{t.commission[language]}:</span><span>{formatCurrency(dailySummary.totalCommission)}</span></div>
                      <div className="flex justify-between font-bold"><span>{t.dueAmount[language]}:</span><span>{formatCurrency(dailySummary.totalDue)}</span></div>
                      
                      <div className="!mt-6 p-4 border rounded-lg bg-slate-50">
                          <h3 className="text-lg font-semibold text-center mb-2">{t.profitTitle[language]}</h3>
                          <p className="text-3xl font-bold text-center">{formatCurrency(todaysProfit)}</p>
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
