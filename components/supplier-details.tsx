"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { formatBytes } from "@/lib/utils"
import { FileText } from "lucide-react"

interface SupplierDetailsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: any
}

const documentTypes = [
  { id: "philgeps" },
  { id: "businessPermit" },
  { id: "taxClearance" },
  { id: "financialStatements" },
  { id: "swordStatement" },
  { id: "incomeTaxReturn" },
  { id: "pcabLicense" },
  { id: "laborLawsCertificate" },
]

const docTypeLabels: { [key: string]: string } = {
  philgeps: "PhilGEPS Certificate of Registration",
  businessPermit: "Mayor's Business Permit",
  taxClearance: "Tax Clearance Certificate",
  financialStatements: "Audited Financial Statements",
  swordStatement: "Duly Notarized Omnibus Sword Statement",
  incomeTaxReturn: "Income Tax Return (ITR)",
  pcabLicense: "Valid PCAB License",
  laborLawsCertificate: "Certificate of Compliance with Labor Laws",
}

export function SupplierDetails({ open, onOpenChange, supplier }: SupplierDetailsProps) {
  if (!supplier) return null

  const getDocumentByType = (type: string) => {
    return supplier.documents?.find((doc: any) => doc.type === type)
  }

  const getISOCertification = () => {
    return supplier.certifications?.find((cert: any) => cert.type === "iso")
  }

  const getOtherCertifications = () => {
    return supplier.certifications?.filter((cert: any) => cert.type === "other") || []
  }

  const businessTypeLabels: { [key: string]: string } = {
    manufacturer: "Manufacturer",
    distributor: "Distributor",
    wholesaler: "Wholesaler",
    retailer: "Retailer",
    serviceProvider: "Service Provider",
    other: supplier.otherBusinessType || "Other",
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-[#FAF8F2] text-[#2F3E2E] border-[#DDD7B1] p-0">
        <DialogHeader className="p-6 pb-2 bg-[#8B7B6B] rounded-t-lg">
          <DialogTitle className="text-xl font-semibold text-white">Supplier Details</DialogTitle>
          <DialogDescription className="text-[#F0EFE9]">
            Comprehensive information about {supplier.companyName}.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[70vh] px-6 py-4">
          <div className="space-y-6">
            {/* Company Information */}
            <section>
              <h3 className="text-lg font-medium text-[#5B8C5A] mb-3">Company Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-[#2F3E2E]">Company Name:</p>
                  <p>{supplier.companyName}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#2F3E2E]">Address:</p>
                  <p>{supplier.address}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#2F3E2E]">City:</p>
                  <p>{supplier.city || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#2F3E2E]">Province/State:</p>
                  <p>{supplier.province || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#2F3E2E]">Postal Code:</p>
                  <p>{supplier.postalCode || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#2F3E2E]">Country:</p>
                  <p>{supplier.country || "N/A"}</p>
                </div>
              </div>
            </section>

            <Separator className="bg-[#DDD7B1]" />

            {/* Contact Information */}
            <section>
              <h3 className="text-lg font-medium text-[#5B8C5A] mb-3">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-[#2F3E2E]">Contact Person:</p>
                  <p>{supplier.contactPerson}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#2F3E2E]">Designation:</p>
                  <p>{supplier.designation || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#2F3E2E]">Phone Number:</p>
                  <p>{supplier.phoneNumber || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#2F3E2E]">Mobile Number:</p>
                  <p>{supplier.mobileNumber || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#2F3E2E]">Email Address:</p>
                  <p>{supplier.email || "N/A"}</p>
                </div>
              </div>
            </section>

            <Separator className="bg-[#DDD7B1]" />

            {/* Business Information */}
            <section>
              <h3 className="text-lg font-medium text-[#5B8C5A] mb-3">Business Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-[#2F3E2E]">Business Types:</p>
                  <p>
                    {supplier.businessTypes && supplier.businessTypes.length > 0
                      ? supplier.businessTypes.map((type: string) => businessTypeLabels[type]).join(", ")
                      : "N/A"}
                  </p>
                </div>
                {supplier.businessTypes?.includes("other") && (
                  <div>
                    <p className="font-semibold text-[#2F3E2E]">Other Business Type:</p>
                    <p>{supplier.otherBusinessType || "N/A"}</p>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-[#2F3E2E]">Year Established:</p>
                  <p>{supplier.yearEstablished || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#2F3E2E]">Business Registration Number:</p>
                  <p>{supplier.businessRegistrationNumber || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#2F3E2E]">Tax Identification Number (TIN):</p>
                  <p>{supplier.taxIdentificationNumber || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#2F3E2E]">PhilGEPS Registration Number:</p>
                  <p>{supplier.philgepsRegistrationNumber || "N/A"}</p>
                </div>
              </div>
            </section>

            <Separator className="bg-[#DDD7B1]" />

            {/* Documentary Requirements */}
            <section>
              <h3 className="text-lg font-medium text-[#5B8C5A] mb-3">Documentary Requirements</h3>
              <div className="space-y-2 text-sm">
                {documentTypes.map((docType) => {
                  const doc = getDocumentByType(docType.id)
                  return (
                    <div key={docType.id}>
                      <p className="font-semibold text-[#2F3E2E]">{docTypeLabels[docType.id]}:</p>
                      {doc ? (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-[#5B8C5A]" />
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {doc.fileName} ({formatBytes(doc.fileSize)})
                          </a>
                        </div>
                      ) : (
                        <p>N/A</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            <Separator className="bg-[#DDD7B1]" />

            {/* Banking Information */}
            <section>
              <h3 className="text-lg font-medium text-[#5B8C5A] mb-3">Banking Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-[#2F3E2E]">Bank Name:</p>
                  <p>{supplier.bankName || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#2F3E2E]">Branch:</p>
                  <p>{supplier.bankBranch || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#2F3E2E]">Account Name:</p>
                  <p>{supplier.accountName || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#2F3E2E]">Account Number:</p>
                  <p>{supplier.accountNumber || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#2F3E2E]">SWIFT/BIC Code:</p>
                  <p>{supplier.swiftCode || "N/A"}</p>
                </div>
              </div>
            </section>

            <Separator className="bg-[#DDD7B1]" />

            {/* Certifications */}
            <section>
              <h3 className="text-lg font-medium text-[#5B8C5A] mb-3">Certifications</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="font-semibold text-[#2F3E2E]">ISO Certifications:</p>
                  {getISOCertification() ? (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#5B8C5A]" />
                      <a
                        href={getISOCertification().fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {getISOCertification().fileName} ({formatBytes(getISOCertification().fileSize)})
                      </a>
                    </div>
                  ) : (
                    <p>N/A</p>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-[#2F3E2E]">Other Certifications:</p>
                  {getOtherCertifications().length > 0 ? (
                    <div className="space-y-1">
                      {getOtherCertifications().map((cert: any, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-[#5B8C5A]" />
                          <a
                            href={cert.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {cert.fileName} ({formatBytes(cert.fileSize)})
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>N/A</p>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-[#2F3E2E]">Compliance with Labor Laws:</p>
                  <p>{supplier.laborLawsCompliance ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#2F3E2E]">Environmental Compliance Certificate:</p>
                  <p>{supplier.environmentalCompliance ? "Yes" : "No"}</p>
                </div>
              </div>
            </section>

            <Separator className="bg-[#DDD7B1]" />

            {/* References */}
            <section>
              <h3 className="text-lg font-medium text-[#5B8C5A] mb-3">References</h3>
              <div className="space-y-4 text-sm">
                {supplier.references && supplier.references.length > 0 ? (
                  supplier.references.map((ref: any, index: number) => (
                    <div key={index} className="p-3 bg-[#F0EFE9] rounded-md">
                      <h4 className="font-semibold text-[#5B8C5A]">Reference {index + 1}</h4>
                      <p>
                        <span className="font-medium">Client Name:</span> {ref.clientName || "N/A"}
                      </p>
                      <p>
                        <span className="font-medium">Contact Person:</span> {ref.contactPerson || "N/A"}
                      </p>
                      <p>
                        <span className="font-medium">Phone Number:</span> {ref.phoneNumber || "N/A"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p>N/A</p>
                )}
              </div>
            </section>

            <Separator className="bg-[#DDD7B1]" />

            {/* Products/Services */}
            <section>
              <h3 className="text-lg font-medium text-[#5B8C5A] mb-3">Products/Services Offered</h3>
              <p className="text-sm">{supplier.productsServices || "N/A"}</p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
