import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import ProductCard from "./product-card";
import ProductImageGallery from "./product-image-gallery";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product } from "@shared/schema";

interface ProductGridProps {
  searchQuery: string;
  filters: {
    category: string;
    finish: string;
    material: string;
    sortBy: string;
  };
  onProductSelect: (product: Product) => void;
  viewMode: "grid" | "list";
}

// Horizontal Product Card Component for List View
function HorizontalProductCard({ product, onSelect }: { product: Product; onSelect: (product: Product) => void }) {
  const { data: wishlist = [] } = useQuery({
    queryKey: ["/api/wishlist"],
  });

  const isInWishlist = (wishlist as any[]).some((item: any) => item.productId === product.id);

  const toggleWishlistMutation = useMutation({
    mutationFn: async () => {
      if (isInWishlist) {
        await apiRequest("DELETE", "/api/wishlist", { productId: product.id });
      } else {
        await apiRequest("POST", "/api/wishlist", { productId: product.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
    },
  });

  // Get all images for the product
  const allImages = [
    product.imageUrl,
    ...((product as any).imageUrls || [])
  ].filter(Boolean);

  return (
    <div className="bg-black-secondary rounded-xl overflow-hidden border border-black-accent hover:border-gold transition-colors">
      <div className="flex flex-col md:flex-row">
        {/* Image Section */}
        <div className="relative w-full md:w-64 h-48 flex-shrink-0">
          {allImages.length > 0 ? (
            <ProductImageGallery
              images={allImages}
              productName={product.name}
              className="w-full h-full"
              showThumbnails={false}
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
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

        {/* Content Section */}
        <div className="flex-1 p-4 flex flex-col">
          <div className="mb-3">
            <h3 className="font-semibold text-white text-xl mb-1">{product.name}</h3>
            <p className="text-gold text-sm font-medium">{product.code}</p>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4 flex-1">
            <div>
              <span className="text-gray-400">Category: </span>
              <span className="text-white">{product.category}</span>
            </div>
            <div>
              <span className="text-gray-400">Material: </span>
              <span className="text-white">{product.material || "Not specified"}</span>
            </div>
            <div>
              <span className="text-gray-400">Dimensions: </span>
              <span className="text-white">{product.length}×{product.breadth}×{product.height} cm</span>
            </div>
            <div>
              <span className="text-gray-400">Finish: </span>
              <span className="text-white">{product.finish}</span>
            </div>
          </div>

          {/* View Details Button */}
          <Button
            onClick={() => onSelect(product)}
            size="sm"
            className="w-full md:w-auto md:px-4 md:py-2 bg-gold hover:bg-gold-light text-black-primary font-medium text-sm"
          >
            View Details
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ProductGrid({ searchQuery, filters, onProductSelect, viewMode }: ProductGridProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const itemsPerPage = 20; // Load 20 products at a time for better performance

  const { data: productData, isLoading } = useQuery({
    queryKey: ["/api/products", searchQuery, filters, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      params.set("category", filters.category || "all");
      params.set("finish", filters.finish || "all");
      params.set("material", filters.material || "all");
      params.set("sortBy", filters.sortBy || "name");
      params.set("page", currentPage.toString());
      params.set("limit", itemsPerPage.toString());

      const response = await fetch(`/api/products?${params}`);
      return response.json();
    }
  });

  // Handle product data updates
  useEffect(() => {
    if (productData) {
      const newProducts = Array.isArray(productData) ? productData : (productData?.products || []);
      if (currentPage === 1) {
        // For page 1, replace all products (this handles filter changes and clear filters)
        setAllProducts(newProducts);
      } else {
        // For subsequent pages, append to existing products
        setAllProducts(prev => [...prev, ...newProducts]);
      }
    }
  }, [productData, currentPage]);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
    // Don't clear allProducts immediately - let the new data load first
    // setAllProducts([]);
  }, [searchQuery, filters]);

  // Get pagination info from server response
  const pagination = productData?.pagination || { page: currentPage, limit: itemsPerPage, total: allProducts.length, totalPages: 1 };
  const hasMorePages = currentPage < pagination.totalPages;

  if (isLoading) {
    return (
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-6 w-32 bg-black-accent" />
          <Skeleton className="h-4 w-24 bg-black-accent" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-black-secondary rounded-xl overflow-hidden border border-black-accent">
              <Skeleton className="w-full h-48 bg-black-accent" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4 bg-black-accent" />
                <Skeleton className="h-3 w-1/2 bg-black-accent" />
                <Skeleton className="h-3 w-full bg-black-accent" />
                <Skeleton className="h-3 w-2/3 bg-black-accent" />
                <Skeleton className="h-8 w-full bg-black-accent" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      {/* Results Summary */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-400">
          Showing <span className="text-white font-medium">1-{allProducts.length}</span>
          of <span className="text-white font-medium">{pagination.total}</span> products
        </p>
        <div className="text-sm text-gray-400">
          Last updated: <span className="text-gold">Just now</span>
        </div>
      </div>

      {allProducts.length === 0 && !isLoading && productData ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">No products found</p>
          <p className="text-gray-500 text-sm mt-2">Try adjusting your search or filters</p>
        </div>
      ) : allProducts.length > 0 && viewMode === "grid" ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {allProducts.map((product: Product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={onProductSelect}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasMorePages && (
            <div className="flex justify-center mt-8">
              <Button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={isLoading}
                className="bg-gold hover:bg-gold-light text-black-primary font-medium px-8 py-2"
              >
                {isLoading ? "Loading..." : "Load More Products"}
              </Button>
            </div>
          )}
        </>
      ) : allProducts.length > 0 ? (
        <>
          <div className="space-y-4">
            {allProducts.map((product: Product) => (
              <HorizontalProductCard
                key={product.id}
                product={product}
                onSelect={onProductSelect}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasMorePages && (
            <div className="flex justify-center mt-8">
              <Button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={isLoading}
                className="bg-gold hover:bg-gold-light text-black-primary font-medium px-8 py-2"
              >
                {isLoading ? "Loading..." : "Load More Products"}
              </Button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
