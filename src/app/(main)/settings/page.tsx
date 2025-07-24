
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/context/language-context";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Server, Loader2, Copy, Eye, EyeOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getServerIp } from "@/ai/flows/server-diag-flow";
import { sendSms } from "@/ai/flows/sms-flow";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const { language } = useLanguage();
  const { toast } = useToast();

  // State for SMS Settings
  const [apiKey, setApiKey] = useState("");
  const [senderId, setSenderId] = useState("");
  const [isSmsEnabled, setIsSmsEnabled] = useState(true);
  const [isConfirmToggleOpen, setIsConfirmToggleOpen] = useState(false);
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);


  // State for SMS Templates
  const [dueReminderSmsTemplate, setDueReminderSmsTemplate] = useState(
    "{business_name}: প্রিয় {customer_name}, আপনার বকেয়ার পরিমাণ {due_amount} টাকা। অনুগ্রহ করে বকেয়া পরিশোধ করুন।"
  );
  const [ledgerSmsTemplate, setLedgerSmsTemplate] = useState(
    "{business_name}: প্রিয় {employee_name}, {date} তারিখে খাতা নং #{ledger_no} থেকে {new_amount} টাকার একটি নতুন {amount_type} যোগ করা হয়েছে। আপনার নতুন মোট বকেয়া এখন {total_due} টাকা।"
  );
  const [paymentSmsTemplate, setPaymentSmsTemplate] = useState(
    "{business_name}: প্রিয় {employee_name}, খাতা নং #{ledger_no} থেকে {payment_type} বাবদ {payment_amount} টাকা পরিশোধ রেকর্ড করা হয়েছে। আপনার নতুন মোট বকেয়া এখন {new_total_due} টাকা।"
  );
  const [manualTxnSmsTemplate, setManualTxnSmsTemplate] = useState(
    "{business_name}: প্রিয় {employee_name}, আপনার অ্যাকাউন্টে {amount} টাকার একটি {transaction_type} লেনদেন সম্পন্ন হয়েছে। আপনার নতুন মোট বকেয়া এখন {total_due} টাকা।"
  );
  const [editLedgerSmsTemplate, setEditLedgerSmsTemplate] = useState(
    "{business_name}: প্রিয় {employee_name}, খাতা নং #{ledger_no} সম্পাদনা করা হয়েছে। আপনার {amount_type} {old_amount} টাকা থেকে পরিবর্তন করে {new_amount} টাকা করা হয়েছে।"
  );


  // State for IP Diagnostic
  const [serverIp, setServerIp] = useState("");
  const [isIpLoading, setIsIpLoading] = useState(false);

  // State for Test SMS
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [isSmsLoading, setIsSmsLoading] = useState(false);
  
  // State for Reset confirmation
  const [resetConfirmationInput, setResetConfirmationInput] = useState("");
  const [hasDataToReset, setHasDataToReset] = useState(false);


  useEffect(() => {
    // Check if there is data to reset
    try {
        const products = localStorage.getItem('products');
        const employees = localStorage.getItem('employees');
        const rewards = localStorage.getItem('rewards-list');
        
        if (
          (products && JSON.parse(products).length > 0) ||
          (employees && JSON.parse(employees).length > 0) ||
          (rewards && JSON.parse(rewards).length > 0)
        ) {
          setHasDataToReset(true);
        } else {
          setHasDataToReset(false);
        }
    } catch (e) {
        console.error("Failed to check for data to reset", e);
        setHasDataToReset(false);
    }
    
    // Load other settings
    const storedSmsSettings = localStorage.getItem('sms-settings');
    if (storedSmsSettings) {
      try {
        const { apiKey, senderId } = JSON.parse(storedSmsSettings);
        setApiKey(apiKey || "");
        setSenderId(senderId || "");
      } catch (e) {
        console.error("Failed to parse sms-settings from localStorage", e);
      }
    }
    const smsEnabled = localStorage.getItem('sms-service-enabled');
    setIsSmsEnabled(smsEnabled === null ? true : JSON.parse(smsEnabled));

    const storedDueTemplate = localStorage.getItem('sms-template');
    if (storedDueTemplate) {
        setDueReminderSmsTemplate(storedDueTemplate);
    }
    const storedLedgerTemplate = localStorage.getItem('sms-template-ledger');
    if (storedLedgerTemplate) {
        setLedgerSmsTemplate(storedLedgerTemplate);
    }
    const storedPaymentTemplate = localStorage.getItem('sms-template-payment');
    if (storedPaymentTemplate) {
        setPaymentSmsTemplate(storedPaymentTemplate);
    }
    const storedManualTxnTemplate = localStorage.getItem('sms-template-manual-txn');
    if (storedManualTxnTemplate) {
        setManualTxnSmsTemplate(storedManualTxnTemplate);
    }
    const storedEditLedgerTemplate = localStorage.getItem('sms-template-edit-ledger');
    if (storedEditLedgerTemplate) {
        setEditLedgerSmsTemplate(storedEditLedgerTemplate);
    }
  }, []);

  const handleSaveSmsSettings = () => {
    localStorage.setItem('sms-settings', JSON.stringify({ apiKey, senderId }));
    toast({
      title: t.settingsSaved[language],
      description: t.settingsSavedDesc[language],
    });
  };

  const handleToggleSmsService = () => {
    const newState = !isSmsEnabled;
    setIsSmsEnabled(newState);
    localStorage.setItem('sms-service-enabled', JSON.stringify(newState));
    toast({
      title: t.settingsSaved[language],
      description: newState ? t.smsServiceNowEnabled[language] : t.smsServiceNowDisabled[language],
    });
    setIsConfirmToggleOpen(false);
  };

  const handleSaveDueSmsTemplate = () => {
    localStorage.setItem('sms-template', dueReminderSmsTemplate);
    toast({
        title: t.templateSaved[language],
        description: t.dueTemplateSavedDesc[language],
    });
  };
  
  const handleSaveLedgerSmsTemplate = () => {
    localStorage.setItem('sms-template-ledger', ledgerSmsTemplate);
    toast({
        title: t.templateSaved[language],
        description: t.ledgerTemplateSavedDesc[language],
    });
  };
  
  const handleSavePaymentSmsTemplate = () => {
    localStorage.setItem('sms-template-payment', paymentSmsTemplate);
    toast({
        title: t.templateSaved[language],
        description: t.paymentTemplateSavedDesc[language],
    });
  };
  
  const handleSaveManualTxnSmsTemplate = () => {
    localStorage.setItem('sms-template-manual-txn', manualTxnSmsTemplate);
    toast({
        title: t.templateSaved[language],
        description: t.manualTxnTemplateSavedDesc[language],
    });
  };

  const handleSaveEditLedgerSmsTemplate = () => {
    localStorage.setItem('sms-template-edit-ledger', editLedgerSmsTemplate);
    toast({
        title: t.templateSaved[language],
        description: t.editLedgerTemplateSavedDesc[language],
    });
  };

  const handleCheckIp = async () => {
    setIsIpLoading(true);
    setServerIp("");
    try {
      const ip = await getServerIp();
      setServerIp(ip);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t.ipError[language],
        description: error.message,
      });
    } finally {
      setIsIpLoading(false);
    }
  };
  
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(serverIp).then(() => {
      toast({
        title: t.ipCopied[language],
      });
    });
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

  const handleSendTestSms = async () => {
    if (!isSmsEnabled) {
      toast({ variant: 'destructive', title: t.smsServiceDisabled[language], description: t.enableSmsServiceFirst[language] });
      return;
    }
    if (!apiKey || !senderId) {
      toast({ variant: 'destructive', title: t.smsSettingsMissing[language], description: t.smsSettingsMissingDesc[language] });
      return;
    }
    if (!testPhoneNumber) {
      toast({ variant: 'destructive', title: t.phoneMissing[language] });
      return;
    }
    
    setIsSmsLoading(true);
    try {
      const message = 'This is a test message from your application.';
      const result = await sendSms({
        apiKey,
        senderId,
        phoneNumber: testPhoneNumber,
        message: message,
      });

      try {
        const history = JSON.parse(localStorage.getItem('sms-history') || '[]');
        history.unshift({
            id: `sms-${Date.now()}`,
            date: new Date().toISOString(),
            recipientName: 'Test Number',
            recipientPhone: testPhoneNumber,
            message: message,
            status: result.success ? 'success' : 'failed',
            statusMessage: result.message,
            smsCount: getSmsCount(message),
        });
        localStorage.setItem('sms-history', JSON.stringify(history.slice(0, 200)));
      } catch (e) { console.error("Failed to save test SMS to history", e) }

      if (result.success) {
        toast({ title: t.smsSuccess[language], description: result.message });
      } else {
        toast({ variant: 'destructive', title: t.smsFailed[language], description: result.message });
      }

    } catch (error: any) {
       toast({ variant: 'destructive', title: t.smsFailed[language], description: error.message });
    } finally {
       setIsSmsLoading(false);
    }
  };

  const handleReset = () => {
    // Before clearing, get user IDs to remove their specific flags
    const usersText = localStorage.getItem('local-users');
    const userKeysToRemove: string[] = [];
    if (usersText) {
        try {
            const users = JSON.parse(usersText);
            if (Array.isArray(users)) {
                users.forEach(user => {
                    if (user && user.id) {
                        userKeysToRemove.push(`isFirstLogin_${user.id}`);
                    }
                });
            }
        } catch (e) {
            console.error("Could not parse users for cleanup", e);
        }
    }

    // Clear all known localStorage keys
    localStorage.removeItem('employees');
    localStorage.removeItem('employee-roles');
    localStorage.removeItem('markets');
    localStorage.removeItem('receivable-transactions');
    localStorage.removeItem('ledger-transactions');
    localStorage.removeItem('ledger-id-counter');
    localStorage.removeItem('products');
    localStorage.removeItem('product-companies');
    localStorage.removeItem('product-quantity-units');
    localStorage.removeItem('app-language');
    localStorage.removeItem('profile-settings');
    localStorage.removeItem('rewards-list');
    localStorage.removeItem('reward-rules');
    localStorage.removeItem('supplier-payments');
    localStorage.removeItem('sms-settings');
    localStorage.removeItem('sms-service-enabled');
    localStorage.removeItem('sms-template');
    localStorage.removeItem('sms-template-ledger');
    localStorage.removeItem('sms-template-payment');
    localStorage.removeItem('sms-template-manual-txn');
    localStorage.removeItem('sms-template-edit-ledger');
    localStorage.removeItem('sms-history');
    localStorage.removeItem('daily-summaries');
    localStorage.removeItem('local-users');
    localStorage.removeItem('current-user');
    
    // Clear user-specific flags
    userKeysToRemove.forEach(key => localStorage.removeItem(key));

    // Reload the page to apply the cleared state
    window.location.reload();
  };

  const t = {
    settings: { en: 'Settings', bn: 'সেটিংস' },
    tabSms: { en: 'SMS Service', bn: 'এসএমএস সার্ভিস' },
    tabSmsTemplate: { en: 'SMS Templates', bn: 'এসএমএস টেমপ্লেট' },
    tabSecurity: { en: 'Security', bn: 'নিরাপত্তা' },
    tabReset: { en: 'Reset', bn: 'রিসেট' },
    appReset: { en: 'Application Reset', bn: 'অ্যাপ্লিকেশন রিসেট' },
    appResetDescription: { en: 'Reset all application data to its initial state. This action cannot be undone.', bn: 'আপনার app এর সকল সংরক্ষিত তথ্য মুছে ফেলে নতুন অবস্থায় নিয়ে যাওয়া হবে। এই কাজটি ফিরিয়ে আনা যাবে না।' },
    resetButton: { en: 'Reset Application', bn: 'অ্যাপ রিসেট করুন' },
    dialogTitle: { en: 'Are you sure?', bn: 'আপনি কি নিশ্চিত?' },
    dialogDescription: { en: 'This will permanently delete all your data, including profile, employees, products, and financial records. This action cannot be undone.', bn: 'এটি আপনার প্রোফাইল, কর্মচারী, পণ্য এবং আর্থিক রেকর্ড সহ সমস্ত ডেটা স্থায়ীভাবে মুছে ফেলবে। এই কাজটি ফিরিয়ে আনা যাবে না।' },
    cancel: { en: 'Cancel', bn: 'বাতিল' },
    confirm: { en: 'Confirm', bn: 'নিশ্চিত করুন' },
    smsService: { en: 'SMS Service', bn: 'এসএমএস সার্ভিস' },
    smsServiceDesc: { en: 'Configure your BulkSMSBD credentials.', bn: 'আপনার BulkSMSBD API Key এবং Sender ID এখানে যোগ করুন।' },
    apiKey: { en: 'API Key', bn: 'API Key' },
    senderId: { en: 'Sender ID', bn: 'Sender ID' },
    save: { en: 'Save', bn: 'সংরক্ষণ' },
    settingsSaved: { en: 'Settings Saved', bn: 'সেটিংস সংরক্ষিত হয়েছে' },
    settingsSavedDesc: { en: 'Your SMS settings have been updated.', bn: 'আপনার এসএমএস সেটিংস আপডেট করা হয়েছে।' },
    ipDiagnostic: { en: 'Server IP Diagnostic', bn: 'সার্ভার আইপি ডায়াগনস্টিক' },
    ipDiagnosticDesc: { en: 'Use this tool to find the public IP address your server uses for outgoing requests.', bn: 'আপনার সার্ভার বহির্গামী অনুরোধের জন্য যে পাবলিক আইপি ঠিকানা ব্যবহার করে তা খুঁজে বের করতে এই টুলটি ব্যবহার করুন।' },
    checkIp: { en: 'Check Server IP', bn: 'সার্ভার আইপি চেক করুন' },
    serverPublicIp: { en: 'Server Public IP Address', bn: 'সার্ভারের পাবলিক আইপি ঠিকানা' },
    ipWhitelistInfo: { en: 'This is the public IP address your server is using for outgoing requests. Please ensure this IP is whitelisted in your BulkSMSBD dashboard.', bn: 'এটি আপনার সার্ভারের পাবলিক আইপি ঠিকানা যা বহির্গামী অনুরোধের জন্য ব্যবহৃত হয়। অনুগ্রহ করে নিশ্চিত করুন যে এই আইপিটি আপনার BulkSMSBD ড্যাশবোর্ডে হোয়াইটলিস্ট করা আছে।' },
    ipError: { en: 'IP Check Failed', bn: 'আইপি চেক ব্যর্থ হয়েছে' },
    ipCopied: { en: 'IP address copied!', bn: 'আইপি ঠিকানা কপি করা হয়েছে!' },
    testSms: { en: 'Send Test SMS', bn: 'টেস্ট এসএমএস পাঠান' },
    testSmsDesc: { en: 'Send a test SMS to verify your settings are correct.', bn: 'আপনার সেটিংস ঠিক আছে কিনা তা পরীক্ষা করতে একটি টেস্ট এসএমএস পাঠান।' },
    phoneNumber: { en: 'Phone Number', bn: 'ফোন নম্বর' },
    send: { en: 'Send', bn: 'সেন্ড করুন' },
    smsSettingsMissing: { en: 'SMS Settings Missing', bn: 'এসএমএস সেটিংস নেই' },
    smsSettingsMissingDesc: { en: 'Please save your API Key and Sender ID first.', bn: 'অনুগ্রহ করে প্রথমে আপনার API কী এবং প্রেরক আইডি সংরক্ষণ করুন।' },
    phoneMissing: { en: 'Phone Number Missing', bn: 'ফোন নম্বর নেই' },
    smsSuccess: { en: 'SMS Sent!', bn: 'এসএমএস পাঠানো হয়েছে!' },
    smsFailed: { en: 'SMS Failed', bn: 'এসএমএস ব্যর্থ হয়েছে' },
    smsServiceStatus: { en: 'SMS Service Status', bn: 'এসএমএস সার্ভিস স্ট্যাটাস' },
    smsServiceStatusDesc: { en: 'Globally enable or disable all SMS sending features.', bn: 'সকল এসএমএস পাঠানোর সুবিধা চালু বা বন্ধ করুন।' },
    smsServiceEnabled: { en: 'SMS Service is Enabled', bn: 'এসএমএস সার্ভিস চালু আছে' },
    smsServiceDisabled: { en: 'SMS Service is Disabled', bn: 'এসএমএস সার্ভিস বন্ধ আছে' },
    enableSmsDialogDesc: { en: 'Are you sure you want to enable the SMS service? SMS charges may apply.', bn: 'আপনি কি এসএমএস সার্ভিস চালু করতে চান? এসএমএস চার্জ প্রযোজ্য হতে পারে।' },
    disableSmsDialogDesc: { en: 'Are you sure you want to disable the SMS service? No notifications will be sent.', bn: 'আপনি কি এসএমএস সার্ভিস বন্ধ করতে চান? কোনো নোটিফিকেশন পাঠানো হবে না।' },
    smsServiceNowEnabled: { en: 'The SMS service has been enabled.', bn: 'এসএমএস সার্ভিস চালু করা হয়েছে।' },
    smsServiceNowDisabled: { en: 'The SMS service has been disabled.', bn: 'এসএমএস সার্ভিস বন্ধ করা হয়েছে।' },
    enableSmsServiceFirst: { en: 'Please enable the global SMS service first.', bn: 'অনুগ্রহ করে প্রথমে গ্লোবাল এসএমএস সার্ভিস চালু করুন।' },
    showApiKey: { en: 'Show API Key', bn: 'API কী দেখুন' },
    hideApiKey: { en: 'Hide API Key', bn: 'API কী লুকান' },
    
    // SMS Template Section
    dueReminderTemplateTitle: { en: 'Due Reminder Template', bn: 'বকেয়া পরিশোধের রিমাইন্ডার টেমপ্লেট' },
    dueReminderTemplateDesc: { en: 'Customize the message sent for due reminders. Placeholders: {customer_name}, {due_amount}, {business_name}.', bn: 'বকেয়া পরিশোধের জন্য পাঠানো মেসেজ কাস্টমাইজ করুন। প্লেসহোল্ডার: {customer_name}, {due_amount}, {business_name}।' },
    template: { en: 'Template', bn: 'টেমপ্লেট' },
    templateSaved: { en: 'Template Saved', bn: 'টেমপ্লেট সংরক্ষিত হয়েছে' },
    dueTemplateSavedDesc: { en: 'Your due reminder SMS template has been updated.', bn: 'আপনার বকেয়া পরিশোধের এসএমএস টেমপ্লেট আপডেট করা হয়েছে।' },
    
    ledgerNotificationTemplateTitle: { en: 'New Ledger Notification Template', bn: 'নতুন খাতা নোটিফিকেশন টেমপ্লেট' },
    ledgerNotificationTemplateDesc: { en: 'Message sent when a new due/commission is added from a new ledger. Placeholders: {employee_name}, {date}, {ledger_no}, {amount_type}, {new_amount}, {total_due}, {business_name}.', bn: 'নতুন খাতা থেকে নতুন বকেয়া/কমিশন যোগ করার সময় পাঠানো বার্তা। প্লেসহোল্ডার: {employee_name}, {date}, {ledger_no}, {amount_type}, {new_amount}, {total_due}, {business_name}।' },
    ledgerTemplateSavedDesc: { en: 'Your ledger notification SMS template has been updated.', bn: 'আপনার নতুন খাতা নোটিফিকেশনের এসএমএস টেমপ্লেট আপডেট করা হয়েছে।' },

    paymentNotificationTemplateTitle: { en: 'Payment Notification Template', bn: 'পরিশোধ নোটিফিকেশন টেমপ্লেট' },
    paymentNotificationTemplateDesc: { en: 'Message sent when a due/commission payment is recorded. Placeholders: {employee_name}, {payment_amount}, {payment_type}, {ledger_no}, {new_total_due}, {business_name}.', bn: 'বকেয়া/কমিশন পরিশোধ রেকর্ড করার সময় পাঠানো বার্তা। প্লেসহোল্ডার: {employee_name}, {payment_amount}, {payment_type}, {ledger_no}, {new_total_due}, {business_name}।' },
    paymentTemplateSavedDesc: { en: 'Your payment notification SMS template has been updated.', bn: 'আপনার পরিশোধ নোটিফিকেশন এসএমএস টেমপ্লেট আপডেট করা হয়েছে।' },
    
    manualTxnNotificationTemplateTitle: { en: 'Manual Transaction Notification Template', bn: 'ম্যানুয়াল লেনদেন নোটিফিকেশন টেমপ্লেট' },
    manualTxnNotificationTemplateDesc: { en: 'Message sent for manual due/payment entries. Placeholders: {employee_name}, {transaction_type}, {amount}, {total_due}, {business_name}.', bn: 'ম্যানুয়াল দেনা/পাওনা এন্ট্রির জন্য পাঠানো বার্তা। প্লেসহোল্ডার: {employee_name}, {transaction_type}, {amount}, {total_due}, {business_name}।' },
    manualTxnTemplateSavedDesc: { en: 'Your manual transaction SMS template has been updated.', bn: 'আপনার ম্যানুয়াল লেনদেন এসএমএস টেমপ্লেট আপডেট করা হয়েছে।' },

    editLedgerNotificationTemplateTitle: { en: 'Ledger Edit Notification Template', bn: 'খাতা সম্পাদনা নোটিফিকেশন টেমপ্লেট' },
    editLedgerNotificationTemplateDesc: { en: 'Message sent when a ledger entry is edited. Placeholders: {employee_name}, {ledger_no}, {amount_type}, {old_amount}, {new_amount}, {business_name}.', bn: 'খাতা সম্পাদনা করার সময় পাঠানো বার্তা। প্লেসহোল্ডার: {employee_name}, {ledger_no}, {amount_type}, {old_amount}, {new_amount}, {business_name}।' },
    editLedgerTemplateSavedDesc: { en: 'Your ledger edit SMS template has been updated.', bn: 'আপনার খাতা সম্পাদনা এসএমএস টেমপ্লেট আপডেট করা হয়েছে।' },

    
    // New Translations for Placeholders
    placeholdersTitle: { en: 'Available Placeholders', bn: 'ব্যবহারযোগ্য প্লেসহোল্ডার' },
    placeholdersUsage: { en: 'Copy a placeholder and paste it into the template where you want its value to appear.', bn: 'প্লেসহোল্ডার কপি করে টেমপ্লেটে পেস্ট করুন, যেখানে আপনি এর মান দেখাতে চান।' },
    customerNamePlaceholder: { en: "Customer's Name", bn: 'গ্রাহকের নাম' },
    dueAmountPlaceholder: { en: 'Due Amount', bn: 'বকেয়ার পরিমাণ' },
    businessNamePlaceholder: { en: 'Your Business Name', bn: 'আপনার ব্যবসার নাম' },
    employeeNamePlaceholder: { en: "Employee's Name", bn: 'কর্মচারীর নাম' },
    datePlaceholder: { en: 'Date', bn: 'তারিখ' },
    ledgerNoPlaceholder: { en: 'Ledger Number', bn: 'খাতা নম্বর' },
    amountTypePlaceholder: { en: 'Type (Due/Commission)', bn: 'ধরণ (বকেয়া/কমিশন)' },
    newAmountPlaceholder: { en: 'New Amount Added', bn: 'নতুন যোগ হওয়া পরিমাণ' },
    totalDuePlaceholder: { en: 'New Total Due', bn: 'নতুন মোট বকেয়া' },
    paymentAmountPlaceholder: { en: 'Payment Amount', bn: 'পরিশোধের পরিমাণ' },
    paymentTypePlaceholder: { en: 'Type (Due/Commission)', bn: 'ধরণ (বকেয়া/কমিশন)' },
    transactionTypePlaceholder: { en: 'Type (Due/Payment)', bn: 'ধরণ (বকেয়া/জমা)' },
    amountPlaceholder: { en: 'Transaction Amount', bn: 'লেনদেনের পরিমাণ' },
    oldAmountPlaceholder: { en: 'Old Amount', bn: 'পুরানো পরিমাণ' },
    deleteConfirmationText: { en: 'To confirm, type "Delete" in the box below.', bn: 'নিশ্চিত করতে, নিচের বাক্সে "Delete" টাইপ করুন।' },
    delete: { en: 'Delete', bn: 'মুছুন' },
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold font-headline">
        {t.settings[language]}
      </h1>
      
      <Tabs defaultValue="sms" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sms">{t.tabSms[language]}</TabsTrigger>
          <TabsTrigger value="template">{t.tabSmsTemplate[language]}</TabsTrigger>
          <TabsTrigger value="security">{t.tabSecurity[language]}</TabsTrigger>
          <TabsTrigger value="reset">{t.tabReset[language]}</TabsTrigger>
        </TabsList>
        <TabsContent value="sms" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.smsServiceStatus[language]}</CardTitle>
              <CardDescription>{t.smsServiceStatusDesc[language]}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <AlertDialog open={isConfirmToggleOpen} onOpenChange={setIsConfirmToggleOpen}>
                    <Switch
                        id="sms-service-toggle"
                        checked={isSmsEnabled}
                        onCheckedChange={() => setIsConfirmToggleOpen(true)}
                    />
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t.dialogTitle[language]}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {isSmsEnabled ? t.disableSmsDialogDesc[language] : t.enableSmsDialogDesc[language]}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{t.cancel[language]}</AlertDialogCancel>
                            <AlertDialogAction onClick={handleToggleSmsService}>
                                {t.confirm[language]}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <Label htmlFor="sms-service-toggle">
                    {isSmsEnabled ? t.smsServiceEnabled[language] : t.smsServiceDisabled[language]}
                </Label>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t.smsService[language]}</CardTitle>
              <CardDescription>{t.smsServiceDesc[language]}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="apiKey">{t.apiKey[language]}</Label>
                  <div className="relative">
                    <Input
                      id="apiKey"
                      type={isApiKeyVisible ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="C123..."
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute inset-y-0 right-0 h-full px-3"
                      onClick={() => setIsApiKeyVisible((prev) => !prev)}
                    >
                      {isApiKeyVisible ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      <span className="sr-only">
                        {isApiKeyVisible ? t.hideApiKey[language] : t.showApiKey[language]}
                      </span>
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="senderId">{t.senderId[language]}</Label>
                  <Input id="senderId" value={senderId} onChange={(e) => setSenderId(e.target.value)} placeholder="880..." />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveSmsSettings}>{t.save[language]}</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.ipDiagnostic[language]}</CardTitle>
              <CardDescription>{t.ipDiagnosticDesc[language]}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleCheckIp} disabled={isIpLoading}>
                {isIpLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t.checkIp[language]}
              </Button>

              {(isIpLoading || serverIp) && (
                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Server className="h-5 w-5"/>
                      {t.serverPublicIp[language]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isIpLoading ? (
                      <Skeleton className="h-8 w-48" />
                    ) : (
                      <div className="flex items-center gap-4">
                        <code className="text-xl font-semibold p-2 bg-background rounded-md border">{serverIp}</code>
                        <Button variant="ghost" size="icon" onClick={handleCopyToClipboard}><Copy className="h-4 w-4"/></Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">{t.ipWhitelistInfo[language]}</p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>{t.testSms[language]}</CardTitle>
              <CardDescription>{t.testSmsDesc[language]}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="grid gap-2 flex-grow">
                  <Label htmlFor="testPhoneNumber">{t.phoneNumber[language]}</Label>
                  <Input id="testPhoneNumber" type="tel" value={testPhoneNumber} onChange={e => setTestPhoneNumber(e.target.value)} placeholder="01..." />
                </div>
                <Button onClick={handleSendTestSms} disabled={isSmsLoading}>
                  {isSmsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t.send[language]}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="template" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.dueReminderTemplateTitle[language]}</CardTitle>
              <CardDescription>{t.dueReminderTemplateDesc[language]}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="grid gap-2">
                        <Label htmlFor="dueSmsTemplate">{t.template[language]}</Label>
                        <Textarea
                            id="dueSmsTemplate"
                            value={dueReminderSmsTemplate}
                            onChange={(e) => setDueReminderSmsTemplate(e.target.value)}
                            rows={6}
                            className="text-sm"
                        />
                    </div>
                    <div className="space-y-3">
                        <h4 className="font-medium text-sm">{t.placeholdersTitle[language]}</h4>
                        <div className="text-xs text-muted-foreground bg-muted p-4 rounded-lg space-y-1">
                            <p><code>{'{customer_name}'}</code>: {t.customerNamePlaceholder[language]}</p>
                            <p><code>{'{due_amount}'}</code>: {t.dueAmountPlaceholder[language]}</p>
                            <p><code>{'{business_name}'}</code>: {t.businessNamePlaceholder[language]}</p>
                            <Separator className="my-2" />
                            <p className="text-xs italic">{t.placeholdersUsage[language]}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSaveDueSmsTemplate}>{t.save[language]}</Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
                <CardTitle>{t.ledgerNotificationTemplateTitle[language]}</CardTitle>
                <CardDescription>{t.ledgerNotificationTemplateDesc[language]}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="grid gap-2">
                        <Label htmlFor="ledgerSmsTemplate">{t.template[language]}</Label>
                        <Textarea
                            id="ledgerSmsTemplate"
                            value={ledgerSmsTemplate}
                            onChange={(e) => setLedgerSmsTemplate(e.target.value)}
                            rows={6}
                            className="text-sm"
                        />
                    </div>
                    <div className="space-y-3">
                        <h4 className="font-medium text-sm">{t.placeholdersTitle[language]}</h4>
                        <div className="text-xs text-muted-foreground bg-muted p-4 rounded-lg space-y-1">
                            <p><code>{'{employee_name}'}</code>: {t.employeeNamePlaceholder[language]}</p>
                            <p><code>{'{date}'}</code>: {t.datePlaceholder[language]}</p>
                            <p><code>{'{ledger_no}'}</code>: {t.ledgerNoPlaceholder[language]}</p>
                            <p><code>{'{amount_type}'}</code>: {t.amountTypePlaceholder[language]}</p>
                            <p><code>{'{new_amount}'}</code>: {t.newAmountPlaceholder[language]}</p>
                            <p><code>{'{total_due}'}</code>: {t.totalDuePlaceholder[language]}</p>
                            <p><code>{'{business_name}'}</code>: {t.businessNamePlaceholder[language]}</p>
                            <Separator className="my-2" />
                            <p className="text-xs italic">{t.placeholdersUsage[language]}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSaveLedgerSmsTemplate}>{t.save[language]}</Button>
            </CardFooter>
          </Card>
           <Card>
            <CardHeader>
                <CardTitle>{t.editLedgerNotificationTemplateTitle[language]}</CardTitle>
                <CardDescription>{t.editLedgerNotificationTemplateDesc[language]}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="grid gap-2">
                        <Label htmlFor="editLedgerSmsTemplate">{t.template[language]}</Label>
                        <Textarea
                            id="editLedgerSmsTemplate"
                            value={editLedgerSmsTemplate}
                            onChange={(e) => setEditLedgerSmsTemplate(e.target.value)}
                            rows={6}
                            className="text-sm"
                        />
                    </div>
                    <div className="space-y-3">
                        <h4 className="font-medium text-sm">{t.placeholdersTitle[language]}</h4>
                        <div className="text-xs text-muted-foreground bg-muted p-4 rounded-lg space-y-1">
                            <p><code>{'{employee_name}'}</code>: {t.employeeNamePlaceholder[language]}</p>
                            <p><code>{'{ledger_no}'}</code>: {t.ledgerNoPlaceholder[language]}</p>
                            <p><code>{'{amount_type}'}</code>: {t.amountTypePlaceholder[language]}</p>
                            <p><code>{'{old_amount}'}</code>: {t.oldAmountPlaceholder[language]}</p>
                            <p><code>{'{new_amount}'}</code>: {t.newAmountPlaceholder[language]}</p>
                            <p><code>{'{business_name}'}</code>: {t.businessNamePlaceholder[language]}</p>
                            <Separator className="my-2" />
                            <p className="text-xs italic">{t.placeholdersUsage[language]}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSaveEditLedgerSmsTemplate}>{t.save[language]}</Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
                <CardTitle>{t.paymentNotificationTemplateTitle[language]}</CardTitle>
                <CardDescription>{t.paymentNotificationTemplateDesc[language]}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="grid gap-2">
                        <Label htmlFor="paymentSmsTemplate">{t.template[language]}</Label>
                        <Textarea
                            id="paymentSmsTemplate"
                            value={paymentSmsTemplate}
                            onChange={(e) => setPaymentSmsTemplate(e.target.value)}
                            rows={6}
                            className="text-sm"
                        />
                    </div>
                    <div className="space-y-3">
                        <h4 className="font-medium text-sm">{t.placeholdersTitle[language]}</h4>
                        <div className="text-xs text-muted-foreground bg-muted p-4 rounded-lg space-y-1">
                            <p><code>{'{employee_name}'}</code>: {t.employeeNamePlaceholder[language]}</p>
                            <p><code>{'{payment_amount}'}</code>: {t.paymentAmountPlaceholder[language]}</p>
                            <p><code>{'{payment_type}'}</code>: {t.paymentTypePlaceholder[language]}</p>
                            <p><code>{'{ledger_no}'}</code>: {t.ledgerNoPlaceholder[language]}</p>
                            <p><code>{'{new_total_due}'}</code>: {t.totalDuePlaceholder[language]}</p>
                            <p><code>{'{business_name}'}</code>: {t.businessNamePlaceholder[language]}</p>
                            <Separator className="my-2" />
                            <p className="text-xs italic">{t.placeholdersUsage[language]}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSavePaymentSmsTemplate}>{t.save[language]}</Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
                <CardTitle>{t.manualTxnNotificationTemplateTitle[language]}</CardTitle>
                <CardDescription>{t.manualTxnNotificationTemplateDesc[language]}</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="grid md:grid-cols-2 gap-8">
                    <div className="grid gap-2">
                        <Label htmlFor="manualTxnSmsTemplate">{t.template[language]}</Label>
                        <Textarea
                            id="manualTxnSmsTemplate"
                            value={manualTxnSmsTemplate}
                            onChange={(e) => setManualTxnSmsTemplate(e.target.value)}
                            rows={6}
                            className="text-sm"
                        />
                    </div>
                    <div className="space-y-3">
                        <h4 className="font-medium text-sm">{t.placeholdersTitle[language]}</h4>
                        <div className="text-xs text-muted-foreground bg-muted p-4 rounded-lg space-y-1">
                            <p><code>{'{employee_name}'}</code>: {t.employeeNamePlaceholder[language]}</p>
                            <p><code>{'{transaction_type}'}</code>: {t.transactionTypePlaceholder[language]}</p>
                            <p><code>{'{amount}'}</code>: {t.amountPlaceholder[language]}</p>
                            <p><code>{'{total_due}'}</code>: {t.totalDuePlaceholder[language]}</p>
                            <p><code>{'{business_name}'}</code>: {t.businessNamePlaceholder[language]}</p>
                            <Separator className="my-2" />
                            <p className="text-xs italic">{t.placeholdersUsage[language]}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSaveManualTxnSmsTemplate}>{t.save[language]}</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="mt-6">
          {/* This content will be added later based on your requirements. */}
        </TabsContent>

        <TabsContent value="reset" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.appReset[language]}</CardTitle>
              <CardDescription>{t.appResetDescription[language]}</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog onOpenChange={() => setResetConfirmationInput("")}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={hasDataToReset}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t.resetButton[language]}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t.dialogTitle[language]}</AlertDialogTitle>
                    <AlertDialogDescription>{t.dialogDescription[language]}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2 py-2">
                    <Label htmlFor="delete-confirm">{t.deleteConfirmationText[language]}</Label>
                    <Input
                      id="delete-confirm"
                      value={resetConfirmationInput}
                      onChange={(e) => setResetConfirmationInput(e.target.value)}
                      placeholder={t.delete[language]}
                      autoComplete="off"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t.cancel[language]}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleReset}
                      disabled={resetConfirmationInput.toLowerCase() !== 'delete'}
                    >
                      {t.confirm[language]}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
