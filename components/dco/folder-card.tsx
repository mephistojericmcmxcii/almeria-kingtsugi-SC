"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Folder, ArrowUpCircle, ArrowDownCircle, MoreVertical, Trash2, Edit } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"
import {
  doc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  serverTimestamp,
  addDoc,
} from "firebase/firestore"
import { ref, deleteObject } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface FolderCardProps {
  folder: {
    id: string
    name: string
    description: string
    position: number
    documentCount?: number
    createdAt: Date
  }
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onDelete: (id: string) => void
  onRefresh: () => void // Add this prop
  isFirst: boolean
  isLast: boolean
}

// Function to log activities to Firebase
const logActivity = async (
  actionType: "add" | "modify" | "delete",
  documentName: string,
  folderName: string,
  userId = "system",
) => {
  try {
    if (!db) return

    // Add a new document to the activity_logs collection
    await addDoc(collection(db, "activity_logs"), {
      actionType,
      fileName: documentName,
      folderName,
      user: userId,
      timestamp: serverTimestamp(),
    })

    console.log(`Activity logged: ${actionType} ${documentName} in ${folderName} by ${userId}`)
  } catch (error) {
    console.error("Error logging activity:", error)
  }
}

export function FolderCard({ folder, onMoveUp, onMoveDown, onDelete, onRefresh, isFirst, isLast }: FolderCardProps) {
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Add a new state for rename dialog
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [isRenaming, setIsRenaming] = useState(false)

  const handleOpenFolder = () => {
    router.push(`/operation/dco/${encodeURIComponent(folder.id)}`)
  }

  const handleDeleteFolder = async () => {
    try {
      setIsDeleting(true)

      // 1. Get all documents in this folder
      const documentsQuery = query(collection(db!, "dco_documents"), where("folderId", "==", folder.id))
      const documentsSnapshot = await getDocs(documentsQuery)

      // 2. Delete all document files from storage
      const deletePromises = documentsSnapshot.docs.map(async (docSnapshot) => {
        const documentData = docSnapshot.data()
        if (documentData.path && storage) {
          const fileRef = ref(storage, documentData.path)
          try {
            await deleteObject(fileRef)

            // Log each document deletion
            await logActivity("delete", documentData.name || "Unknown file", folder.name, "current user")
          } catch (error) {
            console.error(`Error deleting file ${documentData.path}:`, error)
          }
        }

        // Delete document record from Firestore
        return deleteDoc(doc(db!, "dco_documents", docSnapshot.id))
      })

      // Wait for all document deletions to complete
      await Promise.all(deletePromises)

      // 3. Delete the folder document
      await deleteDoc(doc(db!, "dco_folders", folder.id))

      // Log folder deletion
      await logActivity("delete", folder.name, "Folders", "current user")

      // 4. Update the UI
      onDelete(folder.id)

      // 5. Clear cache and trigger refresh
      if (typeof window !== "undefined") {
        localStorage.removeItem("cachedFoldersData")
        localStorage.removeItem("foldersLastFetchTime")
      }
      onRefresh()

      toast({
        title: "Folder deleted",
        description: "The folder has been deleted successfully.",
      })
    } catch (error) {
      console.error("Error deleting folder:", error)
      toast({
        title: "Error",
        description: "Failed to delete folder. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleRenameFolder = async () => {
    if (!newFolderName.trim()) {
      toast({
        title: "Error",
        description: "Folder name cannot be empty.",
        variant: "destructive",
      })
      return
    }

    if (newFolderName.includes(" ")) {
      toast({
        title: "Error",
        description: "New folder name cannot contain spaces. Please use hyphens (-) or underscores (_) instead.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsRenaming(true)

      // Update the folder document
      await updateDoc(doc(db!, "dco_folders", folder.id), {
        name: newFolderName.trim(),
        description: newDescription.trim(),
        updatedAt: serverTimestamp(),
      })

      // Log the rename activity
      await logActivity(
        "modify",
        `Renamed folder: ${folder.name} to ${newFolderName.trim()}`,
        "Folders",
        "current user",
      )

      // Clear cache and trigger refresh
      if (typeof window !== "undefined") {
        localStorage.removeItem("cachedFoldersData")
        localStorage.removeItem("foldersLastFetchTime")
      }
      onRefresh()

      toast({
        title: "Folder renamed",
        description: "The folder has been renamed successfully.",
      })
    } catch (error) {
      console.error("Error renaming folder:", error)
      toast({
        title: "Error",
        description: "Failed to rename folder. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRenaming(false)
      setRenameDialogOpen(false)
    }
  }

  const openRenameDialog = () => {
    setNewFolderName(folder.name)
    setNewDescription(folder.description)
    setRenameDialogOpen(true)
  }

  return (
    <>
      <Card className="bg-[#FAF8F2] border-[#DDD7B1] text-[#2F3E2E] hover:bg-[#DDD7B1] transition-all cursor-pointer group">
        <CardHeader className="pb-2" onClick={handleOpenFolder}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium truncate">{folder.name}</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[#4C6529] hover:text-[#2F3E2E] hover:bg-[#DDD7B1]"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#FAF8F2] border-[#DDD7B1] text-[#2F3E2E]">
                {!isFirst && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      onMoveUp(folder.id)
                    }}
                    className="hover:bg-[#DDD7B1]"
                  >
                    <ArrowUpCircle className="mr-2 h-4 w-4" />
                    Move Up
                  </DropdownMenuItem>
                )}
                {!isLast && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      onMoveDown(folder.id)
                    }}
                    className="hover:bg-[#DDD7B1]"
                  >
                    <ArrowDownCircle className="mr-2 h-4 w-4" />
                    Move Down
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    openRenameDialog()
                  }}
                  className="hover:bg-[#DDD7B1]"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteDialogOpen(true)
                  }}
                  className="text-red-500 hover:bg-red-100 hover:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pb-2" onClick={handleOpenFolder}>
          {folder.description && <p className="text-sm text-[#2F3E2E] mb-2 line-clamp-2">{folder.description}</p>}
        </CardContent>
        <CardFooter className="flex justify-between pt-0 text-sm text-[#2F3E2E]" onClick={handleOpenFolder}>
          <div className="flex items-center">
            <Folder className="h-4 w-4 mr-1 text-[#5B8C5A]" />
            <span>
              {folder.documentCount || 0} document{folder.documentCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div>
            {folder.createdAt && <span>Created {formatDistanceToNow(folder.createdAt, { addSuffix: true })}</span>}
          </div>
        </CardFooter>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#FAF8F2] border-[#DDD7B1] text-[#2F3E2E]">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#2F3E2E]">
              This will permanently delete the folder &quot;{folder.name}&quot; and all {folder.documentCount || 0}{" "}
              document{folder.documentCount !== 1 ? "s" : ""} inside it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-[#DDD7B1] text-[#2F3E2E] hover:bg-[#DDD7B1] hover:text-[#4C6529]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolder}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#FAF8F2] text-[#2F3E2E] border-[#DDD7B1]">
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription className="text-[#2F3E2E]">Update the folder name and description.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rename-name" className="text-[#4C6529]">
                Folder Name
              </Label>
              <Input
                id="rename-name"
                placeholder="Enter folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="bg-[#FAF8F2] border-[#DDD7B1] text-[#2F3E2E]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rename-description" className="text-[#4C6529]">
                Description (Optional)
              </Label>
              <Textarea
                id="rename-description"
                placeholder="Enter folder description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="bg-[#FAF8F2] border-[#DDD7B1] text-[#2F3E2E]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
              className="border-[#DDD7B1] text-[#2F3E2E] hover:bg-[#DDD7B1] hover:text-[#4C6529]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameFolder}
              disabled={isRenaming || !newFolderName.trim() || newFolderName.includes(" ")}
              className="bg-[#5B8C5A] hover:bg-[#4C6529] text-white"
            >
              {isRenaming ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
