
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/language-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

// Types
type ProfileSettings = {
  businessName: string;
  ownerName: string;
  mobile: string;
  email: string;
};

type Product = {
  id: number;
  name: string;
  company: string;
  purchasePrice: number;
  quantity: number;
  quantityUnit: string;
  largerUnit?: string;
  conversionFactor?: number;
};

const formatCurrency = (amount: number) => `৳${amount.toFixed(2)}`;

export default function PrintProductsPage() {
    const searchParams = useSearchParams();
    const { language } = useLanguage();

    const [items, setItems] = useState<Product[]>([]);
    const [profile, setProfile] = useState<Partial<ProfileSettings>>({});
    const [isLoading, setIsLoading] = useState(true);

    const company = searchParams.get('company');

    useEffect(() => {
      try {
        const storedProfile = localStorage.getItem('profile-settings');
        if (storedProfile) setProfile(JSON.parse(storedProfile));

        const storedProducts = localStorage.getItem("products");
        let allProducts: Product[] = storedProducts ? JSON.parse(storedProducts) : [];
        
        const filtered = company ? allProducts.filter(p => p.company === company) : allProducts;

        setItems(filtered);
      } catch (e) {
        console.error("Failed to load or filter data", e);
      } finally {
        setIsLoading(false);
      }
    }, [company]);

    const totalValue = useMemo(() => {
        return items.reduce((sum, item) => sum + (item.purchasePrice * item.quantity), 0);
    }, [items]);
    
    const handlePrint = () => window.print();

    const formatProductQuantity = (product: Product) => {
      if (product.largerUnit && product.conversionFactor && product.conversionFactor > 0) {
        const totalInLargerUnit = product.quantity;
        const largerUnitCount = Math.floor(totalInLargerUnit);
        const remainder = totalInLargerUnit - largerUnitCount;
        const smallerUnitCount = Math.round(remainder * product.conversionFactor);
  
        const parts = [];
        if (largerUnitCount > 0) {
          parts.push(`${largerUnitCount} ${product.quantityUnit}`);
        }
        if (smallerUnitCount > 0) {
          parts.push(`${smallerUnitCount} ${product.largerUnit}`);
        }
        
        if (parts.length === 0 && product.quantityUnit) {
          return `0 ${product.quantityUnit}`;
        }
  
        return parts.join(', ');
      }
      return `${product.quantity.toFixed(2)} ${product.quantityUnit}`;
    };
    
    const t = {
        title: { en: "Product Stock Report", bn: "পণ্যের স্টক রিপোর্ট" },
        company: { en: "Company", bn: "কোম্পানি" },
        allCompanies: { en: "All", bn: "সকল" },
        productName: { en: "Product Name", bn: "পণ্যের নাম" },
        quantity: { en: "Quantity", bn: "পরিমাণ" },
        purchasePrice: { en: "Purchase Price", bn: "ক্রয় মূল্য" },
        totalValue: { en: "Total Value", bn: "মোট মূল্য" },
        grandTotal: { en: "Grand Total", bn: "সর্বমোট" },
        noData: { en: "No products found for the selected criteria.", bn: "নির্বাচিত মানদণ্ডের জন্য কোনো পণ্য পাওয়া যায়নি।" },
        print: { en: "Print", bn: "প্রিন্ট" },
    };

    if (isLoading) {
        return (
            <div className="p-8">
                <Skeleton className="h-8 w-1/2 mb-4" />
                <Skeleton className="h-4 w-1/4 mb-8" />
                <Skeleton className="h-96 w-full" />
            </div>
        )
    }

    return (
        <div className="p-4">
             <div id="printable-products-report">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold">{profile.businessName || 'Business Name'}</h1>
                    <p>{profile.ownerName}</p>
                    <p>{profile.mobile}</p>
                    <p>{profile.email}</p>
                </header>
                
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold underline">{t.title[language]}</h2>
                </div>
                
                <div className="text-sm mb-4">
                    <p><strong>{t.company[language]}:</strong> {company || t.allCompanies[language]}</p>
                </div>

                <Separator className="my-4" />
                
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t.productName[language]}</TableHead>
                            <TableHead>{t.company[language]}</TableHead>
                            <TableHead className="text-right">{t.quantity[language]}</TableHead>
                            <TableHead className="text-right">{t.purchasePrice[language]}</TableHead>
                            <TableHead className="text-right">{t.totalValue[language]}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length > 0 ? items.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>{item.company}</TableCell>
                                <TableCell className="text-right">{formatProductQuantity(item)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.purchasePrice)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.purchasePrice * item.quantity)}</TableCell>
                            </TableRow>
                        )) : (
                           <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">{t.noData[language]}</TableCell>
                           </TableRow>
                        )}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={4} className="text-right font-bold">{t.grandTotal[language]}</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(totalValue)}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
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
