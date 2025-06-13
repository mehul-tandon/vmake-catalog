import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
  className?: string;
  showThumbnails?: boolean;
  onImageClick?: () => void; // Optional callback for custom image click behavior
}

export default function ProductImageGallery({
  images,
  productName,
  className = "",
  showThumbnails = false,
  onImageClick
}: ProductImageGalleryProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Filter out empty/invalid images
  const validImages = images.filter(img => img && img.trim() !== "");

  // Auto-slideshow for product cards (only when not showing thumbnails and has multiple images)
  useEffect(() => {
    if (!showThumbnails && validImages.length > 1 && !isHovered) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % validImages.length);
      }, 3000); // Change image every 3 seconds

      return () => clearInterval(interval);
    }
  }, [validImages.length, showThumbnails, isHovered]);

  if (validImages.length === 0) {
    return (
      <div className={`bg-gray-200 rounded-lg flex items-center justify-center ${className}`}>
        <span className="text-gray-500">No image available</span>
      </div>
    );
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % validImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
  };

  const openModal = (index: number) => {
    setCurrentImageIndex(index);
    setIsModalOpen(true);
  };

  return (
    <>
      <div
        className={`relative ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Main Image */}
        <div className="relative group h-full">
          <img
            src={validImages[currentImageIndex]}
            alt={`${productName} - Image ${currentImageIndex + 1}`}
            className="w-full h-full object-contain rounded-lg cursor-pointer bg-gray-100"
            onClick={() => onImageClick ? onImageClick() : openModal(currentImageIndex)}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder-image.png';
            }}
          />

          {/* Navigation arrows for multiple images */}
          {validImages.length > 1 && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 border-white/20 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 border-white/20 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}

          {/* Image counter */}
          {validImages.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              {currentImageIndex + 1} / {validImages.length}
            </div>
          )}

          {/* Simple dot indicators for slideshow mode - positioned absolutely within image */}
          {!showThumbnails && validImages.length > 1 && (
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
              <div className="flex space-x-1 bg-black/30 backdrop-blur-sm rounded-full px-2 py-1">
                {validImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      index === currentImageIndex ? "bg-gold" : "bg-white/70"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Thumbnail strip - only show when explicitly requested */}
        {showThumbnails && validImages.length > 1 && (
          <div className="flex space-x-2 mt-3 overflow-x-auto">
            {validImages.map((image, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentImageIndex
                    ? "border-gold shadow-lg"
                    : "border-gray-300 hover:border-gold/50"
                }`}
              >
                <img
                  src={image}
                  alt={`${productName} thumbnail ${index + 1}`}
                  className="w-full h-full object-contain bg-gray-100"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-image.png';
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Full-screen modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl bg-black/90 border-none p-0">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="absolute top-4 right-4 z-10 bg-black/50 border-white/20 text-white hover:bg-black/70"
              onClick={() => setIsModalOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>

            <img
              src={validImages[currentImageIndex]}
              alt={`${productName} - Full size`}
              className="w-full max-h-[80vh] object-contain bg-gray-100"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-image.png';
              }}
            />

            {/* Modal navigation */}
            {validImages.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 border-white/20 text-white hover:bg-black/70"
                  onClick={prevImage}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 border-white/20 text-white hover:bg-black/70"
                  onClick={nextImage}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>

                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded">
                  {currentImageIndex + 1} / {validImages.length}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
