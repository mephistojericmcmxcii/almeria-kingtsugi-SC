
import type { DocumentReference } from 'firebase/firestore';

export type User = {
  id: string;
  displayName: string;
  email: string;
  role: 'admin' | 'guest';
  profileImageUrl: string;
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

    
