
'use client';

import type { InventoryVariant, Specification } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tag, Package, FileQuestion, Info, ListTree } from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';

interface ViewProductModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  variant: InventoryVariant | null;
  onAddToCart: (variant: InventoryVariant) => void;
}

export function ViewProductModal({ isOpen, onOpenChange, variant, onAddToCart }: ViewProductModalProps) {
  const { user } = useAuth();
  const router = useRouter();
  
  if (!variant) return null;

  const handleAddToCartClick = () => {
    if (!user) {
      router.push('/login');
    } else {
      onAddToCart(variant);
    }
  }

  const getPlaceholderImage = (item: InventoryVariant) => {
      if (item.imageUrl) {
          return { imageUrl: item.imageUrl, description: item.parentName, imageHint: 'product' };
      }
      if (item.parentCategory) {
        const categoryId = item.parentCategory.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-category';
        const categoryImage = PlaceHolderImages.find(p => p.id === categoryId);
        if (categoryImage) {
            return categoryImage;
        }
      }
      const itemImage = PlaceHolderImages.find(p => p.id === item.parentItemId);
      if (itemImage) {
        return itemImage;
      }
      return PlaceHolderImages.find(p => p.id === 'product-fallback')!;
  };

  const placeholder = getPlaceholderImage(variant);

  const getStatusBadge = (variant: InventoryVariant) => {
    if (variant.quantity <= 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    if (variant.quantity <= variant.warningLimit) {
      return <Badge variant="secondary" className="bg-orange-500 text-orange-50 hover:bg-orange-600">Low Stock</Badge>;
    }
    return <Badge className="bg-green-600 text-green-50 hover:bg-green-700 border-green-700">In Stock</Badge>;
  };
  
  const renderSpecifications = () => {
    if (!variant.specifications || (Array.isArray(variant.specifications) && variant.specifications.length === 0)) return null;

    let specsContent;

    if (typeof variant.specifications === 'string' && variant.specifications) {
        specsContent = <p className="text-sm text-muted-foreground whitespace-pre-wrap">{variant.specifications}</p>;
    } else if (Array.isArray(variant.specifications)) {
        specsContent = (
            <table className="w-full text-sm">
                <tbody>
                    {variant.specifications.map((spec: Specification, index: number) => (
                        <tr key={index} className="border-b last:border-b-0">
                            <td className="py-2 pr-2 font-medium text-muted-foreground w-1/3">{spec.title}</td>
                            <td className="py-2 pr-2">{spec.value}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }

    return (
        <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2 text-muted-foreground"><ListTree className="w-4 h-4" /> Specifications</h4>
            {specsContent}
        </div>
    );
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0" showCloseButton={true}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 overflow-hidden">
            <div className="aspect-square relative m-6 mr-0">
                <img
                    src={placeholder.imageUrl}
                    alt={placeholder.description || 'Product Image'}
                    className="object-cover rounded-lg w-full h-full"
                    data-ai-hint={placeholder.imageHint}
                />
            </div>
            <div className="flex flex-col overflow-y-auto">
               <ScrollArea className="flex-grow">
                 <div className="space-y-6 pr-6 py-6">
                    <DialogHeader className="space-y-2">
                        <div className='flex items-center justify-between'>
                            <Badge variant="secondary">{variant.parentCategory || 'Uncategorized'}</Badge>
                            {getStatusBadge(variant)}
                        </div>
                        <DialogTitle className="font-headline text-3xl text-primary">{variant.parentName}</DialogTitle>
                        <DialogDescription className="text-xl font-semibold">{variant.brand}{variant.model && ` - ${variant.model}`}</DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 text-sm flex-grow">
                       {variant.description && (
                           <div className="space-y-2">
                                <h4 className="font-semibold flex items-center gap-2 text-muted-foreground"><Info className="w-4 h-4"/>Description</h4>
                                <p className="text-sm text-muted-foreground">{variant.description}</p>
                           </div>
                       )}
                       {renderSpecifications()}
                    </div>
                </div>
               </ScrollArea>
                
                 <div className="px-6 pb-6 mt-auto border-t pt-6 space-y-4">
                     <div className="flex items-center justify-between text-base">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Tag className="w-5 h-5" />
                            <span className="font-bold text-xl text-foreground">Price on Request</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Button size="lg" disabled={variant.quantity <= 0} onClick={handleAddToCartClick}>
                            <FileQuestion className="mr-2" /> Add to Quotation
                        </Button>
                    </div>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
