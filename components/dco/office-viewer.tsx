"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FileIcon, Download } from "lucide-react"
import { ref, getDownloadURL } from "firebase/storage"
import { storage } from "@/lib/firebase"

interface OfficeViewerProps {
  fileUrl: string
  fileType?: string
  document: any
  onConvert?: (document: any) => void
  fileName?: string
}

export default function OfficeViewer({ fileUrl, fileType, document, onConvert, fileName }: OfficeViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const documentName = document?.name || fileName || "document"

  // Determine file type from name if not provided
  const getFileType = () => {
    if (fileType) return fileType
    const name = documentName.toLowerCase()
    if (name.endsWith(".pdf")) return "pdf"
    if (name.endsWith(".docx") || name.endsWith(".doc")) return "docx"
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "xlsx"
    if (name.endsWith(".pptx") || name.endsWith(".ppt")) return "pptx"
    if (name.match(/\.(jpg|jpeg|png|gif|bmp)$/)) return "image"
    return "other"
  }

  const actualFileType = getFileType()

  // Generate a signed URL for Firebase Storage files
  useEffect(() => {
    const getSignedStorageUrl = async () => {
      try {
        setIsLoading(true)

        // Check if this is a Firebase Storage URL
        if (fileUrl && fileUrl.includes("firebasestorage.googleapis.com")) {
          // Extract the storage path from the URL
          const urlObj = new URL(fileUrl)
          const pathMatch = urlObj.pathname.match(/\/o\/(.+?)(?:\?|$)/)

          if (pathMatch && pathMatch[1]) {
            // Decode the path
            const storagePath = decodeURIComponent(pathMatch[1])

            try {
              // Get a signed URL with Firebase Storage
              const storageRef = ref(storage, storagePath)
              const url = await getDownloadURL(storageRef)
              setSignedUrl(url)
            } catch (storageError) {
              console.error("Error getting download URL:", storageError)
              // Fallback to using the original URL
              setSignedUrl(fileUrl)
            }
          } else {
            // If we can't extract the path, use the original URL
            setSignedUrl(fileUrl)
          }
        } else {
          // If it's not a Firebase Storage URL, use it directly
          setSignedUrl(fileUrl)
        }

        setError(null)
      } catch (err) {
        console.error("Error generating signed URL:", err)
        setError("Failed to access the document. It might require authentication.")
        // Set the URL to null to prevent further loading attempts
        setSignedUrl(null)
      } finally {
        setIsLoading(false)
      }
    }

    if (fileUrl) {
      getSignedStorageUrl()
    } else {
      setError("No document URL provided")
      setIsLoading(false)
    }
  }, [fileUrl])

  const handleIframeLoad = () => {
    setIsLoading(false)
  }

  const handleIframeError = () => {
    setError("Failed to load document preview")
    setIsLoading(false)
  }

  const handleDownload = () => {
    if (!signedUrl) return

    // Create a temporary link element and trigger the download
    const a = document.createElement("a")
    a.href = signedUrl
    a.download = documentName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Render different preview based on file type
  const renderPreview = () => {
    if (!signedUrl) return null

    switch (actualFileType) {
      case "pdf":
        return (
          <iframe
            src={signedUrl}
            className="w-full h-full border-0"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            title={documentName}
            sandbox="allow-scripts allow-same-origin"
          />
        )
      case "image":
        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <img
              src={signedUrl || "/placeholder.svg"}
              alt={documentName}
              className="max-w-full max-h-full object-contain"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              crossOrigin="anonymous"
            />
          </div>
        )
      case "docx":
      case "xlsx":
      case "pptx":
      default:
        // For Office documents, just notify the user that the file cannot be opened
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-600 text-white p-6">
            <FileIcon className="h-24 w-24 mx-auto mb-4 text-white" />
            <h3 className="text-xl font-medium text-white mb-2">{documentName}</h3>
            <p className="text-sm text-white opacity-90">
              This file cannot be previewed directly in the browser. Please download the file to view it.
            </p>
          </div>
        )
    }
  }

  return (
    <div className="w-full h-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-900 text-white z-10">
          <FileIcon className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2">Loading document...</h3>
          <p className="text-gray-300">Please wait while we access your document</p>
        </div>
      )}

      {error ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-900 text-white">
          <FileIcon className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2">Preview not available</h3>
          <p className="text-gray-300 mb-4">{error}</p>
          <div className="flex gap-3">
            <Button onClick={handleDownload} className="bg-emerald-600 hover:bg-emerald-700" disabled={!signedUrl}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            {onConvert && (
              <Button onClick={() => onConvert(document)} className="bg-emerald-600 hover:bg-emerald-700">
                Convert to PDF
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>{renderPreview()}</>
      )}
    </div>
  )
}
