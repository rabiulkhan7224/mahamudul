
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const { language } = useLanguage();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  const t = {
    title: { en: 'Sign Up', bn: 'সাইন আপ' },
    description: { en: 'Enter your information to create an account', bn: 'অ্যাকাউন্ট তৈরি করতে আপনার তথ্য লিখুন' },
    fullName: { en: 'Full Name', bn: 'পুরো নাম' },
    email: { en: 'Email', bn: 'ইমেল' },
    password: { en: 'Create Password', bn: 'পাসওয়ার্ড তৈরি করুন' },
    confirmPassword: { en: 'Confirm Password', bn: 'পাসওয়ার্ড নিশ্চিত করুন' },
    signUp: { en: 'Sign up', bn: 'সাইন আপ' },
    hasAccount: { en: 'Already have an account?', bn: 'ইতিমধ্যে একটি অ্যাকাউন্ট আছে?' },
    login: { en: 'Login', bn: 'লগইন' },
    // Errors
    passwordsDoNotMatch: { en: 'Passwords do not match.', bn: 'পাসওয়ার্ড দুটি মেলেনি।' },
    passwordTooShort: { en: 'Password must be at least 6 characters long.', bn: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' },
    emailInUse: { en: 'An account with this email already exists.', bn: 'এই ইমেলটি দিয়ে আগে অ্যাকাউন্ট খোলা হয়েছে।' },
    genericError: { en: 'An unknown error occurred.', bn: 'একটি অজানা ত্রুটি ঘটেছে।' }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t.passwordsDoNotMatch[language]);
      return;
    }
    
    if (password.length < 6) {
      setError(t.passwordTooShort[language]);
      return;
    }

    setIsLoading(true);
    try {
      await signup(fullName, email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === 'Email already in use') {
          setError(t.emailInUse[language]);
        } else {
          setError(t.genericError[language]);
        }
      } else {
        setError(t.genericError[language]);
      }
      console.error(err);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Card className="mx-auto max-w-sm w-full">
      <CardHeader>
        <CardTitle className="text-xl">{t.title[language]}</CardTitle>
        <CardDescription>{t.description[language]}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignup}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="full-name">{t.fullName[language]}</Label>
              <Input
                id="full-name"
                type="text"
                placeholder={language === 'bn' ? 'আপনার পুরো নাম' : 'Your Full Name'}
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">{t.email[language]}</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">{t.password[language]}</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={isPasswordVisible ? "text" : "password"} 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute bottom-0 right-0 h-full px-3"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                >
                  {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {language === 'bn' ? 'কমপক্ষে ৬ অক্ষরের হতে হবে।' : 'Must be at least 6 characters.'}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">{t.confirmPassword[language]}</Label>
              <div className="relative">
                <Input 
                  id="confirm-password" 
                  type={isConfirmPasswordVisible ? "text" : "password"}
                  required 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute bottom-0 right-0 h-full px-3"
                  onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                  aria-label={isConfirmPasswordVisible ? 'Hide password' : 'Show password'}
                >
                  {isConfirmPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t.signUp[language]}
            </Button>
          </div>
        </form>
        <div className="mt-4 text-center text-sm">
          {t.hasAccount[language]}{' '}
          <Link href="/login" className="underline">
            {t.login[language]}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
