import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWishlist } from "@/hooks/use-wishlist";
import ProductImageGallery from "./product-image-gallery";
import type { Product } from "@shared/schema";

interface ProductModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
  const { toast } = useToast();
  const { isInWishlist, toggleWishlist } = useWishlist(product.id);

  // Prepare all images for the gallery
  const allImages = [
    product.imageUrl,
    ...((product as any).imageUrls || [])
  ].filter(Boolean);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: `Check out this ${product.category.toLowerCase()}: ${product.name}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Product link copied to clipboard",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-black-secondary border-black-accent">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="order-2 lg:order-1">
            {allImages.length > 0 ? (
              <ProductImageGallery
                images={allImages}
                productName={product.name}
                className="w-full h-64 lg:h-80"
                showThumbnails={true}
              />
            ) : (
              <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">No image available</span>
              </div>
            )}
          </div>

          <div className="space-y-4 order-1 lg:order-2">
            <div>
              <p className="text-gold text-lg font-semibold mb-2">{product.code}</p>
              <h3 className="text-xl lg:text-2xl font-bold text-white mb-3">{product.name}</h3>
              {(product as any).description && (
                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                  {(product as any).description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-gray-400 text-sm uppercase font-medium mb-1">Category</h4>
                <p className="text-white">{product.category}</p>
              </div>
              <div>
                <h4 className="text-gray-400 text-sm uppercase font-medium mb-1">Finish</h4>
                <p className="text-white">{product.finish}</p>
              </div>
              <div>
                <h4 className="text-gray-400 text-sm uppercase font-medium mb-1">Material</h4>
                <p className="text-white">{product.material || "Not specified"}</p>
              </div>
            </div>

            <div>
              <h4 className="text-gray-400 text-sm uppercase font-medium mb-2">Dimensions</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-black-primary rounded-lg p-3 text-center">
                  <p className="text-white font-semibold">{product.length}</p>
                  <p className="text-gray-400 text-xs">Length (cm)</p>
                </div>
                <div className="bg-black-primary rounded-lg p-3 text-center">
                  <p className="text-white font-semibold">{product.breadth}</p>
                  <p className="text-gray-400 text-xs">Breadth (cm)</p>
                </div>
                <div className="bg-black-primary rounded-lg p-3 text-center">
                  <p className="text-white font-semibold">{product.height}</p>
                  <p className="text-gray-400 text-xs">Height (cm)</p>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <Button
                onClick={() => toggleWishlist()}
                className="flex-1 bg-gold hover:bg-gold-light text-black-primary font-semibold"
              >
                <Heart className={`w-4 h-4 mr-2 ${isInWishlist ? "fill-current" : ""}`} />
                {isInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
              </Button>
              <Button
                onClick={handleShare}
                variant="secondary"
                className="px-6 bg-black-accent hover:bg-gray-600 text-white"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
