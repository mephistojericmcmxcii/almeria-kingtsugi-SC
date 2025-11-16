
'use client';

import { useFirebase } from '@/firebase';
import { setDoc, doc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef } from 'react';
import type { AboutPageContent } from '@/app/(app)/about/page';
import { Upload } from 'lucide-react';
import Image from 'next/image';
import { Label } from '../ui/label';

interface EditAboutDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  content: AboutPageContent;
}

function getPathFromUrl(url: string) {
  try {
    const urlObj = new URL(url);
    const pathName = urlObj.pathname;
    // The path will be something like /v0/b/your-bucket.appspot.com/o/path%2Fto%2Fimage.jpg
    // We need to decode the URI component and extract the path after '/o/'.
    const parts = pathName.split('/o/');
    if (parts.length > 1) {
      return decodeURIComponent(parts[1]);
    }
    return null;
  } catch (error) {
    console.error("Invalid URL for getPathFromUrl:", error);
    return null;
  }
}

export function EditAboutDialog({ isOpen, onOpenChange, content }: EditAboutDialogProps) {
  const { firestore, storage } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for form fields
  const [formState, setFormState] = useState<AboutPageContent>(content);

  useEffect(() => {
    if (isOpen) {
      setFormState(content);
      setImagePreview(content.imageUrl);
      setImageFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [content, isOpen]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prevState => ({ ...prevState, [name]: value }));
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!acceptedTypes.includes(file.type)) {
        toast({
            variant: "destructive",
            title: "Invalid File Type",
            description: "Please select a PNG, JPEG, or WEBP image.",
        });
        return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };


  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storage || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firebase services not available.' });
      return;
    }
    setIsSubmitting(true);
    let finalImageUrl = formState.imageUrl || '';

    try {
      // Step 1: If a new image file exists, upload it and get the URL
      if (imageFile) {
        const imageStoragePath = `about-page-images/about-us-image-${Date.now()}`;
        const imageStorageRef = storageRef(storage, imageStoragePath);
        
        await uploadBytes(imageStorageRef, imageFile);
        finalImageUrl = await getDownloadURL(imageStorageRef);
        
        // If there was an old image, delete it using the correct path
        if (content.imageUrl && content.imageUrl !== finalImageUrl) {
            try {
              const oldPath = getPathFromUrl(content.imageUrl);
              if (oldPath) {
                  const oldImageRef = storageRef(storage, oldPath);
                  await deleteObject(oldImageRef);
              }
            } catch (deleteError: any) {
              if (deleteError.code !== 'storage/object-not-found') {
                console.warn("Could not delete old image:", deleteError);
              }
            }
        }
      }

      // Step 2: Prepare the data object for Firestore
      const dataToSave: AboutPageContent = { 
        ...formState,
        imageUrl: finalImageUrl,
      };

      // Step 3: Save the data to Firestore
      const aboutRef = doc(firestore, 'system_settings', 'about_page');
      await setDoc(aboutRef, dataToSave, { merge: true });

      toast({
        title: "Success",
        description: "The About page has been updated.",
      });
      onOpenChange(false);

    } catch (error: any) {
      console.error("Failed to update About page:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not update the About page. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDialogClose = (open: boolean) => {
    if (isSubmitting) return;
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-2xl">
         {isSubmitting && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-20 rounded-lg">
                <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-4 text-muted-foreground">Saving changes...</p>
            </div>
        )}
        <DialogHeader>
          <DialogTitle>Edit About Page</DialogTitle>
          <DialogDescription>Update the content displayed on the About page.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="space-y-2">
            <Label>Page Image</Label>
              <div className="flex items-center gap-4">
                <div className="relative h-24 w-40 rounded-md border-dashed border-2 flex items-center justify-center text-muted-foreground overflow-hidden">
                  {imagePreview ? (
                    <Image src={imagePreview} alt="About page preview" fill style={{objectFit: "cover"}} />
                  ) : (
                    <Upload className="h-8 w-8" />
                  )}
                </div>
                <Input 
                  type="file" 
                  accept="image/png, image/jpeg, image/webp" 
                  onChange={handleImageChange}
                  className="hidden"
                  ref={fileInputRef}
                  disabled={isSubmitting}
                />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                  {imagePreview ? 'Change Image' : 'Upload Image'}
                </Button>
              </div>
          </div>
          
          <div className="space-y-2"><Label htmlFor="title">Page Title</Label><Input id="title" name="title" value={formState.title} onChange={handleInputChange} disabled={isSubmitting} /></div>
          <div className="space-y-2"><Label htmlFor="heading">Main Heading</Label><Input id="heading" name="heading" value={formState.heading} onChange={handleInputChange} disabled={isSubmitting} /></div>
          <div className="space-y-2"><Label htmlFor="p1">Paragraph 1</Label><Textarea id="p1" name="p1" value={formState.p1} onChange={handleInputChange} rows={5} disabled={isSubmitting} /></div>
          <div className="space-y-2"><Label htmlFor="p2">Paragraph 2</Label><Textarea id="p2" name="p2" value={formState.p2} onChange={handleInputChange} rows={4} disabled={isSubmitting} /></div>
          <div className="space-y-2"><Label htmlFor="missionHeading">Mission Heading</Label><Input id="missionHeading" name="missionHeading" value={formState.missionHeading} onChange={handleInputChange} disabled={isSubmitting} /></div>
          <div className="space-y-2"><Label htmlFor="missionP">Mission Paragraph</Label><Textarea id="missionP" name="missionP" value={formState.missionP} onChange={handleInputChange} rows={3} disabled={isSubmitting} /></div>
          
            <DialogFooter className="mt-8">
            <Button type="button" variant="outline" onClick={() => handleDialogClose(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
