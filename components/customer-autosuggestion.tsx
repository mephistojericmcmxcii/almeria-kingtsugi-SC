"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { db } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"
import type { Customer } from "@/lib/customer-service" // Import the Customer interface

// Extend the Customer interface to include the new fields
interface ExtendedCustomer extends Customer {
  customerCity?: string
  customerCountry?: string
  customerManualBarangay?: string
  customerPostalCode?: string
  customerProvince?: string
  customerRegion?: string
}

interface CustomerAutosuggestionProps {
  value: string
  onChange: (value: string) => void
  onSelectCustomer: (customer: ExtendedCustomer) => void // Updated to ExtendedCustomer
  className?: string
  placeholder?: string
  required?: boolean
}

export default function CustomerAutosuggestion({
  value,
  onChange,
  onSelectCustomer,
  className,
  placeholder,
  required,
}: CustomerAutosuggestionProps) {
  const [suggestions, setSuggestions] = useState<ExtendedCustomer[]>([]) // Updated to ExtendedCustomer[]
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [allCustomers, setAllCustomers] = useState<ExtendedCustomer[]>([]) // Updated to ExtendedCustomer[]
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch all customers once when component mounts
  useEffect(() => {
    const fetchAllCustomers = async () => {
      try {
        if (!db) {
          console.error("Firestore DB is not initialized.")
          return
        }

        const customersRef = collection(db, "customers")
        const querySnapshot = await getDocs(customersRef)

        const fetchedCustomers: ExtendedCustomer[] = [] // Updated to ExtendedCustomer[]
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          fetchedCustomers.push({
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
            isRSBSA: data.isRSBSA ?? false, // Ensure boolean conversion
            // Explicitly include new fields, though ...data should already cover them if present
            customerCity: data.customerCity,
            customerCountry: data.customerCountry,
            customerManualBarangay: data.customerManualBarangay,
            customerPostalCode: data.customerPostalCode,
            customerProvince: data.customerProvince,
            customerRegion: data.customerRegion,
          } as ExtendedCustomer) // Cast to ExtendedCustomer
        })

        setAllCustomers(fetchedCustomers)
      } catch (error) {
        console.error("Error fetching all customers:", error)
      }
    }

    fetchAllCustomers()
  }, [])

  const filterCustomers = useCallback(
    (searchTerm: string) => {
      if (!searchTerm || searchTerm.length < 2) {
        setSuggestions([])
        setShowSuggestions(false)
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const lowerSearchTerm = searchTerm.toLowerCase()

        // Client-side filtering for case-insensitive search
        const filteredCustomers = allCustomers.filter((customer) => {
          const fullNameMatch = customer.fullName?.toLowerCase().includes(lowerSearchTerm)
          const emailMatch = customer.email?.toLowerCase().includes(lowerSearchTerm)
          const phoneMatch = customer.phone?.includes(searchTerm)
          const organizationMatch = customer.organization?.toLowerCase().includes(lowerSearchTerm)

          // You can add filtering by new fields here if desired
          // const cityMatch = customer.customerCity?.toLowerCase().includes(lowerSearchTerm);
          // const countryMatch = customer.customerCountry?.toLowerCase().includes(lowerSearchTerm);
          // etc.

          return fullNameMatch || emailMatch || phoneMatch || organizationMatch
        })

        setSuggestions(filteredCustomers)
        setShowSuggestions(filteredCustomers.length > 0)
      } catch (error) {
        console.error("Error filtering customers:", error)
        setSuggestions([])
        setShowSuggestions(false)
      } finally {
        setIsLoading(false)
      }
    },
    [allCustomers],
  )

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    debounceTimeoutRef.current = setTimeout(() => {
      filterCustomers(value)
    }, 300) // Debounce for 300ms

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [value, filterCustomers])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    // Close suggestions if input is empty or less than 2 characters
    if (newValue.length < 2) {
      setShowSuggestions(false)
      setSuggestions([])
    } else {
      setShowSuggestions(true) // Show suggestions as user types
    }
  }

  const handleSelect = (customer: ExtendedCustomer) => {
    // Updated to ExtendedCustomer
    onChange(customer.fullName) // Update input field with selected name
    onSelectCustomer(customer) // Pass full customer object to parent
    setSuggestions([]) // Clear suggestions
    setShowSuggestions(false) // Hide dropdown
  }

  return (
    <div className="relative w-full">
      <Label htmlFor="customerName" className="text-[#2F3E2E]">
        Customer Name *
      </Label>
      <Input
        id="customerName"
        name="customerName"
        value={value}
        onChange={handleInputChange}
        onFocus={() => {
          if (value.length >= 2) {
            setShowSuggestions(true)
          }
        }} // Show on focus if already typed enough characters
        onBlur={() => {
          // Small delay to allow for suggestion clicks
          setTimeout(() => {
            setShowSuggestions(false)
          }, 150)
        }}
        className={cn("bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]", className)}
        placeholder={placeholder || "Lastname, Firstname, Middlename"}
        required={required}
        ref={inputRef}
        autoComplete="off" // Disable browser's autocomplete
      />
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-20 w-full bg-[#F0EAD6] border border-[#DDD7B1] rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto"
        >
          {isLoading ? (
            <div className="p-2 text-[#8B8378]">Loading...</div>
          ) : (
            suggestions.map((customer) => (
              <div
                key={customer.id}
                className="p-2 cursor-pointer hover:bg-[#D0C9B0] text-[#2F3E2E] text-sm"
                onClick={() => handleSelect(customer)}
              >
                <div className="font-medium">{customer.fullName}</div>
                {customer.organization && <div className="text-xs text-[#8B8378]">{customer.organization}</div>}
                {customer.phone && <div className="text-xs text-[#8B8378]">{customer.phone}</div>}
                {/* You can display the new fields here if needed */}
                {/* {customer.customerCity && <div className="text-xs text-[#8B8378]">{customer.customerCity}</div>} */}
                {/* {customer.customerProvince && <div className="text-xs text-[#8B8378]">{customer.customerProvince}</div>} */}
              </div>
            ))
          )}
        </div>
      )}
      {showSuggestions && !isLoading && suggestions.length === 0 && value.length >= 2 && (
        <div className="absolute z-20 w-full bg-[#F0EAD6] border border-[#DDD7B1] rounded-md shadow-lg mt-1 p-2 text-[#8B8378] text-sm">
          No suggestions found.
        </div>
      )}
    </div>
  )
}
