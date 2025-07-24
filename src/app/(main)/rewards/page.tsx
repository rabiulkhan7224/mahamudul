
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/context/language-context";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/ui/animated-number";


// Types
type Reward = {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  pricePerUnit: number; // This is the purchase price
  profitMargin: number;
  sellingPrice: number;
};

type RewardRule = {
  id: number;
  mainProductId: number;
  mainProductQuantity: number;
  mainProductUnit: string;
  rewardId: number;
  rewardQuantity: number;
};

type Product = {
  id: number;
  name: string;
  company: string;
  quantityUnit: string;
  largerUnit?: string;
};

const formatCurrency = (amount: number) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '৳0.00';
  }
  return `৳${amount.toFixed(2)}`;
};

export default function RewardsPage() {
    const { language } = useLanguage();

    // Data states with lazy initialization from localStorage
    const [rewards, setRewards] = useState<Reward[]>(() => {
      if (typeof window === 'undefined') return [];
      try {
        const stored = localStorage.getItem('rewards-list');
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        console.error("Failed to parse rewards-list from localStorage", e);
        return [];
      }
    });

    const [rules, setRules] = useState<RewardRule[]>(() => {
      if (typeof window === 'undefined') return [];
      try {
        const stored = localStorage.getItem('reward-rules');
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        console.error("Failed to parse reward-rules from localStorage", e);
        return [];
      }
    });

    const [products, setProducts] = useState<Product[]>(() => {
      if (typeof window === 'undefined') return [];
      try {
        const stored = localStorage.getItem('products');
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        console.error("Failed to parse products from localStorage", e);
        return [];
      }
    });

    const [quantityUnits, setQuantityUnits] = useState<string[]>(() => {
      if (typeof window === 'undefined') return [];
      try {
        const stored = localStorage.getItem('product-quantity-units');
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        console.error("Failed to parse product-quantity-units from localStorage", e);
        return [];
      }
    });

    // Dialog & Form states for Rewards
    const [isRewardDialogOpen, setIsRewardDialogOpen] = useState(false);
    const [editingReward, setEditingReward] = useState<Reward | null>(null);
    const [rewardToDelete, setRewardToDelete] = useState<Reward | null>(null);
    const [rewardName, setRewardName] = useState("");
    const [rewardUnit, setRewardUnit] = useState("");
    const [rewardQuantity, setRewardQuantity] = useState<number | string>("");
    const [rewardPrice, setRewardPrice] = useState<number | string>("");
    const [rewardProfitMargin, setRewardProfitMargin] = useState<number | string>("");

    // Dialog & Form states for Rules
    const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<RewardRule | null>(null);
    const [ruleToDelete, setRuleToDelete] = useState<RewardRule | null>(null);
    const [ruleMainProduct, setRuleMainProduct] = useState("");
    const [ruleMainQty, setRuleMainQty] = useState<number | string>("");
    const [ruleMainUnit, setRuleMainUnit] = useState("");
    const [ruleReward, setRuleReward] = useState("");
    const [ruleRewardQty, setRuleRewardQty] = useState<number | string>("");
    const [isProductSelectionOpen, setIsProductSelectionOpen] = useState(false);


    // Persist data to localStorage
    useEffect(() => { 
        if(typeof window !== 'undefined') {
            localStorage.setItem('rewards-list', JSON.stringify(rewards));
        }
    }, [rewards]);
    useEffect(() => { 
        if(typeof window !== 'undefined') {
            localStorage.setItem('reward-rules', JSON.stringify(rules)); 
        }
    }, [rules]);
    
    // Memos for efficient lookups and calculations
    const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
    const rewardMap = useMemo(() => new Map(rewards.map(r => [r.id, r])), [rewards]);
    
    const selectedMainProductDetails = useMemo(() => {
      if (!ruleMainProduct) return null;
      return productMap.get(Number(ruleMainProduct));
    }, [ruleMainProduct, productMap]);
    
    const mainProductUnits = useMemo(() => {
        if (!selectedMainProductDetails) return [];
        const units = [selectedMainProductDetails.quantityUnit];
        if (selectedMainProductDetails.largerUnit) units.push(selectedMainProductDetails.largerUnit);
        return units.filter(Boolean);
    }, [selectedMainProductDetails]);

    const totalRewardValue = useMemo(() => {
        return rewards.reduce((total, reward) => total + (reward.quantity * reward.pricePerUnit), 0);
    }, [rewards]);
    
    const rewardSellingPrice = useMemo(() => {
      const pp = parseFloat(String(rewardPrice));
      const pm = parseFloat(String(rewardProfitMargin));
      if (!isNaN(pp) && !isNaN(pm)) {
        return (pp * (1 + pm / 100));
      }
      return 0;
    }, [rewardPrice, rewardProfitMargin]);
    
    const groupedProducts = useMemo(() => {
        const groups: { [key: string]: Product[] } = {};
        for (const product of products) {
            if (!groups[product.company]) {
                groups[product.company] = [];
            }
            groups[product.company].push(product);
        }
        return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
    }, [products]);


    // Handlers for REWARDS
    const resetRewardDialog = () => {
        setEditingReward(null);
        setRewardName("");
        setRewardUnit("");
        setRewardQuantity("");
        setRewardPrice("");
        setRewardProfitMargin("");
    };

    const handleEditReward = (reward: Reward) => {
        setEditingReward(reward);
        setRewardName(reward.name);
        setRewardUnit(reward.unit);
        setRewardQuantity(reward.quantity);
        setRewardPrice(reward.pricePerUnit);
        setRewardProfitMargin(reward.profitMargin);
        setIsRewardDialogOpen(true);
    };

    const handleSaveReward = () => {
        if (!rewardName || !rewardUnit || rewardQuantity === "" || rewardPrice === "" || rewardProfitMargin === "") {
            alert(language === 'bn' ? 'অনুগ্রহ করে সকল ঘর পূরণ করুন।' : 'Please fill all fields.');
            return;
        }

        const newReward: Reward = {
            id: editingReward ? editingReward.id : Date.now(),
            name: rewardName,
            unit: rewardUnit,
            quantity: Number(rewardQuantity),
            pricePerUnit: Number(rewardPrice),
            profitMargin: Number(rewardProfitMargin),
            sellingPrice: rewardSellingPrice,
        };

        if (editingReward) {
            setRewards(rewards.map(r => r.id === editingReward.id ? newReward : r));
        } else {
            setRewards([...rewards, newReward]);
        }
        setIsRewardDialogOpen(false);
    };

    const handleDeleteReward = () => {
        if (!rewardToDelete) return;
        if (rules.some(rule => rule.rewardId === rewardToDelete.id)) {
            alert(language === 'bn' ? 'এই পুরস্কারটি একটি নিয়মে ব্যবহৃত হচ্ছে। নিয়মটি মুছে ফেলে আবার চেষ্টা করুন।' : 'This reward is used in a rule. Delete the rule first.');
            setRewardToDelete(null);
            return;
        }
        setRewards(rewards.filter(r => r.id !== rewardToDelete.id));
        setRewardToDelete(null);
    };

    // Handlers for RULES
    const resetRuleDialog = () => {
        setEditingRule(null);
        setRuleMainProduct("");
        setRuleMainQty("");
        setRuleMainUnit("");
        setRuleReward("");
        setRuleRewardQty("");
    };

    const handleEditRule = (rule: RewardRule) => {
        setEditingRule(rule);
        setRuleMainProduct(String(rule.mainProductId));
        setRuleMainQty(rule.mainProductQuantity);
        setRuleMainUnit(rule.mainProductUnit);
        setRuleReward(String(rule.rewardId));
        setRuleRewardQty(rule.rewardQuantity);
        setIsRuleDialogOpen(true);
    };

    const handleSaveRule = () => {
        if (!ruleMainProduct || !ruleMainQty || !ruleMainUnit || !ruleReward || !ruleRewardQty) {
            alert(language === 'bn' ? 'অনুগ্রহ করে সকল ঘর পূরণ করুন।' : 'Please fill all fields.');
            return;
        }
        
        const newRule: RewardRule = {
            id: editingRule ? editingRule.id : Date.now(),
            mainProductId: Number(ruleMainProduct),
            mainProductQuantity: Number(ruleMainQty),
            mainProductUnit: ruleMainUnit,
            rewardId: Number(ruleReward),
            rewardQuantity: Number(ruleRewardQty),
        };
        
        if (editingRule) {
            setRules(rules.map(r => r.id === editingRule.id ? newRule : r));
        } else {
            setRules([...rules, newRule]);
        }
        setIsRuleDialogOpen(false);
    };
    
    const handleDeleteRule = () => {
        if (!ruleToDelete) return;
        setRules(rules.filter(r => r.id !== ruleToDelete.id));
        setRuleToDelete(null);
    };
    
    // Translation object
    const t = {
        title: { en: 'Rewards', bn: 'পুরস্কার তালিকা' },
        description: { en: 'Manage reward items and rules for sales promotions.', bn: 'বিক্রয় প্রচারের জন্য পুরস্কার এবং নিয়মাবলী পরিচালনা করুন।' },
        rewardList: { en: 'Reward Items', bn: 'পুরস্কারের তালিকা' },
        addReward: { en: 'Add Reward', bn: 'নতুন পুরস্কার যোগ' },
        totalValue: { en: 'Total Stock Value', bn: 'মোট স্টক মূল্য' },
        name: { en: 'Name', bn: 'নাম' },
        unit: { en: 'Unit', bn: 'একক' },
        quantity: { en: 'Quantity (Stock)', bn: 'পরিমাণ (স্টক)' },
        purchasePrice: { en: 'Purchase Price', bn: 'ক্রয় মূল্য' },
        sellingPrice: { en: 'Selling Price', bn: 'বিক্রয় মূল্য' },
        profitMargin: { en: 'Profit Margin (%)', bn: 'লাভের হার (%)' },
        totalStockValue: { en: 'Total Stock Value', bn: 'মোট স্টক মূল্য' },
        actions: { en: 'Actions', bn: 'কার্যকলাপ' },
        noRewards: { en: 'No reward items added yet.', bn: 'এখনও কোনো পুরস্কার যোগ করা হয়নি।' },
        
        ruleList: { en: 'Reward Rules', bn: 'পুরস্কারের নিয়মাবলী' },
        addRule: { en: 'Add Rule', bn: 'নতুন নিয়ম যোগ' },
        mainProduct: { en: 'Main Product', bn: 'মূল পণ্য' },
        condition: { en: 'Condition', bn: 'শর্ত' },
        reward: { en: 'Reward', bn: 'পুরস্কার' },
        rewardQuantity: { en: 'Reward Qty', bn: 'পুরস্কারের পরিমাণ' },
        noRules: { en: 'No reward rules set yet.', bn: 'এখনও কোনো পুরস্কারের নিয়ম সেট করা হয়নি।' },
        noProducts: { en: "No products added yet.", bn: "এখনো কোনো পণ্য যোগ করা হয়নি।" },

        // Dialogs
        formTitleAddReward: { en: 'Add New Reward Item', bn: 'নতুন পুরস্কার যোগ করুন' },
        formTitleEditReward: { en: 'Edit Reward Item', bn: 'পুরস্কার সম্পাদনা করুন' },
        formTitleAddRule: { en: 'Set New Reward Rule', bn: 'নতুন পুরস্কারের নিয়ম সেট করুন' },
        formTitleEditRule: { en: 'Edit Reward Rule', bn: 'পুরস্কারের নিয়ম সম্পাদনা করুন' },
        selectProduct: { en: 'Select Product', bn: 'পণ্য নির্বাচন করুন' },
        selectReward: { en: 'Select Reward', bn: 'পুরস্কার নির্বাচন করুন' },
        selectUnit: { en: 'Select Unit', bn: 'একক নির্বাচন করুন' },
        save: { en: 'Save', bn: 'সংরক্ষণ' },
        cancel: { en: 'Cancel', bn: 'বাতিল' },
        confirmDeleteTitle: { en: 'Are you sure?', bn: 'আপনি কি নিশ্চিত?' },
        confirmDeleteReward: { en: 'This will permanently delete this reward item.', bn: 'এটি এই পুরস্কারটি স্থায়ীভাবে মুছে ফেলবে।' },
        confirmDeleteRule: { en: 'This will permanently delete this rule.', bn: 'এটি এই নিয়মটি স্থায়ীভাবে মুছে ফেলবে।' },
        confirm: { en: 'Confirm', bn: 'নিশ্চিত করুন' },
    };

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-bold font-headline">{t.title[language]}</h1>
            
            {/* Rewards Management Card */}
            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>{t.rewardList[language]}</CardTitle>
                    <div className="flex items-center gap-4">
                        <div className="text-right p-2 rounded-lg border bg-card">
                            <div className="text-xs font-medium text-muted-foreground">{t.totalStockValue[language]}</div>
                            <div className="text-xl font-bold"><AnimatedNumber value={totalRewardValue} formatter={formatCurrency} /></div>
                        </div>
                        <Dialog open={isRewardDialogOpen} onOpenChange={(open) => { if(!open) resetRewardDialog(); setIsRewardDialogOpen(open); }}>
                            <DialogTrigger asChild>
                                <Button><PlusCircle className="mr-2 h-4 w-4"/>{t.addReward[language]}</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-3xl">
                                <DialogHeader>
                                    <DialogTitle>{editingReward ? t.formTitleEditReward[language] : t.formTitleAddReward[language]}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="grid md:grid-cols-3 gap-4">
                                        <div className="grid gap-2"><Label>{t.name[language]}</Label><Input value={rewardName} onChange={e => setRewardName(e.target.value)} /></div>
                                        <div className="grid gap-2"><Label>{t.unit[language]}</Label><Select value={rewardUnit} onValueChange={setRewardUnit}><SelectTrigger><SelectValue placeholder={t.selectUnit[language]}/></SelectTrigger><SelectContent>{quantityUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
                                        <div className="grid gap-2"><Label>{t.quantity[language]}</Label><Input type="number" value={rewardQuantity} onChange={e => setRewardQuantity(e.target.value)} /></div>
                                    </div>
                                    <div className="grid md:grid-cols-3 gap-4">
                                        <div className="grid gap-2"><Label>{t.purchasePrice[language]}</Label><Input type="number" value={rewardPrice} onChange={e => setRewardPrice(e.target.value)} /></div>
                                        <div className="grid gap-2"><Label>{t.profitMargin[language]}</Label><Input type="number" value={rewardProfitMargin} onChange={e => setRewardProfitMargin(e.target.value)} /></div>
                                        <div className="grid gap-2"><Label>{t.sellingPrice[language]}</Label><Input value={formatCurrency(rewardSellingPrice)} readOnly disabled /></div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild><Button variant="secondary">{t.cancel[language]}</Button></DialogClose>
                                    <Button onClick={handleSaveReward}>{t.save[language]}</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t.name[language]}</TableHead>
                                <TableHead>{t.quantity[language]}</TableHead>
                                <TableHead className="text-right">{t.purchasePrice[language]}</TableHead>
                                <TableHead className="text-right">{t.profitMargin[language]}</TableHead>
                                <TableHead className="text-right">{t.sellingPrice[language]}</TableHead>
                                <TableHead className="text-right">{t.totalStockValue[language]}</TableHead>
                                <TableHead className="text-right">{t.actions[language]}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rewards.length > 0 ? rewards.map(r => (
                                <TableRow key={r.id}>
                                    <TableCell className="font-medium">{r.name}</TableCell>
                                    <TableCell>{r.quantity} {r.unit}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(r.pricePerUnit)}</TableCell>
                                    <TableCell className="text-right">{r.profitMargin}%</TableCell>
                                    <TableCell className="text-right">{formatCurrency(r.sellingPrice)}</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(r.quantity * r.pricePerUnit)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditReward(r)}><Edit className="h-4 w-4"/></Button>
                                        <Button variant="ghost" size="icon" onClick={() => setRewardToDelete(r)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    </TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={7} className="h-24 text-center">{t.noRewards[language]}</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Rules Management Card */}
            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>{t.ruleList[language]}</CardTitle>
                    <Dialog open={isRuleDialogOpen} onOpenChange={(open) => { if(!open) resetRuleDialog(); setIsRuleDialogOpen(open); }}>
                        <DialogTrigger asChild>
                            <Button><PlusCircle className="mr-2 h-4 w-4"/>{t.addRule[language]}</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingRule ? t.formTitleEditRule[language] : t.formTitleAddRule[language]}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="grid gap-2">
                                    <Label>{t.mainProduct[language]}</Label>
                                    <Dialog open={isProductSelectionOpen} onOpenChange={setIsProductSelectionOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="justify-start">
                                                {ruleMainProduct ? (productMap.get(Number(ruleMainProduct))?.name || t.selectProduct[language]) : t.selectProduct[language]}
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-lg">
                                            <DialogHeader>
                                                <DialogTitle>{t.selectProduct[language]}</DialogTitle>
                                            </DialogHeader>
                                            <div className="py-4">
                                                <div className="border rounded-md p-2 h-[60vh] overflow-y-auto">
                                                    {products.length > 0 ? (
                                                        <Tabs defaultValue={groupedProducts[0]?.[0]} className="w-full">
                                                            <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 gap-1 h-auto mb-2">
                                                                {groupedProducts.map(([company]) => (<TabsTrigger key={company} value={company}>{company}</TabsTrigger>))}
                                                            </TabsList>
                                                            {groupedProducts.map(([company, companyProducts]) => (
                                                                <TabsContent key={company} value={company}>
                                                                    <div className="space-y-1">
                                                                        {companyProducts.map(p => (
                                                                            <button
                                                                                key={p.id}
                                                                                onClick={() => {
                                                                                    setRuleMainProduct(String(p.id));
                                                                                    setIsProductSelectionOpen(false);
                                                                                }}
                                                                                className={cn("w-full text-left p-2 rounded-md hover:bg-accent flex items-center justify-between text-sm")}
                                                                            >
                                                                                <span>{p.name}</span>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </TabsContent>
                                                            ))}
                                                        </Tabs>
                                                    ) : (
                                                        <div className="p-4 text-sm text-center text-muted-foreground flex items-center justify-center h-full">
                                                            {t.noProducts[language]}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2"><Label>{t.quantity[language]}</Label><Input type="number" value={ruleMainQty} onChange={e => setRuleMainQty(e.target.value)}/></div>
                                    <div className="grid gap-2"><Label>{t.unit[language]}</Label><Select value={ruleMainUnit} onValueChange={setRuleMainUnit} disabled={!ruleMainProduct}><SelectTrigger><SelectValue placeholder={t.selectUnit[language]}/></SelectTrigger><SelectContent>{mainProductUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
                                </div>
                                <div className="grid gap-2"><Label>{t.reward[language]}</Label><Select value={ruleReward} onValueChange={setRuleReward}><SelectTrigger><SelectValue placeholder={t.selectReward[language]}/></SelectTrigger><SelectContent>{rewards.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}</SelectContent></Select></div>
                                <div className="grid gap-2"><Label>{t.rewardQuantity[language]}</Label><Input type="number" value={ruleRewardQty} onChange={e => setRuleRewardQty(e.target.value)}/></div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild><Button variant="secondary">{t.cancel[language]}</Button></DialogClose>
                                <Button onClick={handleSaveRule}>{t.save[language]}</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>{t.mainProduct[language]}</TableHead><TableHead>{t.condition[language]}</TableHead><TableHead>{t.reward[language]}</TableHead><TableHead className="text-right">{t.rewardQuantity[language]}</TableHead><TableHead className="text-right">{t.actions[language]}</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {rules.length > 0 ? rules.map(r => (
                                <TableRow key={r.id}>
                                    <TableCell>{productMap.get(r.mainProductId)?.name || 'N/A'}</TableCell>
                                    <TableCell>{r.mainProductQuantity} {r.mainProductUnit}</TableCell>
                                    <TableCell>{rewardMap.get(r.rewardId)?.name || 'N/A'}</TableCell>
                                    <TableCell className="text-right">{r.rewardQuantity} {rewardMap.get(r.rewardId)?.unit}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditRule(r)}><Edit className="h-4 w-4"/></Button>
                                        <Button variant="ghost" size="icon" onClick={() => setRuleToDelete(r)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    </TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={5} className="h-24 text-center">{t.noRules[language]}</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Alert Dialog for Deleting Reward */}
            <AlertDialog open={!!rewardToDelete} onOpenChange={(open) => !open && setRewardToDelete(null)}>
                <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>{t.confirmDeleteTitle[language]}</AlertDialogTitle><AlertDialogDescription>{t.confirmDeleteReward[language]}</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setRewardToDelete(null)}>{t.cancel[language]}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteReward}>{t.confirm[language]}</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {/* Alert Dialog for Deleting Rule */}
            <AlertDialog open={!!ruleToDelete} onOpenChange={(open) => !open && setRuleToDelete(null)}>
                <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>{t.confirmDeleteTitle[language]}</AlertDialogTitle><AlertDialogDescription>{t.confirmDeleteRule[language]}</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setRuleToDelete(null)}>{t.cancel[language]}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteRule}>{t.confirm[language]}</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
