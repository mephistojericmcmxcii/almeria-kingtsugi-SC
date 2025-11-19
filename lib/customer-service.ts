import { db } from "@/lib/firebase"
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where } from "firebase/firestore"

// Define the Customer interface
export interface Customer {
  id: string // This will be the formatted name
  fullName: string
  email?: string
  phone?: string
  customerRegion?: string | null // Added structured address fields
  customerProvince?: string | null
  customerCity?: string | null
  customerManualBarangay?: string | null
  customerPostalCode?: string | null
  customerCountry?: string | null
  address?: string // Keep for backward compatibility if existing data uses it
  organization?: string
  clientType?: string
  isRSBSA?: boolean // Changed to boolean
  rsbsaIdNo?: string
  birthday?: string
  createdAt: Date
  updatedAt: Date
  sampleIds: string[] // Array of sample IDs associated with this customer
}

// Format a name to be used as a document ID
export function formatNameAsKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove non-alphanumeric characters except spaces and hyphens
    .replace(/\s+/g, "-") // Replace spaces with single hyphens
    .replace(/^-+|-+$/g, "") // Trim hyphens from start and end
}

// Create or update a customer record
export const saveCustomer = async (customerData: Partial<Customer>): Promise<string> => {
  try {
    if (!db || !customerData.fullName) {
      throw new Error("Database not initialized or customer name missing")
    }

    const customerId = formatNameAsKey(customerData.fullName)
    const customerRef = doc(db, "customers", customerId)

    // Check if customer already exists
    const customerDoc = await getDoc(customerRef)

    if (customerDoc.exists()) {
      // Update existing customer
      const existingData = customerDoc.data()
      const updatedData = {
        ...customerData,
        id: customerId,
        updatedAt: new Date(),
        // Merge sample IDs without duplicates
        sampleIds: customerData.sampleIds
          ? [...new Set([...(existingData.sampleIds || []), ...customerData.sampleIds])]
          : existingData.sampleIds || [],
        // Ensure boolean conversion for isRSBSA
        isRSBSA: typeof customerData.isRSBSA === "boolean" ? customerData.isRSBSA : (existingData.isRSBSA ?? false),
      }

      await updateDoc(customerRef, updatedData)
      console.log(`Customer updated: ${customerId}`)
      return customerId
    } else {
      // Create new customer
      const newCustomer: Customer = {
        id: customerId,
        fullName: customerData.fullName,
        email: customerData.email || "",
        phone: customerData.phone || "",
        customerRegion: customerData.customerRegion || null, // Save structured address
        customerProvince: customerData.customerProvince || null,
        customerCity: customerData.customerCity || null,
        customerManualBarangay: customerData.customerManualBarangay || null,
        customerPostalCode: customerData.customerPostalCode || null,
        customerCountry: customerData.customerCountry || null,
        address: customerData.address || "", // Keep for backward compatibility
        organization: customerData.organization || "",
        clientType: customerData.clientType || "",
        isRSBSA: customerData.isRSBSA ?? false, // Default to false if undefined
        rsbsaIdNo: customerData.rsbsaIdNo || "",
        birthday: customerData.birthday || "",
        createdAt: new Date(),
        updatedAt: new Date(),
        sampleIds: customerData.sampleIds || [],
      }

      await setDoc(customerRef, newCustomer)
      console.log(`New customer created: ${customerId}`)
      return customerId
    }
  } catch (error) {
    console.error("Error saving customer:", error)
    throw error
  }
}

// Get all customers
export const getAllCustomers = async (): Promise<Customer[]> => {
  try {
    if (!db) {
      throw new Error("Database not initialized")
    }

    const customersRef = collection(db, "customers")
    const querySnapshot = await getDocs(customersRef)

    const customers: Customer[] = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      customers.push({
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
        isRSBSA: data.isRSBSA ?? false, // Ensure boolean conversion
      } as Customer)
    })

    return customers
  } catch (error) {
    console.error("Error fetching customers:", error)
    throw error
  }
}

// Get a customer by ID
export const getCustomerById = async (id: string): Promise<Customer | null> => {
  try {
    if (!db) {
      throw new Error("Database not initialized")
    }

    const customerRef = doc(db, "customers", id)
    const customerDoc = await getDoc(customerRef)

    if (customerDoc.exists()) {
      const data = customerDoc.data()
      return {
        ...data,
        id: customerDoc.id,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
        isRSBSA: data.isRSBSA ?? false, // Ensure boolean conversion
      } as Customer
    }

    return null
  } catch (error) {
    console.error("Error fetching customer:", error)
    throw error
  }
}

// Find a customer by name, email, or phone
export const findCustomer = async (searchTerm: string): Promise<Customer[]> => {
  try {
    if (!db) {
      throw new Error("Database not initialized")
    }

    const customersRef = collection(db, "customers")
    let q = query(customersRef) // Start with a base query

    // If searchTerm is provided, apply filters
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase()
      // This range query is for prefix matching on fullName
      // It requires an index: `customers` collection, `fullName` field, `ASC` order.
      // If you get an error about missing index, Firebase will suggest creating it.
      q = query(
        customersRef,
        where("fullName", ">=", lowerCaseSearchTerm),
        where("fullName", "<=", lowerCaseSearchTerm + "\uf8ff"),
        // Add other fields if you want to search across them, but it might require more complex queries or client-side filtering
        // For now, focusing on fullName for autosuggestion
      )
    }

    const querySnapshot = await getDocs(q)

    const customers: Customer[] = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      customers.push({
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
        isRSBSA: data.isRSBSA ?? false, // Ensure boolean conversion
      } as Customer)
    })

    // Client-side filtering for other fields if needed, or if the range query is not sufficient
    // For autosuggestion, the range query on fullName is usually enough.
    return customers.filter(
      (customer) =>
        customer.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm) ||
        customer.organization?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  } catch (error) {
    console.error("Error finding customers:", error)
    throw error
  }
}
