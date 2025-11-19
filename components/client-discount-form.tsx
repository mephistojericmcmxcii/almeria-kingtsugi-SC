"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { X, Plus, Trash2, Percent } from "lucide-react"
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface ClientDiscountFormProps {
  onClose: () => void
}

interface ClientDiscount {
  id?: string
  clientType: string
  discountValue: number
  description: string
  createdAt?: Date
  updatedAt?: Date
}

export default function ClientDiscountForm({ onClose }: ClientDiscountFormProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [clientDiscounts, setClientDiscounts] = useState<ClientDiscount[]>([])
  const [newClientType, setNewClientType] = useState("")
  const [newDiscountValue, setNewDiscountValue] = useState("")
  const [newDescription, setNewDescription] = useState("")

  // Fetch existing client discounts on component mount
  useEffect(() => {
    const fetchClientDiscounts = async () => {
      try {
        setLoading(true)
        const clientDiscountsRef = collection(db!, "clientDiscounts")
        const querySnapshot = await getDocs(clientDiscountsRef)

        const discounts: ClientDiscount[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data() as ClientDiscount
          discounts.push({
            id: doc.id,
            clientType: data.clientType,
            discountValue: data.discountValue,
            description: data.description,
          })
        })

        setClientDiscounts(discounts)
      } catch (err) {
        console.error("Error fetching client discounts:", err)
        setError("Failed to load client discounts. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchClientDiscounts()
  }, [])

  // Add new client discount
  const handleAddClientDiscount = async () => {
    try {
      // Validate inputs
      if (!newClientType.trim()) {
        setError("Client type is required.")
        return
      }

      const discountValue = Number.parseFloat(newDiscountValue)
      if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
        setError("Discount value must be a number between 0 and 100.")
        return
      }

      setSaving(true)
      setError("")

      // Check if client type already exists
      const existingClientType = clientDiscounts.find(
        (discount) => discount.clientType.toLowerCase() === newClientType.toLowerCase(),
      )

      if (existingClientType) {
        setError("This client type already exists. Please use a different name.")
        setSaving(false)
        return
      }

      // Add new client discount to Firestore
      const newDiscount: ClientDiscount = {
        clientType: newClientType,
        discountValue: discountValue,
        description: newDescription,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const docRef = await addDoc(collection(db!, "clientDiscounts"), newDiscount)

      // Update local state
      setClientDiscounts([
        ...clientDiscounts,
        {
          id: docRef.id,
          clientType: newClientType,
          discountValue: discountValue,
          description: newDescription,
        },
      ])

      // Reset form
      setNewClientType("")
      setNewDiscountValue("")
      setNewDescription("")

      setSuccess("Client discount added successfully!")

      // Reset success message after 3 seconds
      setTimeout(() => {
        setSuccess("")
      }, 3000)
    } catch (err) {
      console.error("Error adding client discount:", err)
      setError("Failed to add client discount. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  // Update client discount
  const handleUpdateClientDiscount = async (id: string, field: keyof ClientDiscount, value: string | number) => {
    try {
      const index = clientDiscounts.findIndex((discount) => discount.id === id)
      if (index === -1) return

      // Create updated discount object
      const updatedDiscount = { ...clientDiscounts[index], [field]: value, updatedAt: new Date() }

      // Update in Firestore
      await updateDoc(doc(db!, "clientDiscounts", id), {
        [field]: value,
        updatedAt: new Date(),
      })

      // Update local state
      const updatedDiscounts = [...clientDiscounts]
      updatedDiscounts[index] = updatedDiscount
      setClientDiscounts(updatedDiscounts)

      setSuccess("Client discount updated successfully!")

      // Reset success message after 3 seconds
      setTimeout(() => {
        setSuccess("")
      }, 3000)
    } catch (err) {
      console.error("Error updating client discount:", err)
      setError("Failed to update client discount. Please try again.")
    }
  }

  // Delete client discount
  const handleDeleteClientDiscount = async (id: string) => {
    try {
      if (confirm("Are you sure you want to delete this client discount?")) {
        // Delete from Firestore
        await deleteDoc(doc(db!, "clientDiscounts", id))

        // Update local state
        setClientDiscounts(clientDiscounts.filter((discount) => discount.id !== id))

        setSuccess("Client discount deleted successfully!")

        // Reset success message after 3 seconds
        setTimeout(() => {
          setSuccess("")
        }, 3000)
      }
    } catch (err) {
      console.error("Error deleting client discount:", err)
      setError("Failed to delete client discount. Please try again.")
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-emerald-800 border border-emerald-700 rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-emerald-700">
          <h2 className="text-xl font-bold text-white">Client Discount Management</h2>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-300 hover:text-white hover:bg-emerald-700"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {error && <div className="bg-red-500/20 border border-red-500 text-white p-3 rounded-md">{error}</div>}
          {success && (
            <div className="bg-green-500/20 border border-green-500 text-white p-3 rounded-md">{success}</div>
          )}

          {/* Add New Client Discount Form */}
          <div className="bg-emerald-700/20 p-6 rounded-md">
            <h3 className="text-lg font-medium text-white mb-4">Add New Client Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="newClientType" className="text-white">
                  Client Type *
                </Label>
                <Input
                  id="newClientType"
                  value={newClientType}
                  onChange={(e) => setNewClientType(e.target.value)}
                  className="bg-emerald-700 border-emerald-600 text-white placeholder:text-emerald-300/70"
                  placeholder="e.g., Student"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newDiscountValue" className="text-white">
                  Discount Value (%) *
                </Label>
                <div className="relative">
                  <Input
                    id="newDiscountValue"
                    type="number"
                    min="0"
                    max="100"
                    value={newDiscountValue}
                    onChange={(e) => setNewDiscountValue(e.target.value)}
                    className="bg-emerald-700 border-emerald-600 text-white pr-8 placeholder:text-emerald-300/70"
                    placeholder="e.g., 10"
                  />
                  <Percent className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="newDescription" className="text-white">
                  Description
                </Label>
                <Textarea
                  id="newDescription"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="bg-emerald-700 border-emerald-600 text-white min-h-[80px] placeholder:text-emerald-300/70"
                  placeholder="Describe the client type and discount conditions"
                />
              </div>
              <div className="md:col-span-2">
                <Button
                  onClick={handleAddClientDiscount}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add Client Discount
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Client Discounts List */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white border-b border-emerald-700 pb-2">Client Discounts</h3>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
              </div>
            ) : clientDiscounts.length === 0 ? (
              <div className="bg-emerald-700/20 p-4 rounded-md text-center text-gray-300">
                No client discounts added yet. Use the form above to add client discounts.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {clientDiscounts.map((discount) => (
                  <div
                    key={discount.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 bg-emerald-700/20 rounded-md"
                  >
                    <div className="md:col-span-4">
                      <Label htmlFor={`clientType-${discount.id}`} className="text-white">
                        Client Type
                      </Label>
                      <Input
                        id={`clientType-${discount.id}`}
                        value={discount.clientType}
                        onChange={(e) => handleUpdateClientDiscount(discount.id!, "clientType", e.target.value)}
                        className="bg-emerald-700 border-emerald-600 text-white mt-2 placeholder:text-emerald-300/70"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor={`discountValue-${discount.id}`} className="text-white">
                        Discount (%)
                      </Label>
                      <div className="relative mt-2">
                        <Input
                          id={`discountValue-${discount.id}`}
                          type="number"
                          min="0"
                          max="100"
                          value={discount.discountValue}
                          onChange={(e) =>
                            handleUpdateClientDiscount(
                              discount.id!,
                              "discountValue",
                              Number.parseFloat(e.target.value) || 0,
                            )
                          }
                          className="bg-emerald-700 border-emerald-600 text-white pr-8 placeholder:text-emerald-300/70"
                        />
                        <Percent className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    <div className="md:col-span-5">
                      <Label htmlFor={`description-${discount.id}`} className="text-white">
                        Description
                      </Label>
                      <Textarea
                        id={`description-${discount.id}`}
                        value={discount.description}
                        onChange={(e) => handleUpdateClientDiscount(discount.id!, "description", e.target.value)}
                        className="bg-emerald-700 border-emerald-600 text-white mt-2 min-h-[80px] placeholder:text-emerald-300/70"
                      />
                    </div>
                    <div className="md:col-span-1 flex items-end justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20 mt-2"
                        onClick={() => handleDeleteClientDiscount(discount.id!)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end p-4 border-t border-emerald-700">
          <Button className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
