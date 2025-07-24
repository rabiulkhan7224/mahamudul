
"use client";

import { useState, useEffect, ChangeEvent, ReactNode } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/context/language-context";
import { Upload, Copy, ShieldCheck, Loader2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { sendSms } from "@/ai/flows/sms-flow";
import { cn } from "@/lib/utils";

type ProfileData = {
  logo: string;
  ownerPhoto: string;
  businessName: string;
  ownerName: string;
  mobile: string;
  email: string;
  userId?: string;
};

interface ProfileSettingsDialogProps {
  children?: ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave?: () => void;
  isFirstTimeSetup?: boolean;
}

export function ProfileSettingsDialog({ children, isOpen: controlledIsOpen, onOpenChange, onSave, isFirstTimeSetup = false }: ProfileSettingsDialogProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<Partial<ProfileData>>({});
  const [logoPreview, setLogoPreview] = useState<string>("https://placehold.co/100x100.png");
  const [ownerPhotoPreview, setOwnerPhotoPreview] = useState<string>("https://placehold.co/100x100.png");
  
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  const [isEditing, setIsEditing] = useState(isFirstTimeSetup);
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [userInputOtp, setUserInputOtp] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");


  const isOpen = controlledIsOpen ?? internalIsOpen;
  const setIsOpen = onOpenChange ?? setInternalIsOpen;

  useEffect(() => {
    if (isOpen) {
        try {
          const storedProfile = localStorage.getItem("profile-settings");
          if (storedProfile) {
            const parsedProfile: Partial<ProfileData> = JSON.parse(storedProfile);
            setProfile(parsedProfile);
            if (parsedProfile.logo) setLogoPreview(parsedProfile.logo);
            else setLogoPreview("https://placehold.co/100x100.png");

            if (parsedProfile.ownerPhoto) setOwnerPhotoPreview(parsedProfile.ownerPhoto);
            else setOwnerPhotoPreview("https://placehold.co/100x100.png");
          } else if (user) {
            setProfile({ email: user.email || '', userId: user.id });
          }
        } catch (error) {
          console.error("Failed to parse profile from localStorage", error);
        }
    } else {
        // Reset state on close
        setIsEditing(isFirstTimeSetup);
        setOtpSent(false);
        setGeneratedOtp("");
        setUserInputOtp("");
        setOtpError("");
    }
  }, [isOpen, user, isFirstTimeSetup]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setProfile((prev) => ({ ...prev, [id]: value }));
  };

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setLogoPreview(dataUrl);
        setProfile((prev) => ({ ...prev, logo: dataUrl }));
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleOwnerPhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setOwnerPhotoPreview(dataUrl);
        setProfile((prev) => ({ ...prev, ownerPhoto: dataUrl }));
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleRequestOtp = async () => {
    if (!profile.mobile) {
        setOtpError(t.phoneMissingError[language]);
        return;
    }
    
    setOtpError("");
    setIsSendingOtp(true);

    const otp = String(Math.floor(1000 + Math.random() * 9000));
    setGeneratedOtp(otp);
    
    const storedSmsSettings = localStorage.getItem('sms-settings');
    const { apiKey, senderId } = storedSmsSettings ? JSON.parse(storedSmsSettings) : { apiKey: '', senderId: '' };

    if (!apiKey || !senderId) {
        setOtpError(t.smsSettingsMissing[language]);
        setIsSendingOtp(false);
        return;
    }

    const businessName = (JSON.parse(localStorage.getItem('profile-settings') || '{}') as Partial<ProfileData>).businessName || '';
    const message = `${businessName} - Your OTP for profile update is: ${otp}`;
    
    try {
        const result = await sendSms({
            apiKey,
            senderId,
            phoneNumber: profile.mobile,
            message: message,
        });
        
        if (result.success) {
            setOtpSent(true);
            toast({ title: t.otpSent[language] });
        } else {
            setOtpError(result.message);
        }
    } catch (e: any) {
        setOtpError(e.message || t.genericError[language]);
    } finally {
        setIsSendingOtp(false);
    }
  };
  
  const handleVerifyOtp = () => {
      if (userInputOtp === generatedOtp) {
          setIsEditing(true);
          setOtpError("");
      } else {
          setOtpError(t.invalidOtp[language]);
      }
  };


  const handleSaveChanges = () => {
    if (isFirstTimeSetup && (!profile.businessName || !profile.ownerName)) {
        alert(language === 'bn' ? 'অনুগ্রহ করে ব্যবসার নাম এবং মালিকের নাম পূরণ করুন।' : 'Please fill in the business name and owner name.');
        return;
    }
    const finalProfile = {
      ...profile,
      email: user?.email,
      userId: user?.id,
    };
    localStorage.setItem("profile-settings", JSON.stringify(finalProfile));
    alert(language === 'bn' ? 'প্রোফাইল সফলভাবে সংরক্ষিত হয়েছে।' : 'Profile saved successfully.');
    
    if (onSave) {
      onSave();
    } else {
      setIsOpen(false);
      window.location.reload();
    }
  };

  const handleCopyUserId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      toast({
        title: t.userIdCopied[language],
      });
    }
  };
  
  const handleClose = () => {
    if (!isFirstTimeSetup) {
      setIsOpen(false);
    }
  };

  const t = {
    profileSettings: { en: 'Profile Settings', bn: 'প্রোফাইল সেটিংস' },
    profileDescription: { en: 'Update your business information.', bn: 'আপনার ব্যবসার তথ্য আপডেট করুন।' },
    firstTimeSetupDescription: { en: 'Welcome! Please set up your profile to get started.', bn: 'স্বাগতম! শুরু করার জন্য অনুগ্রহ করে আপনার প্রোফাইল সেট আপ করুন।' },
    businessLogo: { en: 'Business Logo', bn: 'ব্যবসার লোগো' },
    ownerPhoto: { en: "Owner's Photo", bn: 'ব্যবসায়ীর ছবি' },
    changeLogo: { en: 'Change Logo', bn: 'লোগো পরিবর্তন' },
    changePhoto: { en: 'Change Photo', bn: 'ছবি পরিবর্তন' },
    businessName: { en: 'Business Name', bn: 'ব্যবসার নাম' },
    ownerName: { en: "Businessman's Name", bn: 'ব্যবসায়ীর নাম' },
    mobile: { en: 'Mobile Number', bn: 'মোবাইল নাম্বার' },
    email: { en: 'Email Address', bn: 'ইমেইল এড্রেস' },
    saveChanges: { en: 'Save Changes', bn: 'পরিবর্তন সংরক্ষণ করুন' },
    cancel: { en: 'Cancel', bn: 'বাতিল' },
    userId: { en: 'User ID', bn: 'ইউজার আইডি' },
    userIdCopied: { en: 'User ID Copied', bn: 'ইউজার আইডি কপি হয়েছে' },
    editProfile: { en: 'Edit Profile', bn: 'প্রোফাইল এডিট' },
    sendOtp: { en: 'Send OTP', bn: 'ওটিপি পাঠান' },
    verifyOtp: { en: 'Verify OTP', bn: 'ওটিপি যাচাই করুন' },
    otpPlaceholder: { en: '4-Digit OTP', bn: '৪-ডিজিটের ওটিপি' },
    otpVerification: { en: 'OTP Verification', bn: 'ওটিপি ভেরিফিকেশন' },
    otpVerificationDesc: { en: 'An OTP has been sent to your registered mobile number. Please enter it to proceed.', bn: 'আপনার নিবন্ধিত মোবাইল নম্বরে একটি ওটিপি পাঠানো হয়েছে। অনুগ্রহ করে এটি প্রবেশ করে এগিয়ে যান।' },
    phoneMissingError: { en: 'Owner mobile number is not set.', bn: 'মালিকের মোবাইল নম্বর সেট করা নেই।' },
    smsSettingsMissing: { en: 'SMS settings are not configured.', bn: 'এসএমএস সেটিংস কনফিগার করা নেই।' },
    otpSent: { en: 'OTP sent successfully!', bn: 'ওটিপি সফলভাবে পাঠানো হয়েছে!' },
    invalidOtp: { en: 'Invalid OTP. Please try again.', bn: 'অবৈধ ওটিপি। আবার চেষ্টা করুন.' },
    genericError: { en: 'An unknown error occurred.', bn: 'একটি অজানা ত্রুটি ঘটেছে।' },
  };

  const dialogContentProps = isFirstTimeSetup
    ? {
        onEscapeKeyDown: (e: Event) => e.preventDefault(),
        onInteractOutside: (e: Event) => e.preventDefault(),
      }
    : {};

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col" {...dialogContentProps}>
        <DialogHeader>
          <DialogTitle>{t.profileSettings[language]}</DialogTitle>
          <DialogDescription>
            {isFirstTimeSetup ? t.firstTimeSetupDescription[language] : t.profileDescription[language]}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-4 -mr-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-8 items-start">
            
            {/* Left Column: Avatars and User ID */}
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
                  <div className="flex flex-col items-center gap-2">
                      <div className="relative h-24 w-24">
                      <Image
                          src={logoPreview}
                          alt="Business Logo"
                          fill
                          className="rounded-full object-cover"
                          data-ai-hint="business logo"
                      />
                      </div>
                      <div className="grid gap-1.5 text-center">
                      <Label htmlFor="logo-upload-dialog">{t.businessLogo[language]}</Label>
                      <Input id="logo-upload-dialog" type="file" accept="image/*" className="hidden" onChange={handleLogoChange} disabled={!isEditing} />
                      <Button asChild variant="outline" size="sm" disabled={!isEditing}>
                          <Label htmlFor="logo-upload-dialog" className={cn("cursor-pointer flex items-center", !isEditing && "cursor-not-allowed opacity-50")}>
                          <Upload className="mr-2 h-4 w-4" />
                          {t.changeLogo[language]}
                          </Label>
                      </Button>
                      </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                      <div className="relative h-24 w-24">
                          <Image
                              src={ownerPhotoPreview}
                              alt="Owner's Photo"
                              fill
                              className="rounded-full object-cover"
                              data-ai-hint="profile picture"
                          />
                      </div>
                      <div className="grid gap-1.5 text-center">
                          <Label htmlFor="owner-photo-upload-dialog">{t.ownerPhoto[language]}</Label>
                          <Input id="owner-photo-upload-dialog" type="file" accept="image/*" className="hidden" onChange={handleOwnerPhotoChange} disabled={!isEditing} />
                          <Button asChild variant="outline" size="sm" disabled={!isEditing}>
                              <Label htmlFor="owner-photo-upload-dialog" className={cn("cursor-pointer flex items-center", !isEditing && "cursor-not-allowed opacity-50")}>
                              <Upload className="mr-2 h-4 w-4" />
                              {t.changePhoto[language]}
                              </Label>
                          </Button>
                      </div>
                  </div>
                </div>
                 {user?.id && (
                    <div className="grid gap-2">
                        <Label htmlFor="userId">{t.userId[language]}</Label>
                        <div className="relative">
                            <Input id="userId" value={user.id} readOnly disabled />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute inset-y-0 right-0 h-full px-3"
                                onClick={handleCopyUserId}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Column: Form fields */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="businessName">{t.businessName[language]}</Label>
                <Input id="businessName" value={profile.businessName || ''} onChange={handleChange} disabled={!isEditing} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ownerName">{t.ownerName[language]}</Label>
                <Input id="ownerName" value={profile.ownerName || ''} onChange={handleChange} disabled={!isEditing}/>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mobile">{t.mobile[language]}</Label>
                <Input id="mobile" type="tel" value={profile.mobile || ''} onChange={handleChange} disabled={!isEditing}/>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">{t.email[language]}</Label>
                <Input id="email" type="email" value={user?.email || profile.email || ''} readOnly disabled />
              </div>
            </div>
          </div>
        </div>
        
        {!isEditing && !isFirstTimeSetup && (
            <div className="space-y-4 pt-4 border-t shrink-0">
                {!otpSent ? (
                     <>
                        <Button onClick={handleRequestOtp} disabled={isSendingOtp} className="w-full">
                            {isSendingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t.sendOtp[language]}
                        </Button>
                        {otpError && <p className="text-sm text-destructive text-center">{otpError}</p>}
                     </>
                ) : (
                    <div className="space-y-2">
                        <Label htmlFor="otp-input">{t.otpVerification[language]}</Label>
                        <p className="text-xs text-muted-foreground">{t.otpVerificationDesc[language]}</p>
                        <div className="flex gap-2">
                            <Input
                                id="otp-input"
                                value={userInputOtp}
                                onChange={(e) => setUserInputOtp(e.target.value)}
                                placeholder={t.otpPlaceholder[language]}
                                maxLength={4}
                            />
                            <Button onClick={handleVerifyOtp}><ShieldCheck className="mr-2 h-4 w-4"/>{t.verifyOtp[language]}</Button>
                        </div>
                        {otpError && <p className="text-sm text-destructive">{otpError}</p>}
                    </div>
                )}
            </div>
        )}

        <DialogFooter className="pt-4 border-t shrink-0">
          {!isFirstTimeSetup && !isEditing && (
            <DialogClose asChild>
              <Button type="button" variant="secondary" onClick={handleClose}>
                {t.cancel[language]}
              </Button>
            </DialogClose>
          )}
          {isEditing && (
             <Button onClick={handleSaveChanges}>
                {t.saveChanges[language]}
             </Button>
          )}
          {!isEditing && !isFirstTimeSetup && (
            <Button disabled>
                {t.saveChanges[language]}
            </Button>
          )}

        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
