
"use client";

import { useState, useMemo, ReactNode, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { useLanguage } from '@/context/language-context';
import { Banknote, Printer, Loader2, CheckCircle2 } from 'lucide-react';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { sendSms } from '@/ai/flows/sms-flow';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';

const formatCurrency = (amount: number) => {
  if (isNaN(amount)) return '৳0.00';
  return `৳${amount.toFixed(2)}`;
};

const denominations = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

type ProfileSettings = {
  businessName: string;
  ownerName: string;
  mobile: string;
  email: string;
};

interface CashCalculatorDialogProps {
    children?: ReactNode;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CashCalculatorDialog({ isOpen, onOpenChange }: CashCalculatorDialogProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Partial<ProfileSettings>>({});
  const [counts, setCounts] = useState<Record<number, number | string>>(
    denominations.reduce((acc, curr) => ({ ...acc, [curr]: '' }), {})
  );
  const [sendSmsChecked, setSendSmsChecked] = useState(false);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [dialogStep, setDialogStep] = useState<'calculator' | 'smsPreview' | 'printReady'>('calculator');
  const [smsMessage, setSmsMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      try {
        const storedProfile = localStorage.getItem('profile-settings');
        if (storedProfile) setProfile(JSON.parse(storedProfile));
      } catch (e) {
        console.error("Failed to load profile data", e);
      }
      setDialogStep('calculator');
      setSendSmsChecked(false);
    }
  }, [isOpen]);

  const handleCountChange = (denomination: number, value: string) => {
    setCounts(prev => ({
      ...prev,
      [denomination]: value === '' ? '' : Number(value)
    }));
  };
  
  const grandTotal = useMemo(() => {
    return denominations.reduce((total, denom) => {
      const count = Number(counts[denom]) || 0;
      return total + (denom * count);
    }, 0);
  }, [counts]);

  const t = {
    title: { en: 'Cash Calculator', bn: 'টাকা হিসাবকারী' },
    reportTitle: { en: 'Cash Calculation Report', bn: 'নগদ টাকার হিসাব রিপোর্ট' },
    description: { en: 'Calculate total cash amount based on note counts.', bn: 'নোটের সংখ্যা অনুযায়ী মোট টাকার পরিমাণ হিসাব করুন।' },
    note: { en: 'Note / Coin', bn: 'নোট / কয়েন' },
    count: { en: 'Count', bn: 'সংখ্যা' },
    amount: { en: 'Amount', bn: 'পরিমাণ' },
    total: { en: 'Grand Total', bn: 'সর্বমোট' },
    print: { en: 'Print', bn: 'প্রিন্ট' },
    close: { en: 'Close', bn: 'বন্ধ' },
    sendSmsToOwner: { en: 'Send summary as SMS to owner', bn: 'মালিককে এসএমএস হিসেবে সারসংক্ষেপ পাঠান' },
    smsFailed: { en: 'SMS Failed', bn: 'এসএমএস ব্যর্থ হয়েছে' },
    ownerMobileMissing: { en: 'Owner mobile number is not set in profile.', bn: 'প্রোফাইলে মালিকের মোবাইল নম্বর সেট করা নেই।' },
    smsSettingsMissing: { en: 'SMS Settings Missing', bn: 'এসএমএস সেটিংস নেই' },
    smsSettingsMissingDesc: { en: 'Please configure API Key and Sender ID in settings.', bn: 'অনুগ্রহ করে সেটিংসে API কী এবং প্রেরক আইডি কনফিগার করুন।' },
    smsSuccess: { en: 'SMS Sent Successfully!', bn: 'এসএমএস সফলভাবে পাঠানো হয়েছে!' },
    preview: { en: 'Preview', bn: 'প্রিভিউ' },
    confirmAndSend: { en: 'Confirm & Send', bn: 'নিশ্চিত করুন ও পাঠান' },
    smsPreviewTitle: { en: 'SMS Preview', bn: 'এসএমএস প্রিভিউ' },
    smsPreviewDesc: { en: 'This message will be sent to the owner.', bn: 'এই বার্তাটি মালিককে পাঠানো হবে।' },
    back: { en: 'Back', bn: 'ফিরে যান' },
    smsSentSuccessfully: { en: 'SMS Sent Successfully!', bn: 'এসএমএস সফলভাবে পাঠানো হয়েছে!' },
    readyToPrint: { en: 'You can now print the report.', bn: 'আপনি এখন রিপোর্টটি প্রিন্ট করতে পারেন।' },
  };

  const getSmsCount = (message: string): number => {
    const isUnicode = Array.from(message).some(char => char.charCodeAt(0) > 127);
    if (isUnicode) {
        if (message.length <= 70) return 1;
        return Math.ceil(message.length / 67);
    } else {
        if (message.length <= 160) return 1;
        return Math.ceil(message.length / 153);
    }
  };
  
  const triggerPrint = () => {
      window.print();
      onOpenChange(false);
  }

  const handlePreviewOrPrint = async () => {
    if (sendSmsChecked) {
        if (!profile.mobile) {
            toast({ variant: 'destructive', title: t.smsFailed[language], description: t.ownerMobileMissing[language] });
            return;
        }

        const storedSmsSettings = localStorage.getItem('sms-settings');
        const { apiKey, senderId } = storedSmsSettings ? JSON.parse(storedSmsSettings) : { apiKey: '', senderId: '' };

        if (!apiKey || !senderId) {
            toast({ variant: 'destructive', title: t.smsSettingsMissing[language], description: t.smsSettingsMissingDesc[language] });
            return;
        }

        const summaryLines = denominations
            .map(denom => {
                const count = Number(counts[denom]) || 0;
                if (count > 0) {
                    const line = language === 'bn' 
                        ? `${denom.toLocaleString('bn-BD')} x ${count.toLocaleString('bn-BD')} = ${formatCurrency(denom * count)}`
                        : `${denom} x ${count} = ${formatCurrency(denom * count)}`;
                    return line;
                }
                return null;
            })
            .filter(Boolean);
        
        const messageHeader = language === 'bn' ? `নগদ টাকার হিসাবের সারসংক্ষেপ (${new Date().toLocaleDateString('bn-BD')}):\n` : `Cash Calculation Summary (${new Date().toLocaleDateString('en-CA')}):\n`;
        const totalHeader = language === 'bn' ? '\nসর্বমোট: ' : '\nGrand Total: ';
        const message = `${messageHeader}${summaryLines.join('\n')}${totalHeader}${formatCurrency(grandTotal)}`;
        
        setSmsMessage(message);
        setDialogStep('smsPreview');

    } else {
        triggerPrint();
    }
  };

  const handleConfirmAndSend = async () => {
    setIsSendingSms(true);
    const storedSmsSettings = localStorage.getItem('sms-settings');
    const { apiKey, senderId } = JSON.parse(storedSmsSettings || '{}');
    try {
        const result = await sendSms({ apiKey, senderId, phoneNumber: profile.mobile!, message: smsMessage });

        try {
          const history = JSON.parse(localStorage.getItem('sms-history') || '[]');
          history.unshift({
              id: `sms-${Date.now()}-cash-calc`,
              date: new Date().toISOString(),
              recipientName: profile.ownerName || 'Owner',
              recipientPhone: profile.mobile!,
              message: smsMessage,
              status: result.success ? 'success' : 'failed',
              statusMessage: result.message,
              smsCount: getSmsCount(smsMessage),
          });
          localStorage.setItem('sms-history', JSON.stringify(history.slice(0, 200)));
        } catch (e) { console.error("Failed to save SMS to history", e) }

        if (result.success) {
            toast({ title: t.smsSuccess[language] });
            setDialogStep('printReady');
        } else {
            toast({ variant: 'destructive', title: t.smsFailed[language], description: result.message });
            setDialogStep('calculator');
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: t.smsFailed[language], description: error.message });
        setDialogStep('calculator');
    } finally {
        setIsSendingSms(false);
    }
  }


  const getItemLabel = (denom: number) => {
    if (language === 'bn') {
        return `${denom.toLocaleString('bn-BD')} টাকার ${denom > 2 ? 'নোট' : 'কয়েন'}`;
    }
    return `${denom} Taka ${denom > 2 ? 'Note' : 'Coin'}`;
  }

  const renderContent = () => {
    switch (dialogStep) {
        case 'smsPreview':
            return (
                <Card>
                  <CardHeader>
                    <CardTitle>{t.smsPreviewTitle[language]}</CardTitle>
                    <CardDescription>{t.smsPreviewDesc[language]}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm p-3 bg-muted rounded-md whitespace-pre-wrap">{smsMessage}</p>
                  </CardContent>
                </Card>
            );
        case 'printReady':
            return (
                <div className="flex flex-col items-center justify-center text-center p-8 space-y-4">
                  <CheckCircle2 className="h-12 w-12 text-green-500"/>
                  <h3 className="text-lg font-semibold">{t.smsSentSuccessfully[language]}</h3>
                  <p className="text-muted-foreground">{t.readyToPrint[language]}</p>
                </div>
            );
        case 'calculator':
        default:
          return (
            <>
              <div id="printable-cash-calculator">
                 <div className="print-only mb-8">
                    <header className="mb-4 text-center">
                        <h1 className="text-xl font-bold">{profile.businessName || 'Business Name'}</h1>
                    </header>
                    <div className="text-center mb-4">
                        <h2 className="text-lg font-bold underline">{t.reportTitle[language]}</h2>
                    </div>
                    <Separator className="my-2" />
                  </div>
                <div className="max-h-[70vh] no-print:max-h-[60vh] overflow-y-auto pr-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.note[language]}</TableHead>
                        <TableHead className="text-center">{t.count[language]}</TableHead>
                        <TableHead className="text-right">{t.amount[language]}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {denominations.map(denom => {
                        const count = Number(counts[denom]) || 0;
                        const subtotal = denom * count;
                        return (
                          <TableRow key={denom} className={count === 0 ? 'no-print' : ''}>
                            <TableCell className="font-medium">
                              {getItemLabel(denom)}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={counts[denom]}
                                onChange={(e) => handleCountChange(denom, e.target.value)}
                                className="w-24 text-center mx-auto no-print"
                                placeholder="0"
                              />
                               <span className="print-only text-center block">{count}</span>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(subtotal)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                 {/* Add a printable footer here */}
                 <div className="print-only pt-4">
                   <Table>
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={2} className="text-right font-bold text-lg">{t.total[language]}</TableCell>
                            <TableCell className="text-right font-bold text-lg">{formatCurrency(grandTotal)}</TableCell>
                        </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </div>
            </>
          );
    }
  };

  const renderFooter = () => {
    switch (dialogStep) {
        case 'smsPreview':
            return (
                <DialogFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={() => setDialogStep('calculator')}>{t.back[language]}</Button>
                    <Button onClick={handleConfirmAndSend} disabled={isSendingSms}>
                        {isSendingSms && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t.confirmAndSend[language]}
                    </Button>
                </DialogFooter>
            );
        case 'printReady':
            return (
                <DialogFooter className="pt-4 border-t">
                    <DialogClose asChild>
                        <Button variant="secondary">{t.close[language]}</Button>
                    </DialogClose>
                    <Button onClick={triggerPrint}>
                        <Printer className="mr-2 h-4 w-4"/>
                        {t.print[language]}
                    </Button>
                </DialogFooter>
            );
        case 'calculator':
        default:
          return (
            <DialogFooter className="no-print flex-col sm:flex-row sm:justify-between sm:items-center pt-4 border-t gap-2">
                <div className="text-lg font-bold text-center sm:text-left">
                    {t.total[language]}: {formatCurrency(grandTotal)}
                </div>
                <div className="flex gap-4 items-center justify-end">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="send-sms" checked={sendSmsChecked} onCheckedChange={(checked) => setSendSmsChecked(Boolean(checked))} />
                        <Label htmlFor="send-sms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {t.sendSmsToOwner[language]}
                        </Label>
                    </div>
                    <DialogClose asChild>
                        <Button variant="outline">{t.close[language]}</Button>
                    </DialogClose>
                    <Button onClick={handlePreviewOrPrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        {sendSmsChecked ? t.preview[language] : t.print[language]}
                    </Button>
                </div>
            </DialogFooter>
          );
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl print-dialog-content">
        <DialogHeader className="no-print">
          <DialogTitle>{t.title[language]}</DialogTitle>
          <DialogDescription>{t.description[language]}</DialogDescription>
        </DialogHeader>
        {renderContent()}
        {renderFooter()}
      </DialogContent>
    </Dialog>
  );
}
