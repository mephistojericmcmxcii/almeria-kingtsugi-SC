
import type { DocumentReference, Timestamp } from 'firebase/firestore';

export type User = {
  id: string;
  displayName: string;
  email: string;
  role: 'admin' | 'guest';
  profileImageUrl: string;
  address?: string;
  lastViewedOrdersAt?: Timestamp;
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
  warningLimit: number;
  description?: string;
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
};

export type OrderStatus = 'pending' | 'confirmed' | 'delivering' | 'completed' | 'cancelled';

export type Order = {
  id: string;
  userId: string;
  userDisplayName: string;
  userEmail: string;
  orderDate: Timestamp;
  items: CartItem[];
  totalAmount: number;
  shippingAddress: string;
  status: OrderStatus;
  paymentMethod: string;
  ref?: DocumentReference; // Available on collection group queries
  updatedAt?: Timestamp;
};

    