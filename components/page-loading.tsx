"use client"

interface PageLoadingProps {
  isLoading: boolean
  message?: string
}

/**
 * Page-specific loading component
 * Used for individual page loading states
 */
export default function PageLoading({ isLoading, message = "Loading..." }: PageLoadingProps) {
  if (!isLoading) return null

  return (
    <div className="fixed inset-0 bg-emerald-900 flex items-center justify-center z-40">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-400"></div>
        <p className="text-emerald-200 text-sm font-medium">{message}</p>
      </div>
    </div>
  )
}
