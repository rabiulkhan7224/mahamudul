
"use client";

import { useState, useEffect, ChangeEvent } from 'react';
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from '@/context/language-context';
import { useToast } from '@/hooks/use-toast';
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type Employee = {
  id: number;
  name: string;
  phone: string;
  role: string;
  photo?: string;
};

export default function EmployeeProfilePage({ params }: { params: { employeeId: string } }) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [employeePhotoPreview, setEmployeePhotoPreview] = useState<string>("https://placehold.co/150x150.png");

  useEffect(() => {
    try {
      const storedEmployees = localStorage.getItem('employees');
      if (storedEmployees) {
        const employees: Employee[] = JSON.parse(storedEmployees);
        const currentEmployee = employees.find(e => String(e.id) === params.employeeId);
        if (currentEmployee) {
          setEmployee(currentEmployee);
          if (currentEmployee.photo) {
            setEmployeePhotoPreview(currentEmployee.photo);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load employee data", e);
    }
  }, [params.employeeId]);

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setEmployeePhotoPreview(dataUrl);

        // Update the employee in localStorage
        try {
          const storedEmployees = localStorage.getItem('employees');
          if (storedEmployees) {
            let employees: Employee[] = JSON.parse(storedEmployees);
            employees = employees.map(emp => 
              emp.id === employee?.id ? { ...emp, photo: dataUrl } : emp
            );
            localStorage.setItem('employees', JSON.stringify(employees));
            setEmployee(prev => prev ? { ...prev, photo: dataUrl } : null);
            toast({ title: t.photoUpdated[language] });
          }
        } catch (error) {
          console.error("Failed to update photo in localStorage", error);
          toast({ variant: 'destructive', title: t.photoUpdateFailed[language] });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const t = {
    title: { en: 'My Profile', bn: 'আমার প্রোফাইল' },
    description: { en: 'View and manage your profile information.', bn: 'আপনার প্রোফাইল তথ্য দেখুন এবং পরিচালনা করুন।' },
    name: { en: 'Full Name', bn: 'পুরো নাম' },
    role: { en: 'Role', bn: 'ভূমিকা' },
    phone: { en: 'Mobile Number', bn: 'মোবাইল নাম্বার' },
    changePhoto: { en: 'Change Photo', bn: 'ছবি পরিবর্তন করুন' },
    photoUpdated: { en: 'Photo updated successfully!', bn: 'ছবি সফলভাবে আপডেট হয়েছে!' },
    photoUpdateFailed: { en: 'Failed to update photo.', bn: 'ছবি আপডেট করতে ব্যর্থ হয়েছে।' },
  };

  if (!employee) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold font-headline">{t.title[language]}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t.title[language]}</CardTitle>
          <CardDescription>{t.description[language]}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center gap-4">
              <div className="relative h-32 w-32">
                <Image
                  src={employeePhotoPreview}
                  alt={employee.name}
                  fill
                  className="rounded-full object-cover border-4 border-primary/20"
                  data-ai-hint="profile picture"
                />
              </div>
              <div className="grid gap-1.5 text-center">
                <Input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                <Button asChild variant="outline" size="sm">
                  <Label htmlFor="photo-upload" className="cursor-pointer flex items-center">
                    <Upload className="mr-2 h-4 w-4" />
                    {t.changePhoto[language]}
                  </Label>
                </Button>
              </div>
            </div>
            <div className="md:col-span-2 space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{t.name[language]}</Label>
                <Input id="name" value={employee.name} readOnly disabled />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">{t.role[language]}</Label>
                <Input id="role" value={employee.role} readOnly disabled />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">{t.phone[language]}</Label>
                <Input id="phone" value={employee.phone} readOnly disabled />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
