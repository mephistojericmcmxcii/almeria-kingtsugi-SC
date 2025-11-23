

import type { DocumentReference, Timestamp } from 'firebase/firestore';

export type User = {
  id: string;
  displayName: string;
  email: string;
  role: 'admin' | 'guest';
  profileImageUrl: string;
  address?: string;
  contactNumber?: string;
  lastViewedOrdersAt?: Timestamp;
  lastViewedAllOrdersAt?: Timestamp;
  lastViewedAllRfqsAt?: Timestamp;
};

export type InventoryItem = {
    id: string;
    name: string;
    category: string;
    description?: string;
    createdAt: any; 
    updatedAt: any;
    // Denormalized fields for cost optimization
    variantCount: number;
    totalStock: number;
};

export type Specification = {
    title: string;
    value: string;
}

export type InventoryVariant = {
  id: string;
  // Denormalized fields from parent for query optimization
  parentItemId: string; 
  parentName: string;
  parentCategory: string;
  // Original fields
  variation: string;
  brand: string;
  model?: string;
  source: string;
  quantity: number;
  price: number;
  costPrice: number;
  warningLimit: number;
  description?: string;
  specifications?: string | Specification[];
  imageUrl?: string;
  createdAt: any;
  updatedAt: any;
  // This property is available on documents fetched from a collection group query
  ref?: DocumentReference; 
};

export type CartItem = {
  id: string;
  variantId: string;
  parentItemId: string;
  quantity: number;
  addedAt: any;
  // Denormalized data for easy display in the cart
  parentName?: string;
  brand?: string;
  price?: number;
  imageUrl?: string;
  imageHint?: string;
  stock?: number;
  discount?: number; // Per-item discount as a percentage
};

export type OrderStatus = 'pending-quote' | 'quote-ready' | 'confirmed' | 'delivering' | 'completed' | 'cancelled' | 'declined' | 'rescheduled';

export type StatusHistory = {
  status: OrderStatus;
  timestamp: Timestamp | any; // 'any' for serverTimestamp
};


export type Order = {
  id: string;
  userId: string;
  userDisplayName: string;
  userEmail: string;
  orderDate: Timestamp;
  items: CartItem[];
  totalAmount: number;
  shippingAddress: string;
  shippingContactNumber: string;
  status: OrderStatus;
  paymentMethod: string;
  ref?: DocumentReference; // Available on collection group queries
  updatedAt?: Timestamp;
  cancellationReason?: string;
  quotationFileUrl?: string; // URL to the uploaded quotation file from admin
  customerRevisionUrl?: string; // URL to a revised file uploaded by the customer
  discount: number; // Overall order discount, can be sum of item discounts
  deliveryFee?: number;
  packagingFee?: number;
  notes?: string;
  statusHistory?: StatusHistory[];
};

export type PurchaseOrderStatus = 'Completed' | 'Lacking' | 'Delivered' | 'Cancelled';
export type PoPaymentStatus = 'Paid' | 'Unpaid';

export type PurchaseOrderItem = {
  id: string;
  name: string;
  unit?: string;
  quantity?: number;
  amount: number; // Allocated amount per unit OR total cost for misc
  actualAmount?: number; // Real cost per unit
  miscCost?: number;
  description?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  itemType?: 'general' | 'misc';
}

export type PurchaseOrder = {
  id: string;
  poNumber: string;
  date: Timestamp;
  careOf: string;
  source: string;
  status: PurchaseOrderStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  // Payment fields
  agency?: string;
  paymentDate?: Timestamp;
  taxDeduction?: number;
  amountDeposited?: number;
  bank?: string;
  paymentStatus?: PoPaymentStatus;
  entryType?: 'system' | 'manual';
  depositReceiptUrl?: string;
  // Manual entry fields
  totalAllocation?: number;
  totalExpenses?: number;
  // Delivery confirmation
  salesInvoice?: string;
  deliveryReceipt?: string;
  salesInvoiceUrl?: string;
  deliveryReceiptUrl?: string;
};

export type QuotationRequestItem = {
  name: string;
  quantity: number;
  specs?: string;
};

export type QuotationRequest = {
  id: string;
  userId: string;
  customerName: string;
  contactNumber: string;
  emailAddress: string;
  companyName?: string;
  requestType: 'list' | 'attachment';
  items?: QuotationRequestItem[];
  fileAttachment?: string; // URL to the uploaded file
  additionalDetails?: string;
  createdAt: any;
};

export type CustomerFeedback = {
  userName: string;
  rating: number;
  review?: string;
  createdAt: any;
};
