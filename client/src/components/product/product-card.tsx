
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDimensions } from "@/lib/utils";
import ProductImageGallery from "./product-image-gallery";
import type { Product } from "@shared/schema";

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export default function ProductCard({ product, onSelect }: ProductCardProps) {
  const { toast } = useToast();

  const { data: wishlist = [] } = useQuery({
    queryKey: ["/api/wishlist"],
  });

  const isInWishlist = (wishlist as any[]).some((item: any) => item.productId === product.id);

  const toggleWishlistMutation = useMutation({
    mutationFn: async () => {
      if (isInWishlist) {
        await apiRequest("DELETE", `/api/wishlist/${product.id}`);
      } else {
        await apiRequest("POST", "/api/wishlist", { productId: product.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      toast({
        title: isInWishlist ? "Removed from Wishlist" : "Added to Wishlist",
        description: isInWishlist
          ? `${product.name} removed from your wishlist`
          : `${product.name} added to your wishlist`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Prepare all images for the gallery
  const allImages = [
    product.imageUrl,
    ...((product as any).imageUrls || [])
  ].filter(Boolean);

  return (
    <div className="bg-black-secondary rounded-xl overflow-hidden border border-black-accent product-card-hover flex flex-col h-full">
      {/* Image Section - Fixed height container */}
      <div className="relative h-48 flex-shrink-0">
        {allImages.length > 0 ? (
          <ProductImageGallery
            images={allImages}
            productName={product.name}
            className="h-full w-full"
            showThumbnails={false}
            onImageClick={() => onSelect(product)}
          />
        ) : (
          <div
            className="w-full h-full bg-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors"
            onClick={() => onSelect(product)}
          >
            <span className="text-gray-500">No image available</span>
          </div>
        )}

        {/* Wishlist button positioned absolutely over the image */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlistMutation.mutate();
          }}
          disabled={toggleWishlistMutation.isPending}
          className={`absolute top-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm transition-colors ${
            isInWishlist ? "text-gold" : "text-white hover:text-gold"
          }`}
        >
          <Heart className={`w-5 h-5 ${isInWishlist ? "fill-current" : ""}`} />
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="mb-2">
          <h3 className="font-semibold text-white text-lg">{product.name}</h3>
          <p className="text-gold text-sm font-medium">{product.code}</p>
        </div>

        <div className="space-y-2 text-sm flex-1">
          <div className="flex justify-between">
            <span className="text-gray-400">Category:</span>
            <span className="text-white">{product.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Material:</span>
            <span className="text-white">{product.material || "Not specified"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Dimensions:</span>
            <span className="text-white">
              {formatDimensions(product.length, product.breadth, product.height)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Finish:</span>
            <span className="text-white">{product.finish}</span>
          </div>
        </div>

        <Button
          onClick={() => onSelect(product)}
          className="w-full mt-4 bg-gold hover:bg-gold-light text-black-primary font-semibold"
        >
          View Details
        </Button>
      </div>
    </div>
  );
}
