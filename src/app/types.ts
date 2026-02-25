export interface ProductVariantAttribute {
  name: string;   // e.g. "Color", "Size", "Storage", "Material"
  value: string;  // e.g. "Red", "XL", "128GB", "Leather"
}

export interface ProductVariant {
  id: string;
  name: string;                          // auto-generated, e.g. "Red / XL"
  sku: string;                           // variant-specific SKU
  attributes: ProductVariantAttribute[];
  stock: number;
  wholesalePrice?: number;               // undefined = inherit from parent
  traderPrice?: number;
  retailPrice?: number;
  isActive: boolean;
  imageUrl?: string;
  createdAt: Date;
}

export interface Product {
  id: string;
  sku: string; // Stock Keeping Unit
  name: string;
  category: string;
  price: number;
  wholesalePrice: number;
  traderPrice: number;
  retailPrice: number;
  stock: number;
  image?: string;
  variants?: ProductVariant[];
  hasVariants?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type CustomerType = "wholesaler" | "trader" | "retailer";

export type CreditTransactionType = "add" | "deduct" | "refund" | "payment" | "adjustment";

export interface CreditTransaction {
  id: string;
  customerId: string;
  type: CreditTransactionType;
  amount: number;
  balance: number; // Balance after this transaction
  description: string;
  reference?: string; // Invoice number, receipt number, etc.
  createdBy: string; // Staff member who created the transaction
  createdAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  type: CustomerType;
  phone: string;
  email?: string;
  address?: string;
  creditBalance: number; // Current credit balance
  creditLimit?: number; // Maximum credit allowed
  creditTransactions: CreditTransaction[];
  wishlist?: string[]; // Product IDs
  createdAt: Date;
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "partially_paid" | "cancelled";

export type PaymentTerms = "due_on_receipt" | "net_7" | "net_15" | "net_30" | "net_60" | "custom";

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number; // percentage
  amount: number; // calculated: (quantity * unitPrice * (1 - discount/100)) * (1 + taxRate/100)
  productId?: string; // optional reference to product
}

export interface Payment {
  id: string;
  amount: number;
  date: Date;
  method: string;
  reference?: string;
  notes?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g., "INV-0001"
  customer: Customer;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  totalDiscount: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  paymentTerms: PaymentTerms;
  paymentHistory: Payment[];
  notes?: string;
  termsAndConditions?: string;
  reference?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Sale {
  id: string;
  items: CartItem[];
  total: number;
  paymentMethod: string;
  date: Date;
  customer?: Customer;
  invoiceId?: string;
}

export interface Purchase {
  id: string;
  supplier: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    costPrice: number;
    total: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  date: Date;
  status: "completed" | "pending" | "cancelled";
  notes?: string;
}

export type StaffRole = "admin" | "manager" | "cashier" | "inventory";

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  salary: number;
  joinDate: Date;
  status: "active" | "inactive";
  permissions: {
    canManageProducts: boolean;
    canManagePurchases: boolean;
    canManageStaff: boolean;
    canViewReports: boolean;
    canProcessSales: boolean;
  };
}

export type ReturnReason = 
  | "defective"
  | "wrong_item"
  | "not_as_described"
  | "customer_request"
  | "damaged"
  | "expired"
  | "other";

export type ReturnStatus = "pending" | "approved" | "rejected" | "completed" | "cancelled";

export interface ReturnLineItem {
  id: string;
  invoiceLineItemId: string;
  productId: string;
  productName: string;
  productSku: string;
  quantityReturned: number;
  quantityInvoiced: number;
  unitPrice: number;
  totalRefund: number;
  reason: ReturnReason;
  condition?: string; // "unopened" | "opened" | "damaged"
}

export interface ReturnNote {
  id: string;
  returnNumber: string; // e.g., "RN-0001"
  invoiceId: string;
  invoiceNumber: string;
  customer: Customer;
  lineItems: ReturnLineItem[];
  subtotalRefund: number;
  taxRefund: number;
  totalRefund: number;
  restockingFee: number;
  netRefund: number;
  status: ReturnStatus;
  reason: ReturnReason;
  notes?: string;
  createdBy?: string;
  approvedBy?: string;
  processedDate?: Date;
  refundMethod?: string; // "cash" | "card" | "store_credit" | "original_payment"
  restockItems: boolean; // Whether to add items back to inventory
  createdAt: Date;
  updatedAt: Date;
}

// ─── Damaged Products Database ────────────────────────────────────────────────
export type DamagedCondition = "damaged" | "scrap";
export type DamagedDisposition =
  | "pending"
  | "repair"
  | "write_off"
  | "sell_as_is"
  | "disposed";

export interface DamagedProduct {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  category: string;
  quantity: number;
  condition: DamagedCondition;
  sourceReturnId: string;
  sourceReturnNumber: string;
  customerName: string;
  returnReason: string;
  unitValue: number;       // original unit sale price
  totalValue: number;      // unitValue × quantity
  disposition: DamagedDisposition;
  dispositionNotes?: string;
  damagedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

// ─── Customer Portal Orders ───────────────────────────────────────────────────
export type CustomerOrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface CustomerOrderItem {
  productId: string;
  productName: string;
  productSku: string;
  category: string;
  quantity: number;
  unitPrice: number;         // price at customer's tier
  retailPrice: number;       // for showing savings
  total: number;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;       // e.g. "ORD-0001"
  customerId: string;
  customerName: string;
  customerType: CustomerType;
  items: CustomerOrderItem[];
  subtotal: number;
  totalSavings: number;      // vs retail price
  total: number;
  status: CustomerOrderStatus;
  notes?: string;
  deliveryAddress: string;
  paymentMethod: string;
  createdAt: Date;
  updatedAt: Date;

  // ── Tracking & Dispatch ────────────────────────────────────────────────────
  trackingNumber?: string;
  trackingCarrier?: string;       // e.g. "DHL", "Royal Mail", "DPD", "UPS", "FedEx"
  trackingUrl?: string;
  estimatedDelivery?: Date;
  dispatchedAt?: Date;
  dispatchNotes?: string;
  packedBy?: string;              // staff member who packed
  labelPrinted?: boolean;
  weight?: number;                // kg
  dimensions?: string;           // e.g. "30×20×15 cm"
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  isDefault: boolean;
  
  // Company Information
  companyName: string;
  companyLogoUrl?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  companyTaxId?: string;
  
  // Styling
  primaryColor: string; // hex color
  secondaryColor: string; // hex color
  fontFamily: string;
  
  // Layout Options
  showLogo: boolean;
  showCompanyDetails: boolean;
  showTaxColumn: boolean;
  showDiscountColumn: boolean;
  showProductSku: boolean;
  
  // Content
  headerText?: string;
  footerText?: string;
  defaultTermsAndConditions: string;
  defaultNotes?: string;
  
  // Number Formatting
  currencySymbol: string;
  currencyPosition: "before" | "after"; // £100 or 100£
  decimalPlaces: number;
  
  // Invoice Numbering
  invoicePrefix: string; // e.g., "INV"
  invoiceNumberLength: number; // e.g., 4 for "0001"
  
  createdAt: Date;
  updatedAt: Date;
}

// Website Management Types

export interface WebsiteBanner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  buttonText?: string;
  buttonLink?: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
}

export interface WebsitePage {
  id: string;
  slug: string; // URL slug (e.g., "about-us", "contact")
  title: string;
  content: string; // HTML content
  metaTitle?: string;
  metaDescription?: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebsiteSettings {
  id: string;
  
  // Store Information
  storeName: string;
  storeTagline?: string;
  storeDescription?: string;
  logoUrl?: string;
  faviconUrl?: string;
  
  // Contact Information
  email: string;
  phone: string;
  address?: string;
  
  // Social Media
  facebookUrl?: string;
  twitterUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  youtubeUrl?: string;
  
  // SEO Settings
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  
  // Theme Settings
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  
  // Features
  enableOnlineOrdering: boolean;
  enableProductReviews: boolean;
  enableWishlist: boolean;
  enableLiveChat: boolean;
  
  // Shipping & Payment
  freeShippingThreshold?: number;
  shippingFee?: number;
  taxRate: number;
  
  // Business Hours
  businessHours?: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
  
  updatedAt: Date;
}

export interface ProductWebsiteSettings {
  productId: string;
  isVisibleOnWebsite: boolean;
  isFeatured: boolean;
  websiteDescription?: string;
  websiteImages?: string[];
  seoTitle?: string;
  seoDescription?: string;
  updatedAt: Date;
}

export interface WebsiteAnalytics {
  totalVisitors: number;
  todayVisitors: number;
  onlineOrders: number;
  conversionRate: number;
  popularProducts: { productId: string; views: number; orders: number }[];
  trafficSources: { source: string; percentage: number }[];
}