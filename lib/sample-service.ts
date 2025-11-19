import { collection, getDocs, getDoc, doc, query, where, orderBy, limit } from "firebase/firestore"
import { db } from "./firebase"

// Interface for Sample data
export interface Sample {
  id: string
  lsrfNo: string
  dateReceived: Date
  customerName: string
  customerAddress?: string
  customerPhone?: string
  customerEmail?: string
  customerBirthday?: string
  clientType: string
  sampleType: string
  numberOfSamples: number
  samples: Array<{
    sampleCode: string
    description: string
  }>
  status: string
  notes?: string
  createdAt: Date
  updatedAt: Date
  requestedParameter?: string
  parameters?: string[]
  results?: {
    [key: string]: {
      value: string
      unit?: string
      method?: string
      reference?: string
    }
  }
  tags?: string // Add this line
}

/**
 * Get a single sample by ID
 */
export async function getSampleById(id: string): Promise<Sample | null> {
  try {
    const docRef = doc(db!, "samples", id)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        lsrfNo: data.lsrfNo,
        dateReceived: data.dateReceived.toDate(),
        customerName: data.customerName,
        customerAddress: data.customerAddress,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        customerBirthday: data.customerBirthday,
        clientType: data.clientType,
        sampleType: data.sampleType,
        numberOfSamples: data.numberOfSamples,
        samples: data.samples || [],
        status: data.status,
        notes: data.notes,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        requestedParameter: data.requestedParameter,
        parameters: data.parameters || [],
        results: data.results || {},
        tags: data.tags,
      }
    }

    return null
  } catch (error) {
    console.error("Error fetching sample:", error)
    throw error
  }
}

/**
 * Get all samples from Firestore
 */
export async function getAllSamples(): Promise<Sample[]> {
  try {
    const q = query(collection(db!, "samples"), orderBy("createdAt", "desc"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Sample[]
  } catch (error) {
    console.error("Error fetching samples:", error)
    throw error
  }
}

/**
 * Get samples by status
 */
export async function getSamplesByStatus(status: string): Promise<Sample[]> {
  try {
    const q = query(collection(db!, "samples"), where("status", "==", status), orderBy("createdAt", "desc"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Sample[]
  } catch (error) {
    console.error("Error fetching samples by status:", error)
    throw error
  }
}

/**
 * Get recent samples (limited number)
 */
export async function getRecentSamples(limitCount = 5): Promise<Sample[]> {
  try {
    const q = query(collection(db!, "samples"), orderBy("createdAt", "desc"), limit(limitCount))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Sample[]
  } catch (error) {
    console.error("Error fetching recent samples:", error)
    throw error
  }
}
