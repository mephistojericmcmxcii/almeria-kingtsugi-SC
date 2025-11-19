"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { z } from "zod"
import { zodResolver } from "@/lib/zod-resolver"
import { useForm, useFieldArray } from "react-hook-form"
import { X, Plus, Upload, FileText } from "lucide-react"
import { doc, setDoc, updateDoc, collection, serverTimestamp, getDocs, query, where } from "firebase/firestore"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { formatNameAsKey } from "@/lib/customer-service" // Import the utility function

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatBytes } from "@/lib/utils"

// Define business types
const businessTypes = [
  { id: "manufacturer", label: "Manufacturer" },
  { id: "distributor", label: "Distributor" },
  { id: "wholesaler", label: "Wholesaler" },
  { id: "retailer", label: "Retailer" },
  { id: "serviceProvider", label: "Service Provider" },
  { id: "other", label: "Other" },
]

// Define document types
const documentTypes = [
  { id: "philgeps", label: "PhilGEPS Certificate of Registration" },
  { id: "businessPermit", label: "Mayor's Business Permit" },
  { id: "taxClearance", label: "Tax Clearance Certificate" },
  { id: "financialStatements", label: "Audited Financial Statements" },
  { id: "swordStatement", label: "Duly Notarized Omnibus Sword Statement" },
  { id: "incomeTaxReturn", label: "Income Tax Return (ITR)" },
  { id: "pcabLicense", label: "Valid PCAB License" },
  { id: "laborLawsCertificate", label: "Certificate of Compliance with Labor Laws" },
]

// Create schema for reference
const referenceSchema = z.object({
  clientName: z.string().min(2, "Client name is required"),
  contactPerson: z.string().min(2, "Contact person is required"),
  phoneNumber: z.string().min(7, "Phone number is required"),
})

// Create schema for document
const documentSchema = z.object({
  type: z.string(),
  fileName: z.string().optional(),
  fileUrl: z.string().optional(),
  fileSize: z.number().optional(),
})

// Create schema for certification
const certificationSchema = z.object({
  type: z.string(),
  certNumber: z.string().optional(),
  fileName: z.string().optional(),
  fileUrl: z.string().optional(),
  fileSize: z.number().optional(),
})

// Create the main form schema
const supplierFormSchema = z
  .object({
    // Company Information
    companyName: z.string().min(2, "Company name is required"), // Changed from 'name'
    address: z.string().min(2, "Address is required"),
    city: z.string().optional(),
    province: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional().default("Philippines"),

    // Contact Information
    contactPerson: z.string().min(2, "Contact person is required"),
    designation: z.string().optional(),
    phoneNumber: z.string().optional(),
    mobileNumber: z.string().optional(),
    email: z.string().optional(),

    // Business Information
    businessTypes: z.array(z.string()).optional(),
    otherBusinessType: z.string().optional(),
    yearEstablished: z.string().optional(),
    businessRegistrationNumber: z.string().optional(),
    taxIdentificationNumber: z.string().optional(),
    philgepsRegistrationNumber: z.string().optional(),

    // Documentary Requirements
    documents: z.array(documentSchema).optional(),

    // Banking Information
    bankName: z.string().optional(),
    bankBranch: z.string().optional(),
    accountName: z.string().optional(),
    accountNumber: z.string().optional(),
    swiftCode: z.string().optional(),

    // Certifications
    certifications: z.array(certificationSchema).optional(),
    laborLawsCompliance: z.boolean().optional(),
    environmentalCompliance: z.boolean().optional(),

    // References
    references: z.array(referenceSchema).optional(),

    // Products/Services
    productsServices: z.string().optional(),
  })
  .refine((data) => data.phoneNumber || data.mobileNumber, {
    message: "Either phone number or mobile number is required",
    path: ["mobileNumber"],
  })

type SupplierFormValues = z.infer<typeof supplierFormSchema>

interface SupplierFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier?: any // Existing supplier data for editing
  onSuccess?: () => void // Callback for successful submission
}

