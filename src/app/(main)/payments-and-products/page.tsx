
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
  TableFooter
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
  SelectGroup
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/context/language-context";
import { PlusCircle, Edit, Trash2, CheckCircle2, PackageCheck, Package, CircleDotDashed, AlertCircle, TrendingUp, TrendingDown, Eye, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AnimatedNumber } from "@/components/ui/animated-number";

// Types
type Company = { name: string; };
type FullProduct = { id: number; name: string; company: string; purchasePrice: number; quantity: number; quantityUnit: string; largerUnit?: string; conversionFactor?: number; };
type SupplierPaymentItem = { id: number; productId: number; productName: string; quantity: number; unit: string; pricePerUnit: number; totalPrice: number; };
type SupplierPayment = { id: number; companyName: string; paymentDate: string; paymentMethod: string; advancePayment?: number; items: SupplierPaymentItem[]; status: 'pending' | 'received'; receivedDate?: string; note?: string; actualReceivedItems?: SupplierPaymentItem[]; };

const formatCurrency = (amount: number) => `৳${amount.toFixed(2)}`;

export default function PaymentsAndProductsPage() {
  const { language } = useLanguage();

  // Data state with lazy initialization from localStorage
  const [payments, setPayments] = useState<SupplierPayment[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('supplier-payments');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to parse supplier-payments from localStorage', e);
      return [];
    }
  });
  
  const [companies, setCompanies] = useState<Company[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('product-companies');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to parse product-companies from localStorage', e);
      return [];
    }
  });

  const [products, setProducts] = useState<FullProduct[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('products');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to parse products from localStorage', e);
      return [];
    }
  });

  // Dialog & Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SupplierPayment | null>(null);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [advancePayment, setAdvancePayment] = useState<number | string>("");
  const [note, setNote] = useState("");
  const [itemsInDialog, setItemsInDialog] = useState<SupplierPaymentItem[]>([]);
  
  // Item Dialog state
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [itemProduct, setItemProduct] = useState("");
  const [itemQuantity, setItemQuantity] = useState<number | string>("");
  const [itemUnit, setItemUnit] = useState("");
  const [itemPrice, setItemPrice] = useState<number | string>("");

  // Confirmation dialogs
  const [paymentToReceive, setPaymentToReceive] = useState<SupplierPayment | null>(null);
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
  const [receptionItems, setReceptionItems] = useState<SupplierPaymentItem[]>([]);
  const [itemToDelete, setItemToDelete] = useState<SupplierPayment | null>(null);
  
  // Extra Item Dialog state
  const [isExtraItemDialogOpen, setIsExtraItemDialogOpen] = useState(false);
  const [extraItemProduct, setExtraItemProduct] = useState("");
  const [extraItemQuantity, setExtraItemQuantity] = useState<number | string>("");
  const [extraItemUnit, setExtraItemUnit] = useState("");
  const [extraItemPrice, setExtraItemPrice] = useState<number | string>("");


  // Persist payments to localStorage whenever they change
  useEffect(() => {
    if(typeof window !== 'undefined') {
      localStorage.setItem('supplier-payments', JSON.stringify(payments));
    }
  }, [payments]);
  
  // Persist products to localStorage whenever they change
  useEffect(() => {
    if(typeof window !== 'undefined') {
      localStorage.setItem('products', JSON.stringify(products));
    }
  }, [products]);

  const summaryData = useMemo(() => {
    const sortedByDate = [...payments].sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    const latestPaymentAmount = sortedByDate.length > 0 ? sortedByDate[0].advancePayment || 0 : 0;

    const receivedPayments = payments.filter(p => p.status === 'received' && p.receivedDate);
    const sortedReceived = [...receivedPayments].sort((a, b) => new Date(b.receivedDate!).getTime() - new Date(a.receivedDate!).getTime());
    
    let lastReceivedValue = 0;
    if (sortedReceived.length > 0) {
      const lastReceivedPayment = sortedReceived[0];
      if (lastReceivedPayment.actualReceivedItems) {
        lastReceivedValue = lastReceivedPayment.actualReceivedItems.reduce((sum, item) => sum + item.totalPrice, 0);
      }
    }

    const overallSupplierBalance = receivedPayments.reduce((balance, p) => {
        const receivedValue = p.actualReceivedItems?.reduce((sum, item) => sum + item.totalPrice, 0) || 0;
        const advance = p.advancePayment || 0;
        return balance + (advance - receivedValue);
    }, 0);

    return {
      latestPaymentAmount,
      lastReceivedValue,
      overallSupplierBalance
    };
  }, [payments]);


  const sortedPayments = useMemo(() => {
    return [...payments].sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  }, [payments]);
  
  const totalAmountInDialog = useMemo(() => {
    return itemsInDialog.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [itemsInDialog]);

  const dueAmountInDialog = useMemo(() => {
      return totalAmountInDialog - (Number(advancePayment) || 0);
  }, [totalAmountInDialog, advancePayment]);

  const productsForSelectedCompany = useMemo(() => {
    if (!selectedCompany) return [];
    return products.filter(p => p.company === selectedCompany);
  }, [products, selectedCompany]);

  const selectedItemProductDetails = useMemo(() => {
    if (!itemProduct) return null;
    return products.find(p => p.id === Number(itemProduct));
  }, [itemProduct, products]);

  const availableUnitsForItem = useMemo(() => {
    if (!selectedItemProductDetails) return [];
    const units = [selectedItemProductDetails.quantityUnit];
    if (selectedItemProductDetails.largerUnit) {
        units.push(selectedItemProductDetails.largerUnit);
    }
    return units.filter(Boolean);
  }, [selectedItemProductDetails]);

  useEffect(() => {
    if (!selectedItemProductDetails) return;

    const largerUnitName = selectedItemProductDetails.quantityUnit;
    const smallerUnitName = selectedItemProductDetails.largerUnit;
    const conversion = selectedItemProductDetails.conversionFactor || 1;
    const priceOfLargerUnit = selectedItemProductDetails.purchasePrice;

    if (itemUnit === largerUnitName) {
        setItemPrice(priceOfLargerUnit);
    } else if (itemUnit === smallerUnitName) {
        const priceOfSmallerUnit = conversion > 0 ? priceOfLargerUnit / conversion : 0;
        setItemPrice(priceOfSmallerUnit);
    }
  }, [selectedItemProductDetails, itemUnit]);

  // Calculations for Reception Dialog
  const receptionTotalValue = useMemo(() => {
    return receptionItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [receptionItems]);

  const receptionBalance = useMemo(() => {
    if (!paymentToReceive) return 0;
    return (paymentToReceive.advancePayment || 0) - receptionTotalValue;
  }, [paymentToReceive, receptionTotalValue]);

  const receptionDiscrepancies = useMemo(() => {
    if (!paymentToReceive) return [];
    const orderedItemsMap = new Map(paymentToReceive.items.map(item => [item.productId, item]));
    const receivedItemsMap = new Map(receptionItems.map(item => [item.productId, item]));
    const allProductIds = new Set([...orderedItemsMap.keys(), ...receivedItemsMap.keys()]);

    return Array.from(allProductIds).map(productId => {
        const receivedItem = receivedItemsMap.get(productId);
        const orderedItem = orderedItemsMap.get(productId);
        
        const receivedQuantity = receivedItem?.quantity ?? 0;
        const orderedQuantity = orderedItem?.quantity ?? 0;

        if (orderedQuantity === receivedQuantity) {
            return null;
        }

        const displayItem = receivedItem || orderedItem;
        if (!displayItem) return null;
        
        const difference = receivedQuantity - orderedQuantity;
        const pricePerUnit = displayItem.pricePerUnit;

        return {
            productName: displayItem.productName,
            orderedQuantity: orderedQuantity,
            receivedQuantity: receivedQuantity,
            unit: displayItem.unit,
            difference: difference,
            pricePerUnit: pricePerUnit,
            totalPriceDifference: difference * pricePerUnit,
        };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
  }, [paymentToReceive, receptionItems]);

  const totalDiscrepancyValue = useMemo(() => {
    return receptionDiscrepancies.reduce((sum, item) => sum + item.totalPriceDifference, 0);
  }, [receptionDiscrepancies]);

  const productsForExtraItemDialog = useMemo(() => {
    if (!paymentToReceive) return [];
    const receivedProductIds = new Set(receptionItems.map(item => item.productId));
    
    return products.filter(p => 
        p.company === paymentToReceive.companyName && 
        !receivedProductIds.has(p.id)
    );
  }, [products, paymentToReceive, receptionItems]);

  const selectedExtraItemProductDetails = useMemo(() => {
    if (!extraItemProduct) return null;
    return products.find(p => p.id === Number(extraItemProduct));
  }, [extraItemProduct, products]);

  const availableUnitsForExtraItem = useMemo(() => {
    if (!selectedExtraItemProductDetails) return [];
    const units = [selectedExtraItemProductDetails.quantityUnit];
    if (selectedExtraItemProductDetails.largerUnit) {
        units.push(selectedExtraItemProductDetails.largerUnit);
    }
    return units.filter(Boolean);
  }, [selectedExtraItemProductDetails]);

  useEffect(() => {
    if (!selectedExtraItemProductDetails) return;

    const largerUnitName = selectedExtraItemProductDetails.quantityUnit;
    const smallerUnitName = selectedExtraItemProductDetails.largerUnit;
    const conversion = selectedExtraItemProductDetails.conversionFactor || 1;
    const priceOfLargerUnit = selectedExtraItemProductDetails.purchasePrice;

    if (extraItemUnit === largerUnitName) {
        setExtraItemPrice(priceOfLargerUnit);
    } else if (extraItemUnit === smallerUnitName) {
        const priceOfSmallerUnit = conversion > 0 ? priceOfLargerUnit / conversion : 0;
        setExtraItemPrice(priceOfSmallerUnit);
    }
  }, [selectedExtraItemProductDetails, extraItemUnit]);


  const formatProductQuantity = (product: FullProduct) => {
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
    const qty = Number(product.quantity);
    if (isNaN(qty)) return `0 ${product.quantityUnit || ''}`;
    
    return `${qty.toFixed(2)} ${product.quantityUnit || ''}`;
  };

  const resetDialog = () => {
    setEditingPayment(null);
    setSelectedCompany("");
    setPaymentDate(new Date().toLocaleDateString('en-CA'));
    setPaymentMethod("Cash");
    setAdvancePayment("");
    setNote("");
    setItemsInDialog([]);
  };

  const handleAddNew = () => {
    resetDialog();
    setIsDialogOpen(true);
  };
  
  const handleEdit = (payment: SupplierPayment) => {
    setEditingPayment(payment);
    setSelectedCompany(payment.companyName);
    setPaymentDate(payment.paymentDate);
    setPaymentMethod(payment.paymentMethod);
    setAdvancePayment(payment.advancePayment || "");
    setNote(payment.note || "");
    setItemsInDialog(payment.items);
    setIsDialogOpen(true);
  };
  
  const handleSave = () => {
    if (!selectedCompany || !paymentDate || itemsInDialog.length === 0) {
      alert(language === 'bn' ? 'অনুগ্রহ করে কোম্পানি, তারিখ এবং কমপক্ষে একটি পণ্য যোগ করুন।' : 'Please select company, date and add at least one item.');
      return;
    }

    const newPayment: SupplierPayment = {
      id: editingPayment ? editingPayment.id : Date.now(),
      companyName: selectedCompany,
      paymentDate,
      paymentMethod,
      advancePayment: Number(advancePayment) || 0,
      items: itemsInDialog,
      status: editingPayment ? editingPayment.status : 'pending',
      receivedDate: editingPayment ? editingPayment.receivedDate : undefined,
      note,
    };

    if (editingPayment) {
      setPayments(payments.map(p => p.id === editingPayment.id ? newPayment : p));
    } else {
      setPayments([...payments, newPayment]);
    }
    setIsDialogOpen(false);
  };

  const handleOpenReceptionDialog = (payment: SupplierPayment) => {
    setPaymentToReceive(payment);
    setReceptionItems(JSON.parse(JSON.stringify(payment.items)));
    setIsReceiveDialogOpen(true);
  };
  
  const handleReceptionItemQuantityChange = (itemId: number, newQuantity: string) => {
    const qty = Number(newQuantity) || 0;
    setReceptionItems(prevItems => 
      prevItems.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            quantity: qty,
            totalPrice: qty * item.pricePerUnit,
          };
        }
        return item;
      })
    );
  };

  const handleConfirmReception = () => {
    if (!paymentToReceive) return;
    
    // 1. Update product stock
    let updatedProducts = [...products];
    receptionItems.forEach(item => {
        const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
        if (productIndex !== -1) {
            const product = updatedProducts[productIndex];
            let quantityToAdd = item.quantity;
            // Convert to base unit if necessary
            if (product.largerUnit && product.conversionFactor && item.unit === product.largerUnit) {
                quantityToAdd = item.quantity / product.conversionFactor;
            }
            updatedProducts[productIndex].quantity += quantityToAdd;
        }
    });
    setProducts(updatedProducts);
    
    // 2. Update payment status
    const updatedPayment: SupplierPayment = {
        ...paymentToReceive,
        status: 'received',
        receivedDate: new Date().toLocaleDateString('en-CA'),
        actualReceivedItems: receptionItems,
    };
    setPayments(payments.map(p => p.id === paymentToReceive.id ? updatedPayment : p));

    setIsReceiveDialogOpen(false);
    setPaymentToReceive(null);
  };
  
  const handleDelete = () => {
    if(!itemToDelete) return;

    // If the item was already received, revert the stock addition.
    if (itemToDelete.status === 'received') {
      let updatedProducts = [...products];
      const itemsToRevert = itemToDelete.actualReceivedItems || itemToDelete.items;
      itemsToRevert.forEach(item => {
        const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
        if (productIndex !== -1) {
            const product = updatedProducts[productIndex];
            let quantityToDeduct = item.quantity;
            // Convert to base unit if necessary for deduction
            if (product.largerUnit && product.conversionFactor && item.unit === product.largerUnit) {
                quantityToDeduct = item.quantity / product.conversionFactor;
            }
            updatedProducts[productIndex].quantity -= quantityToDeduct;
        }
      });
      // Set the new products state, which will trigger the useEffect to save to localStorage.
      setProducts(updatedProducts);
    }
    
    // Remove the payment record itself.
    setPayments(payments.filter(p => p.id !== itemToDelete.id));
    setItemToDelete(null);
  };
  
  const resetItemDialog = () => {
    setItemProduct("");
    setItemQuantity("");
    setItemUnit("");
    setItemPrice("");
  };

  const handleAddItem = () => {
    const product = products.find(p => p.id === Number(itemProduct));
    if (!product || !itemQuantity || !itemUnit || !itemPrice) {
      alert(language === 'bn' ? 'অনুগ্রহ করে সব ঘর পূরণ করুন।' : 'Please fill all fields.');
      return;
    }
    const newItem: SupplierPaymentItem = {
        id: Date.now(),
        productId: product.id,
        productName: product.name,
        quantity: Number(itemQuantity),
        unit: itemUnit,
        pricePerUnit: Number(itemPrice),
        totalPrice: Number(itemQuantity) * Number(itemPrice)
    };
    setItemsInDialog([...itemsInDialog, newItem]);
    setIsItemDialogOpen(false);
  };
  
  const handleRemoveItem = (id: number) => {
    setItemsInDialog(itemsInDialog.filter(i => i.id !== id));
  };
  
  const resetExtraItemDialog = () => {
    setExtraItemProduct("");
    setExtraItemQuantity("");
    setExtraItemUnit("");
    setExtraItemPrice("");
  };

  const handleAddExtraItem = () => {
    const product = products.find(p => p.id === Number(extraItemProduct));
    if (!product || !extraItemQuantity || !extraItemUnit || !extraItemPrice) {
      alert(language === 'bn' ? 'অনুগ্রহ করে সব ঘর পূরণ করুন।' : 'Please fill all fields.');
      return;
    }
    const newItem: SupplierPaymentItem = {
      id: Date.now(),
      productId: product.id,
      productName: product.name,
      quantity: Number(extraItemQuantity),
      unit: extraItemUnit,
      pricePerUnit: Number(extraItemPrice),
      totalPrice: Number(extraItemQuantity) * Number(extraItemPrice),
    };
    setReceptionItems([...receptionItems, newItem]);
    setIsExtraItemDialogOpen(false);
  };


  const t = {
    title: { en: 'Supplier Payments', bn: 'পেমেন্ট ও পণ্য' },
    description: { en: 'Track payments to suppliers and product receipts.', bn: 'সরবরাহকারীদের পেমেন্ট এবং পণ্য প্রাপ্তি ট্র্যাক করুন।' },
    addNewPayment: { en: 'New Payment Record', bn: 'নতুন পেমেন্ট রেকর্ড' },
    advancePayment: { en: 'Advance Payment', bn: 'অগ্রিম পেমেন্ট' },
    paymentDate: { en: 'Payment Date', bn: 'পেমেন্টের তারিখ' },
    company: { en: 'Company', bn: 'কোম্পানি' },
    totalAmount: { en: 'Total Amount', bn: 'মোট পরিমাণ' },
    paidAmount: { en: 'Paid Amount', bn: 'প্রদত্ত পরিমাণ' },
    dueAmount: { en: 'Due Amount', bn: 'বাকি পরিমাণ' },
    status: { en: 'Status', bn: 'স্ট্যাটাস' },
    receivedDate: { en: 'Received Date', bn: 'প্রাপ্তির তারিখ' },
    actions: { en: 'Actions', bn: 'কার্যকলাপ' },
    pending: { en: 'Pending Receipt', bn: 'প্রাপ্তি বাকি' },
    received: { en: 'Received', bn: 'প্রাপ্ত' },
    formTitleAdd: { en: 'Add New Payment Record', bn: 'নতুন পেমেন্ট রেকর্ড যোগ করুন' },
    formTitleEdit: { en: 'Edit Payment Record', bn: 'পেমেন্ট রেকর্ড এডিট করুন' },
    formDescription: { en: 'Fill in the details of the payment made to the supplier.', bn: 'সরবরাহকারীকে করা পেমেন্টের বিবরণ পূরণ করুন।' },
    selectCompany: { en: 'Select Company', bn: 'কোম্পানি নির্বাচন করুন' },
    paymentMethod: { en: 'Payment Method', bn: 'পেমেন্ট পদ্ধতি' },
    cash: { en: 'Cash', bn: 'ক্যাশ' },
    bank: { en: 'Bank', bn: 'ব্যাংক' },
    note: { en: 'Note', bn: 'নোট' },
    itemsPaidFor: { en: 'Items Paid For', bn: 'যেসব পণ্যের জন্য পেমেন্ট করা হয়েছে' },
    addProduct: { en: 'Add Product', bn: 'পণ্য যোগ' },
    product: { en: 'Product', bn: 'পণ্য' },
    quantity: { en: 'Quantity', bn: 'পরিমাণ' },
    unit: { en: 'Unit', bn: 'একক' },
    selectUnit: { en: 'Select Unit', bn: 'একক নির্বাচন করুন' },
    pricePerUnit: { en: 'Price/Unit', bn: 'একক মূল্য' },
    totalPrice: { en: 'Total Price', bn: 'মোট মূল্য' },
    markAsReceived: { en: 'Mark as Received', bn: 'প্রাপ্ত হিসেবে চিহ্নিত করুন' },
    save: { en: 'Save', bn: 'সংরক্ষণ' },
    cancel: { en: 'Cancel', bn: 'বাতিল' },
    preview: { en: 'Preview / Print', bn: 'প্রিভিউ / প্রিন্ট' },
    edit: { en: 'Edit', bn: 'সম্পাদনা' },
    delete: { en: 'Delete', bn: 'মুছুন' },
    confirmDeleteDescription: { en: 'This will permanently delete this payment record. If items were received, stock will be adjusted. This action cannot be undone.', bn: 'এই পেমেন্ট রেকর্ডটি স্থায়ীভাবে মুছে ফেলবে। যদি পণ্যগুলি ইতিমধ্যে প্রাপ্ত হয়ে থাকে তবে স্টক সমন্বয় করা হবে। এই কাজটি ফিরিয়ে আনা যাবে না।' },
    confirm: { en: 'Confirm', bn: 'নিশ্চিত করুন' },
    noPayments: { en: 'No supplier payments recorded yet.', bn: 'এখনও কোনো সরবরাহকারী পেমেন্ট রেকর্ড করা হয়নি।' },
    // Reception Dialog
    receptionTitle: { en: "Receive Products", bn: "পণ্য গ্রহণ করুন" },
    receptionDescription: { en: "Confirm the quantity of products you have received from the supplier.", bn: "সরবরাহকারীর কাছ থেকে আপনি যে পরিমাণ পণ্য পেয়েছেন তা নিশ্চিত করুন।" },
    orderedQty: { en: "Ordered", bn: "অর্ডারকৃত" },
    receivedQty: { en: "Received", bn: "প্রাপ্ত" },
    receptionFinancialSummary: { en: "Financial Summary", bn: "আর্থিক সারসংক্ষেপ" },
    receptionTotalOrdered: { en: "Total Ordered Value", bn: "মোট অর্ডারের মূল্য" },
    receptionTotalReceived: { en: "Total Received Value", bn: "মোট প্রাপ্ত পণ্যের মূল্য" },
    receptionDiscrepancyValue: { en: "Discrepancy Adjustment", bn: "অসামঞ্জস্য সমন্বয়" },
    receptionFinalBalance: { en: "Final Balance", bn: "চূড়ান্ত ব্যালেন্স" },
    supplierOwes: { en: "Supplier Owes You", bn: "সরবরাহকারীর কাছে পাওনা" },
    youOwe: { en: "You Owe Supplier", bn: "আপনার কাছে দেনা" },
    balanced: { en: "Balanced", bn: "পরিশোধিত" },
    receptionDiscrepancies: { en: "Discrepancies", bn: "অসামঞ্জস্য" },
    receptionNoDiscrepancies: { en: "No discrepancies between ordered and received items.", bn: "অর্ডার করা এবং প্রাপ্ত পণ্যের মধ্যে কোন অসামঞ্জস্য নেই।" },
    difference: { en: "Difference", bn: "পার্থক্য" },
    confirmReception: { en: "Confirm Reception", bn: "প্রাপ্তি নিশ্চিত করুন" },
    addExtraProduct: { en: "Add Other Product", bn: "অন্যান্য পণ্য যোগ করুন" },
    latestPayment: { en: 'Latest Payment', bn: 'সর্বশেষ পেমেন্ট' },
    lastReceivedValue: { en: 'Last Received Value', bn: 'সর্বশেষ প্রাপ্ত পণ্যের মূল্য' },
    supplierBalance: { en: 'Supplier Balance', bn: 'সরবরাহকারী ব্যালেন্স' },
    youOweSupplier: { en: 'You Owe Supplier', bn: 'আপনার কাছে দেনা' },
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">{t.title[language]}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.latestPayment[language]}</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                <AnimatedNumber value={summaryData.latestPaymentAmount} formatter={formatCurrency}/>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.lastReceivedValue[language]}</CardTitle>
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                <AnimatedNumber value={summaryData.lastReceivedValue} formatter={formatCurrency}/>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.supplierBalance[language]}</CardTitle>
            {summaryData.overallSupplierBalance > 0 ? (
                <TrendingDown className="h-4 w-4 text-green-600" />
            ) : summaryData.overallSupplierBalance < 0 ? (
                <TrendingUp className="h-4 w-4 text-destructive" />
            ) : null}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
                summaryData.overallSupplierBalance > 0 ? 'text-green-600' : summaryData.overallSupplierBalance < 0 ? 'text-destructive' : ''
            }`}>
                <AnimatedNumber value={Math.abs(summaryData.overallSupplierBalance)} formatter={formatCurrency}/>
            </div>
            <p className="text-xs text-muted-foreground">
                {summaryData.overallSupplierBalance > 0 ? t.supplierOwes[language] : summaryData.overallSupplierBalance < 0 ? t.youOweSupplier[language] : t.balanced[language]}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t.title[language]}</CardTitle>
            <CardDescription>{t.description[language]}</CardDescription>
          </div>
          <Button onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4"/>{t.addNewPayment[language]}</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.paymentDate[language]}</TableHead>
                <TableHead>{t.company[language]}</TableHead>
                <TableHead className="text-right">{t.totalAmount[language]}</TableHead>
                <TableHead className="text-right">{t.dueAmount[language]}</TableHead>
                <TableHead>{t.status[language]}</TableHead>
                <TableHead>{t.receivedDate[language]}</TableHead>
                <TableHead className="text-right">{t.actions[language]}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPayments.length > 0 ? sortedPayments.map(p => {
                const totalAmount = p.items.reduce((sum, i) => sum + i.totalPrice, 0);
                const dueAmount = totalAmount - (p.advancePayment || 0);
                return (
                <TableRow key={p.id}>
                  <TableCell>{new Date(p.paymentDate).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-CA')}</TableCell>
                  <TableCell className="font-medium">{p.companyName}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalAmount)}</TableCell>
                  <TableCell className="text-right font-medium text-destructive">{formatCurrency(dueAmount)}</TableCell>
                  <TableCell>
                    {p.status === 'received' ? (
                      <Badge variant="secondary" className="text-green-700 border-green-300"><CheckCircle2 className="mr-1 h-3.5 w-3.5"/>{t.received[language]}</Badge>
                    ) : (
                      <Badge variant="outline"><CircleDotDashed className="mr-1 h-3.5 w-3.5"/>{t.pending[language]}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{p.receivedDate ? new Date(p.receivedDate).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-CA') : '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild title={t.preview[language]}>
                      <Link href={`/payments-and-products/${p.id}/print`} target="_blank">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    {p.status === 'pending' && (
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(p)} title={t.edit[language]}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                     {p.status === 'pending' && (
                      <Button variant="ghost" size="icon" onClick={() => handleOpenReceptionDialog(p)} title={t.markAsReceived[language]}>
                          <PackageCheck className="h-4 w-4 text-green-600"/>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setItemToDelete(p)} title={t.delete[language]}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              )}) : (
                <TableRow><TableCell colSpan={8} className="h-24 text-center">{t.noPayments[language]}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Add/Edit Payment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if(!open) resetDialog(); setIsDialogOpen(open); }}>
        <DialogContent className="sm:max-w-4xl flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingPayment ? t.formTitleEdit[language] : t.formTitleAdd[language]}</DialogTitle>
            <DialogDescription>{t.formDescription[language]}</DialogDescription>
          </DialogHeader>
          
          <div className="flex-grow overflow-y-auto -mr-6 pr-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="company">{t.company[language]}</Label>
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                  <SelectTrigger><SelectValue placeholder={t.selectCompany[language]}/></SelectTrigger>
                  <SelectContent>
                    {companies.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="paymentDate">{t.paymentDate[language]}</Label>
                <Input id="paymentDate" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="paymentMethod">{t.paymentMethod[language]}</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">{t.cash[language]}</SelectItem>
                    <SelectItem value="Bank">{t.bank[language]}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="advancePayment">{t.advancePayment[language]}</Label>
                <Input id="advancePayment" type="number" placeholder="0.00" value={advancePayment} onChange={(e) => setAdvancePayment(e.target.value)} />
              </div>
              <div className="grid gap-2 md:col-span-4">
                <Label htmlFor="note">{t.note[language]}</Label>
                <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>
            
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>{t.itemsPaidFor[language]}</CardTitle>
                <Dialog modal={false} open={isItemDialogOpen} onOpenChange={(open) => {if(!open) resetItemDialog(); setIsItemDialogOpen(open);}}>
                    <DialogTrigger asChild>
                        <Button variant="outline" disabled={!selectedCompany}>
                            <Package className="mr-2 h-4 w-4"/>{t.addProduct[language]}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>{t.addProduct[language]}</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid gap-2">
                                <Label>{t.product[language]}</Label>
                                <Select value={itemProduct} onValueChange={(val) => {
                                    const p = products.find(prod => String(prod.id) === val);
                                    setItemProduct(val);
                                    if(p) {
                                      setItemUnit(p.quantityUnit);
                                      setItemPrice(p.purchasePrice);
                                    }
                                }}>
                                    <SelectTrigger><SelectValue placeholder={t.product[language]}/></SelectTrigger>
                                    <SelectContent>
                                        {productsForSelectedCompany.length > 0 ? productsForSelectedCompany.map(p => (
                                            <SelectItem key={p.id} value={String(p.id)}>
                                                <div className="flex justify-between w-full items-center">
                                                    <span>{p.name}</span>
                                                    <span className="ml-4 text-xs font-medium text-muted-foreground">
                                                        {formatProductQuantity(p)}
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        )) : (
                                            <div className="p-4 text-center text-sm text-muted-foreground">
                                                {language === 'bn' ? 'এই কোম্পানির জন্য কোনো পণ্য নেই' : 'No products for this company'}
                                            </div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2"><Label>{t.quantity[language]}</Label><Input type="number" value={itemQuantity} onChange={e => setItemQuantity(e.target.value)}/></div>
                                <div className="grid gap-2">
                                  <Label>{t.unit[language]}</Label>
                                  <Select value={itemUnit} onValueChange={setItemUnit} disabled={!itemProduct}>
                                    <SelectTrigger><SelectValue placeholder={t.selectUnit[language]}/></SelectTrigger>
                                    <SelectContent>
                                        {availableUnitsForItem.map(unit => (
                                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                            </div>
                            <div className="grid gap-2"><Label>{t.pricePerUnit[language]}</Label><Input type="number" value={itemPrice} onChange={e => setItemPrice(e.target.value)}/></div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="secondary">{t.cancel[language]}</Button></DialogClose>
                            <Button onClick={handleAddItem}>{t.addProduct[language]}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.product[language]}</TableHead>
                      <TableHead className="text-center">{t.quantity[language]}</TableHead>
                      <TableHead className="text-right">{t.pricePerUnit[language]}</TableHead>
                      <TableHead className="text-right">{t.totalPrice[language]}</TableHead>
                      <TableHead/>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsInDialog.length > 0 ? itemsInDialog.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell className="text-center">{item.quantity} {item.unit}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.pricePerUnit)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}><Trash2 className="h-4 w-4"/></Button></TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={5} className="h-24 text-center">{language === 'bn' ? 'কোনো পণ্য যোগ করা হয়নি' : 'No items added'}</TableCell></TableRow>
                    )}
                  </TableBody>
                  <TableFooter>
                     <TableRow>
                        <TableCell colSpan={3} className="text-right font-bold">{t.totalAmount[language]}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(totalAmountInDialog)}</TableCell>
                        <TableCell/>
                    </TableRow>
                     <TableRow>
                        <TableCell colSpan={3} className="text-right font-bold">{t.advancePayment[language]}</TableCell>
                        <TableCell className="text-right font-bold text-green-600">{formatCurrency(Number(advancePayment) || 0)}</TableCell>
                        <TableCell/>
                    </TableRow>
                     <TableRow>
                        <TableCell colSpan={3} className="text-right font-bold text-lg">{t.dueAmount[language]}</TableCell>
                        <TableCell className="text-right font-bold text-lg text-destructive">{formatCurrency(dueAmountInDialog)}</TableCell>
                        <TableCell/>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="pt-4 border-t">
            <DialogClose asChild><Button variant="secondary">{t.cancel[language]}</Button></DialogClose>
            <Button onClick={handleSave}>{t.save[language]}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reception Dialog */}
      <Dialog open={isReceiveDialogOpen} onOpenChange={(open) => { if (!open) setPaymentToReceive(null); setIsReceiveDialogOpen(open); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t.receptionTitle[language]}</DialogTitle>
            <DialogDescription>{t.receptionDescription[language]}</DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto pr-6 -mr-6 space-y-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>{t.product[language]}</CardTitle>
                 <Dialog modal={false} open={isExtraItemDialogOpen} onOpenChange={(open) => {if(!open) resetExtraItemDialog(); setIsExtraItemDialogOpen(open);}}>
                    <DialogTrigger asChild>
                       <Button variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4"/>{t.addExtraProduct[language]}</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>{t.addExtraProduct[language]}</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                           <div className="grid gap-2">
                                <Label>{t.product[language]}</Label>
                                <Select value={extraItemProduct} onValueChange={(val) => {
                                    const p = products.find(prod => String(prod.id) === val);
                                    setExtraItemProduct(val);
                                    if(p) {
                                      setExtraItemUnit(p.quantityUnit);
                                      setExtraItemPrice(p.purchasePrice);
                                    }
                                }}>
                                    <SelectTrigger><SelectValue placeholder={t.product[language]}/></SelectTrigger>
                                    <SelectContent>
                                        {productsForExtraItemDialog.length > 0 ? productsForExtraItemDialog.map(p => (
                                            <SelectItem key={p.id} value={String(p.id)}>
                                               <div className="flex justify-between w-full items-center">
                                                    <span>{p.name}</span>
                                                    <span className="ml-4 text-xs font-medium text-muted-foreground">
                                                        {formatProductQuantity(p)}
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        )) : (
                                            <div className="p-4 text-center text-sm text-muted-foreground">
                                                {language === 'bn' ? 'এই কোম্পানির আর কোনো পণ্য যোগ করার জন্য নেই' : 'No other products to add for this company'}
                                            </div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2"><Label>{t.quantity[language]}</Label><Input type="number" value={extraItemQuantity} onChange={e => setExtraItemQuantity(e.target.value)}/></div>
                                <div className="grid gap-2">
                                  <Label>{t.unit[language]}</Label>
                                  <Select value={extraItemUnit} onValueChange={setExtraItemUnit} disabled={!extraItemProduct}>
                                    <SelectTrigger><SelectValue placeholder={t.selectUnit[language]}/></SelectTrigger>
                                    <SelectContent>
                                        {availableUnitsForExtraItem.map(unit => (
                                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                            </div>
                            <div className="grid gap-2"><Label>{t.pricePerUnit[language]}</Label><Input type="number" value={extraItemPrice} onChange={e => setExtraItemPrice(e.target.value)}/></div>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild><Button variant="secondary">{t.cancel[language]}</Button></DialogClose>
                          <Button onClick={handleAddExtraItem}>{t.addProduct[language]}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.product[language]}</TableHead>
                      <TableHead className="text-center">{t.orderedQty[language]}</TableHead>
                      <TableHead className="text-center">{t.receivedQty[language]}</TableHead>
                      <TableHead className="text-right">{t.pricePerUnit[language]}</TableHead>
                      <TableHead className="text-right">{t.totalPrice[language]}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receptionItems.map(item => {
                      const orderedItem = paymentToReceive?.items.find(i => i.productId === item.productId);
                      return (
                        <TableRow key={item.id}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell className="text-center">{orderedItem ? `${orderedItem.quantity} ${item.unit}` : '-'}</TableCell>
                          <TableCell className="w-28">
                            <Input 
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleReceptionItemQuantityChange(item.id, e.target.value)}
                              className="text-center"
                            />
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(item.pricePerUnit)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {receptionDiscrepancies.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-600">
                            <AlertCircle className="h-5 w-5"/>
                            {t.receptionDiscrepancies[language]}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t.product[language]}</TableHead>
                                    <TableHead className="text-center">{t.orderedQty[language]}</TableHead>
                                    <TableHead className="text-center">{t.receivedQty[language]}</TableHead>
                                    <TableHead className="text-right">{t.difference[language]}</TableHead>
                                    <TableHead className="text-right">{t.pricePerUnit[language]}</TableHead>
                                    <TableHead className="text-right">{t.totalPrice[language]}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {receptionDiscrepancies.map(disc => (
                                    <TableRow key={disc.productName}>
                                        <TableCell>{disc.productName}</TableCell>
                                        <TableCell className="text-center">{disc.orderedQuantity} {disc.unit}</TableCell>
                                        <TableCell className="text-center">{disc.receivedQuantity} {disc.unit}</TableCell>
                                        <TableCell className={`text-right font-medium ${disc.difference > 0 ? 'text-green-600' : 'text-destructive'}`}>
                                            {disc.difference > 0 ? '+' : ''}{disc.difference} {disc.unit}
                                        </TableCell>
                                        <TableCell className="text-right">{formatCurrency(disc.pricePerUnit)}</TableCell>
                                        <TableCell className={`text-right font-medium ${disc.totalPriceDifference > 0 ? 'text-green-600' : 'text-destructive'}`}>
                                            {disc.totalPriceDifference > 0 ? '+' : ''}{formatCurrency(disc.totalPriceDifference)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            <Card>
              <CardHeader><CardTitle>{t.receptionFinancialSummary[language]}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>{t.receptionTotalOrdered[language]}:</span>
                  <span>{formatCurrency(paymentToReceive?.items.reduce((sum, i) => sum + i.totalPrice, 0) || 0)}</span>
                </div>
                
                {totalDiscrepancyValue !== 0 && (
                    <div className={`flex justify-between text-sm font-medium ${totalDiscrepancyValue > 0 ? 'text-green-600' : 'text-destructive'}`}>
                        <span>{t.receptionDiscrepancyValue[language]}:</span>
                        <span>{totalDiscrepancyValue > 0 ? '+' : ''}{formatCurrency(totalDiscrepancyValue)}</span>
                    </div>
                )}
        
                <Separator className="my-2" />
        
                <div className="flex justify-between font-medium text-sm">
                  <span>{t.receptionTotalReceived[language]}:</span>
                  <span>{formatCurrency(receptionTotalValue)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span>{t.advancePayment[language]}:</span>
                  <span>- {formatCurrency(paymentToReceive?.advancePayment || 0)}</span>
                </div>
                
                <Separator className="my-2" />
                
                <div className="flex justify-between items-center text-lg font-bold p-3 rounded-md bg-muted">
                    <span>{t.receptionFinalBalance[language]}:</span>
                    <span className={`flex items-center gap-1 ${receptionBalance > 0 ? 'text-green-600' : receptionBalance < 0 ? 'text-destructive' : ''}`}>
                      {receptionBalance !== 0 && (receptionBalance > 0 ? <TrendingDown className="h-5 w-5"/> : <TrendingUp className="h-5 w-5"/>)}
                      {formatCurrency(Math.abs(receptionBalance))}
                      <span className="text-xs font-normal ml-1">
                        ({receptionBalance > 0 ? t.supplierOwes[language] : receptionBalance < 0 ? t.youOwe[language] : t.balanced[language]})
                      </span>
                    </span>
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter className="pt-4 border-t">
            <DialogClose asChild><Button variant="secondary">{t.cancel[language]}</Button></DialogClose>
            <Button onClick={handleConfirmReception}>{t.confirmReception[language]}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{language === 'bn' ? 'আপনি কি নিশ্চিত?' : 'Are you sure?'}</AlertDialogTitle>
            <AlertDialogDescription>{t.confirmDeleteDescription[language]}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>{t.cancel[language]}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t.confirm[language]}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
