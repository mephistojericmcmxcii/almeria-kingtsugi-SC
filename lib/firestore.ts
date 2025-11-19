import { initializeApp, getApps, getApp } from "firebase/app"
import {
  getFirestore, // Import getFirestore
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  updateDoc,
  Timestamp,
  orderBy,
  limit,
} from "firebase/firestore"
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth" // Corrected imports
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
export const db = getFirestore(app) // Initialize and export db here
export const auth = getAuth(app)
const storage = getStorage(app)

// Types for Firestore documents
export interface DashboardCounts {
  totalSamples: number
  activeTests: number
  inventoryItems: number
  staffMembers: number
}

export interface EventDocument {
  id: string
  title: string
  date: Date
  location: string
  type: string
  description?: string
  preparation?: string
  targetAudience?: string
  priority?: string
  organizer?: {
    name: string
    avatar?: string
  }
}

export interface HallOfFameEntry {
  id: string
  name: string
  achievement: string
  date: string // Assuming this is a string like "YYYY-MM-DD" or similar
  avatar: string
  badge: string
  about?: string
  createdAt: Timestamp // For ordering
}

export interface FarmerProfileDocument {
  id: string
  name: string
  birthday: string // YYYY-MM-DD format
  contactNo?: string
  emailAddress?: string
  // Add other fields as necessary
}

export interface IndividualSampleData {
  customSampleId: string
  remark: string
  status: string
  createdAt: string
  preparedBy?: string
  prepMethod?: string
  lsrfNo?: string
}

export interface FarmerDetailInFirestore {
  name: string
  latitude: string
  longitude: string
  crops: string
  area: string
  soilSampleType: string
  vegetativeCovers: string
  numberOfSamplesText: string
  samplingDepth: string
  samples?: IndividualSampleData[]
}

export interface SamplingDataDocument {
  id: string
  sampleId: string
  location: string
  date: string
  analyst: string
  status: string
  typeOfSample: string
  weatherCondition: string
  moistureStatus: string
  texture: string
  colorMunsell: string
  slopeOfSite: string
  drainageConditions: string
  collectedBy: string
  dateCollected: string
  associationLGU?: string
  address?: string
  contactPerson?: string
  rsbsaNo?: string
  numberOfFarmers: number
  farmerDetails: FarmerDetailInFirestore[]
}

export interface CelebrantDocument {
  id: string
  name: string
  birthdate: Date | string // Can be Date object or string from Firestore
  avatar?: string
  profileImage?: string
  department?: string
  position?: string
  message?: string
  hobbies?: string
  favoriteFood?: string
}

// Mock data for dashboard counts (replace with actual Firestore fetches)
export async function getDashboardData(): Promise<{ counts: DashboardCounts }> {
  // In a real application, you would fetch these counts from Firestore
  // For now, returning mock data
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        counts: {
          totalSamples: 1234,
          activeTests: 56,
          inventoryItems: 789,
          staffMembers: 120,
        },
      })
    }, 500) // Simulate network delay
  })
}

// Function to fetch upcoming events from Firestore
export async function getUpcomingEvents(): Promise<EventDocument[]> {
  try {
    const eventsRef = collection(db, "events")
    const today = new Date()
    // Query for events where the date is today or in the future, ordered by date
    const q = query(eventsRef, where("date", ">=", Timestamp.fromDate(today)), orderBy("date"), limit(5)) // Fetch up to 5 upcoming events
    const snapshot = await getDocs(q)

    const events: EventDocument[] = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      events.push({
        id: doc.id,
        title: data.title,
        date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
        location: data.location,
        type: data.type,
        description: data.description,
        preparation: data.preparation,
        targetAudience: data.targetAudience,
        priority: data.priority,
        organizer: data.organizer,
      })
    })
    return events
  } catch (error) {
    console.error("Error fetching upcoming events:", error)
    return []
  }
}

// Function to fetch Hall of Fame data from Firestore
export async function getHallOfFameData(): Promise<HallOfFameEntry[]> {
  try {
    const hallOfFameRef = collection(db, "hallOfFame")
    // Get the most recent entry, or multiple if desired
    const q = query(hallOfFameRef, orderBy("createdAt", "desc"), limit(1)) // Fetch only the most recent entry
    const snapshot = await getDocs(q)

    const entries: HallOfFameEntry[] = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      entries.push({
        id: doc.id,
        name: data.name,
        achievement: data.achievement,
        date: data.date,
        avatar: data.avatar,
        badge: data.badge,
        about: data.about,
        createdAt: data.createdAt,
      })
    })
    return entries
  } catch (error) {
    console.error("Error fetching Hall of Fame data:", error)
    return []
  }
}

// Function to fetch all farmer profiles (for month celebrants)
export async function getAllFarmerProfiles(): Promise<FarmerProfileDocument[]> {
  try {
    const farmersRef = collection(db, "farmerProfiles") // Assuming a 'farmerProfiles' collection
    const snapshot = await getDocs(farmersRef)

    const profiles: FarmerProfileDocument[] = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      profiles.push({
        id: doc.id,
        name: data.name,
        birthday: data.birthday, // Assuming birthday is stored as a string "YYYY-MM-DD"
        contactNo: data.contactNo,
        emailAddress: data.emailAddress,
      })
    })
    return profiles
  } catch (error) {
    console.error("Error fetching farmer profiles:", error)
    return []
  }
}

