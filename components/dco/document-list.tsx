"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs, doc, deleteDoc, addDoc, serverTimestamp, getDoc } from "firebase/firestore"
import { ref, deleteObject, getBlob } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import { formatDistanceToNow } from "date-fns"
import { formatBytes } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import {
  FileIcon,
  FileTextIcon,
  FileImageIcon,
  FileSpreadsheetIcon,
  FileIcon as FilePresentationIcon,
  Eye,
  Download,
  MoreVertical,
  Trash2,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { convertWordToHtml, convertExcelToHtml } from "@/lib/document-converter"
import dynamic from "next/dynamic"

const OfficeViewer = dynamic(() => import("@/components/dco/office-viewer"), {
  loading: () => (
    <div className="text-center py-12 bg-[#DDD7B1] rounded h-[70vh] flex flex-col items-center justify-center">
      <FileIcon className="h-16 w-16 text-[#5B8C5A] mx-auto mb-4" />
      <h3 className="text-xl font-medium text-[#4C6529] mb-2">Loading preview...</h3>
      <p className="text-[#2F3E2E]">Please wait while we load the document viewer</p>
    </div>
  ),
  ssr: false,
})

interface Document {
  id: string
  name: string
  type: string
  size: number
  url: string
  path: string
  createdAt: Date
}

interface DocumentListProps {
  folderId: string
  searchQuery: string
  searchFilter: string
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

export function DocumentList({ folderId, searchQuery, searchFilter }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [viewDocument, setViewDocument] = useState<Document | null>(null)
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)
  const [convertedContent, setConvertedContent] = useState<string | null>(null)
  const [converting, setConverting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const fetchDocuments = async () => {
    try {
      setLoading(true)

      // Modified query to remove orderBy to avoid needing a composite index
      const q = query(collection(db!, "dco_documents"), where("folderId", "==", folderId))

      const querySnapshot = await getDocs(q)

      const docs = querySnapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name,
          type: data.type,
          size: data.size,
          url: data.url,
          path: data.path,
          createdAt: data.createdAt?.toDate() || new Date(),
        }
      })

      // Sort documents by createdAt in memory (descending order - newest first)
      docs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      setDocuments(docs)
    } catch (error) {
      console.error("Error fetching documents:", error)
      toast({
        title: "Error",
        description: "Failed to load documents. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId])

  // Reset converted content when document changes
  useEffect(() => {
    setConvertedContent(null)
    setConverting(false)
  }, [viewDocument])

  const handleView = (doc: Document) => {
    if (!doc || !doc.url) {
      toast({
        title: "Error",
        description: "Document URL is missing or invalid",
        variant: "destructive",
      })
      return
    }
    setViewDocument(doc)
  }

  const handleDownload = (doc: Document) => {
    // Create a temporary link element and trigger the download
    const a = document.createElement("a")
    a.href = doc.url
    a.download = doc.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleDelete = async () => {
    if (!documentToDelete) return

    try {
      // Get folder name for logging
      let folderName = "Unknown folder"
      try {
        const folderDoc = await getDoc(doc(db!, "dco_folders", folderId))
        if (folderDoc.exists()) {
          folderName = folderDoc.data().name || folderName
        }
      } catch (error) {
        console.error("Error fetching folder name:", error)
      }

      // Delete file from storage if path exists
      if (documentToDelete.path && storage) {
        const fileRef = ref(storage, documentToDelete.path)
        await deleteObject(fileRef)
      }

      // Delete document metadata from Firestore
      await deleteDoc(doc(db!, "dco_documents", documentToDelete.id))

      // Log the document deletion activity
      await logActivity("delete", documentToDelete.name, folderName, "current user")

      // Update the UI
      setDocuments((prev) => prev.filter((d) => d.id !== documentToDelete.id))

      toast({
        title: "Document deleted",
        description: `${documentToDelete.name} has been deleted.`,
      })

      setDocumentToDelete(null)
    } catch (error) {
      console.error("Error deleting document:", error)
      toast({
        title: "Error",
        description: "Failed to delete document. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileTextIcon className="h-5 w-5 text-red-500" />
      case "word":
        return <FileTextIcon className="h-5 w-5 text-[#5B8C5A]" />
      case "excel":
        return <FileSpreadsheetIcon className="h-5 w-5 text-[#4C6529]" />
      case "powerpoint":
        return <FilePresentationIcon className="h-5 w-5 text-[#E07B39]" />
      case "image":
        return <FileImageIcon className="h-5 w-5 text-[#8A4F7D]" />
      default:
        return <FileIcon className="h-5 w-5 text-[#2F3E2E]" />
    }
  }

  const convertDocument = async () => {
    if (!viewDocument || !viewDocument.path || !storage) {
      toast({
        title: "Error",
        description: "Document path is missing or storage is not available",
        variant: "destructive",
      })
      return
    }

    try {
      setConverting(true)

      // Get folder name for logging
      let folderName = "Unknown folder"
      try {
        const folderDoc = await getDoc(doc(db!, "dco_folders", folderId))
        if (folderDoc.exists()) {
          folderName = folderDoc.data().name || folderName
        }
      } catch (error) {
        console.error("Error fetching folder name:", error)
      }

      // Get the file extension
      const fileExtension = viewDocument.name.split(".").pop()?.toLowerCase()
      const isWord = ["doc", "docx"].includes(fileExtension || "")
      const isExcel = ["xls", "xlsx", "csv"].includes(fileExtension || "")

      // Get the file from Firebase Storage
      const fileRef = ref(storage, viewDocument.path)
      const blob = await getBlob(fileRef)
      const arrayBuffer = await blob.arrayBuffer()

      // Convert based on file type
      let html = ""
      if (isWord) {
        html = await convertWordToHtml(arrayBuffer)
      } else if (isExcel) {
        html = await convertExcelToHtml(arrayBuffer)
      } else {
        throw new Error("Unsupported file type")
      }

      setConvertedContent(html)

      // Log the document conversion activity
      await logActivity("modify", `Converted ${viewDocument.name}`, folderName, "current user")
    } catch (error) {
      console.error("Error converting document:", error)
      toast({
        title: "Conversion Error",
        description: "Failed to convert the document for preview.",
        variant: "destructive",
      })
    } finally {
      setConverting(false)
    }
  }

  // Filter documents based on search query
  const filteredDocuments = documents.filter((doc) => {
    if (!searchQuery) return true

    const matchesQuery = doc.name.toLowerCase().includes(searchQuery.toLowerCase())

    if (searchFilter === "documents" || searchFilter === "all") {
      return matchesQuery
    }

    return false
  })

  const handleConvertToPdf = (document: Document) => {
    console.log("Converting to PDF:", document)
    toast({
      title: "Feature not available",
      description: "This feature is not yet implemented.",
    })
  }

  return (
    <>
      {loading ? (
        // Loading skeleton
        <div className="bg-[#FAF8F2] rounded-lg p-4 border border-[#DDD7B1]">
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-8 w-40 bg-[#DDD7B1]" />
            <Skeleton className="h-8 w-20 bg-[#DDD7B1]" />
          </div>
          <div className="space-y-2">
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-10 w-full bg-[#DDD7B1]" />
                </div>
              ))}
          </div>
        </div>
      ) : filteredDocuments.length > 0 ? (
        <div className="bg-[#FAF8F2] rounded-lg overflow-hidden border border-[#DDD7B1]">
          <div className="flex justify-between items-center p-4">
            <h3 className="text-lg font-medium text-[#4C6529]">Documents</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchDocuments}
              className="border-[#DDD7B1] text-[#4C6529] hover:bg-[#DDD7B1] hover:text-[#2F3E2E] bg-transparent"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-[#DDD7B1]/50 border-[#DDD7B1]">
                  <TableHead className="text-[#4C6529]">Name</TableHead>
                  <TableHead className="text-[#4C6529] text-right">Size</TableHead>
                  <TableHead className="text-[#4C6529] text-right">Date</TableHead>
                  <TableHead className="text-[#4C6529] w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-[#DDD7B1]/50 border-[#DDD7B1]">
                    <TableCell className="font-medium text-[#4C6529]">
                      <div className="flex items-center gap-2">
                        {getFileIcon(doc.type)}
                        <span className="truncate max-w-xs">{doc.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[#2F3E2E] text-right">{formatBytes(doc.size)}</TableCell>
                    <TableCell className="text-[#2F3E2E] text-right">
                      {formatDistanceToNow(doc.createdAt, { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-[#4C6529] hover:text-[#2F3E2E] hover:bg-[#DDD7B1]"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#FAF8F2] border-[#DDD7B1] text-[#2F3E2E]">
                            <DropdownMenuItem onClick={() => handleView(doc)} className="hover:bg-[#DDD7B1]">
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(doc)} className="hover:bg-[#DDD7B1]">
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDocumentToDelete(doc)}
                              className="text-red-500 hover:bg-red-100 hover:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : searchQuery ? (
        <div className="bg-[#FAF8F2] rounded-lg p-8 text-center border border-[#DDD7B1]">
          <FileIcon className="h-12 w-12 text-[#5B8C5A] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[#4C6529] mb-1">No matching documents</h3>
          <p className="text-[#2F3E2E]">No documents match your search for &quot;{searchQuery}&quot;</p>
        </div>
      ) : (
        <div className="bg-[#FAF8F2] rounded-lg p-8 text-center border border-[#DDD7B1]">
          <FileIcon className="h-12 w-12 text-[#5B8C5A] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[#4C6529] mb-1">No documents yet</h3>
          <p className="text-[#2F3E2E]">Upload documents using the form above</p>
        </div>
      )}

      {/* Document Preview Dialog */}
      {viewDocument && (
        <Dialog open={!!viewDocument} onOpenChange={(open) => !open && setViewDocument(null)}>
          <DialogContent className="sm:max-w-3xl bg-[#FAF8F2] border-[#DDD7B1] text-[#2F3E2E]">
            <DialogHeader>
              <DialogTitle>{viewDocument.name}</DialogTitle>
            </DialogHeader>
            <div className="mt-2">
              {viewDocument.type === "image" ? (
                <div className="w-full h-[70vh] flex items-center justify-center bg-[#DDD7B1] rounded">
                  <img
                    src={viewDocument.url || "/placeholder.svg?height=400&width=400"}
                    alt={viewDocument.name}
                    className="mx-auto max-h-[70vh] object-contain rounded"
                    onError={(e) => {
                      e.currentTarget.onerror = null
                      e.currentTarget.src = "/placeholder.svg?height=400&width=400"
                    }}
                  />
                </div>
              ) : viewDocument.type === "pdf" ? (
                <div className="w-full h-[70vh] rounded overflow-hidden">
                  <iframe
                    src={`${viewDocument.url}#view=FitH`}
                    className="w-full h-full rounded"
                    title={viewDocument.name}
                    sandbox="allow-scripts allow-same-origin"
                    onError={() => {
                      toast({
                        title: "Error",
                        description: "Failed to load PDF preview",
                        variant: "destructive",
                      })
                    }}
                  />
                </div>
              ) : (
                (() => {
                  const fileExtension = viewDocument.name.split(".").pop()?.toLowerCase()
                  const isWord = ["doc", "docx"].includes(fileExtension || "")
                  const isExcel = ["xls", "xlsx", "csv"].includes(fileExtension || "")

                  if ((isWord || isExcel) && convertedContent) {
                    // Show the converted content in an iframe
                    return (
                      <div className="w-full h-[70vh] bg-white rounded overflow-hidden">
                        <iframe
                          srcDoc={convertedContent}
                          className="w-full h-full border-0"
                          title={viewDocument.name}
                          sandbox="allow-scripts allow-same-origin"
                        />
                      </div>
                    )
                  } else if ((isWord || isExcel) && converting) {
                    // Show loading state
                    return (
                      <div className="text-center py-12 bg-[#DDD7B1] rounded h-[70vh] flex flex-col items-center justify-center">
                        <Loader2 className="h-16 w-16 text-[#5B8C5A] mx-auto mb-4 animate-spin" />
                        <h3 className="text-xl font-medium text-[#4C6529] mb-2">Converting document...</h3>
                        <p className="text-[#2F3E2E] mb-4">Please wait while we prepare the document for preview.</p>
                      </div>
                    )
                  } else if (isWord || isExcel) {
                    // Show convert button
                    return (
                      <div className="rounded h-[70vh] flex flex-col">
                        {/* Office Viewer Component */}
                        <OfficeViewer
                          fileUrl={viewDocument.url}
                          fileType={isWord ? "docx" : "xlsx"}
                          document={viewDocument}
                          onConvert={handleConvertToPdf}
                          fileName={viewDocument.name}
                        />
                      </div>
                    )
                  } else {
                    // Default "Preview not available" for other file types
                    return (
                      <div className="text-center py-12 bg-[#FAF8F2] rounded h-[70vh] flex flex-col items-center justify-center border border-[#DDD7B1]">
                        <FileIcon className="h-16 w-16 text-[#5B8C5A] mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-[#4C6529] mb-2">Preview not available</h3>
                        <p className="text-[#2F3E2E] mb-4">This file type cannot be previewed directly.</p>
                        <Button
                          variant="outline"
                          className="bg-[#5B8C5A] text-white border-[#4C6529] hover:bg-[#4C6529]"
                          onClick={() => handleDownload(viewDocument)}
                        >
                          Download to view
                        </Button>
                      </div>
                    )
                  }
                })()
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!documentToDelete} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
        <AlertDialogContent className="bg-[#FAF8F2] border-[#DDD7B1] text-[#2F3E2E]">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#2F3E2E]">
              This will permanently delete the document &quot;{documentToDelete?.name}&quot;. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-[#DDD7B1] text-[#2F3E2E] hover:bg-[#DDD7B1] hover:text-[#4C6529]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
