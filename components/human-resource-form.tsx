"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Plus, Upload, User, Mail, Calendar, Phone, Key, Lock, AlertCircle, MapPin, Briefcase } from "lucide-react"
import { collection, getDocs, setDoc, doc } from "firebase/firestore"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { db, auth } from "@/lib/firebase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

interface HumanResourceFormProps {
  onClose: () => void
}

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
  status?: string
}

interface AccessPoint {
  id: string
  name: string
  description: string
  permissions: string[]
}

export default function HumanResourceForm({ onClose }: HumanResourceFormProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [employees, setEmployees] = useState<Employee[]>([])
  const [accessPoints, setAccessPoints] = useState<AccessPoint[]>([])
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // New employee form state
  const [newEmployee, setNewEmployee] = useState<Employee>({
    name: "",
    email: "",
    phone: "",
    birthday: "",
    idNumber: "",
    address: "",
    location: "",
    position: "",
    department: "",
    contractType: "",
    accessPoints: [],
  })

  // Process image to reduce size and quality
  const processImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          // Create canvas for resizing
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")

          // Calculate new dimensions (maintain aspect ratio)
          const maxWidth = 300
          const maxHeight = 300
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width)
              width = maxWidth
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height)
              height = maxHeight
            }
          }

          // Resize image
          canvas.width = width
          canvas.height = height
          ctx?.drawImage(img, 0, 0, width, height)

          // Convert to base64 with reduced quality (35%)
          const dataUrl = canvas.toDataURL("image/jpeg", 0.35)
          resolve(dataUrl)
        }
        img.onerror = () => {
          reject(new Error("Failed to load image"))
        }
        img.src = event.target?.result as string
      }
      reader.onerror = () => {
        reject(new Error("Failed to read file"))
      }
      reader.readAsDataURL(file)
    })
  }

  // Handle profile image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setUploadingImage(true)

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image is too large. Maximum size is 5MB.")
        return
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file.")
        return
      }

      // Process and resize image
      const processedImage = await processImage(file)
      setProfileImage(processedImage)
    } catch (err) {
      console.error("Error processing image:", err)
      setError("Failed to process image. Please try again.")
    } finally {
      setUploadingImage(false)
    }
  }

  // Remove profile image
  const handleRemoveImage = () => {
    setProfileImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Fetch access points on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch access points
        const accessPointsRef = collection(db!, "accessPoints")
        const accessPointsSnapshot = await getDocs(accessPointsRef)

        const accessPointsList: AccessPoint[] = []
        accessPointsSnapshot.forEach((doc) => {
          const data = doc.data() as AccessPoint
          accessPointsList.push({
            id: doc.id,
            name: data.name,
            description: data.description,
            permissions: data.permissions || [],
          })
        })

        setAccessPoints(accessPointsList)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Failed to load data. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Handle new employee form changes
  const handleNewEmployeeChange = (field: keyof Employee, value: string | string[]) => {
    setNewEmployee((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Toggle access point for new employee
  const toggleNewEmployeeAccessPoint = (accessPointId: string) => {
    setNewEmployee((prev) => {
      const currentAccessPoints = prev.accessPoints || []
      if (currentAccessPoints.includes(accessPointId)) {
        return {
          ...prev,
          accessPoints: currentAccessPoints.filter((id) => id !== accessPointId),
        }
      } else {
        return {
          ...prev,
          accessPoints: [...currentAccessPoints, accessPointId],
        }
      }
    })
  }

  // Validate password
  const validatePassword = () => {
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters long")
      return false
    }

    if (password !== repeatPassword) {
      setPasswordError("Passwords do not match")
      return false
    }

    setPasswordError("")
    return true
  }

  // Add new employee
  const handleAddEmployee = async () => {
    try {
      // Validate inputs
      if (!newEmployee.name.trim()) {
        setError("Employee name is required.")
        return
      }

      if (!newEmployee.email.trim()) {
        setError("Employee email is required.")
        return
      }

      if (!newEmployee.position.trim()) {
        setError("Employee position is required.")
        return
      }

      if (!newEmployee.department.trim()) {
        setError("Employee department is required.")
        return
      }

      if (!newEmployee.contractType.trim()) {
        setError("Employee contract type is required.")
        return
      }

      // Validate password
      if (!validatePassword()) {
        return
      }

      setSaving(true)
      setError("")

      // Check if employee email already exists
      const existingEmployee = employees.find((emp) => emp.email.toLowerCase() === newEmployee.email.toLowerCase())

      if (existingEmployee) {
        setError("An employee with this email already exists.")
        setSaving(false)
        return
      }

      console.log("[v0] Starting employee registration process...")
      console.log("[v0] Email:", newEmployee.email)

      let userCredential
      try {
        if (auth) {
          console.log("[v0] Creating Firebase Auth user...")
          userCredential = await createUserWithEmailAndPassword(auth, newEmployee.email, password)
          console.log("[v0] Firebase Auth user created with UID:", userCredential.user.uid)
        } else {
          throw new Error("Firebase Auth is not initialized.")
        }
      } catch (authError: any) {
        console.error("Error creating user account:", authError)
        if (authError.code === "auth/email-already-in-use") {
          setError("This email is already registered in the authentication system.")
        } else {
          setError(`Failed to create user account: ${authError.message}`)
        }
        setSaving(false)
        return
      }

      const employeeData = {
        uid: userCredential.user.uid, // Store UID in document
        status: "Active", // Default status
        ...newEmployee,
        profileImage: profileImage || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      console.log("[v0] Saving employee data to Firestore with UID as document key...")
      console.log("[v0] Document path: employees/" + userCredential.user.uid)
      console.log("[v0] Employee data:", employeeData)

      await setDoc(doc(db!, "employees", userCredential.user.uid), employeeData)

      console.log("[v0] Employee successfully saved to Firestore!")

      // Update local state
      setEmployees([
        ...employees,
        {
          ...newEmployee,
          id: userCredential.user.uid, // Use UID as ID
          profileImage: profileImage || "",
        },
      ])

      // Reset form
      setNewEmployee({
        name: "",
        email: "",
        phone: "",
        birthday: "",
        idNumber: "",
        address: "",
        location: "",
        position: "",
        department: "",
        contractType: "",
        accessPoints: [],
      })
      setPassword("")
      setRepeatPassword("")
      setProfileImage(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      setSuccess("Employee added successfully with system access!")

      // Reset success message after 3 seconds
      setTimeout(() => {
        setSuccess("")
      }, 3000)
    } catch (err) {
      console.error("Error adding employee:", err)
      setError("Failed to add employee. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-[#F0EAD6] border border-[#DDD7B1] rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#DDD7B1]">
          <h2 className="text-xl font-bold text-[#2F3E2E]">Add New Employee</h2>
          <Button
            variant="ghost"
            size="icon"
            className="text-[#8B8378] hover:text-[#2F3E2E] hover:bg-[#E0D9C0]"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-8">
          {error && <div className="bg-red-500/20 border border-red-500 text-red-700 p-3 rounded-md">{error}</div>}
          {success && (
            <div className="bg-green-500/20 border border-green-500 text-green-700 p-3 rounded-md">{success}</div>
          )}

          {/* Add New Employee Form - Now the main content */}
          <div className="bg-[#E0D9C0] p-8 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-[#2F3E2E] mb-6">Add New Employee & System Account</h3>

            {/* Profile Image Upload */}
            <div className="mb-8">
              <Label className="text-[#2F3E2E] mb-3 block font-medium">Profile Photo</Label>
              <div className="flex items-start gap-6">
                <div className="w-28 h-28 rounded-full overflow-hidden bg-[#D0C9AF] flex items-center justify-center border-2 border-[#C0B89F] shadow-sm">
                  {profileImage ? (
                    <img
                      src={profileImage || "/placeholder.svg"}
                      alt="Profile Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-14 w-14 text-[#8B8378]" />
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex flex-col gap-3">
                    <input
                      type="file"
                      id="profile-image"
                      accept="image/*"
                      onChange={handleImageUpload}
                      ref={fileInputRef}
                      className="hidden"
                    />
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-[#5B8C5A] hover:bg-[#4C6529] text-white flex items-center gap-2 px-4 py-2"
                        disabled={uploadingImage}
                      >
                        {uploadingImage ? (
                          <>
                            <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            Processing...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            {profileImage ? "Change Photo" : "Upload Photo"}
                          </>
                        )}
                      </Button>
                      {profileImage && (
                        <Button
                          type="button"
                          onClick={handleRemoveImage}
                          variant="destructive"
                          className="flex items-center gap-2 px-4 py-2"
                        >
                          <X className="h-4 w-4" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-[#8B8378] leading-relaxed">
                    Upload a profile photo (JPG, PNG). Max size: 5MB. <br />
                    Image will be resized and compressed automatically.
                  </p>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="space-y-6 mb-8">
              <h4 className="text-md font-medium text-[#2F3E2E] border-b border-[#C0B89F] pb-3 flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="newIdNumber" className="text-[#2F3E2E] font-medium">
                    ID Number
                  </Label>
                  <Input
                    id="newIdNumber"
                    value={newEmployee.idNumber}
                    onChange={(e) => handleNewEmployeeChange("idNumber", e.target.value)}
                    className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378] h-11"
                    placeholder="e.g., EMP001"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="newName" className="text-[#2F3E2E] font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Full Name *
                  </Label>
                  <Input
                    id="newName"
                    value={newEmployee.name}
                    onChange={(e) => handleNewEmployeeChange("name", e.target.value)}
                    className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378] h-11"
                    placeholder="e.g., John Doe"
                  />
                </div>

                <div className="space-y-3 lg:col-span-2">
                  <Label htmlFor="newAddress" className="text-[#2F3E2E] font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Address
                  </Label>
                  <Input
                    id="newAddress"
                    value={newEmployee.address}
                    onChange={(e) => handleNewEmployeeChange("address", e.target.value)}
                    className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378] h-11"
                    placeholder="e.g., 123 Main Street, City, State, ZIP"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-6 mb-8">
              <h4 className="text-md font-medium text-[#2F3E2E] border-b border-[#C0B89F] pb-3 flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="newPhone" className="text-[#2F3E2E] font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="newPhone"
                    value={newEmployee.phone}
                    onChange={(e) => handleNewEmployeeChange("phone", e.target.value)}
                    className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378] h-11"
                    placeholder="e.g., +1234567890"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="newEmail" className="text-[#2F3E2E] font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address *
                  </Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => handleNewEmployeeChange("email", e.target.value)}
                    className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378] h-11"
                    placeholder="e.g., john.doe@example.com"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="newBirthday" className="text-[#2F3E2E] font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Birthday
                  </Label>
                  <Input
                    id="newBirthday"
                    type="date"
                    value={newEmployee.birthday}
                    onChange={(e) => handleNewEmployeeChange("birthday", e.target.value)}
                    className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378] h-11"
                  />
                </div>
              </div>
            </div>

            {/* Work Information */}
            <div className="space-y-6 mb-8">
              <h4 className="text-md font-medium text-[#2F3E2E] border-b border-[#C0B89F] pb-3 flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Work Information
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="newLocation" className="text-[#2F3E2E] font-medium">
                    Location (Responsibility Area)
                  </Label>
                  <Input
                    id="newLocation"
                    value={newEmployee.location}
                    onChange={(e) => handleNewEmployeeChange("location", e.target.value)}
                    className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378] h-11"
                    placeholder="MSL, BSWM, or RSL"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="newPosition" className="text-[#2F3E2E] font-medium">
                    Position *
                  </Label>
                  <Input
                    id="newPosition"
                    value={newEmployee.position}
                    onChange={(e) => handleNewEmployeeChange("position", e.target.value)}
                    className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378] h-11"
                    placeholder="e.g., Laboratory Analyst"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="newDepartment" className="text-[#2F3E2E] font-medium">
                    Department *
                  </Label>
                  <Select
                    value={newEmployee.department}
                    onValueChange={(value) => handleNewEmployeeChange("department", value)}
                  >
                    <SelectTrigger className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E] h-11">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E]">
                      <SelectItem value="laboratory">Laboratory</SelectItem>
                      <SelectItem value="logistics">Logistics</SelectItem>
                      <SelectItem value="administration">Administration</SelectItem>
                      <SelectItem value="management">Management</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="newContractType" className="text-[#2F3E2E] font-medium">
                    Contract Type *
                  </Label>
                  <Select
                    value={newEmployee.contractType}
                    onValueChange={(value) => handleNewEmployeeChange("contractType", value)}
                  >
                    <SelectTrigger className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E] h-11">
                      <SelectValue placeholder="Select contract type" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E]">
                      <SelectItem value="Regular/Plantilla">Regular/Plantilla</SelectItem>
                      <SelectItem value="Contract of Service">Contract of Service</SelectItem>
                      <SelectItem value="Job Order">Job Order</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* System Access */}
            <div className="space-y-6">
              <h4 className="text-md font-medium text-[#2F3E2E] border-b border-[#C0B89F] pb-3 flex items-center gap-2">
                <Key className="h-5 w-5" />
                System Access & Security
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="newPassword" className="text-[#2F3E2E] font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Password *
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E] h-11"
                    placeholder="Enter password (min. 6 characters)"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="newRepeatPassword" className="text-[#2F3E2E] font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Repeat Password *
                  </Label>
                  <Input
                    id="newRepeatPassword"
                    type="password"
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                    className="bg-[#F0EAD6] border-[#C0B89F] text-[#2F3E2E] h-11"
                    placeholder="Confirm password"
                  />
                </div>

                {passwordError && (
                  <div className="lg:col-span-2 flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-md">
                    <AlertCircle className="h-4 w-4" />
                    {passwordError}
                  </div>
                )}

                <div className="space-y-4 lg:col-span-2">
                  <Label className="text-[#2F3E2E] font-medium">Access Points</Label>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-[#F0EAD6] p-6 rounded-lg border border-[#C0B89F]">
                    {accessPoints.length > 0 ? (
                      accessPoints.map((point) => (
                        <div key={point.id} className="flex items-center space-x-3">
                          <Checkbox
                            id={`new-access-${point.id}`}
                            checked={newEmployee.accessPoints.includes(point.id)}
                            onCheckedChange={() => toggleNewEmployeeAccessPoint(point.id)}
                            className="border-[#5B8C5A] data-[state=checked]:bg-[#5B8C5A]"
                          />
                          <Label htmlFor={`new-access-${point.id}`} className="text-[#2F3E2E] text-sm cursor-pointer">
                            {point.name}
                          </Label>
                        </div>
                      ))
                    ) : (
                      <div className="text-[#8B8378] text-sm col-span-4 text-center py-4">
                        No access points available. Please add them in Access Point Management.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-[#C0B89F]">
                <Button
                  onClick={handleAddEmployee}
                  className="bg-[#5B8C5A] hover:bg-[#4C6529] text-white flex items-center gap-2 px-6 py-3 h-12 text-base font-medium"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Adding Employee...
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      Add Employee & Create Account
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
