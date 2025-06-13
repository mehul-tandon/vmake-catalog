import { useState } from "react";
import Navigation from "@/components/layout/navigation";
import WhatsAppVerification from "@/components/auth/whatsapp-verification";
import ProductGrid from "@/components/product/product-grid";
import SearchFilters from "@/components/product/search-filters";
import WishlistModal from "@/components/wishlist/wishlist-modal";
import ProductModal from "@/components/product/product-modal";
import ContactSection from "@/components/contact/contact-section";
import ScrollToTop from "@/components/ui/scroll-to-top";
import { useAuth } from "@/hooks/use-auth";
import type { Product } from "@shared/schema";

export default function Home() {
  const { user, isLoading } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filters, setFilters] = useState({
    category: "all",
    finish: "all",
    material: "all",
    sortBy: "name",
  });



  if (isLoading) {
    return (
      <div className="min-h-screen bg-black-primary flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (!user) {
    return <WhatsAppVerification />;
  }

  return (
    <div className="min-h-screen bg-black-primary text-white">
      <Navigation
        onWishlistClick={() => setIsWishlistOpen(true)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SearchFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filters={filters}
          onFiltersChange={setFilters}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        <ProductGrid
          searchQuery={searchQuery}
          filters={filters}
          onProductSelect={setSelectedProduct}
          viewMode={viewMode}
        />

        {/* Contact Section */}
        <ContactSection />
      </div>

      <WishlistModal
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
      />

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>
  );
}
