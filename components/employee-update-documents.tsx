"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Eye, Trash2, Plus } from "lucide-react"
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { db, storage } from "@/lib/firebase"

interface Document {
  id: string
  type: string
  fileName: string
  fileUrl: string
  uploadDate: string
}

interface EmployeeUpdateDocumentsProps {
  isOpen: boolean
  onClose: () => void
  currentUser: any
}

export default function EmployeeUpdateDocuments({ isOpen, onClose, currentUser }: EmployeeUpdateDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [newDocumentType, setNewDocumentType] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const documentTypes = [
    "Resume/CV",
    "NBI Clearance",
    "Personal Data Sheet",
    "Employment Contract",
    "ID Copy",
    "Medical Certificate",
    "Educational Certificate",
    "Training Certificate",
    "Other",
  ]

  useEffect(() => {
    if (isOpen && currentUser?.uid) {
      fetchDocuments()
    }
  }, [isOpen, currentUser])

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const employeeDoc = await getDoc(doc(db, "employees", currentUser.uid))
      if (employeeDoc.exists()) {
        const data = employeeDoc.data()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error("Error fetching documents:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "application/pdf") {
      setSelectedFile(file)
    } else {
      alert("Please select a PDF file only.")
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !newDocumentType) {
      alert("Please select a file and document type.")
      return
    }

    setUploading(true)
    try {
      // Upload file to Firebase Storage
      const fileRef = ref(storage, `employee-documents/${currentUser.uid}/${Date.now()}_${selectedFile.name}`)
      const snapshot = await uploadBytes(fileRef, selectedFile)
      const downloadURL = await getDownloadURL(snapshot.ref)

      // Create document object
      const newDocument: Document = {
        id: Date.now().toString(),
        type: newDocumentType,
        fileName: selectedFile.name,
        fileUrl: downloadURL,
        uploadDate: new Date().toISOString().split("T")[0],
      }

      // Update Firestore
      await updateDoc(doc(db, "employees", currentUser.uid), {
        documents: arrayUnion(newDocument),
      })

      // Update local state
      setDocuments((prev) => [...prev, newDocument])

      // Reset form
      setSelectedFile(null)
      setNewDocumentType("")

      // Reset file input
      const fileInput = document.getElementById("file-upload") as HTMLInputElement
      if (fileInput) fileInput.value = ""
    } catch (error) {
      console.error("Error uploading document:", error)
      alert("Error uploading document. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (document: Document) => {
    if (!confirm("Are you sure you want to delete this document?")) return

    try {
      // Delete from Firebase Storage
      const fileRef = ref(storage, document.fileUrl)
      await deleteObject(fileRef)

      // Update Firestore
      await updateDoc(doc(db, "employees", currentUser.uid), {
        documents: arrayRemove(document),
      })

      // Update local state
      setDocuments((prev) => prev.filter((doc) => doc.id !== document.id))
    } catch (error) {
      console.error("Error deleting document:", error)
      alert("Error deleting document. Please try again.")
    }
  }

  const handleView = (fileUrl: string) => {
    window.open(fileUrl, "_blank")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#F0EAD6] border-[#DDD7B1]">
        <DialogHeader>
          <DialogTitle className="text-[#2F3E2E] text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#5B8C5A]" />
            Update Documents
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8 py-4">
          {/* Upload New Document */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-[#D0C9AF]">
              <Plus className="h-4 w-4 text-[#5B8C5A]" />
              <h3 className="text-lg font-medium text-[#2F3E2E]">Upload New Document</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-3">
                <Label htmlFor="document-type" className="text-[#2F3E2E] font-medium">
                  Document Type
                </Label>
                <Select value={newDocumentType} onValueChange={setNewDocumentType}>
                  <SelectTrigger className="bg-[#E0D9C0] border-[#D0C9AF] text-[#2F3E2E] h-11">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#F0EAD6] border-[#D0C9AF] text-[#2F3E2E]">
                    {documentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="file-upload" className="text-[#2F3E2E] font-medium">
                  Select PDF File
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="bg-[#E0D9C0] border-[#D0C9AF] text-[#2F3E2E] h-11"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-[#2F3E2E] font-medium">&nbsp;</Label>
                <Button
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile || !newDocumentType}
                  className="w-full bg-[#5B8C5A] hover:bg-[#4A7549] text-white h-11"
                >
                  {uploading ? "Uploading..." : "Upload Document"}
                </Button>
              </div>
            </div>
          </div>

          {/* Documents List */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-[#D0C9AF]">
              <FileText className="h-4 w-4 text-[#5B8C5A]" />
              <h3 className="text-lg font-medium text-[#2F3E2E]">My Documents</h3>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="text-[#2F3E2E]">Loading documents...</div>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-[#8B8378] mx-auto mb-4" />
                <p className="text-[#8B8378]">No documents uploaded yet</p>
              </div>
            ) : (
              <div className="bg-[#E0D9C0] rounded-lg border border-[#D0C9AF] overflow-hidden">
                <div className="grid grid-cols-4 gap-4 p-4 bg-[#D0C9AF] font-medium text-[#2F3E2E] text-sm">
                  <div>Document Type</div>
                  <div>File Name</div>
                  <div>Upload Date</div>
                  <div>Actions</div>
                </div>
                {documents.map((document) => (
                  <div
                    key={document.id}
                    className="grid grid-cols-4 gap-4 p-4 border-t border-[#D0C9AF] text-[#2F3E2E]"
                  >
                    <div className="font-medium">{document.type}</div>
                    <div className="truncate">{document.fileName}</div>
                    <div>{document.uploadDate}</div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleView(document.fileUrl)}
                        size="sm"
                        className="bg-[#5B8C5A] hover:bg-[#4A7549] text-white"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(document)}
                        size="sm"
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-6 border-t border-[#D0C9AF]">
            <Button onClick={onClose} className="bg-[#5B8C5A] hover:bg-[#4A7549] text-white">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