export function SupplierForm({ open, onOpenChange, supplier, onSuccess }: SupplierFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({})
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const isEditing = !!supplier
  const storage = getStorage()

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      // Company Information
      companyName: "",
      address: "",
      city: "",
      province: "",
      postalCode: "",
      country: "Philippines",

      // Contact Information
      contactPerson: "",
      designation: "",
      phoneNumber: "",
      mobileNumber: "",
      email: "",

      // Business Information
      businessTypes: [],
      otherBusinessType: "",
      yearEstablished: "",
      businessRegistrationNumber: "",
      taxIdentificationNumber: "",
      philgepsRegistrationNumber: "",

      // Documentary Requirements
      documents: [],

      // Banking Information
      bankName: "",
      bankBranch: "",
      accountName: "",
      accountNumber: "",
      swiftCode: "",

      // Certifications
      certifications: [],
      laborLawsCompliance: false,
      environmentalCompliance: false,

      // References
      references: [
        { clientName: "", contactPerson: "", phoneNumber: "" },
        { clientName: "", contactPerson: "", phoneNumber: "" },
      ],

      // Products/Services
      productsServices: "",
    },
    mode: "onChange",
  })

  // Use field array for references
  const {
    fields: referenceFields,
    append: appendReference,
    remove: removeReference,
  } = useFieldArray({
    control: form.control,
    name: "references",
  })

  // Handle file upload
  const handleFileUpload = async (file: File, type: string, category: "document" | "certification") => {
    if (!file) return null

    try {
      setUploadingFiles((prev) => ({ ...prev, [type]: true }))

      // Create a reference to the file in Firebase Storage
      const fileRef = ref(storage, `suppliers/${category}/${Date.now()}_${file.name}`)

      // Upload the file
      await uploadBytes(fileRef, file)

      // Get the download URL
      const downloadURL = await getDownloadURL(fileRef)

      setUploadingFiles((prev) => ({ ...prev, [type]: false }))

      return {
        fileName: file.name,
        fileUrl: downloadURL,
        fileSize: file.size,
      }
    } catch (error) {
      console.error(`Error uploading ${category}:`, error)
      toast.error(`Failed to upload ${file.name}`)
      setUploadingFiles((prev) => ({ ...prev, [type]: false }))
      return null
    }
  }

  // Handle document upload
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileData = await handleFileUpload(file, documentType, "document")
    if (!fileData) return

    // Get current documents
    const currentDocuments = form.getValues("documents") || []

    // Check if document of this type already exists
    const existingIndex = currentDocuments.findIndex((doc) => doc.type === documentType)

    if (existingIndex >= 0) {
      // Update existing document
      const updatedDocuments = [...currentDocuments]
      updatedDocuments[existingIndex] = {
        type: documentType,
        ...fileData,
      }
      form.setValue("documents", updatedDocuments, { shouldValidate: true })
    } else {
      // Add new document
      form.setValue(
        "documents",
        [
          ...currentDocuments,
          {
            type: documentType,
            ...fileData,
          },
        ],
        { shouldValidate: true },
      )
    }
  }

  // Handle certification upload
  const handleCertificationUpload = async (e: React.ChangeEvent<HTMLInputElement>, certType: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileData = await handleFileUpload(file, certType, "certification")
    if (!fileData) return

    // Get current certifications
    const currentCertifications = form.getValues("certifications") || []

    // For ISO, check if it already exists
    if (certType === "iso") {
      const existingIndex = currentCertifications.findIndex((cert) => cert.type === "iso")

      if (existingIndex >= 0) {
        // Update existing certification
        const updatedCertifications = [...currentCertifications]
        updatedCertifications[existingIndex] = {
          type: "iso",
          certNumber: form.getValues("certifications")?.[existingIndex]?.certNumber || "",
          ...fileData,
        }
        form.setValue("certifications", updatedCertifications, { shouldValidate: true })
      } else {
        // Add new certification
        form.setValue(
          "certifications",
          [
            ...currentCertifications,
            {
              type: "iso",
              certNumber: "",
              ...fileData,
            },
          ],
          { shouldValidate: true },
        )
      }
    } else {
      // For other certifications, always add a new one
      form.setValue(
        "certifications",
        [
          ...currentCertifications,
          {
            type: "other",
            ...fileData,
          },
        ],
        { shouldValidate: true },
      )
    }
  }

  // Check if supplier companyName already exists
  const checkSupplierNameExists = async (companyName: string, currentSupplierId?: string): Promise<boolean> => {
    if (!companyName.trim()) return false

    const q = query(collection(db, "suppliers"), where("companyName", "==", companyName))
    const querySnapshot = await getDocs(q)

    // If editing, allow the current document's companyName
    if (currentSupplierId && querySnapshot.docs.some((doc) => doc.id === currentSupplierId)) {
      return false
    }

    return !querySnapshot.empty
  }

  // Handle form submission
  async function onSubmit(data: SupplierFormValues) {
    setIsSubmitting(true)
    try {
      const nameExists = await checkSupplierNameExists(data.companyName, isEditing ? supplier.id : undefined)
      if (nameExists) {
        form.setError("companyName", {
          type: "manual",
          message: "This Company Name already exists. Please use a unique name.",
        })
        toast.error("Failed to save supplier: Company name already exists.")
        return
      }

      if (isEditing) {
        // Update existing supplier
        await updateDoc(doc(db, "suppliers", supplier.id), {
          ...data,
          updatedAt: serverTimestamp(),
        })
        toast.success("Supplier updated successfully")
      } else {
        // Create new supplier with companyName as the document ID
        const newSupplierId = formatNameAsKey(data.companyName)
        await setDoc(doc(db, "suppliers", newSupplierId), {
          ...data,
          id: newSupplierId, // Store the ID within the document as well
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        toast.success("Supplier added successfully")
      }

      onOpenChange(false)
      if (onSuccess) onSuccess()
      form.reset()
    } catch (error) {
      console.error("Error saving supplier:", error)
      toast.error("Failed to save supplier")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get document by type
  const getDocumentByType = (type: string) => {
    const documents = form.getValues("documents") || []
    return documents.find((doc) => doc.type === type)
  }

  // Get ISO certification
  const getISOCertification = () => {
    const certifications = form.getValues("certifications") || []
    return certifications.find((cert) => cert.type === "iso")
  }

  // Get other certifications
  const getOtherCertifications = () => {
    const certifications = form.getValues("certifications") || []
    return certifications.filter((cert) => cert.type === "other")
  }

  // Remove document
  const removeDocument = (type: string) => {
    const documents = form.getValues("documents") || []
    const updatedDocuments = documents.filter((doc) => doc.type !== type)
    form.setValue("documents", updatedDocuments, { shouldValidate: true })
  }

  // Remove certification
  const removeCertification = (index: number) => {
    const certifications = form.getValues("certifications") || []
    const updatedCertifications = [...certifications]
    updatedCertifications.splice(index, 1)
    form.setValue("certifications", updatedCertifications, { shouldValidate: true })
  }

  useEffect(() => {
    if (open) {
      // Only reset when the dialog opens
      if (isEditing && supplier) {
        form.reset({
          // Company Information
          companyName: supplier.companyName || "",
          address: supplier.address || supplier.business || "",
          city: supplier.city || "",
          province: supplier.province || "",
          postalCode: supplier.postalCode || "",
          country: supplier.country || "Philippines",

          // Contact Information
          contactPerson: supplier.contactPerson || "",
          designation: supplier.designation || "",
          phoneNumber: supplier.phoneNumber || "",
          mobileNumber: supplier.mobileNumber || "",
          email: supplier.email || "",

          // Business Information
          businessTypes: supplier.businessTypes || [],
          otherBusinessType: supplier.otherBusinessType || "",
          yearEstablished: supplier.yearEstablished || "",
          businessRegistrationNumber: supplier.businessRegistrationNumber || "",
          taxIdentificationNumber: supplier.taxIdentificationNumber || "",
          philgepsRegistrationNumber: supplier.philgepsRegistrationNumber || "",

          // Documentary Requirements
          documents: supplier.documents || [],

          // Banking Information
          bankName: supplier.bankName || "",
          bankBranch: supplier.bankBranch || "",
          accountName: supplier.accountName || "",
          accountNumber: supplier.accountNumber || "",
          swiftCode: supplier.swiftCode || "",

          // Certifications
          certifications: supplier.certifications || [],
          laborLawsCompliance: supplier.laborLawsCompliance || false,
          environmentalCompliance: supplier.environmentalCompliance || false,

          // References
          references: supplier.references || [
            { clientName: "", contactPerson: "", phoneNumber: "" },
            { clientName: "", contactPerson: "", phoneNumber: "" },
          ],

          // Products/Services
          productsServices: supplier.productsServices || "",
        })
      } else {
        // Reset to default values for adding a new supplier
        form.reset({
          companyName: "",
          address: "",
          city: "",
          province: "",
          postalCode: "",
          country: "Philippines",
          contactPerson: "",
          designation: "",
          phoneNumber: "",
          mobileNumber: "",
          email: "",
          businessTypes: [],
          otherBusinessType: "",
          yearEstablished: "",
          businessRegistrationNumber: "",
          taxIdentificationNumber: "",
          philgepsRegistrationNumber: "",
          documents: [],
          bankName: "",
          bankBranch: "",
          accountName: "",
          accountNumber: "",
          swiftCode: "",
          certifications: [],
          laborLawsCompliance: false,
          environmentalCompliance: false,
          references: [
            { clientName: "", contactPerson: "", phoneNumber: "" },
            { clientName: "", contactPerson: "", phoneNumber: "" },
          ],
          productsServices: "",
        })
      }
      form.clearErrors() // Clear any previous errors when opening
    }
  }, [supplier, form, isEditing, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-[#FAF8F2] text-[#2F3E2E] border-[#DDD7B1] p-0">
        <DialogHeader className="p-6 pb-2 bg-[#8B7B6B] rounded-t-lg">
          <DialogTitle className="text-xl font-semibold text-white">
            {isEditing ? "Edit Supplier" : "Add New Supplier"}
          </DialogTitle>
          <DialogDescription className="text-[#F0EFE9]">
            {isEditing ? "Update supplier information in the system." : "Add a new supplier to the system."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[70vh] px-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6 pb-6"
              style={{ outline: "none" }}
              tabIndex={-1}
            >
              <Accordion type="single" collapsible defaultValue="company-info" className="w-full">
                {/* Company Information Section */}
                <AccordionItem value="company-info" className="border-[#DDD7B1]">
                  <AccordionTrigger className="text-[#5B8C5A] hover:text-[#4C6529] hover:no-underline py-4">
                    <h3 className="text-lg font-medium">Company Information</h3>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#5B8C5A]">Company Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter company name"
                                {...field}
                                tabIndex={0}
                                className="bg-[#F0EFE9] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#5B8C5A]"
                              />
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#5B8C5A]">Address</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter complete address"
                                {...field}
                                tabIndex={0}
                                className="bg-[#F0EFE9] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#5B8C5A]"
                              />
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#5B8C5A]">City</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter city"
                                  {...field}
                                  tabIndex={0}
                                  className="bg-[#F0EFE9] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#5B8C5A]"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="province"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#5B8C5A]">Province/State</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter province or state"
                                  {...field}
                                  tabIndex={0}
                                  className="bg-[#F0EFE9] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#5B8C5A]"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="postalCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#5B8C5A]">Postal Code</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter postal code"
                                  {...field}
                                  tabIndex={0}
                                  className="bg-[#F0EFE9] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#5B8C5A]"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#5B8C5A]">Country</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter country"
                                  {...field}
                                  tabIndex={0}
                                  className="bg-[#F0EFE9] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#5B8C5A]"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Contact Information Section */}
                <AccordionItem value="contact-info" className="border-[#DDD7B1]">
                  <AccordionTrigger className="text-[#5B8C5A] hover:text-[#4C6529] hover:no-underline py-4">
                    <h3 className="text-lg font-medium">Contact Information</h3>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="contactPerson"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#5B8C5A]">Contact Person</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter contact person name"
                                  {...field}
                                  tabIndex={0}
                                  className="bg-[#F0EFE9] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#5B8C5A]"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="designation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#5B8C5A]">Designation</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter designation"
                                  {...field}
                                  tabIndex={0}
                                  className="bg-[#F0EFE9] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#5B8C5A]"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="phoneNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#5B8C5A]">Phone Number</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter phone number"
                                  {...field}
                                  tabIndex={0}
                                  className="bg-[#F0EFE9] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#5B8C5A]"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="mobileNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#5B8C5A]">Mobile Number</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter mobile number"
                                  {...field}
                                  tabIndex={0}
                                  className="bg-[#F0EFE9] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#5B8C5A]"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#5B8C5A]">Email Address</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter email address"
                                type="email"
                                {...field}
                                tabIndex={0}
                                className="bg-[#F0EFE9] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#5B8C5A]"
                              />
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Business Information Section */}
                <AccordionItem value="business-info" className="border-[#DDD7B1]">
                  <AccordionTrigger className="text-[#5B8C5A] hover:text-[#4C6529] hover:no-underline py-4">
                    <h3 className="text-lg font-medium">Business Information</h3>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="businessTypes"
                        render={() => (
                          <FormItem>
                            <div className="mb-2">
                              <FormLabel className="text-[#5B8C5A]">Business Type</FormLabel>
                              <FormDescription className="text-[#2F3E2E]">Select all that apply</FormDescription>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {businessTypes.map((type) => (
                                <FormField
                                  key={type.id}
                                  control={form.control}
                                  name="businessTypes"
                                  render={({ field }) => {
                                    return (
                                      <FormItem key={type.id} className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(type.id)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...field.value, type.id])
                                                : field.onChange(field.value?.filter((value) => value !== type.id))
                                            }}
                                            className="border-[#5B8C5A] data-[state=checked]:bg-[#5B8C5A]"
                                          />
                                        </FormControl>
                                        <FormLabel className="text-[#2F3E2E] font-normal">{type.label}</FormLabel>
                                      </FormItem>
                                    )
                                  }}
                                />
                              ))}
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />

                      {form.watch("businessTypes")?.includes("other") && (
                        <FormField
                          control={form.control}
                          name="otherBusinessType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#5B8C5A]">Other Business Type</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Specify other business type"
                                  {...field}
                                  tabIndex={0}
                                  className="bg-[#F0EFE9] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#5B8C5A]"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="yearEstablished"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#5B8C5A]">Year Established</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter year established"
                                  {...field}
                                  tabIndex={0}
                                  className="bg-[#F0EFE9] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#5B8C5A]"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="businessRegistrationNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#5B8C5A]">Business Registration Number</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter business registration number"
                                  {...field}
                                  tabIndex={0}
                                  className="bg-[#F0EFE9] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#5B8C5A]"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="taxIdentificationNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#5B8C5A]">Tax Identification Number (TIN)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter TIN"
                                  {...field}
                                  tabIndex={0}
                                  className="bg-[#F0EFE9] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#5B8C5A]"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="philgepsRegistrationNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#5B8C5A]">PhilGEPS Registration Number</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter PhilGEPS registration number"
                                  {...field}
                                  tabIndex={0}
                                  className="bg-[#F0EFE9] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#5B8C5A]"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Documentary Requirements Section */}
                <AccordionItem value="documentary-requirements" className="border-[#DDD7B1]">
                  <AccordionTrigger className="text-[#5B8C5A] hover:text-[#4C6529] hover:no-underline py-4">
                    <h3 className="text-lg font-medium">Documentary Requirements</h3>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4">
                    <div className="space-y-4">
                      <FormDescription className="text-[#2F3E2E]">
                        Upload required documents if available (PDF or image files)
                      </FormDescription>

                      {documentTypes.map((docType) => (
                        <FormField
                          key={docType.id}
                          control={form.control}
                          name="documents"
                          render={() => (
                            <FormItem className="flex flex-col space-y-2">
                              <FormLabel className="text-[#5B8C5A]">{docType.label}</FormLabel>
                              <div className="flex items-center gap-2">
                                <input
                                  type="file"
                                  id={`document-${docType.id}`}
                                  className="hidden"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) => handleDocumentUpload(e, docType.id)}
                                  ref={(el) => (fileInputRefs.current[`document-${docType.id}`] = el)}
                                />

                                {getDocumentByType(docType.id) ? (
                                  <FormControl>
                                    <div className="flex items-center gap-2 p-2 bg-[#F0EFE9] rounded-md w-full">
                                      <FileText className="h-5 w-5 text-[#5B8C5A]" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[#2F3E2E] truncate">
                                          {getDocumentByType(docType.id)?.fileName}
                                        </p>
                                        <p className="text-xs text-[#2F3E2E]">
                                          {formatBytes(getDocumentByType(docType.id)?.fileSize || 0)}
                                        </p>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-[#5B8C5A] hover:text-red-700 hover:bg-red-100"
                                        onClick={() => removeDocument(docType.id)}
                                      >
                                        <X className="h-4 w-4" />
                                        <span className="sr-only">Remove</span>
                                      </Button>
                                    </div>
                                  </FormControl>
                                ) : (
                                  <FormControl>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="w-full border-[#5B8C5A] text-[#5B8C5A] bg-transparent hover:bg-[#F0EFE9] hover:text-[#4C6529]"
                                      onClick={() => fileInputRefs.current[`document-${docType.id}`]?.click()}
                                      disabled={uploadingFiles[docType.id]}
                                    >
                                      {uploadingFiles[docType.id] ? (
                                        <span className="flex items-center gap-2">
                                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#5B8C5A] border-t-transparent"></span>
                                          Uploading...
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-2">
                                          <Upload className="h-4 w-4" />
                                          Upload {docType.label}
                                        </span>
                                      )}
                                    </Button>
                                  </FormControl>
                                )}
                              </div>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Banking Information Section */}
                <AccordionItem value="banking-info" className="border-[#DDD7B1]">
                  <AccordionTrigger className="text-[#5B8C5A] hover:text-[#4C6529] hover:no-underline py-4">
                    <h3 className="text-lg font-medium">Banking Information</h3>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="bankName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#5B8C5A]">Bank Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter bank name"
                                  {...field}
                                  tabIndex={0}
                                  className="bg-[#F0EFE9] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#5B8C5A]"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="bankBranch"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#5B8C5A]">Branch</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter bank branch"
                                  {...field}
                                  tabIndex={0}
                                  className="bg-[#F0EFE9] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#5B8C5A]"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="accountName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#5B8C5A]">Account Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter account name"
                                  {...field}
                                  tabIndex={0}
                                  className="bg-[#F0EFE9] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#5B8C5A]"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="accountNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#5B8C5A]">Account Number</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter account number"
                                  {...field}
                                  tabIndex={0}
                                  className="bg-[#F0EFE9] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#5B8C5A]"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="swiftCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#5B8C5A]">SWIFT/BIC Code (if applicable)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter SWIFT/BIC code"
                                {...field}
                                tabIndex={0}
                                className="bg-[#F0EFE9] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#5B8C5A]"
                              />
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Certificate of Compliance Section */}
                <AccordionItem value="compliance" className="border-[#DDD7B1]">
                  <AccordionTrigger className="text-[#5B8C5A] hover:text-[#4C6529] hover:no-underline py-4">
                    <h3 className="text-lg font-medium">Certificate of Compliance</h3>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4">
                    <div className="space-y-4">
                      <FormDescription className="text-[#2F3E2E]">
                        Upload certification documents if available
                      </FormDescription>

                      {/* ISO Certification */}
                      <FormField
                        control={form.control}
                        name="certifications"
                        render={() => (
                          <FormItem className="flex flex-col space-y-2">
                            <FormLabel className="text-[#5B8C5A]">ISO Certifications (if any)</FormLabel>
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                id="certification-iso"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => handleCertificationUpload(e, "iso")}
                                ref={(el) => (fileInputRefs.current["certification-iso"] = el)}
                              />

                              {getISOCertification() ? (
                                <FormControl>
                                  <div className="flex items-center gap-2 p-2 bg-[#F0EFE9] rounded-md w-full">
                                    <FileText className="h-5 w-5 text-[#5B8C5A]" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-[#2F3E2E] truncate">
                                        {getISOCertification()?.fileName}
                                      </p>
                                      <p className="text-xs text-[#2F3E2E]">
                                        {formatBytes(getISOCertification()?.fileSize || 0)}
                                      </p>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-[#5B8C5A] hover:text-red-700 hover:bg-red-100"
                                      onClick={() => {
                                        const certifications = form.getValues("certifications") || []
                                        const updatedCertifications = certifications.filter(
                                          (cert) => cert.type !== "iso",
                                        )
                                        form.setValue("certifications", updatedCertifications, { shouldValidate: true })
                                      }}
                                    >
                                      <X className="h-4 w-4" />
                                      <span className="sr-only">Remove</span>
                                    </Button>
                                  </div>
                                </FormControl>
                              ) : (
                                <FormControl>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full border-[#5B8C5A] text-[#5B8C5A] bg-transparent hover:bg-[#F0EFE9] hover:text-[#4C6529]"
                                    onClick={() => fileInputRefs.current["certification-iso"]?.click()}
                                    disabled={uploadingFiles["iso"]}
                                  >
                                    {uploadingFiles["iso"] ? (
                                      <span className="flex items-center gap-2">
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#5B8C5A] border-t-transparent"></span>
                                        Uploading...
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-2">
                                        <Upload className="h-4 w-4" />
                                        Upload ISO Certificate
                                      </span>
                                    )}
                                  </Button>
                                </FormControl>
                              )}
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />

                      {/* Other Certifications */}
                      <FormField
                        control={form.control}
                        name="certifications"
                        render={() => (
                          <FormItem className="flex flex-col space-y-2">
                            <FormLabel className="text-[#5B8C5A]">Other Certifications</FormLabel>
                            <div className="space-y-2">
                              {getOtherCertifications().map((cert, index) => (
                                <div key={index} className="flex items-center gap-2 p-2 bg-[#F0EFE9] rounded-md">
                                  <FileText className="h-5 w-5 text-[#5B8C5A]" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-[#2F3E2E] truncate">{cert.fileName}</p>
                                    <p className="text-xs text-[#2F3E2E]">{formatBytes(cert.fileSize || 0)}</p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-[#5B8C5A] hover:text-red-700 hover:bg-red-100"
                                    onClick={() => {
                                      const certifications = form.getValues("certifications") || []
                                      const isoIndex = certifications.findIndex((c) => c.type === "iso")
                                      const otherCerts = certifications.filter((c) => c.type === "other")

                                      // Remove the specific other certification
                                      otherCerts.splice(index, 1)

                                      // Reconstruct the certifications array
                                      const newCertifications =
                                        isoIndex >= 0 ? [certifications[isoIndex], ...otherCerts] : [...otherCerts]

                                      form.setValue("certifications", newCertifications, { shouldValidate: true })
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Remove</span>
                                  </Button>
                                </div>
                              ))}

                              <FormControl>
                                <div>
                                  <input
                                    type="file"
                                    id="certification-other"
                                    className="hidden"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => handleCertificationUpload(e, "other")}
                                    ref={(el) => (fileInputRefs.current["certification-other"] = el)}
                                  />

                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full border-[#5B8C5A] text-[#5B8C5A] bg-transparent hover:bg-[#F0EFE9] hover:text-[#4C6529]"
                                    onClick={() => fileInputRefs.current["certification-other"]?.click()}
                                    disabled={uploadingFiles["other"]}
                                  >
                                    {uploadingFiles["other"] ? (
                                      <span className="flex items-center gap-2">
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#5B8C5A] border-t-transparent"></span>
                                        Uploading...
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-2">
                                        <Upload className="h-4 w-4" />
                                        Upload Other Certificate
                                      </span>
                                    )}
                                  </Button>
                                </div>
                              </FormControl>
                            </div>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />

                      <Separator className="bg-[#DDD7B1] my-4" />

                      {/* Compliance Checkboxes */}
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="laborLawsCompliance"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  className="border-[#5B8C5A] data-[state=checked]:bg-[#5B8C5A]"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-[#2F3E2E]">
                                  Compliance with national labor laws and regulations
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="environmentalCompliance"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  className="border-[#5B8C5A] data-[state=checked]:bg-[#5B8C5A]"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-[#2F3E2E]">Environmental Compliance Certificate</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* References Section */}
                <AccordionItem value="references" className="border-[#DDD7B1]">
                  <AccordionTrigger className="text-[#5B8C5A] hover:text-[#4C6529] hover:no-underline py-4">
                    <h3 className="text-lg font-medium">References</h3>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4">
                    <div className="space-y-4">
                      <FormDescription className="text-[#2F3E2E]">
                        Provide at least 2 references (maximum 3)
                      </FormDescription>

                      {referenceFields.map((field, index) => (
                        <div key={field.id} className="space-y-4 p-4 bg-[#F0EFE9] rounded-md relative">
                          <div className="absolute right-2 top-2">
                            {index > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-[#5B8C5A] hover:text-red-700 hover:bg-red-100"
                                onClick={() => removeReference(index)}
                              >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Remove</span>
                              </Button>
                            )}
                          </div>

                          <h4 className="font-medium text-[#5B8C5A]">Reference {index + 1}</h4>

                          <FormField
                            control={form.control}
                            name={`references.${index}.clientName`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[#5B8C5A]">Client Name</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter client name"
                                    {...field}
                                    tabIndex={0}
                                    className="bg-[#FAF8F2] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#5B8C5A]"
                                  />
                                </FormControl>
                                <FormMessage className="text-red-400" />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`references.${index}.contactPerson`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[#5B8C5A]">Contact Person</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter contact person"
                                    {...field}
                                    tabIndex={0}
                                    className="bg-[#FAF8F2] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#5B8C5A]"
                                  />
                                </FormControl>
                                <FormMessage className="text-red-400" />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`references.${index}.phoneNumber`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[#5B8C5A]">Phone Number</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter phone number"
                                    {...field}
                                    tabIndex={0}
                                    className="bg-[#FAF8F2] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#5B8C5A]"
                                  />
                                </FormControl>
                                <FormMessage className="text-red-400" />
                              </FormItem>
                            )}
                          />
                        </div>
                      ))}

                      {referenceFields.length < 3 && (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-[#5B8C5A] text-[#5B8C5A] bg-transparent hover:bg-[#F0EFE9] hover:text-[#4C6529]"
                          onClick={() => appendReference({ clientName: "", contactPerson: "", phoneNumber: "" })}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Reference
                        </Button>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Products/Services Section */}
                <AccordionItem value="products-services" className="border-[#DDD7B1]">
                  <AccordionTrigger className="text-[#5B8C5A] hover:text-[#4C6529] hover:no-underline py-4">
                    <h3 className="text-lg font-medium">Products/Services Offered</h3>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4">
                    <FormField
                      control={form.control}
                      name="productsServices"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#5B8C5A]">Products/Services Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe the products or services offered by this supplier"
                              {...field}
                              tabIndex={0}
                              className="bg-[#F0EFE9] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#5B8C5A] min-h-[150px]"
                            />
                          </FormControl>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="border-[#5B8C5A] text-[#5B8C5A] bg-transparent hover:bg-[#F0EFE9] hover:text-[#4C6529]"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-[#5B8C5A] hover:bg-[#4C6529] text-white">
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                      {isEditing ? "Updating..." : "Saving..."}
                    </span>
                  ) : isEditing ? (
                    "Update Supplier"
                  ) : (
                    "Add Supplier"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
