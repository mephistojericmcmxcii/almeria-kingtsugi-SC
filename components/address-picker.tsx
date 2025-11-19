"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { getRegions, getProvincesByRegion, getCitiesMunicipalitiesByProvince } from "@/lib/ph-locations-data"
import { useDebounce } from "@/hooks/use-debounce" // Import useDebounce

interface AddressPickerProps {
  onAddressChange?: (address: {
    region: string | null
    province: string | null
    city: string | null
    manualBarangay: string | null
    postalCode: string | null
    country: string | null
  }) => void
  initialRegion?: string
  initialProvince?: string
  initialCity?: string
  initialManualBarangay?: string
  initialPostalCode?: string
  initialCountry?: string
}

export default function AddressPicker({
  onAddressChange,
  initialRegion = null,
  initialProvince = null,
  initialCity = null,
  initialManualBarangay = null,
  initialPostalCode = null,
  initialCountry = "Philippines",
}: AddressPickerProps) {
  // These useState calls already initialize the state from props on mount/re-mount
  const [selectedRegion, setSelectedRegion] = useState<string | null>(initialRegion)
  const [selectedProvince, setSelectedProvince] = useState<string | null>(initialProvince)
  const [selectedCity, setSelectedCity] = useState<string | null>(initialCity)

  // Direct state for manual input fields
  const [manualBarangay, setManualBarangay] = useState<string | null>(initialManualBarangay)
  const [postalCode, setPostalCode] = useState<string | null>(initialPostalCode)
  const [country, setCountry] = useState<string | null>(initialCountry)

  const [regions, setRegions] = useState<string[]>([])
  const [provinces, setProvinces] = useState<string[]>([])
  const [citiesMunicipalities, setCitiesMunicipalities] = useState<string[]>([])

  // Debounced version of the onAddressChange callback
  const debouncedOnAddressChange = useDebounce(onAddressChange, 300)

  // Initialize regions on component mount
  useEffect(() => {
    setRegions(getRegions())
  }, [])

  // Update provinces when region changes
  useEffect(() => {
    if (selectedRegion) {
      const newProvinces = getProvincesByRegion(selectedRegion)
      setProvinces(newProvinces)
      // If initialProvince is provided and valid for the new region, set it.
      // Otherwise, if the current selectedProvince is not in the new list, reset it.
      if (initialProvince && newProvinces.includes(initialProvince)) {
        setSelectedProvince(initialProvince)
      } else if (!newProvinces.includes(selectedProvince || "")) {
        setSelectedProvince(null)
        setSelectedCity(null) // Reset city too if province changes
      }
    } else {
      setProvinces([])
      setSelectedProvince(null)
      setSelectedCity(null)
    }
  }, [selectedRegion, initialProvince]) // Removed selectedProvince from dependencies

  // Update cities/municipalities when province changes
  useEffect(() => {
    if (selectedRegion && selectedProvince) {
      const newCitiesMunicipalities = getCitiesMunicipalitiesByProvince(selectedRegion, selectedProvince)
      setCitiesMunicipalities(newCitiesMunicipalities)
      // If initialCity is provided and valid for the new province, set it.
      // Otherwise, if the current selectedCity is not in the new list, reset it.
      if (initialCity && newCitiesMunicipalities.includes(initialCity)) {
        setSelectedCity(initialCity)
      } else if (!newCitiesMunicipalities.includes(selectedCity || "")) {
        setSelectedCity(null)
      }
    } else {
      setCitiesMunicipalities([])
      setSelectedCity(null)
    }
  }, [selectedRegion, selectedProvince, initialCity]) // Removed selectedCity from dependencies

  // Call the debounced onAddressChange whenever any selection or manual input changes
  useEffect(() => {
    debouncedOnAddressChange?.({
      region: selectedRegion,
      province: selectedProvince,
      city: selectedCity,
      manualBarangay: manualBarangay,
      postalCode: postalCode,
      country: country,
    })
  }, [selectedRegion, selectedProvince, selectedCity, manualBarangay, postalCode, country, debouncedOnAddressChange])

  const handleRegionChange = useCallback((value: string) => {
    setSelectedRegion(value)
    setSelectedProvince(null) // Reset province and city when region changes
    setSelectedCity(null)
  }, [])

  const handleProvinceChange = useCallback((value: string) => {
    setSelectedProvince(value)
    setSelectedCity(null) // Reset city when province changes
  }, [])

  const handleCityChange = useCallback((value: string) => {
    setSelectedCity(value)
  }, [])

  const handleManualBarangayChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setManualBarangay(e.target.value)
  }, [])

  const handlePostalCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPostalCode(e.target.value)
  }, [])

  const handleCountryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCountry(e.target.value)
  }, [])

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="region">Region</Label>
        <Select value={selectedRegion || ""} onValueChange={handleRegionChange}>
          <SelectTrigger id="region" className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
            <SelectValue placeholder="Select Region" />
          </SelectTrigger>
          <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
            {regions.map((region) => (
              <SelectItem key={region} value={region}>
                {region}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="province">Province</Label>
        <Select
          value={selectedProvince || ""}
          onValueChange={handleProvinceChange}
          disabled={!selectedRegion || provinces.length === 0}
        >
          <SelectTrigger id="province" className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
            <SelectValue placeholder="Select Province" />
          </SelectTrigger>
          <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
            {provinces.map((province) => (
              <SelectItem key={province} value={province}>
                {province}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">City/Municipality</Label>
        <Select
          value={selectedCity || ""}
          onValueChange={handleCityChange}
          disabled={!selectedProvince || citiesMunicipalities.length === 0}
        >
          <SelectTrigger id="city" className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E]">
            <SelectValue placeholder="Select City/Municipality" />
          </SelectTrigger>
          <SelectContent className="bg-[#F0EAD6] border-[#DDD7B1] text-[#2F3E2E]">
            {citiesMunicipalities.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Manual Barangay Input */}
      <div className="space-y-2">
        <Label htmlFor="manualBarangay">Barangay (Optional)</Label>
        <Input
          id="manualBarangay"
          value={manualBarangay || ""}
          onChange={handleManualBarangayChange}
          className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
          placeholder="Enter Barangay"
        />
      </div>

      {/* Postal Code Input */}
      <div className="space-y-2">
        <Label htmlFor="postalCode">Postal Code (Optional)</Label>
        <Input
          id="postalCode"
          value={postalCode || ""}
          onChange={handlePostalCodeChange}
          className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
          placeholder="Enter Postal Code"
        />
      </div>

      {/* Country Input */}
      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <Input
          id="country"
          value={country || ""}
          onChange={handleCountryChange}
          className="bg-[#E0D9C0] border-[#C0B89F] text-[#2F3E2E] placeholder:text-[#8B8378]"
          placeholder="Enter Country"
        />
      </div>
    </div>
  )
}
