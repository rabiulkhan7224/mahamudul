
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/context/language-context";
import { CheckCircle2, Loader2, Info, Calendar, Clock } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { sendSms } from "@/ai/flows/sms-flow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { differenceInSeconds, format } from "date-fns";
import { bn as bnLocale } from "date-fns/locale";


type Plan = {
    id: number;
    title: { en: string; bn: string };
    price: number;
    durationDays: number; // Duration in days
    isRecommended?: boolean;
    isPopular?: boolean;
};

const Countdown = ({ expiryDate }: { expiryDate: Date | null }) => {
    const { language } = useLanguage();
    const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number; totalSeconds: number }>({
        days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0
    });

    useEffect(() => {
        if (!expiryDate) return;

        const interval = setInterval(() => {
            const totalSeconds = differenceInSeconds(expiryDate, new Date());
            
            if (totalSeconds <= 0) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 });
                clearInterval(interval);
                // Optionally trigger a page reload or auth state refresh
                window.location.reload();
                return;
            }

            setTimeLeft({
                days: Math.floor(totalSeconds / (3600 * 24)),
                hours: Math.floor((totalSeconds % (3600 * 24)) / 3600),
                minutes: Math.floor((totalSeconds % 3600) / 60),
                seconds: Math.floor(totalSeconds % 60),
                totalSeconds: totalSeconds,
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [expiryDate]);

    const formatNumber = (num: number) => {
        if (language === 'bn') {
            return num.toLocaleString('bn-BD');
        }
        return num.toString().padStart(2, '0');
    };
    
    const t = {
        days: { en: 'Days', bn: 'দিন' },
        hours: { en: 'Hours', bn: 'ঘন্টা' },
        minutes: { en: 'Mins', bn: 'মিনিট' },
        seconds: { en: 'Secs', bn: 'সেকেন্ড' },
    };
    
    const totalDays = Math.floor(timeLeft.totalSeconds / (3600 * 24));
    let colorClass = "text-green-500";
    if (totalDays <= 2) {
      colorClass = "text-red-500";
    } else if (totalDays <= 5) {
      colorClass = "text-amber-500";
    }

    return (
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 text-center ${colorClass}`}>
            <div>
                <div className="text-4xl font-bold">{formatNumber(timeLeft.days)}</div>
                <div className="text-sm text-muted-foreground">{t.days[language]}</div>
            </div>
            <div>
                <div className="text-4xl font-bold">{formatNumber(timeLeft.hours)}</div>
                <div className="text-sm text-muted-foreground">{t.hours[language]}</div>
            </div>
            <div>
                <div className="text-4xl font-bold">{formatNumber(timeLeft.minutes)}</div>
                <div className="text-sm text-muted-foreground">{t.minutes[language]}</div>
            </div>
            <div>
                <div className="text-4xl font-bold">{formatNumber(timeLeft.seconds)}</div>
                <div className="text-sm text-muted-foreground">{t.seconds[language]}</div>
            </div>
        </div>
    );
};


export default function SubscriptionPage() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const { user, subscriptionStatus, subscribedPlanId, pendingSubscription, activateSubscription, subscriptionExpiry, subscriptionStartDate } = useAuth();
  
  const [loadingPlanIndex, setLoadingPlanIndex] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentPhone, setPaymentPhone] = useState("");
  const [paymentTxId, setPaymentTxId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otp, setOtp] = useState("");
  const [isActivating, setIsActivating] = useState(false);

  const handlePlanClick = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsPaymentDialogOpen(true);
  };
  
  const t = {
    title: { en: "Subscription Plans", bn: "সাবস্ক্রিপশন প্ল্যান" },
    description: { en: "Choose the perfect plan for your business needs. All plans include our core features with premium support.", bn: "আপনার ব্যবসার প্রয়োজন অনুযায়ী সেরা প্ল্যানটি বেছে নিন। সমস্ত প্ল্যানে প্রিমিয়াম সাপোর্ট সহ আমাদের মূল বৈশিষ্ট্যগুলো অন্তর্ভুক্ত রয়েছে।" },
    monthlyPlan: { en: "Monthly Plan", bn: "মাসিক প্ল্যান" },
    threeMonthsPlan: { en: "3 Months Plan", bn: "৩ মাসের প্ল্যান" },
    sixMonthsPlan: { en: "6 Months Plan", bn: "৬ মাসের প্ল্যান" },
    bdt: { en: "BDT", bn: "টাকা" },
    recommended: { en: "Recommended", bn: "সুপারিশকৃত" },
    mostPopular: { en: "Most Popular", bn: "সবচেয়ে জনপ্রিয়" },
    renew: { en: "Renew Now", bn: "এখনই রিনিউ করুন" },
    getStarted: { en: "Get Started", bn: "শুরু করুন" },
    planFeatures: [
        { en: "Unlimited Ledger Entries", bn: "আনলিমিটেড লেজার এন্ট্রি" },
        { en: "Employee & Salary Management", bn: "কর্মচারী এবং বেতন ব্যবস্থাপনা" },
        { en: "Product & Inventory Control", bn: "পণ্য এবং ইনভেন্টরি নিয়ন্ত্রণ" },
        { en: "Accounts Receivable Tracking", bn: "বকেয়া হিসাব ট্র্যাকিং" },
        { en: "Supplier Payment Management", bn: "সরবরাহকারী পেমেন্ট ব্যবস্থাপনা" },
        { en: "Daily & Monthly Sales Reports", bn: "দৈনিক ও মাসিক বিক্রয় রিপোর্ট" },
        { en: "User-friendly Dashboard", bn: "ব্যবহারকারী-বান্ধব ড্যাশবোর্ড" },
        { en: "Dedicated Support", bn: "ডেডিকেটেড সাপোর্ট" },
    ],
    // Payment Dialog
    paymentDialogTitle: { en: "Complete Your Payment", bn: "আপনার পেমেন্ট সম্পন্ন করুন" },
    paymentDialogDesc: { en: "To activate your plan, please send money via bKash to the following number.", bn: "আপনার প্ল্যানটি সক্রিয় করতে, অনুগ্রহ করে নিচের নম্বরে বিকাশের মাধ্যমে টাকা পাঠান।" },
    bKashNumber: { en: "bKash Number", bn: "বিকাশ নম্বর" },
    amountToSend: { en: "Amount to Send", bn: "পাঠানোর পরিমাণ" },
    paymentInfo: { en: "Payment Information", bn: "পেমেন্টের তথ্য" },
    yourBkashNumber: { en: "Your bKash Number", bn: "আপনার বিকাশ নম্বর" },
    transactionId: { en: "Transaction ID", bn: "ট্রানজেকশন আইডি" },
    submitPayment: { en: "Submit Payment Info", bn: "পেমেন্টের তথ্য জমা দিন" },
    cancel: { en: "Cancel", bn: "বাতিল" },
    // OTP
    pendingVerification: { en: "Pending Verification", bn: "ভেরিফিকেশন বাকি আছে" },
    enterOtp: { en: "Enter the 6-digit OTP you received via SMS to activate your plan.", bn: "আপনার প্ল্যান সক্রিয় করতে এসএমএসে প্রাপ্ত ৬-সংখ্যার ওটিপি লিখুন।" },
    otpLabel: { en: "Activation OTP", bn: "অ্যাক্টিভেশন ওটিপি" },
    activate: { en: "Activate", bn: "সক্রিয় করুন" },
    // Toasts
    smsSettingsMissing: { en: 'SMS Settings Missing', bn: 'এসএমএস সেটিংস নেই' },
    smsSettingsMissingDesc: { en: 'Please configure your SMS API Key and Sender ID in Settings before proceeding.', bn: 'অনুগ্রহ করে আগে সেটিংসে আপনার এসএমএস এপিআই কী এবং প্রেরক আইডি কনফিগার করুন।' },
    requestSubmitted: { en: 'Request Submitted', bn: 'অনুরোধ জমা হয়েছে' },
    requestSubmittedDesc: { en: 'Your payment information has been sent. Please wait for the activation OTP.', bn: 'আপনার পেমেন্টের তথ্য পাঠানো হয়েছে। অনুগ্রহ করে অ্যাক্টিভেশন ওটিপি-এর জন্য অপেক্ষা করুন।' },
    activationSuccess: { en: 'Subscription Activated!', bn: 'সাবস্ক্রিপশন সক্রিয় হয়েছে!' },
    activationFailed: { en: 'Activation Failed', bn: 'অ্যাক্টিভেশন ব্যর্থ হয়েছে' },
    invalidOtp: { en: 'The OTP you entered is incorrect. Please try again.', bn: 'আপনি যে ওটিপি দিয়েছেন তা ভুল। অনুগ্রহ করে আবার চেষ্টা করুন।' },
    // Misc
    currentPlan: { en: "Current Plan", bn: "বর্তমান প্ল্যান" },
    expiresOn: { en: "Expires on", bn: "মেয়াদ শেষ হবে" },
    loading: { en: 'Loading...', bn: 'লোড হচ্ছে...' },
    status: { en: 'Status', bn: 'স্ট্যাটাস' },
    active: { en: 'Active', bn: 'সক্রিয়' },
    startDate: { en: 'Start Date', bn: 'শুরুর তারিখ' },
    timeLeft: { en: 'Time Left', bn: 'সময় বাকি' },
  };
  
  const pricingPlans: Plan[] = [
    {
      id: 1,
      title: t.monthlyPlan,
      price: 2500,
      durationDays: 30,
      isRecommended: true,
      isPopular: false
    },
    {
      id: 2,
      title: t.threeMonthsPlan,
      price: 7500,
      durationDays: 90,
      isRecommended: false,
      isPopular: true
    },
    {
      id: 3,
      title: t.sixMonthsPlan,
      price: 13500,
      durationDays: 180,
      isRecommended: false,
      isPopular: false
    }
  ];
  
  const currentPlanDetails = subscribedPlanId ? pricingPlans.find(p => p.id === subscribedPlanId) : null;

  const handleSubmitPayment = async () => {
    if (!selectedPlan || !paymentPhone || !paymentTxId) return;

    const storedSmsSettings = localStorage.getItem('sms-settings');
    const { apiKey, senderId } = storedSmsSettings ? JSON.parse(storedSmsSettings) : { apiKey: '', senderId: '' };

    if (!apiKey || !senderId) {
        toast({
            variant: "destructive",
            title: t.smsSettingsMissing[language],
            description: t.smsSettingsMissingDesc[language],
        });
        return;
    }

    setIsSubmitting(true);
    
    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    
    try {
        const message = `New Subscription Request:
        User: ${user?.fullName} (${user?.email})
        Plan: ${selectedPlan.title[language]}
        Amount: ${selectedPlan.price} BDT
        From bKash No: ${paymentPhone}
        TrxID: ${paymentTxId}
        OTP: ${otp}`;

        await sendSms({
            apiKey,
            senderId,
            phoneNumber: '01796131037', // Admin's number
            message: message,
        });

        const newPendingSubscription = {
            planId: selectedPlan.id,
            requestDate: new Date().toISOString(),
            otp: otp, // Store the OTP
        };
        localStorage.setItem('pending_subscription', JSON.stringify(newPendingSubscription));
        
        toast({
            title: t.requestSubmitted[language],
            description: t.requestSubmittedDesc[language],
        });

        // Force a reload of auth context state by logging out and in conceptually
        window.location.reload(); 

    } catch (error) {
        console.error("SMS sending failed:", error);
    } finally {
        setIsSubmitting(false);
        setIsPaymentDialogOpen(false);
    }
  };

  const handleActivate = async () => {
    if (!pendingSubscription || !otp) return;

    setIsActivating(true);
    try {
      await activateSubscription(otp);
      toast({ title: t.activationSuccess[language] });
    } catch (error) {
      toast({ variant: 'destructive', title: t.activationFailed[language], description: t.invalidOtp[language] });
    } finally {
      setIsActivating(false);
      setOtp("");
    }
  };


  return (
    <div className="flex flex-col gap-6">
    
        {subscriptionStatus === 'active' && currentPlanDetails && (
            <Card className="bg-gradient-to-br from-primary/10 via-background to-background">
                <CardHeader>
                    <CardTitle>{t.currentPlan[language]}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm font-medium text-muted-foreground">{t.currentPlan[language]}</p>
                            <p className="text-lg font-bold">{currentPlanDetails.title[language]}</p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm font-medium text-muted-foreground">{t.startDate[language]}</p>
                            <p className="text-lg font-bold">{subscriptionStartDate ? format(subscriptionStartDate, 'PP', { locale: language === 'bn' ? bnLocale : undefined }) : '-'}</p>
                        </div>
                         <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm font-medium text-muted-foreground">{t.expiresOn[language]}</p>
                            <p className="text-lg font-bold">{subscriptionExpiry ? format(subscriptionExpiry, 'PP', { locale: language === 'bn' ? bnLocale : undefined }) : '-'}</p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm font-medium text-muted-foreground">{t.status[language]}</p>
                            <p className="text-lg font-bold text-green-600 flex items-center justify-center gap-2"><CheckCircle2 className="h-5 w-5"/>{t.active[language]}</p>
                        </div>
                    </div>
                     <div>
                        <Label className="text-sm font-medium text-muted-foreground">{t.timeLeft[language]}</Label>
                        <Countdown expiryDate={subscriptionExpiry} />
                    </div>
                </CardContent>
            </Card>
        )}

      <div className="flex flex-col items-center justify-center space-y-4 text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">{t.title[language]}</h1>
        <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
          {t.description[language]}
        </p>
      </div>
      <div className="mx-auto grid max-w-sm items-start gap-8 sm:max-w-4xl sm:grid-cols-2 md:gap-12 lg:max-w-5xl lg:grid-cols-3">
        {pricingPlans.map((plan, index) => {
            const isCurrentPlan = subscriptionStatus === 'active' && subscribedPlanId === plan.id;
            const isPendingPlan = subscriptionStatus === 'pending' && pendingSubscription?.planId === plan.id;
            const isOtherPlanPending = subscriptionStatus === 'pending' && pendingSubscription?.planId !== plan.id;
            
            return (
              <Card key={index} className={`relative overflow-hidden shadow-lg transition-transform hover:scale-105 ${plan.isPopular ? 'border-2 border-primary' : ''} ${isOtherPlanPending ? 'opacity-50 pointer-events-none' : ''}`}>
                {plan.isPopular && !isCurrentPlan && <div className="absolute top-0 right-0 m-2 bg-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">{t.mostPopular[language]}</div>}
                {plan.isRecommended && !isCurrentPlan && <div className="absolute top-0 left-0 m-2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">{t.recommended[language]}</div>}
                {isCurrentPlan && <div className="absolute top-0 left-0 m-2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">{t.currentPlan[language]}</div>}
                
                <CardContent className="p-6 grid gap-4">
                  <h3 className="text-2xl font-bold text-center mt-4">{plan.title[language]}</h3>
                  <div className="text-center">
                      <span className="text-4xl font-extrabold bg-gradient-to-r from-primary via-purple-500 to-pink-500 text-transparent bg-clip-text">
                        {plan.price.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
                      </span>
                      <span className="text-lg font-semibold text-muted-foreground ml-2">{t.bdt[language]}</span>
                  </div>
                  <ul className="grid gap-3 text-sm">
                    {t.planFeatures.map((feature, fIndex) => (
                       <li key={fIndex} className="flex items-center gap-2">
                         <CheckCircle2 className="h-4 w-4 text-primary"/>
                         <span className="text-muted-foreground">{feature[language]}</span>
                       </li>
                    ))}
                  </ul>

                  {isPendingPlan ? (
                    <div className="mt-4 space-y-4">
                        <Alert variant="default" className="border-amber-500/50 text-amber-600 [&>svg]:text-amber-600">
                           <Info className="h-4 w-4" />
                           <AlertTitle>{t.pendingVerification[language]}</AlertTitle>
                           <AlertDescription>{t.enterOtp[language]}</AlertDescription>
                        </Alert>
                        <div className="grid gap-2">
                            <Label htmlFor={`otp-${plan.id}`}>{t.otpLabel[language]}</Label>
                            <Input id={`otp-${plan.id}`} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="••••••" />
                        </div>
                        <Button onClick={handleActivate} disabled={isActivating || !otp} className="w-full">
                            {isActivating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            {t.activate[language]}
                        </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => handlePlanClick(plan)} 
                      disabled={loadingPlanIndex === index || isCurrentPlan || isOtherPlanPending}
                      className="w-full mt-4"
                    >
                      {loadingPlanIndex === index ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                            {t.loading[language]}
                          </>
                        ) : (
                          isCurrentPlan ? t.currentPlan[language] : t.getStarted[language]
                        )}
                    </Button>
                  )}
                </CardContent>
              </Card>
          );
        })}
      </div>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>{t.paymentDialogTitle[language]}</DialogTitle>
                  <DialogDescription>{t.paymentDialogDesc[language]}</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <Card>
                    <CardContent className="p-4 space-y-2 text-center">
                        <Label>{t.bKashNumber[language]}</Label>
                        <p className="text-2xl font-bold tracking-widest">01796131037</p>
                        <Label>{t.amountToSend[language]}</Label>
                        <p className="text-xl font-bold">{selectedPlan?.price.toLocaleString('en-US')} {t.bdt[language]}</p>
                    </CardContent>
                </Card>
                <div className="space-y-2">
                    <Label>{t.paymentInfo[language]}</Label>
                    <Input placeholder={t.yourBkashNumber[language]} value={paymentPhone} onChange={(e) => setPaymentPhone(e.target.value)} />
                    <Input placeholder={t.transactionId[language]} value={paymentTxId} onChange={(e) => setPaymentTxId(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                  <DialogClose asChild><Button variant="outline">{t.cancel[language]}</Button></DialogClose>
                  <Button onClick={handleSubmitPayment} disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t.submitPayment[language]}
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}
