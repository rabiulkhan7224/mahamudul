
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

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const t = {
    title: { en: 'Login', bn: 'লগইন' },
    description: { en: 'Enter your email below to login to your account', bn: 'আপনার অ্যাকাউন্টে লগইন করতে নীচে আপনার ইমেল লিখুন' },
    email: { en: 'Email', bn: 'ইমেল' },
    password: { en: 'Password', bn: 'পাসওয়ার্ড' },
    login: { en: 'Login', bn: 'লগইন' },
    noAccount: { en: "Don't have an account?", bn: 'অ্যাকাউন্ট নেই?' },
    signUp: { en: 'Sign up', bn: 'সাইন আপ' },
    // Errors
    invalidCredentials: { en: 'Invalid email or password.', bn: 'ভুল ইমেল অথবা পাসওয়ার্ড।' },
    genericError: { en: 'An unknown error occurred.', bn: 'একটি অজানা ত্রুটি ঘটেছে।' }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'Invalid credentials') {
        setError(t.invalidCredentials[language]);
      } else {
        setError(t.genericError[language]);
        console.error(err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mx-auto max-w-sm w-full">
      <CardHeader>
        <CardTitle className="text-2xl">{t.title[language]}</CardTitle>
        <CardDescription>{t.description[language]}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin}>
          <div className="grid gap-4">
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
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.login[language]}
            </Button>
          </div>
        </form>
        <div className="mt-4 text-center text-sm">
          {t.noAccount[language]}{' '}
          <Link href="/signup" className="underline">
            {t.signUp[language]}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
