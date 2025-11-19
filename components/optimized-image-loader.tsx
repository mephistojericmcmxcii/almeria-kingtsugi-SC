"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

interface OptimizedImageLoaderProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  priority?: boolean
  fallback?: string
  cacheKey?: string
}

// Image cache with expiration
const imageCache = new Map<string, { url: string; timestamp: number }>()
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export default function OptimizedImageLoader({
  src,
  alt,
  width,
  height,
  className = "",
  priority = false,
  fallback = "/placeholder.svg",
  cacheKey,
}: OptimizedImageLoaderProps) {
  const [imageSrc, setImageSrc] = useState(() => {
    // Check cache first
    if (cacheKey) {
      const cached = imageCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.url
      }
    }
    return src
  })
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let mounted = true

    const loadImage = async () => {
      try {
        // If we have a cache key and the src looks like a Firebase URL, try to load it
        if (cacheKey && src.includes('firebase')) {
          const { getFirebaseStorage } = await import("@/lib/firebase-optimized")
          const { ref, getDownloadURL } = await import("firebase/storage")
          
          const storage = getFirebaseStorage()
          if (storage) {
            const imageRef = ref(storage, src)
            const url = await getDownloadURL(imageRef)
            
            if (mounted) {
              // Cache the URL
              imageCache.set(cacheKey, { url, timestamp: Date.now() })
              setImageSrc(url)
            }
          }
        }
      } catch (error) {
        console.error("Error loading image:", error)
        if (mounted) {
          setHasError(true)
          setImageSrc(fallback)
        }
      }
    }

    if (src !== imageSrc && !hasError) {
      loadImage()
    }

    return () => {
      mounted = false
    }
  }, [src, cacheKey, fallback, imageSrc, hasError])

  const handleLoad = () => {
    setIsLoading(false)
  }

  const handleError = () => {
    setHasError(true)
    setIsLoading(false)
    setImageSrc(fallback)
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {isLoading && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse rounded" 
          style={{ width, height }} 
        />
      )}
      <Image
        src={imageSrc || "/placeholder.svg"}
        alt={alt}
        width={width}
        height={height}
        className={`${className} ${isLoading ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
        priority={priority}
        onLoad={handleLoad}
        onError={handleError}
        quality={85}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIQcSE0Fhsf/EABUBAQEAAAAAAAAAAAAAAAAAAAQF/8QAGhEAAgMBAQAAAAAAAAAAAAAAAAECEgMRMf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPyMfM2p/CH7tOilT5Yb6bk+h0R+Rj5m1P4Q/dp0UqfLDfTcn0OiPy"
      />
    </div>
  )
}
