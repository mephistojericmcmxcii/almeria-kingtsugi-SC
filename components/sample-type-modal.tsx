"use client"

// Removed Dialog, DialogContent, DialogHeader, DialogTitle imports
import { Button } from "@/components/ui/button"
import { X } from "lucide-react" // Re-import X icon for the close button

interface SampleTypeSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectType: (type: "testing" | "non-testing") => void
}

export default function SampleTypeSelectionModal({ isOpen, onClose, onSelectType }: SampleTypeSelectionModalProps) {
  if (!isOpen) return null // Only render the modal if isOpen is true

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#F0EAD6] border border-[#DDD7B1] rounded-lg shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-[#DDD7B1] sticky top-0 z-10 bg-[#F0EAD6]">
          <h2 className="text-xl font-bold text-[#2F3E2E]">Select Sample Type</h2>
          <Button
            variant="ghost"
            size="icon"
            className="text-[#8B8378] hover:text-[#2F3E2E] hover:bg-[#C0B89F]"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="grid gap-4 py-6 px-4">
          <Button
            className="w-full bg-[#5B8C5A] hover:bg-[#4A7049] text-white text-lg py-3"
            onClick={() => onSelectType("testing")}
          >
            Testing Sample
          </Button>
          <Button
            className="w-full bg-[#5B8C5A] hover:bg-[#4A7049] text-white text-lg py-3"
            onClick={() => onSelectType("non-testing")}
          >
            Non-Testing Sample
          </Button>
        </div>
      </div>
    </div>
  )
}