// Function to fetch month celebrants
export async function getMonthCelebrants(): Promise<CelebrantDocument[]> {
  const employeesCollection = collection(db, "employees")
  const querySnapshot = await getDocs(employeesCollection)

  const celebrants: CelebrantDocument[] = []
  const today = new Date()
  const currentMonth = today.getMonth() // 0-indexed
  const currentDay = today.getDate()

  querySnapshot.forEach((doc) => {
    const data = doc.data()
    let birthday: Date | null = null

    if (data.birthday instanceof Timestamp) {
      birthday = data.birthday.toDate()
    } else if (
      data.birthday &&
      typeof data.birthday.seconds === "number" &&
      typeof data.birthday.nanoseconds === "number"
    ) {
      birthday = new Timestamp(data.birthday.seconds, data.birthday.nanoseconds).toDate()
    } else if (typeof data.birthday === "string") {
      birthday = new Date(data.birthday)
      if (isNaN(birthday.getTime())) {
        birthday = null // Invalid date string
      }
    }

    // Filter: birthday must be in the current month AND on or after the current day
    if (birthday && birthday.getMonth() === currentMonth && birthday.getDate() >= currentDay) {
      celebrants.push({
        id: doc.id,
        name: data.name || "Unknown",
        birthdate: birthday,
        avatar: data.avatar || undefined,
        profileImage: data.profileImage || undefined,
        department: data.department || undefined,
        position: data.position || undefined,
        message: data.message || undefined,
        hobbies: data.hobbies || undefined,
        favoriteFood: data.favoriteFood || undefined,
      })
    }
  })

  // Sort celebrants by day of month
  celebrants.sort((a, b) => {
    const dayA = (a.birthdate instanceof Date ? a.birthdate : new Date(a.birthdate)).getDate()
    const dayB = (b.birthdate instanceof Date ? b.birthdate : new Date(b.birthdate)).getDate()
    return dayA - dayB
  })

  return celebrants
}

export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider() // Use imported GoogleAuthProvider
    const result = await signInWithPopup(auth, provider) // Use imported auth and signInWithPopup
    const user = result.user
    console.log("User signed in:", user)
    return user
  } catch (error) {
    console.error("Error signing in with Google:", error)
    throw error
  }
}

export const signOutUser = async () => {
  try {
    await signOut(auth) // Use imported signOut and auth
    console.log("User signed out")
  } catch (error) {
    console.error("Error signing out:", error)
    throw error
  }
}

// Helper to get document reference for farmer profiles
const getFarmerProfileDocRef = (farmerName: string) => {
  // Normalize the farmer name to use as document ID
  const normalizedName = farmerName.toLowerCase().trim().replace(/\s+/g, "-")
  return doc(db, "farmerProfiles", normalizedName)
}

export const getFarmerProfile = async (farmerName: string): Promise<FarmerProfileDocument | null> => {
  try {
    const docRef = getFarmerProfileDocRef(farmerName)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data() as Omit<FarmerProfileDocument, "id">
      console.log('[Firestore] Fetched farmer profile for "' + farmerName + '":', data)
      return { id: docSnap.id, ...data }
    } else {
      console.log("No such farmer profile document!")
      return null
    }
  } catch (error) {
    console.error("Error getting farmer profile:", error)
    return null
  }
}

