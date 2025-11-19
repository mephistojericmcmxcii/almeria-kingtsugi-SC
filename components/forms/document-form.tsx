"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/lib/toast"

export function DocumentForm({ initialData, onSubmit }) {
  const [formData, setFormData] = useState(initialData || {})
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await onSubmit(formData)
      toast.success("Document saved successfully")
      router.refresh()
    } catch (error) {
      console.error("Error saving document:", error)
      toast.error("Failed to save document")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" value={formData.title || ""} onChange={handleChange} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea id="content" name="content" value={formData.content || ""} onChange={handleChange} rows={5} />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Document"}
      </Button>
    </form>
  )
}
