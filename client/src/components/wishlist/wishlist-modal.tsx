import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@shared/schema";

interface WishlistItem {
  id: number;
  userId: number;
  productId: number;
  createdAt: string;
  product: Product;
}

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WishlistModal({ isOpen, onClose }: WishlistModalProps) {
  const { toast } = useToast();
  
  const { data: wishlist = [], isLoading } = useQuery<WishlistItem[]>({
    queryKey: ["/api/wishlist"],
    enabled: isOpen,
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: async (productId: number) => {
      await apiRequest("DELETE", `/api/wishlist/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      toast({
        title: "Removed from Wishlist",
        description: "Product removed from your wishlist",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove product",
        variant: "destructive",
      });
    },
  });

  const exportToExcel = async () => {
    if (wishlist.length === 0) {
    toast({
        title: "Empty Wishlist",
        description: "Add products to your wishlist first",
        variant: "destructive",
    });
      return;
    }

    toast({
      title: "Export Started", 
      description: "Your Excel file is being prepared for download...",
    });
    
    try {
      // Create download link
      const link = document.createElement('a');
      link.href = '/api/wishlist/export/excel';
      link.download = 'wishlist.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: "Your wishlist Excel file has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not download Excel file. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-3/4 bg-black-secondary border-black-accent">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-3/4 bg-black-secondary border-black-accent flex flex-col">
        <DialogHeader className="border-b border-black-accent pb-4">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-2xl font-bold text-white">
              My Wishlist ({wishlist.length})
            </DialogTitle>
              <Button
                onClick={exportToExcel}
                variant="secondary"
              className="bg-gold hover:bg-gold-light text-black-primary font-semibold"
              disabled={wishlist.length === 0}
              >
                <FileText className="w-4 h-4 mr-2" />
              Download as Excel
              </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6">
          {wishlist.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">Your wishlist is empty</p>
              <p className="text-gray-500 text-sm mt-2">
                Browse products and add your favorites to see them here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wishlist.map((item) => (
                <div key={item.id} className="bg-black-primary rounded-lg p-4 border border-black-accent">
                  {item.product.imageUrl && (
                    <img 
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                  )}
                  <h3 className="font-semibold text-white mb-1">{item.product.name}</h3>
                  <p className="text-gold text-sm mb-2">{item.product.code}</p>
                  <p className="text-gray-400 text-xs mb-3">{item.product.category}</p>
                  <Button
                    onClick={() => removeFromWishlistMutation.mutate(item.productId)}
                    disabled={removeFromWishlistMutation.isPending}
                    variant="destructive"
                    size="sm"
                    className="w-full"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
