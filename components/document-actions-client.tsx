"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createDocument, updateDocument, deleteDocument } from "@/app/actions/document-actions"
import { toast } from "@/lib/toast"

export function CreateDocumentButton({ data }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleCreate = async () => {
    setLoading(true)

    try {
      const result = await createDocument(data)

      if (result.success) {
        toast.success(result.message)
        router.push(`/documents/${result.id}`)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleCreate} disabled={loading}>
      {loading ? "Creating..." : "Create Document"}
    </Button>
  )
}

export function UpdateDocumentButton({ id, data }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleUpdate = async () => {
    setLoading(true)

    try {
      const result = await updateDocument(id, data)

      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleUpdate} disabled={loading}>
      {loading ? "Updating..." : "Update Document"}
    </Button>
  )
}

export function DeleteDocumentButton({ id }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this document?")) {
      return
    }

    setLoading(true)

    try {
      const result = await deleteDocument(id)

      if (result.success) {
        toast.success(result.message)
        router.push("/documents")
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="destructive" onClick={handleDelete} disabled={loading}>
      {loading ? "Deleting..." : "Delete Document"}
    </Button>
  )
}
