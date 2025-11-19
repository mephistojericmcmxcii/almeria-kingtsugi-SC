"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { collection, setDoc, serverTimestamp, query, orderBy, getDocs, doc, getDoc, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { FolderPlus } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface CreateFolderDialogProps {
  onFolderCreated: () => void
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

export function CreateFolderDialog({ onFolderCreated }: CreateFolderDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")
  const [checking, setChecking] = useState(false)
  const [existingFolders, setExistingFolders] = useState<string[]>([])

  // Log when the component renders and when the dialog state changes
  useEffect(() => {
    console.log("CreateFolderDialog rendered. Current 'open' state:", open)
  }, [open])

  // Fetch existing folder names on component mount
  useEffect(() => {
    const fetchExistingFolders = async () => {
      try {
        const q = query(collection(db!, "dco_folders"))
        const querySnapshot = await getDocs(q)
        const folderNames = querySnapshot.docs.map((doc) => doc.id)
        setExistingFolders(folderNames)
      } catch (error) {
        console.error("Error fetching existing folders:", error)
      }
    }

    if (open) {
      fetchExistingFolders()
    }
  }, [open]) // Refresh when dialog opens

  const handleNameChange = (value: string) => {
    setName(value)
    setError("")
  }

  const validateFolderName = (name: string) => {
    // Check if name is empty
    if (!name.trim()) {
      setError("Folder name is required.")
      return false
    }

    // Check if name contains invalid characters for Firestore document IDs
    const invalidChars = /[/.#$[\]]/
    if (invalidChars.test(name)) {
      setError("Folder name cannot contain /, ., #, $, [, or ].")
      return false
    }

    // Add check for spaces
    if (name.includes(" ")) {
      setError("Folder name cannot contain spaces. Please use hyphens (-) or underscores (_) instead.")
      return false
    }

    // Check if name already exists
    if (existingFolders.includes(name.trim())) {
      setError("A folder with this name already exists.")
      return false
    }

    return true
  }

  const handleCreate = async () => {
    setChecking(true)

    if (!validateFolderName(name)) {
      setChecking(false)
      return
    }

    try {
      setLoading(true)
      setError("")

      // Double-check if folder exists (in case of race condition)
      const folderRef = doc(db!, "dco_folders", name.trim())
      const folderDoc = await getDoc(folderRef)

      if (folderDoc.exists()) {
        setError("A folder with this name already exists")
        setLoading(false)
        return
      }

      // Get the highest position value to place the new folder at the end
      const positionQuery = query(collection(db!, "dco_folders"), orderBy("position", "desc"))
      const positionSnapshot = await getDocs(positionQuery)
      const highestPosition = positionSnapshot.empty ? 0 : positionSnapshot.docs[0].data().position + 1

      // Use the folder name as the document ID
      await setDoc(doc(db!, "dco_folders", name.trim()), {
        name: name.trim(),
        description: description.trim(),
        position: highestPosition,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      // Log the folder creation activity
      await logActivity("add", `Created folder: ${name.trim()}`, "Folders", "current user")

      // Reset form and close dialog
      setName("")
      setDescription("")
      setOpen(false)

      // Show success toast
      toast({
        title: "Folder created",
        description: `Folder "${name.trim()}" has been created successfully.`,
      })

      // Trigger refresh
      onFolderCreated()
    } catch (error) {
      console.error("Error creating folder:", error)
      setError("Failed to create folder. Please try again.")
    } finally {
      setLoading(false)
      setChecking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        {" "}
        {/* Removed asChild */}
        <Button className="bg-[#5B8C5A] hover:bg-[#4C6529] text-white">
          <FolderPlus className="mr-2 h-4 w-4" />
          New Folder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-[#FAF8F2] text-[#2F3E2E] border-[#DDD7B1]">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription className="text-[#2F3E2E]">
            Create a new folder to organize your documents. The folder name will be used as the unique identifier.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-[#4C6529]">
              Folder Name
            </Label>
            <Input
              id="name"
              placeholder="Enter folder name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="bg-[#FAF8F2] border-[#DDD7B1] text-[#2F3E2E]"
            />
            {name && !error && (
              <p className="text-[#5B8C5A] text-sm">
                This name will be used as the folder's unique identifier. Avoid spaces.
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description" className="text-[#4C6529]">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              placeholder="Enter folder description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-[#FAF8F2] border-[#DDD7B1] text-[#2F3E2E]"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="border-[#DDD7B1] text-[#2F3E2E] hover:bg-[#DDD7B1] hover:text-[#4C6529]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading || checking || !name.trim() || !!error}
            className="bg-[#5B8C5A] hover:bg-[#4C6529] text-white"
          >
            {loading ? "Creating..." : "Create Folder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
