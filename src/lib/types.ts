
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
  description?: string;
  createdAt: any;
  updatedAt: any;
};
