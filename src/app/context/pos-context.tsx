import { createContext, useContext, useState, ReactNode } from "react";
import { Product, CartItem, Sale, Customer, Invoice, CustomerType, Purchase, Staff, InvoiceStatus, Payment, ReturnNote, InvoiceLineItem, InvoiceTemplate, CreditTransaction, CreditTransactionType, DamagedProduct, CustomerOrder } from "@/app/types";
import { products as initialProducts } from "@/app/data/products";
import { initialCustomers } from "@/app/data/customers";
import { initialInvoices } from "@/app/data/invoices";
import { initialPurchases } from "@/app/data/purchases";
import { initialStaff } from "@/app/data/staff";
import { initialReturns } from "@/app/data/returns";

interface POSContextType {
  products: Product[];
  cart: CartItem[];
  sales: Sale[];
  customers: Customer[];
  invoices: Invoice[];
  purchases: Purchase[];
  staff: Staff[];
  returnNotes: ReturnNote[];
  damagedProducts: DamagedProduct[];
  customerOrders: CustomerOrder[];
  invoiceTemplates: InvoiceTemplate[];
  selectedCustomer: Customer | null;
  categories: string[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  completeSale: (paymentMethod: string) => void;
  updateProductStock: (productId: string, newStock: number) => void;
  addProduct: (product: Omit<Product, "id">) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addCategory: (category: string) => void;
  deleteCategory: (category: string) => void;
  addCustomer: (customer: Omit<Customer, "id" | "createdAt">) => void;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  setSelectedCustomer: (customer: Customer | null) => void;
  getProductPrice: (product: Product) => number;
  updateInvoiceStatus: (invoiceId: string, status: "paid" | "pending" | "cancelled") => void;
  getCustomerLedger: (customerId: string) => Invoice[];
  addPurchase: (purchase: Omit<Purchase, "id">) => void;
  updatePurchase: (id: string, purchase: Partial<Purchase>) => void;
  deletePurchase: (id: string) => void;
  addStaff: (staff: Omit<Staff, "id">) => void;
  updateStaff: (id: string, staff: Partial<Staff>) => void;
  deleteStaff: (id: string) => void;
  createInvoice: (invoice: Omit<Invoice, "id">) => void;
  updateInvoice: (id: string, invoice: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  recordPayment: (invoiceId: string, payment: Payment) => void;
  createReturnNote: (returnNote: Omit<ReturnNote, "id">) => void;
  updateReturnNote: (id: string, returnNote: Partial<ReturnNote>) => void;
  deleteReturnNote: (id: string) => void;
  addDamagedProduct: (item: Omit<DamagedProduct, "id">) => void;
  updateDamagedProduct: (id: string, item: Partial<DamagedProduct>) => void;
  deleteDamagedProduct: (id: string) => void;
  addCustomerOrder: (order: Omit<CustomerOrder, "id">) => void;
  updateCustomerOrder: (id: string, order: Partial<CustomerOrder>) => void;
  createInvoiceTemplate: (template: Omit<InvoiceTemplate, "id" | "createdAt" | "updatedAt">) => void;
  updateInvoiceTemplate: (id: string, template: Partial<InvoiceTemplate>) => void;
  deleteInvoiceTemplate: (id: string) => void;
  getDefaultTemplate: () => InvoiceTemplate | undefined;
  setDefaultTemplate: (templateId: string) => void;
  addCreditTransaction: (transaction: CreditTransaction) => void;
  updateCreditTransaction: (id: string, transaction: Partial<CreditTransaction>) => void;
  deleteCreditTransaction: (id: string) => void;
  getCreditTransactions: (customerId: string) => CreditTransaction[];
  // Staff ↔ Customer assignments (customerId → staffId)
  staffAssignments: Record<string, string>;
  setStaffAssignment: (customerId: string, staffId: string | null) => void;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export function POSProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases);
  const [staff, setStaff] = useState<Staff[]>(initialStaff);
  const [returnNotes, setReturnNotes] = useState<ReturnNote[]>(initialReturns);
  const [damagedProducts, setDamagedProducts] = useState<DamagedProduct[]>([]);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [invoiceTemplates, setInvoiceTemplates] = useState<InvoiceTemplate[]>([
    {
      id: "default-template",
      name: "Default Template",
      isDefault: true,
      companyName: "BNM parts",
      companyLogoUrl: "",
      companyAddress: "123 High Street, London, UK",
      companyPhone: "+44 20 1234 5678",
      companyEmail: "info@bnmparts.com",
      companyWebsite: "www.bnmparts.com",
      companyTaxId: "GB123456789",
      primaryColor: "#2563eb",
      secondaryColor: "#64748b",
      fontFamily: "Arial",
      showLogo: true,
      showCompanyDetails: true,
      showTaxColumn: true,
      showDiscountColumn: true,
      showProductSku: true,
      headerText: "",
      footerText: "Thank you for your business!",
      defaultTermsAndConditions: "Payment is due within specified period. Late payments may incur additional charges.",
      defaultNotes: "",
      currencySymbol: "£",
      currencyPosition: "before",
      decimalPlaces: 2,
      invoicePrefix: "INV",
      invoiceNumberLength: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);

  // Default assignments seeded from initial data: customerId → staffId
  const [staffAssignments, setStaffAssignments] = useState<Record<string, string>>(() => ({
    "1": "1",  "4": "1",  "6": "1",  "2": "1",   // David Anderson   (manager)
    "5": "2",  "9": "2",  "10": "2", "3": "2",   // Emily Roberts    (cashier)
    "7": "3",  "8": "3",  "11": "3", "12": "3",  // Marcus Thompson  (inventory)
    "13": "4", "14": "4", "15": "4",              // Sophie Williams  (cashier)
    "16": "5", "17": "5", "18": "5",              // James Patterson  (cashier)
  }));

  const getProductPrice = (product: Product): number => {
    if (!selectedCustomer) return product.retailPrice;
    
    switch (selectedCustomer.type) {
      case "wholesaler":
        return product.wholesalePrice;
      case "trader":
        return product.traderPrice;
      case "retailer":
        return product.retailPrice;
      default:
        return product.retailPrice;
    }
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity < product.stock) {
          return prev.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        return prev;
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.min(quantity, item.product.stock) }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const completeSale = (paymentMethod: string) => {
    const subtotal = cart.reduce(
      (sum, item) => sum + getProductPrice(item.product) * item.quantity,
      0
    );
    const tax = subtotal * 0.20; // 20% VAT
    const total = subtotal + tax;

    const invoiceId = `INV-${Date.now()}`;
    const saleId = `SALE-${Date.now()}`;

    // Create invoice if customer is selected
    if (selectedCustomer) {
      const lineItems: InvoiceLineItem[] = cart.map(item => ({
        id: `item-${Date.now()}-${Math.random()}`,
        description: item.product.name,
        quantity: item.quantity,
        unitPrice: getProductPrice(item.product),
        taxRate: 20,
        discount: 0,
        amount: getProductPrice(item.product) * item.quantity * 1.2,
        productId: item.product.id,
      }));

      const invoice: Omit<Invoice, "id"> = {
        invoiceNumber: invoiceId,
        customer: selectedCustomer,
        lineItems,
        subtotal,
        totalDiscount: 0,
        taxAmount: tax,
        total,
        amountPaid: total,
        amountDue: 0,
        status: "paid",
        issueDate: new Date(),
        dueDate: new Date(),
        paymentTerms: "due_on_receipt",
        paymentHistory: [{
          id: `pay-${Date.now()}`,
          amount: total,
          date: new Date(),
          method: paymentMethod,
          reference: invoiceId,
        }],
        notes: "",
        termsAndConditions: "Payment is due on receipt.",
        reference: invoiceId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      createInvoice(invoice);
    }

    // Create sale record
    const sale: Sale = {
      id: saleId,
      items: [...cart],
      total,
      paymentMethod,
      date: new Date(),
      customer: selectedCustomer || undefined,
      invoiceId: selectedCustomer ? invoiceId : undefined,
    };

    // Update product stock
    setProducts((prev) =>
      prev.map((product) => {
        const cartItem = cart.find((item) => item.product.id === product.id);
        if (cartItem) {
          return { ...product, stock: product.stock - cartItem.quantity };
        }
        return product;
      })
    );

    setSales((prev) => [sale, ...prev]);
    clearCart();
    setSelectedCustomer(null);
  };

  const updateProductStock = (productId: string, newStock: number) => {
    setProducts((prev) =>
      prev.map((product) =>
        product.id === productId ? { ...product, stock: newStock } : product
      )
    );
  };

  const addProduct = (productData: Omit<Product, "id">) => {
    const newProduct: Product = {
      ...productData,
      id: `PROD-${Date.now()}`,
    };
    setProducts((prev) => [newProduct, ...prev]);
  };

  const updateProduct = (id: string, productData: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((product) =>
        product.id === id ? { ...product, ...productData } : product
      )
    );
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((product) => product.id !== id));
  };

  const addCategory = (category: string) => {
    setCategories((prev) => [...prev, category]);
  };

  const deleteCategory = (category: string) => {
    setCategories((prev) => prev.filter((cat) => cat !== category));
  };

  const addCustomer = (customerData: Omit<Customer, "id" | "createdAt">) => {
    const newCustomer: Customer = {
      ...customerData,
      id: `CUST-${Date.now()}`,
      createdAt: new Date(),
    };
    setCustomers((prev) => [newCustomer, ...prev]);
  };

  const updateCustomer = (id: string, customerData: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((customer) =>
        customer.id === id ? { ...customer, ...customerData } : customer
      )
    );
  };

  const deleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((customer) => customer.id !== id));
  };

  const updateInvoiceStatus = (
    invoiceId: string,
    status: "paid" | "pending" | "cancelled"
  ) => {
    setInvoices((prev) =>
      prev.map((invoice) =>
        invoice.id === invoiceId ? { ...invoice, status } : invoice
      )
    );
  };

  const getCustomerLedger = (customerId: string) => {
    return invoices.filter((invoice) => invoice.customer?.id === customerId);
  };

  const addPurchase = (purchaseData: Omit<Purchase, "id">) => {
    const newPurchase: Purchase = {
      ...purchaseData,
      id: `PUR-${Date.now()}`,
    };
    setPurchases((prev) => [newPurchase, ...prev]);
  };

  const updatePurchase = (id: string, purchaseData: Partial<Purchase>) => {
    setPurchases((prev) =>
      prev.map((purchase) =>
        purchase.id === id ? { ...purchase, ...purchaseData } : purchase
      )
    );
  };

  const deletePurchase = (id: string) => {
    setPurchases((prev) => prev.filter((purchase) => purchase.id !== id));
  };

  const addStaff = (staffData: Omit<Staff, "id">) => {
    const newStaff: Staff = {
      ...staffData,
      id: `STAFF-${Date.now()}`,
    };
    setStaff((prev) => [newStaff, ...prev]);
  };

  const updateStaff = (id: string, staffData: Partial<Staff>) => {
    setStaff((prev) =>
      prev.map((staff) =>
        staff.id === id ? { ...staff, ...staffData } : staff
      )
    );
  };

  const deleteStaff = (id: string) => {
    setStaff((prev) => prev.filter((staff) => staff.id !== id));
  };

  const createInvoice = (invoiceData: Omit<Invoice, "id">) => {
    const newInvoice: Invoice = {
      ...invoiceData,
      id: `INV-${Date.now()}`,
    };
    setInvoices((prev) => [newInvoice, ...prev]);
  };

  const updateInvoice = (id: string, invoiceData: Partial<Invoice>) => {
    setInvoices((prev) =>
      prev.map((invoice) =>
        invoice.id === id ? { ...invoice, ...invoiceData } : invoice
      )
    );
  };

  const deleteInvoice = (id: string) => {
    setInvoices((prev) => prev.filter((invoice) => invoice.id !== id));
  };

  const recordPayment = (invoiceId: string, payment: Payment) => {
    setInvoices((prev) =>
      prev.map((invoice) => {
        if (invoice.id === invoiceId) {
          const newPaymentHistory = [...(invoice.paymentHistory || []), payment];
          const newAmountPaid = (invoice.amountPaid || 0) + payment.amount;
          const newAmountDue = invoice.total - newAmountPaid;
          const newStatus: InvoiceStatus = 
            newAmountDue <= 0 ? "paid" : 
            newAmountPaid > 0 ? "partially_paid" : 
            invoice.status;

          return {
            ...invoice,
            paymentHistory: newPaymentHistory,
            amountPaid: newAmountPaid,
            amountDue: newAmountDue,
            status: newStatus,
            updatedAt: new Date(),
          };
        }
        return invoice;
      })
    );
  };

  const createReturnNote = (returnNoteData: Omit<ReturnNote, "id">) => {
    const newReturnNote: ReturnNote = {
      ...returnNoteData,
      id: `RET-${Date.now()}`,
    };
    setReturnNotes((prev) => [newReturnNote, ...prev]);
  };

  const updateReturnNote = (id: string, returnNoteData: Partial<ReturnNote>) => {
    setReturnNotes((prev) =>
      prev.map((returnNote) =>
        returnNote.id === id ? { ...returnNote, ...returnNoteData } : returnNote
      )
    );
  };

  const deleteReturnNote = (id: string) => {
    setReturnNotes((prev) => prev.filter((returnNote) => returnNote.id !== id));
  };

  const addDamagedProduct = (item: Omit<DamagedProduct, "id">) => {
    const newDamagedProduct: DamagedProduct = {
      ...item,
      id: `DAM-${Date.now()}`,
    };
    setDamagedProducts((prev) => [newDamagedProduct, ...prev]);
  };

  const updateDamagedProduct = (id: string, item: Partial<DamagedProduct>) => {
    setDamagedProducts((prev) =>
      prev.map((dp) =>
        dp.id === id ? { ...dp, ...item } : dp
      )
    );
  };

  const deleteDamagedProduct = (id: string) => {
    setDamagedProducts((prev) => prev.filter((dp) => dp.id !== id));
  };

  const addCustomerOrder = (order: Omit<CustomerOrder, "id">) => {
    const newOrder: CustomerOrder = { ...order, id: `ORD-${Date.now()}` };
    setCustomerOrders((prev) => [newOrder, ...prev]);
  };

  const updateCustomerOrder = (id: string, order: Partial<CustomerOrder>) => {
    setCustomerOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...order, updatedAt: new Date() } : o))
    );
  };

  const createInvoiceTemplate = (templateData: Omit<InvoiceTemplate, "id" | "createdAt" | "updatedAt">) => {
    const newTemplate: InvoiceTemplate = {
      ...templateData,
      id: `TEMPLATE-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setInvoiceTemplates((prev) => [newTemplate, ...prev]);
  };

  const updateInvoiceTemplate = (id: string, templateData: Partial<InvoiceTemplate>) => {
    setInvoiceTemplates((prev) =>
      prev.map((template) =>
        template.id === id ? { ...template, ...templateData, updatedAt: new Date() } : template
      )
    );
  };

  const deleteInvoiceTemplate = (id: string) => {
    setInvoiceTemplates((prev) => prev.filter((template) => template.id !== id));
  };

  const getDefaultTemplate = () => {
    return invoiceTemplates.find(template => template.isDefault);
  };

  const setDefaultTemplate = (templateId: string) => {
    setInvoiceTemplates((prev) =>
      prev.map((template) =>
        template.id === templateId ? { ...template, isDefault: true } : { ...template, isDefault: false }
      )
    );
  };

  const addCreditTransaction = (transaction: CreditTransaction) => {
    setCreditTransactions((prev) => [transaction, ...prev]);
  };

  const updateCreditTransaction = (id: string, transaction: Partial<CreditTransaction>) => {
    setCreditTransactions((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, ...transaction } : t
      )
    );
  };

  const deleteCreditTransaction = (id: string) => {
    setCreditTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const getCreditTransactions = (customerId: string) => {
    return creditTransactions.filter((t) => t.customerId === customerId);
  };

  const setStaffAssignment = (customerId: string, staffId: string | null) => {
    setStaffAssignments((prev) => {
      const next = { ...prev };
      if (staffId) next[customerId] = staffId;
      else delete next[customerId];
      return next;
    });
  };

  return (
    <POSContext.Provider
      value={{
        products,
        cart,
        sales,
        customers,
        invoices,
        purchases,
        staff,
        returnNotes,
        damagedProducts,
        customerOrders,
        invoiceTemplates,
        selectedCustomer,
        categories,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        completeSale,
        updateProductStock,
        addProduct,
        updateProduct,
        deleteProduct,
        addCategory,
        deleteCategory,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        setSelectedCustomer,
        getProductPrice,
        updateInvoiceStatus,
        getCustomerLedger,
        addPurchase,
        updatePurchase,
        deletePurchase,
        addStaff,
        updateStaff,
        deleteStaff,
        createInvoice,
        updateInvoice,
        deleteInvoice,
        recordPayment,
        createReturnNote,
        updateReturnNote,
        deleteReturnNote,
        addDamagedProduct,
        updateDamagedProduct,
        deleteDamagedProduct,
        addCustomerOrder,
        updateCustomerOrder,
        createInvoiceTemplate,
        updateInvoiceTemplate,
        deleteInvoiceTemplate,
        getDefaultTemplate,
        setDefaultTemplate,
        addCreditTransaction,
        updateCreditTransaction,
        deleteCreditTransaction,
        getCreditTransactions,
        staffAssignments,
        setStaffAssignment,
      }}
    >
      {children}
    </POSContext.Provider>
  );
}

export function usePOS() {
  const context = useContext(POSContext);
  if (context === undefined) {
    throw new Error("usePOS must be used within a POSProvider");
  }
  return context;
}