
'use client';

import type { InventoryVariant } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tag, Package, FileQuestion } from 'lucide-react';
import { Button } from '../ui/button';
import { ShoppingCart } from 'lucide-react';


type CombinedVariant = InventoryVariant & {
    parentName: string;
    parentCategory: string;
    parentItemId: string;
};

interface ViewProductModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  variant: CombinedVariant | null;
  onAddToCart: (variant: CombinedVariant) => void;
}

export function ViewProductModal({ isOpen, onOpenChange, variant, onAddToCart }: ViewProductModalProps) {
  
  if (!variant) return null;

  const handleAddToCartClick = () => {
    onAddToCart(variant);
  }

  const getPlaceholderImage = (item: CombinedVariant) => {
      if (item.imageUrl) {
          return { imageUrl: item.imageUrl, description: item.parentName, imageHint: 'product' };
      }
      const categoryId = item.parentCategory.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-category';
      const categoryImage = PlaceHolderImages.find(p => p.id === categoryId);
      if (categoryImage) {
          return categoryImage;
      }
      const itemImage = PlaceHolderImages.find(p => p.id === item.parentItemId);
      if (itemImage) {
        return itemImage;
      }
      return PlaceHolderImages.find(p => p.id === 'product-fallback')!;
  };

  const placeholder = getPlaceholderImage(variant);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };

  const getStatusBadge = (variant: CombinedVariant) => {
    if (variant.quantity <= 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    if (variant.quantity <= variant.warningLimit) {
      return <Badge variant="secondary" className="bg-orange-500 text-orange-50 hover:bg-orange-600">Low Stock</Badge>;
    }
    return <Badge className="bg-green-600 text-green-50 hover:bg-green-700 border-green-700">In Stock</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl" showCloseButton={false}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="aspect-square relative">
                <img
                    src={placeholder.imageUrl}
                    alt={placeholder.description}
                    className="object-cover rounded-lg w-full h-full"
                    data-ai-hint={placeholder.imageHint}
                />
            </div>
            <div className="flex flex-col space-y-4">
                <DialogHeader>
                    <div className='flex items-center justify-between'>
                        <Badge variant="secondary">{variant.parentCategory}</Badge>
                        {getStatusBadge(variant)}
                    </div>
                    <DialogTitle className="font-headline text-3xl text-primary">{variant.parentName}</DialogTitle>
                    <DialogDescription className="text-xl font-semibold">{variant.brand}</DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 text-sm">
                    <p className="text-muted-foreground">{variant.description || 'A unique variant from our collection.'}</p>
                    <div className="flex items-center justify-between text-base pt-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Tag className="w-5 h-5" />
                            <span className="font-bold text-2xl text-foreground">Price on Request</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                             <Package className="w-5 h-5" />
                            <span className="font-bold text-2xl text-foreground">{variant.quantity} left</span>
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex flex-col gap-2">
                    <Button size="lg" disabled={variant.quantity <= 0} onClick={handleAddToCartClick}>
                        <FileQuestion className="mr-2" /> Add to Quotation
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
