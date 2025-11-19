"use client"

import { useState } from "react"
import { deleteDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { Trash2, Edit, Eye } from "lucide-react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { SupplierForm } from "./supplier-form"
import { SupplierDetails } from "./supplier-details"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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

interface SupplierListProps {
  suppliers: any[]
  loading: boolean
  onRefresh: () => void
}

export function SupplierList({ suppliers, loading, onRefresh }: SupplierListProps) {
  const [editSupplier, setEditSupplier] = useState<any>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [viewSupplier, setViewSupplier] = useState<any>(null)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [supplierToDeleteId, setSupplierToDeleteId] = useState<string | null>(null)

  // Handle delete confirmation trigger
  const handleDeleteClick = (id: string) => {
    setSupplierToDeleteId(id)
    setIsConfirmDeleteOpen(true)
  }

  // Handle actual delete after confirmation
  const confirmDelete = async () => {
    if (supplierToDeleteId) {
      try {
        await deleteDoc(doc(db!, "suppliers", supplierToDeleteId))
        toast.success("Supplier deleted successfully")
        onRefresh()
      } catch (error) {
        console.error("Error deleting supplier:", error)
        toast.error("Failed to delete supplier")
      } finally {
        setSupplierToDeleteId(null)
        setIsConfirmDeleteOpen(false)
      }
    }
  }

  // Handle edit
  const handleEdit = (supplier: any) => {
    setEditSupplier(supplier)
    setIsEditOpen(true)
  }

  // Handle view
  const handleView = (supplier: any) => {
    setViewSupplier(supplier)
    setIsViewOpen(true)
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-10 text-gray-500">No suppliers found. Add a new supplier to get started.</div>
      ) : (
        <div className="rounded-md border border-emerald-700">
          <Table>
            <TableHeader>
              <TableRow className="bg-emerald-700 border-b-0 select-none pointer-events-none">
                <TableHead className="text-white font-semibold !cursor-default">Company Name</TableHead>
                <TableHead className="text-white font-semibold !cursor-default">Contact Person</TableHead>
                <TableHead className="text-white font-semibold !cursor-default">Phone Number</TableHead>
                <TableHead className="text-white font-semibold !cursor-default">Email</TableHead>
                <TableHead className="text-white font-semibold !cursor-default">Business Type</TableHead>
                <TableHead className="text-white font-semibold text-right !cursor-default">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier.id} className="border-b border-emerald-700/50">
                  <TableCell className="font-medium">{supplier.companyName}</TableCell>
                  <TableCell>{supplier.contactPerson}</TableCell>
                  <TableCell>{supplier.phoneNumber}</TableCell>
                  <TableCell>{supplier.email}</TableCell>
                  <TableCell>
                    {supplier.businessTypes?.map((type: string) => {
                      const businessType = {
                        manufacturer: "Manufacturer",
                        distributor: "Distributor",
                        wholesaler: "Wholesaler",
                        retailer: "Retailer",
                        serviceProvider: "Service Provider",
                        other: supplier.otherBusinessType || "Other",
                      }[type]
                      return (
                        <span
                          key={type}
                          className="inline-block bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded mr-1 mb-1"
                        >
                          {businessType}
                        </span>
                      )
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleView(supplier)}>
                            <Eye className="h-4 w-4 text-emerald-500" />
                            <span className="sr-only">View Details</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View Details</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(supplier)}>
                            <Edit className="h-4 w-4 text-emerald-500" />
                            <span className="sr-only">Edit</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(supplier.id)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Supplier Form */}
      <SupplierForm open={isEditOpen} onOpenChange={setIsEditOpen} supplier={editSupplier} onSuccess={onRefresh} />

      {/* View Supplier Details */}
      {viewSupplier && <SupplierDetails open={isViewOpen} onOpenChange={setIsViewOpen} supplier={viewSupplier} />}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <AlertDialogContent className="bg-[#FAF8F2] text-[#2F3E2E] border-[#DDD7B1]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#5B8C5A]">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#2F3E2E]">
              This action cannot be undone. This will permanently delete the supplier and remove their data from our
              servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#5B8C5A] text-[#5B8C5A] bg-transparent hover:bg-[#F0EFE9] hover:text-[#4C6529]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
