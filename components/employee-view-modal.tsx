"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { User, Mail, Phone, Calendar, Building, Briefcase, MapPin, FileText, Eye } from "lucide-react"
import { useEffect, useState } from "react"
import { collection, getDocs, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface Employee {
  id?: string
  name: string
  email: string
  phone?: string
  birthday?: string
  idNumber?: string
  address?: string
  location?: string
  position: string
  department: string
  contractType: string
  accessPoints: string[]
  profileImage?: string
  createdAt?: Date
  updatedAt?: Date
  documents?: Document[]
}

interface Document {
  id: string
  type: string
  fileName: string
  fileUrl: string
  uploadDate: string
}

interface EmployeeViewModalProps {
  employee: Employee | null
  isOpen: boolean
  onClose: () => void
}

export default function EmployeeViewModal({ employee, isOpen, onClose }: EmployeeViewModalProps) {
  const [accessPointNames, setAccessPointNames] = useState<Record<string, string>>({})
  const [loadingAccessPoints, setLoadingAccessPoints] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])

  useEffect(() => {
    const fetchAccessPointNames = async () => {
      if (!isOpen || !employee?.accessPoints?.length) return

      setLoadingAccessPoints(true)
      try {
        const accessPointsRef = collection(db, "accessPoints")
        const snapshot = await getDocs(accessPointsRef)
        const namesMap: Record<string, string> = {}

        snapshot.forEach((doc) => {
          const data = doc.data()
          namesMap[doc.id] = data.name || data.title || doc.id
        })

        setAccessPointNames(namesMap)
      } catch (error) {
        console.error("Error fetching access points:", error)
      } finally {
        setLoadingAccessPoints(false)
      }
    }

    const fetchDocuments = async () => {
      if (!isOpen || !employee?.id) return

      try {
        const employeeDoc = await getDoc(doc(db, "employees", employee.id))
        if (employeeDoc.exists()) {
          const data = employeeDoc.data()
          setDocuments(data.documents || [])
        }
      } catch (error) {
        console.error("Error fetching documents:", error)
      }
    }

    fetchAccessPointNames()
    fetchDocuments()
  }, [isOpen, employee?.id, employee?.accessPoints])

  const handleViewDocument = (fileUrl: string, fileName: string) => {
    // Open PDF in new tab
    window.open(fileUrl, "_blank")
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not provided"
    return new Date(dateString).toLocaleDateString()
  }

  const formatDepartment = (department: string) => {
    return department.charAt(0).toUpperCase() + department.slice(1)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-[#FAF8F2] border-[#DDD7B1]">
        <DialogHeader>
          <DialogTitle className="text-[#2F3E2E] flex items-center gap-2">
            <User className="h-5 w-5 text-[#5B8C5A]" />
            Employee Details
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-[#F0EAD6]">
            <TabsTrigger value="info" className="data-[state=active]:bg-[#5B8C5A] data-[state=active]:text-white">
              Employee Info
            </TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-[#5B8C5A] data-[state=active]:text-white">
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6 mt-6">
            {/* Profile Section */}
            <div className="flex items-center gap-4 p-4 bg-[#adfca4] rounded-lg">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-[#5B8C5A] flex items-center justify-center">
                {employee?.profileImage ? (
                  <img
                    src={employee.profileImage || "/placeholder.svg"}
                    alt={employee?.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-8 w-8 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-[#2F3E2E]">{employee?.name}</h3>
                {employee?.idNumber && <p className="text-sm text-[#5B8C5A]">ID: {employee.idNumber}</p>}
                <p className="text-[#5B8C5A] flex items-center gap-1">
                  <Briefcase className="h-4 w-4" />
                  {employee?.position}
                </p>
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-1">Contact Information</h4>

                <div className="flex items-center gap-2 text-[#2F3E2E]">
                  <Mail className="h-4 w-4 text-[#5B8C5A]" />
                  <span className="text-sm">{employee?.email}</span>
                </div>

                {employee?.phone && (
                  <div className="flex items-center gap-2 text-[#2F3E2E]">
                    <Phone className="h-4 w-4 text-[#5B8C5A]" />
                    <span className="text-sm">{employee.phone}</span>
                  </div>
                )}

                {employee?.birthday && (
                  <div className="flex items-center gap-2 text-[#2F3E2E]">
                    <Calendar className="h-4 w-4 text-[#5B8C5A]" />
                    <span className="text-sm">{formatDate(employee.birthday)}</span>
                  </div>
                )}

                {employee?.address && (
                  <div className="flex items-center gap-2 text-[#2F3E2E]">
                    <MapPin className="h-4 w-4 text-[#5B8C5A]" />
                    <span className="text-sm">{employee.address}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-1">Work Information</h4>

                <div className="flex items-center gap-2 text-[#2F3E2E]">
                  <Building className="h-4 w-4 text-[#5B8C5A]" />
                  <span className="text-sm">{employee?.department ? formatDepartment(employee.department) : ""}</span>
                </div>

                <div className="flex items-center gap-2 text-[#2F3E2E]">
                  <Briefcase className="h-4 w-4 text-[#5B8C5A]" />
                  <span className="text-sm">{employee?.position}</span>
                </div>

                {employee?.location && (
                  <div className="flex items-center gap-2 text-[#2F3E2E]">
                    <MapPin className="h-4 w-4 text-[#5B8C5A]" />
                    <span className="text-sm">Location: {employee.location}</span>
                  </div>
                )}

                {employee?.contractType && (
                  <div className="flex items-center gap-2 text-[#2F3E2E]">
                    <FileText className="h-4 w-4 text-[#5B8C5A]" />
                    <span className="text-sm">Contract: {employee.contractType}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Access Points */}
            <div className="space-y-3">
              <h4 className="font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-1 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#5B8C5A]" />
                System Access Points
              </h4>
              <div className="flex flex-wrap gap-2">
                {loadingAccessPoints ? (
                  <span className="text-sm text-[#5B8C5A] italic">Loading access points...</span>
                ) : employee?.accessPoints?.length > 0 ? (
                  employee.accessPoints.map((pointId, index) => (
                    <Badge key={index} variant="secondary" className="bg-[#adfca4] text-[#2F3E2E] hover:bg-[#9AE693]">
                      {accessPointNames[pointId] || pointId}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-[#5B8C5A] italic">No access points assigned</span>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6 mt-6">
            <div className="space-y-4">
              <h4 className="font-medium text-[#2F3E2E] border-b border-[#DDD7B1] pb-1 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#5B8C5A]" />
                Employee Documents
              </h4>

              <div className="border border-[#DDD7B1] rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#F0EAD6] hover:bg-[#F0EAD6]">
                      <TableHead className="text-[#2F3E2E] font-medium">Document Type</TableHead>
                      <TableHead className="text-[#2F3E2E] font-medium">File Name</TableHead>
                      <TableHead className="text-[#2F3E2E] font-medium">Upload Date</TableHead>
                      <TableHead className="text-[#2F3E2E] font-medium text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.length > 0 ? (
                      documents.map((doc) => (
                        <TableRow key={doc.id} className="hover:bg-[#FAF8F2]">
                          <TableCell className="text-[#2F3E2E] font-medium">{doc.type}</TableCell>
                          <TableCell className="text-[#5B8C5A]">{doc.fileName}</TableCell>
                          <TableCell className="text-[#5B8C5A]">{formatDate(doc.uploadDate)}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDocument(doc.fileUrl, doc.fileName)}
                              className="border-[#5B8C5A] text-[#5B8C5A] hover:bg-[#5B8C5A] hover:text-white"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-[#5B8C5A] italic py-8">
                          No documents uploaded yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-[#DDD7B1]">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#DDD7B1] text-[#5B8C5A] hover:bg-[#F0EAD6] bg-transparent"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
