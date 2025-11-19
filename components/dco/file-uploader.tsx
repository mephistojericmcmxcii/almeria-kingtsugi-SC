"use client"
import { useState } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { UploadCloud, FileText, XCircle, CheckCircle } from "lucide-react"
import { storage, db } from "@/lib/firebase"
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"
import { collection, addDoc, serverTimestamp, getDoc, doc } from "firebase/firestore"
import { toast } from "@/components/ui/use-toast"

interface FileUploaderProps {
  folderId: string
  onFileUploaded: () => void
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

export function FileUploader({ folderId, onFileUploaded }: FileUploaderProps) {
  const [files, setFiles] = useState<
    Array<{
      file: File
      progress: number
      status: "pending" | "uploading" | "success" | "error"
      error?: string
    }>
  >([])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      setFiles((prev) => [
        ...prev,
        ...acceptedFiles.map((file) => ({
          file,
          progress: 0,
          status: "pending",
        })),
      ])
    },
    multiple: true,
  })

  const handleUpload = async (fileToUpload: File, index: number) => {
    if (!storage || !db) {
      toast({
        title: "Error",
        description: "Firebase Storage or Firestore is not initialized.",
        variant: "destructive",
      })
      setFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, status: "error", error: "Firebase not initialized" } : f)),
      )
      return
    }

    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, status: "uploading" } : f)))

    const storageRef = ref(storage, `dco_documents/${folderId}/${fileToUpload.name}`)
    const uploadTask = uploadBytesResumable(storageRef, fileToUpload)

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, progress } : f)))
      },
      (error) => {
        console.error("Upload failed:", error)
        setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, status: "error", error: error.message } : f)))
        toast({
          title: "Upload Failed",
          description: `Failed to upload ${fileToUpload.name}: ${error.message}`,
          variant: "destructive",
        })
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)

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

          await addDoc(collection(db!, "dco_documents"), {
            name: fileToUpload.name,
            type: fileToUpload.name.split(".").pop()?.toLowerCase() || "unknown",
            size: fileToUpload.size,
            url: downloadURL,
            path: `dco_documents/${folderId}/${fileToUpload.name}`, // Store full path for deletion
            folderId: folderId,
            createdAt: serverTimestamp(),
          })

          // Log the document upload activity
          await logActivity("add", fileToUpload.name, folderName, "current user")

          setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, status: "success" } : f)))
          toast({
            title: "Upload Successful",
            description: `${fileToUpload.name} has been uploaded.`,
          })
          onFileUploaded() // Notify parent component
        } catch (error: any) {
          console.error("Error saving document metadata or logging activity:", error)
          setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, status: "error", error: error.message } : f)))
          toast({
            title: "Upload Failed",
            description: `Failed to save metadata for ${fileToUpload.name}: ${error.message}`,
            variant: "destructive",
          })
        }
      },
    )
  }

  const handleUploadAll = () => {
    files.forEach((file, index) => {
      if (file.status === "pending" || file.status === "error") {
        handleUpload(file.file, index)
      }
    })
  }

  const handleRemoveFile = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, index) => index !== indexToRemove))
  }

  const pendingFiles = files.filter((f) => f.status === "pending" || f.status === "error").length
  const uploadingFiles = files.filter((f) => f.status === "uploading").length

  return (
    <div className="bg-[#FAF8F2] border-[#DDD7B1] rounded-lg p-6 shadow-sm text-[#2F3E2E]">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed border-[#DDD7B1] rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? "bg-[#DDD7B1]/20" : "hover:bg-[#DDD7B1]/10"
        }`}
      >
        <input {...getInputProps()} />
        <UploadCloud className="mx-auto h-12 w-12 text-[#5B8C5A] mb-4" />
        <p className="text-lg font-medium text-[#4C6529]">Drag & drop files here, or click to select</p>
        <p className="text-sm text-[#2F3E2E] mt-1">Supports PDF, Word, Excel, Images (Max 10MB per file)</p>
      </div>

      {files.length > 0 && (
        <div className="mt-6 space-y-4">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-[#FAF8F2] border border-[#DDD7B1] rounded-md"
            >
              <div className="flex items-center gap-3 flex-grow">
                <FileText className="h-5 w-5 text-[#5B8C5A]" />
                <div className="flex-grow">
                  <p className="text-sm font-medium text-[#4C6529] truncate">{file.file.name}</p>
                  <p className="text-xs text-[#2F3E2E]">{Math.round(file.file.size / 1024)} KB</p>
                  {file.status === "uploading" && (
                    <Progress
                      value={file.progress}
                      className="w-full h-2 mt-1 bg-[#DDD7B1]"
                      indicatorColor="bg-[#5B8C5A]"
                    />
                  )}
                  {file.status === "error" && (
                    <p className="text-xs text-red-500 mt-1">Error: {file.error || "Unknown error"}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {file.status === "success" && <CheckCircle className="h-5 w-5 text-[#5B8C5A]" />}
                {file.status === "error" && (
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveFile(index)}>
                    <XCircle className="h-5 w-5 text-red-500" />
                  </Button>
                )}
                {(file.status === "pending" || file.status === "error") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpload(file.file, index)}
                    className="border-[#DDD7B1] text-[#4C6529] hover:bg-[#DDD7B1] hover:text-[#2F3E2E]"
                  >
                    Upload
                  </Button>
                )}
                {file.status !== "uploading" && file.status !== "success" && (
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveFile(index)}>
                    <XCircle className="h-5 w-5 text-[#2F3E2E] hover:text-red-500" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingFiles > 0 && (
        <div className="mt-6 text-right">
          <Button
            onClick={handleUploadAll}
            disabled={uploadingFiles > 0}
            className="bg-[#5B8C5A] hover:bg-[#4C6529] text-white"
          >
            {uploadingFiles > 0 ? `Uploading (${uploadingFiles})...` : `Upload All (${pendingFiles})`}
          </Button>
        </div>
      )}
    </div>
  )
}
