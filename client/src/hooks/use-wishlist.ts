import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useWishlist(productId?: number) {
  const { toast } = useToast();
  
  const { data: wishlist = [] } = useQuery({
    queryKey: ["/api/wishlist"],
  });

  const wishlistCount = wishlist.length;
  const isInWishlist = productId ? wishlist.some((item: any) => item.productId === productId) : false;

  const toggleMutation = useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error("No product ID provided");
      
      if (isInWishlist) {
        await apiRequest("DELETE", `/api/wishlist/${productId}`);
      } else {
        await apiRequest("POST", "/api/wishlist", { productId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      toast({
        title: isInWishlist ? "Removed from Wishlist" : "Added to Wishlist",
        description: isInWishlist 
          ? "Product removed from your wishlist"
          : "Product added to your wishlist",
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

  return {
    wishlist,
    wishlistCount,
    isInWishlist,
    toggleWishlist: () => toggleMutation.mutate(),
    isToggling: toggleMutation.isPending,
  };
}
