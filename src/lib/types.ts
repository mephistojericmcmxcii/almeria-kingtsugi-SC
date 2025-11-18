
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
};

export type InventoryItem = {
    id: string;
    name: string;
    category: string;
    description?: string;
    createdAt: any; 
    updatedAt: any;
};

export type InventoryVariant = {
  id: string;
  brand: string;
  source: string;
  quantity: number;
  price: number;
  costPrice: number;
  warningLimit: number;
  description?: string;
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

export type OrderStatus = 'pending-quote' | 'quote-ready' | 'confirmed' | 'delivering' | 'completed' | 'cancelled' | 'declined';

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
  discount: number; // Overall order discount, can be sum of item discounts
  deliveryFee?: number;
  packagingFee?: number;
  notes?: string;
  statusHistory?: StatusHistory[];
};

export type PurchaseOrderStatus = 'Approved' | 'Completed' | 'Cancelled';

export type PurchaseOrderItem = {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  unit: string;
  quantity: number;
  amount: number; // Allocated amount per unit
  actualAmount?: number; // Real cost per unit
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
};

    