export const setFarmerProfile = async (farmerData: Omit<FarmerProfileDocument, "id" | "createdAt" | "updatedAt">) => {
  const docRef = getFarmerProfileDocRef(farmerData.name)
  await setDoc(docRef, {
    ...farmerData,
    contactNo: farmerData.contactNo || "", // Ensure it's a string, default to empty
    emailAddress: farmerData.emailAddress || "", // Ensure it's a string, default to empty
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

export const updateFarmerProfile = async (
  farmerName: string,
  updatedData: Partial<Omit<FarmerProfileDocument, "createdAt" | "updatedAt">>,
) => {
  const docRef = getFarmerProfileDocRef(farmerName)
  const dataToUpdate: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  }

  for (const key in updatedData) {
    if (Object.prototype.hasOwnProperty.call(updatedData, key)) {
      const value = (updatedData as any)[key]
      if (key === "contactNo" || key === "emailAddress") {
        dataToUpdate[key] = value || ""
      } else {
        dataToUpdate[key] = value
      }
    }
  }

  await updateDoc(docRef, dataToUpdate)
}

export const deleteFarmerProfile = async (farmerName: string) => {
  try {
    const docRef = getFarmerProfileDocRef(farmerName)
    await deleteDoc(docRef)
    console.log("Farmer profile deleted successfully:", farmerName)
  } catch (error) {
    console.error("Error deleting farmer profile:", error)
    throw error
  }
}

export const getSamplingDataByFarmerName = async (farmerName: string): Promise<SamplingDataDocument[]> => {
  try {
    const q = query(collection(db, "samplingData"), where("farmerDetails", "array-contains", { name: farmerName }))
    const querySnapshot = await getDocs(q)
    const samplingRecords: SamplingDataDocument[] = []
    querySnapshot.forEach((doc) => {
      samplingRecords.push({ id: doc.id, ...doc.data() } as SamplingDataDocument)
    })
    return samplingRecords
  } catch (error) {
    console.error("Error getting sampling data by farmer name:", error)
    return []
  }
}

export const uploadFile = async (file: File, path: string) => {
  try {
    const storageRef = ref(storage, path)
    const snapshot = await uploadBytes(storageRef, file)
    const downloadURL = await getDownloadURL(snapshot.ref)
    console.log("File uploaded successfully:", downloadURL)
    return downloadURL
  } catch (error) {
    console.error("Error uploading file:", error)
    throw error
  }
}

export const deleteFile = async (url: string) => {
  try {
    const fileRef = ref(storage, url)
    await deleteObject(fileRef)
    console.log("File deleted successfully:", url)
  } catch (error) {
    console.error("Error deleting file:", error)
    throw error
  }
}

export const getFileUrl = async (path: string) => {
  try {
    const fileRef = ref(storage, path)
    const url = await getDownloadURL(fileRef)
    return url
  } catch (error) {
    console.error("Error getting file URL:", error)
    return null
  }
}

const getSamplingDataDocumentInternal = async (docId: string): Promise<SamplingDataDocument | null> => {
  try {
    const docRef = doc(db, "samplingData", docId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as SamplingDataDocument
    } else {
      console.log("No such document!")
      return null
    }
  } catch (error) {
    console.error("Error getting document:", error)
    return null
  }
}

export const updateFarmerSampleDetailsInSamplingData = async (
  samplingRecordId: string,
  farmerIndex: number,
  samplesData: {
    customSampleId: string
    remark: string
    status: string
    preparedBy?: string
    prepMethod?: string
    lsrfNo?: string
  }[],
) => {
  const samplingDocRef = doc(db, "samplingData", samplingRecordId)
  const samplingDocSnap = await getDoc(samplingDocRef)

  if (!samplingDocSnap.exists()) {
    throw new Error(`Sampling record with ID ${samplingRecordId} not found.`)
  }

  const currentData = samplingDocSnap.data() as SamplingDataDocument
  const updatedFarmerDetails = [...currentData.farmerDetails]

  if (farmerIndex >= updatedFarmerDetails.length || farmerIndex < 0) {
    throw new Error(`Farmer index ${farmerIndex} out of bounds for sampling record ${samplingRecordId}.`)
  }

  if (!updatedFarmerDetails[farmerIndex]) {
    updatedFarmerDetails[farmerIndex] = {} as any
  }
  if (!updatedFarmerDetails[farmerIndex].samples) {
    updatedFarmerDetails[farmerIndex].samples = []
  }

  updatedFarmerDetails[farmerIndex].samples = samplesData.map((sample) => ({
    ...sample,
    createdAt: new Date().toISOString(),
    preparedBy: sample.preparedBy || "",
    prepMethod: sample.prepMethod || "",
    lsrfNo: sample.lsrfNo || "",
  }))

  await updateDoc(samplingDocRef, {
    farmerDetails: updatedFarmerDetails,
  })
}

export const getSamplingDataDocument = async (docId: string): Promise<SamplingDataDocument | null> => {
  return getSamplingDataDocumentInternal(docId)
}

export const updateSampleStatusToReleased = async (sampleId: string) => {
  const sampleRef = doc(db, "samples", sampleId)
  const sampleSnap = await getDoc(sampleRef)

  if (!sampleSnap.exists()) {
    throw new Error("Sample not found.")
  }

  const sampleData = sampleSnap.data()

  if (sampleData.status?.toLowerCase() !== "completed") {
    // Use toLowerCase for robust comparison
    throw new Error("Sample status is not 'completed'. Cannot release.")
  }

  // Update main sample document status and add releasedAt timestamp
  await updateDoc(sampleRef, {
    status: "released",
    releasedAt: new Date(), // Add a timestamp for when it was released
  })

  // Update status for individual samples within the 'samples' array
  if (Array.isArray(sampleData.samples)) {
    const updatedIndividualSamples = sampleData.samples.map((s: any) => ({
      ...s,
      status: "released", // Assuming individual samples also have a status field
    }))
    await updateDoc(sampleRef, { samples: updatedIndividualSamples })
  }

  // Add 'isReleased: true' to each parameter's result within the 'results' object
  if (sampleData.results && typeof sampleData.results === "object") {
    const updatedResults = { ...sampleData.results }
    for (const labCode in updatedResults) {
      if (updatedResults.hasOwnProperty(labCode) && typeof updatedResults[labCode] === "object") {
        for (const param in updatedResults[labCode]) {
          if (updatedResults[labCode].hasOwnProperty(param) && typeof updatedResults[labCode][param] === "object") {
            updatedResults[labCode][param] = {
              ...updatedResults[labCode][param],
              isReleased: true,
            }
          }
        }
      }
    }
    await updateDoc(sampleRef, { results: updatedResults })
  }
}
