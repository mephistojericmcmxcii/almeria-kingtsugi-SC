"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Phone, Camera } from "lucide-react"
import { doc, updateDoc, setDoc, query, collection, where, getDocs } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { updateEmail } from "firebase/auth"
import { db, storage, auth } from "@/lib/firebase"

interface Employee {
  name: string
  address: string
  phone: string
  email: string
  birthday: string
  profileImage?: string // renamed from profilePicture to profileImage
}

interface EmployeeUpdateProfileProps {
  isOpen: boolean
  onClose: () => void
  currentUser: any
}

export default function EmployeeUpdateProfile({ isOpen, onClose, currentUser }: EmployeeUpdateProfileProps) {
  const [employee, setEmployee] = useState<Employee>({
    name: "",
    address: "",
    phone: "",
    email: "",
    birthday: "",
    profileImage: "", // renamed from profilePicture to profileImage
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [isNewProfile, setIsNewProfile] = useState(false)
  const [employeeDocId, setEmployeeDocId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && currentUser?.email) {
      console.log("[v0] Modal opened, fetching employee data...")
      console.log("[v0] Current user:", {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
      })
      fetchEmployeeData()
    }
  }, [isOpen, currentUser?.email])

  const fetchEmployeeData = async () => {
    if (!currentUser?.email) {
      console.log("[v0] No user email available")
      return
    }

    setLoading(true)
    try {
      console.log("[v0] Querying employees collection for email:", currentUser.email)
      const employeesQuery = query(collection(db, "employees"), where("email", "==", currentUser.email))

      const querySnapshot = await getDocs(employeesQuery)

      if (!querySnapshot.empty) {
        const employeeDoc = querySnapshot.docs[0]
        const data = employeeDoc.data()
        const docId = employeeDoc.id

        console.log("[v0] Employee document found with ID:", docId)
        console.log("[v0] Employee data:", data)

        setEmployeeDocId(docId)
        setIsNewProfile(false)

        setEmployee({
          name: data.name || "",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || currentUser.email || "",
          birthday: data.birthday || "",
          profileImage: data.profileImage || data.profilePicture || "", // prioritize profileImage over profilePicture
        })
      } else {
        console.log("[v0] No employee document found for email, creating new profile")
        setEmployeeDocId(null)
        setIsNewProfile(true)

        const fallbackData = {
          name: currentUser.displayName || "",
          address: "",
          phone: "",
          email: currentUser.email || "",
          birthday: "",
          profileImage: currentUser.photoURL || "", // renamed from profilePicture to profileImage
        }

        console.log("[v0] Setting up new profile with auth data:", fallbackData)
        setEmployee(fallbackData)
      }
    } catch (error) {
      console.error("[v0] Error fetching employee data:", error)
      setEmployeeDocId(null)
      setIsNewProfile(true)

      setEmployee({
        name: currentUser.displayName || "",
        address: "",
        phone: "",
        email: currentUser.email || "",
        birthday: "",
        profileImage: currentUser.photoURL || "", // renamed from profilePicture to profileImage
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof Employee, value: string) => {
    console.log(`[v0] Updating ${field} to:`, value)
    setEmployee((prev) => ({ ...prev, [field]: value }))
  }

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !currentUser?.uid) return

    setUploadingImage(true)
    try {
      console.log("[v0] Uploading profile picture...")
      const imageRef = ref(storage, `profile-pictures/${currentUser.uid}/${Date.now()}-${file.name}`)
      await uploadBytes(imageRef, file)
      const downloadURL = await getDownloadURL(imageRef)
      console.log("[v0] Profile picture uploaded:", downloadURL)
      setEmployee((prev) => ({ ...prev, profileImage: downloadURL })) // renamed from profilePicture to profileImage
    } catch (error) {
      console.error("[v0] Error uploading profile picture:", error)
      alert("Failed to upload profile picture. Please try again.")
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSave = async () => {
    if (!currentUser?.email) {
      alert("Unable to save: User not authenticated")
      return
    }

    if (!employee.name.trim()) {
      alert("Please enter your full name")
      return
    }

    if (!employee.email.trim()) {
      alert("Please enter your email address")
      return
    }

    setSaving(true)
    try {
      console.log("[v0] Saving employee data:", employee)

      const emailChanged = currentUser.email !== employee.email
      console.log("[v0] Email change check:", {
        currentEmail: currentUser.email,
        newEmail: employee.email,
        emailChanged: emailChanged,
      })

      if (emailChanged) {
        console.log("[v0] Email changed, updating Firebase Auth email from", currentUser.email, "to", employee.email)
        try {
          if (auth.currentUser) {
            console.log("[v0] Attempting to update Firebase Auth email...")
            await updateEmail(auth.currentUser, employee.email)
            console.log("[v0] Firebase Auth email updated successfully")
          } else {
            console.error("[v0] No current user in Firebase Auth")
            throw new Error("No authenticated user found")
          }
        } catch (authError: any) {
          console.error("[v0] Error updating Firebase Auth email:", authError)

          if (authError.code === "auth/requires-recent-login") {
            alert("For security reasons, please log out and log back in before changing your email address.")
            setSaving(false)
            return
          } else if (authError.code === "auth/email-already-in-use") {
            alert("This email address is already in use by another account.")
            setSaving(false)
            return
          } else if (authError.code === "auth/invalid-email") {
            alert("Please enter a valid email address.")
            setSaving(false)
            return
          } else {
            alert("Failed to update your login email. Please try again or contact support if the problem persists.")
            setSaving(false)
            return
          }
        }
      }

      if (employeeDocId) {
        console.log("[v0] Updating existing employee document:", employeeDocId)
        const employeeRef = doc(db, "employees", employeeDocId)
        await updateDoc(employeeRef, {
          ...employee,
          updatedAt: new Date(),
        })
        console.log("[v0] Employee profile updated successfully")
      } else {
        console.log("[v0] Creating new employee document")
        const employeesRef = collection(db, "employees")
        const newEmployeeRef = doc(employeesRef)
        await setDoc(newEmployeeRef, {
          ...employee,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        setEmployeeDocId(newEmployeeRef.id)
        console.log("[v0] Employee profile created successfully with ID:", newEmployeeRef.id)
      }

      if (emailChanged) {
        alert(
          "Profile saved successfully! Your login email has also been updated. Please log out and log back in with your new email address to ensure everything works properly.",
        )
      } else {
        alert("Profile saved successfully!")
      }
      onClose()
    } catch (error) {
      console.error("[v0] Error saving employee profile:", error)
      alert("Failed to save profile. Please check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!isOpen) {
      setEmployee({
        name: "",
        address: "",
        phone: "",
        email: "",
        birthday: "",
        profileImage: "", // renamed from profilePicture to profileImage
      })
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#F0EAD6] border-[#DDD7B1]">
        <DialogHeader>
          <DialogTitle className="text-[#2F3E2E] text-xl font-semibold flex items-center gap-2">
            <User className="h-5 w-5 text-[#5B8C5A]" />
            {isNewProfile ? "Create Your Profile" : "Update Profile"}
          </DialogTitle>
          {isNewProfile && (
            <p className="text-sm text-[#8B8378] mt-2">
              Welcome! Please fill in your information to create your employee profile.
            </p>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="text-[#2F3E2E]">Loading profile data...</div>
          </div>
        ) : (
          <div className="space-y-8 py-4">
            {isNewProfile && (
              <div className="p-4 bg-[#E8F5E8] border border-[#5B8C5A] rounded-lg">
                <p className="text-sm text-[#2F3E2E]">
                  <strong>New Profile:</strong> Your email has been pre-filled from your account. Please complete the
                  remaining fields to set up your employee profile.
                </p>
              </div>
            )}

            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-[#D0C9AF]">
                <Camera className="h-4 w-4 text-[#5B8C5A]" />
                <h3 className="text-lg font-medium text-[#2F3E2E]">Profile Picture</h3>
              </div>

              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-[#E0D9C0] border-2 border-[#D0C9AF] flex items-center justify-center overflow-hidden">
                    {employee.profileImage ? ( // renamed from profilePicture to profileImage
                      <img
                        src={employee.profileImage || "/placeholder.svg"} // renamed from profilePicture to profileImage
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-12 w-12 text-[#8B8378]" />
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profilePicture" className="text-[#2F3E2E] font-medium">
                    Upload New Picture
                  </Label>
                  <Input
                    id="profilePicture"
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureUpload}
                    disabled={uploadingImage}
                    className="bg-[#E0D9C0] border-[#D0C9AF] text-[#2F3E2E] h-11"
                  />
                  {uploadingImage && <p className="text-sm text-[#8B8378]">Uploading...</p>}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-[#D0C9AF]">
                <User className="h-4 w-4 text-[#5B8C5A]" />
                <h3 className="text-lg font-medium text-[#2F3E2E]">Personal Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-[#2F3E2E] font-medium">
                    Full Name *
                  </Label>
                  <Input
                    id="name"
                    value={employee.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="bg-[#E0D9C0] border-[#D0C9AF] text-[#2F3E2E] h-11"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="birthday" className="text-[#2F3E2E] font-medium">
                    Birthday
                  </Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={employee.birthday}
                    onChange={(e) => handleInputChange("birthday", e.target.value)}
                    className="bg-[#E0D9C0] border-[#D0C9AF] text-[#2F3E2E] h-11"
                  />
                </div>

                <div className="space-y-3 md:col-span-2">
                  <Label htmlFor="address" className="text-[#2F3E2E] font-medium">
                    Address
                  </Label>
                  <Input
                    id="address"
                    value={employee.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    className="bg-[#E0D9C0] border-[#D0C9AF] text-[#2F3E2E] h-11"
                    placeholder="Enter your complete address"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-[#D0C9AF]">
                <Phone className="h-4 w-4 text-[#5B8C5A]" />
                <h3 className="text-lg font-medium text-[#2F3E2E]">Contact Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="phone" className="text-[#2F3E2E] font-medium">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={employee.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className="bg-[#E0D9C0] border-[#D0C9AF] text-[#2F3E2E] h-11"
                    placeholder="Enter your phone number"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="email" className="text-[#2F3E2E] font-medium">
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={employee.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="bg-[#E0D9C0] border-[#D0C9AF] text-[#2F3E2E] h-11"
                    placeholder="Enter your email address"
                    required
                  />
                </div>
              </div>
            </div>

            {process.env.NODE_ENV === "development" && (
              <div className="p-4 bg-[#E0D9C0] rounded border border-[#D0C9AF]">
                <h4 className="text-sm font-medium text-[#2F3E2E] mb-2">Debug Info:</h4>
                <pre className="text-xs text-[#4A5C49] overflow-auto">
                  {JSON.stringify(
                    {
                      currentUserUID: currentUser?.uid,
                      currentUserEmail: currentUser?.email,
                      employeeData: employee,
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>
            )}

            <div className="flex justify-end gap-4 pt-6 border-t border-[#D0C9AF]">
              <Button
                onClick={onClose}
                variant="outline"
                className="bg-transparent border-[#D0C9AF] text-[#2F3E2E] hover:bg-[#E0D9C0]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !employee.name.trim() || !employee.email.trim()}
                className="bg-[#5B8C5A] hover:bg-[#4A7549] text-white"
              >
                {saving ? "Saving..." : isNewProfile ? "Create Profile" : "Save Changes"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
