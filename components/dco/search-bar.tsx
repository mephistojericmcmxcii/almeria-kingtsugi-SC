"use client"

import type React from "react"

import { useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SearchBarProps {
  onSearch: (query: string, filter: string) => void
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState("all")

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    onSearch(query, filter)
  }

  const handleFilterChange = (value: string) => {
    setFilter(value)
    onSearch(searchQuery, value)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-3 bg-[#FAF8F2] p-3 rounded-lg border border-[#DDD7B1]">
      <div className="relative flex-grow">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#4C6529]" />
        <Input
          type="text"
          placeholder="Search folders and documents..."
          value={searchQuery}
          onChange={handleSearch}
          className="pl-9 bg-[#FAF8F2] border-[#DDD7B1] text-[#2F3E2E] placeholder:text-[#4C6529]"
        />
      </div>
      <Select value={filter} onValueChange={handleFilterChange}>
        <SelectTrigger className="w-full sm:w-[180px] bg-[#FAF8F2] border-[#DDD7B1] text-[#2F3E2E]">
          <SelectValue placeholder="Filter by" />
        </SelectTrigger>
        <SelectContent className="bg-[#FAF8F2] border-[#DDD7B1] text-[#2F3E2E]">
          <SelectItem value="all" className="hover:bg-[#DDD7B1]">
            All Items
          </SelectItem>
          <SelectItem value="folders" className="hover:bg-[#DDD7B1]">
            Folders Only
          </SelectItem>
          <SelectItem value="documents" className="hover:bg-[#DDD7B1]">
            Documents Only
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
