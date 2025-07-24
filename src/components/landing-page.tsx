
"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/language-context";
import { ArrowRight, Loader2, BarChart, Users, Package, Banknote, CheckCircle2, Languages, Phone, Mail, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function LandingPage() {
  const { language, toggleLanguage } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPlanIndex, setLoadingPlanIndex] = useState<number | null>(null);

  const handleClick = () => {
    setIsLoading(true);
  };

  const handlePlanClick = (index: number) => {
    setLoadingPlanIndex(index);
  };

  const t = {
    title: {
      en: "The Future of Dealership Management",
      bn: "আপনার ডিলারশিপ ব্যবসার ভবিষ্যৎ",
    },
    subtitle: {
      en: "The all-in-one solution for managing your sales, inventory, employees, and finances with ease. Focus on growth, we'll handle the rest.",
      bn: "আপনার বিক্রয়, ইনভেন্টরি, কর্মচারী এবং আর্থিক হিসাব সহজে পরিচালনা করার জন্য একটি অল-ইন-ওয়ান সমাধান। আপনার ব্যবসার বৃদ্ধিতে মনোযোগ দিন, বাকিটা আমরা সামলে নেব।",
    },
    getStarted: { en: "Get Started Now", bn: "এখনই শুরু করুন" },
    contact: { en: "Contact", bn: "যোগাযোগ" },
    featuresTitle: { en: "Powerful Features, Simple Interface", bn: "শক্তিশালী ফিচার, সহজ ইন্টারফেস" },
    features: [
      {
        icon: BarChart,
        title: { en: "Sales Analytics", bn: "বিক্রয় বিশ্লেষণ" },
        description: { en: "Get real-time insights into your sales performance.", bn: "আপনার বিক্রয়ের কার্যকারিতা সম্পর্কে রিয়েল-টাইম তথ্য পান।" },
      },
      {
        icon: Package,
        title: { en: "Inventory Control", bn: "ইনভেন্টরি নিয়ন্ত্রণ" },
        description: { en: "Manage your stock levels with automated tracking.", bn: "স্বয়ংক্রিয় ট্র্যাকিংয়ের মাধ্যমে আপনার স্টক লেভেল পরিচালনা করুন।" },
      },
      {
        icon: Users,
        title: { en: "Employee Management", bn: "কর্মচারী ব্যবস্থাপনা" },
        description: { en: "Track attendance, performance, and payroll.", bn: "উপস্থিতি, কর্মক্ষমতা এবং বেতন ট্র্যাক করুন।" },
      },
      {
        icon: Banknote,
        title: { en: "Financial Tracking", bn: "আর্থিক ট্র্যাকিং" },
        description: { en: "Keep a clear record of receivables and payments.", bn: "প্রাপ্য এবং পেমেন্টের একটি পরিষ্কার রেকর্ড রাখুন।" },
      },
    ],
    pricing: {
      choosePlan: { en: "Choose Your Plan", bn: "আপনার প্ল্যান বেছে নিন" },
      title: { en: "Simple, Transparent Pricing", bn: "সহজ এবং স্বচ্ছ মূল্য নির্ধারণ" },
      description: { en: "Choose the perfect plan for your business needs. All plans include our core features with premium support.", bn: "আপনার ব্যবসার প্রয়োজন অনুযায়ী সেরা প্ল্যানটি বেছে নিন। সমস্ত প্ল্যানে প্রিমিয়াম সাপোর্ট সহ আমাদের মূল বৈশিষ্ট্যগুলো অন্তর্ভুক্ত রয়েছে।" },
      monthlyPlan: { en: "Monthly Plan", bn: "মাসিক প্ল্যান" },
      threeMonthsPlan: { en: "3 Months Plan", bn: "৩ মাসের প্ল্যান" },
      sixMonthsPlan: { en: "6 Months Plan", bn: "৬ মাসের প্ল্যান" },
      bdt: { en: "BDT", bn: "টাকা" },
      recommended: { en: "Recommended", bn: "সুপারিশকৃত" },
      mostPopular: { en: "Most Popular", bn: "সবচেয়ে জনপ্রিয়" },
      renew: { en: "Get Started", bn: "শুরু করুন" },
      planFeatures: [
        { en: "Unlimited Ledger Entries", bn: "আনলিমিটেড লেজার এন্ট্রি" },
        { en: "Employee & Salary Management", bn: "কর্মচারী এবং বেতন ব্যবস্থাপনা" },
        { en: "Product & Inventory Control", bn: "পণ্য এবং ইনভেন্টরি নিয়ন্ত্রণ" },
        { en: "Accounts Receivable Tracking", bn: "বকেয়া হিসাব ট্র্যাকিং" },
        { en: "Supplier Payment Management", bn: "সরবরাহকারী পেমেন্ট ব্যবস্থাপনা" },
        { en: "Daily & Monthly Sales Reports", bn: "দৈনিক ও মাসিক বিক্রয় রিপোর্ট" },
        { en: "User-friendly Dashboard", bn: "ব্যবহারকারী-বান্ধব ড্যাশবোর্ড" },
        { en: "Dedicated Support", bn: "ডেডিকেটেড সাপোর্ট" },
      ]
    },
    stats: {
      title: { en: "Trusted by Businesses Across Bangladesh", bn: "সারা বাংলাদেশ জুড়ে ব্যবসার বিশ্বস্ত" },
      users: { en: "Total Users", bn: "সর্বমোট ব্যবহারকারী" },
      companies: { en: "Total Companies", bn: "সর্বমোট কোম্পানি" },
      returnUsers: { en: "Return Users", bn: "রিটার্ন ইউজার" }
    },
    toggleLanguage: { en: "বাংলা", bn: "English" },
  };
  
  const pricingPlans = [
    {
      title: t.pricing.monthlyPlan,
      price: 2500,
      isRecommended: true,
      isPopular: false
    },
    {
      title: t.pricing.threeMonthsPlan,
      price: 7500,
      isRecommended: false,
      isPopular: true
    },
    {
      title: t.pricing.sixMonthsPlan,
      price: 13500,
      isRecommended: false,
      isPopular: false
    }
  ];

  return (
    <div className="flex-1 flex flex-col">
       <section className="w-full py-16 md:py-24 lg:py-32 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col gap-4 text-center">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                    <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 text-transparent bg-clip-text">
                        {t.title[language]}
                    </span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                    {t.subtitle[language]}
                </p>
                <div className="flex justify-center items-center gap-4 mt-4">
                    <Button variant="outline" size="lg" onClick={toggleLanguage}>
                        <Languages className="mr-2 h-5 w-5" />
                        {t.toggleLanguage[language]}
                    </Button>
                    <ThemeToggle />
                    <Button 
                        size="lg" 
                        asChild={!isLoading}
                        onClick={handleClick}
                        disabled={isLoading}
                        className="bg-gradient-to-r from-primary to-purple-600 text-primary-foreground hover:opacity-90 transition-opacity shadow-lg"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                <span>{language === 'bn' ? 'লোড হচ্ছে...' : 'Loading...'}</span>
                            </>
                        ) : (
                            <Link href="/signup">
                                {t.getStarted[language]}
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        )}
                    </Button>
                </div>
            </div>
        </div>
       </section>

       <section className="w-full py-16 md:py-24 bg-primary/5">
        <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">{t.stats.title[language]}</h2>
            </div>
             <div className="relative flex justify-center items-center">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-12 z-10">
                    <div className="text-center p-4 bg-background/80 backdrop-blur-sm rounded-lg">
                        <h3 className="text-4xl font-extrabold text-primary">249+</h3>
                        <p className="text-muted-foreground mt-2">{t.stats.users[language]}</p>
                    </div>
                    <div className="text-center p-4 bg-background/80 backdrop-blur-sm rounded-lg">
                        <h3 className="text-4xl font-extrabold text-primary">187+</h3>
                        <p className="text-muted-foreground mt-2">{t.stats.companies[language]}</p>
                    </div>
                    <div className="text-center p-4 bg-background/80 backdrop-blur-sm rounded-lg">
                        <h3 className="text-4xl font-extrabold text-primary">95%</h3>
                        <p className="text-muted-foreground mt-2">{t.stats.returnUsers[language]}</p>
                    </div>
                </div>
             </div>
        </div>
       </section>
       
       <section id="pricing" className="w-full py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
                <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary font-medium">{t.pricing.choosePlan[language]}</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">{t.pricing.title[language]}</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    {t.pricing.description[language]}
                </p>
            </div>
            <div className="mx-auto grid max-w-sm items-start gap-8 sm:max-w-4xl sm:grid-cols-2 md:gap-12 lg:max-w-5xl lg:grid-cols-3">
              {pricingPlans.map((plan, index) => (
                <Card key={index} className={`relative overflow-hidden shadow-lg transition-transform hover:scale-105 ${plan.isPopular ? 'border-2 border-primary' : ''}`}>
                  {plan.isPopular && (
                    <div className="absolute top-0 right-0 m-2 bg-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                      {t.pricing.mostPopular[language]}
                    </div>
                  )}
                  {plan.isRecommended && (
                     <div className="absolute top-0 left-0 m-2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                       {t.pricing.recommended[language]}
                     </div>
                  )}
                  <CardContent className="p-6 grid gap-4">
                    <h3 className="text-2xl font-bold text-center mt-4">{plan.title[language]}</h3>
                    <div className="text-center">
                        <span className="text-4xl font-extrabold bg-gradient-to-r from-primary via-purple-500 to-pink-500 text-transparent bg-clip-text">
                          {plan.price.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
                        </span>
                        <span className="text-lg font-semibold text-muted-foreground ml-2">{t.pricing.bdt[language]}</span>
                    </div>
                    <ul className="grid gap-3 text-sm">
                      {t.pricing.planFeatures.map((feature, fIndex) => (
                         <li key={fIndex} className="flex items-center gap-2">
                           <CheckCircle2 className="h-4 w-4 text-primary"/>
                           <span className="text-muted-foreground">{feature[language]}</span>
                         </li>
                      ))}
                    </ul>
                    <Button 
                      asChild={loadingPlanIndex !== index} 
                      onClick={() => handlePlanClick(index)} 
                      disabled={loadingPlanIndex === index}
                      className="w-full mt-4"
                    >
                      {loadingPlanIndex === index ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                            {language === 'bn' ? 'লোড হচ্ছে...' : 'Loading...'}
                          </>
                        ) : (
                          <Link href="/signup">{t.pricing.renew[language]}</Link>
                        )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
        </div>
       </section>

       <section className="w-full py-16 md:py-24 lg:py-32 bg-gradient-to-br from-primary/5 via-background to-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">{t.featuresTitle[language]}</h2>
            </div>
            <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-5xl md:grid-cols-4 md:gap-8 mt-12">
              {t.features.map((feature, index) => (
                <div key={index} className="flex flex-col items-center gap-2 p-6 bg-background rounded-lg shadow-sm text-center">
                    <div className="bg-primary/10 p-3 rounded-full text-primary">
                        <feature.icon className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-bold">{feature.title[language]}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description[language]}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        <footer id="footer" className="bg-primary/5 py-12 scroll-mt-20">
          <div className="container mx-auto px-4 md:px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {/* Column 1: App Info */}
                  <div className="flex flex-col gap-2">
                    <Link href="/" className="flex items-center gap-2 font-bold text-lg text-foreground">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-6 w-6 text-primary"
                      >
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                      </svg>
                      <span className="text-glow font-extrabold">DashManager</span>
                    </Link>
                  </div>
                  
                  {/* Column 2: Quick Links */}
                  <div>
                      <h4 className="font-semibold mb-3">{language === 'bn' ? 'কুইক লিঙ্কস' : 'Quick Links'}</h4>
                      <ul className="space-y-2">
                          <li><Link href="#pricing" className="text-muted-foreground hover:text-primary">{language === 'bn' ? 'মূল্য নির্ধারণ' : 'Pricing'}</Link></li>
                          <li><Link href="/login" className="text-muted-foreground hover:text-primary">{language === 'bn' ? 'লগইন' : 'Login'}</Link></li>
                      </ul>
                  </div>

                  {/* Column 3: Legal */}
                  <div>
                      <h4 className="font-semibold mb-3">{language === 'bn' ? 'আইনি' : 'Legal'}</h4>
                      <ul className="space-y-2">
                          <li><Link href="#" className="text-muted-foreground hover:text-primary">{language === 'bn' ? 'গোপনীয়তা নীতি' : 'Privacy Policy'}</Link></li>
                          <li><Link href="#" className="text-muted-foreground hover:text-primary">{language === 'bn' ? 'সেবার শর্তাবলী' : 'Terms of Service'}</Link></li>
                      </ul>
                  </div>

                  {/* Column 4: Contact */}
                  <div>
                      <h4 className="font-semibold mb-3">{language === 'bn' ? 'যোগাযোগ করুন' : 'Get In Touch'}</h4>
                      <ul className="space-y-2 text-muted-foreground">
                          <li className="flex items-center gap-2"><Phone className="h-4 w-4"/>+8801796131037</li>
                          <li className="flex items-center gap-2"><Mail className="h-4 w-4"/>dealershipofficial@gmail.com</li>
                          <li className="flex items-center gap-2"><MapPin className="h-4 w-4"/>{language === 'bn' ? 'আরিফ বাজার, বীরগঞ্জ, দিনাজপুর - ৫২২০' : 'Arif Bazar, Birganj, Dinajpur - 5220'}</li>
                      </ul>
                  </div>
              </div>
              <div className="border-t mt-8 pt-6 text-center text-sm text-muted-foreground">
                  © {new Date().getFullYear()} DealerShip. {language === 'bn' ? 'সর্বস্বত্ব সংরক্ষিত।' : 'All rights reserved.'}
              </div>
          </div>
      </footer>
    </div>
  );
}
