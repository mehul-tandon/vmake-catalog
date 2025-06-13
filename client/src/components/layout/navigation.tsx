import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Heart, Settings, User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useWishlist } from "@/hooks/use-wishlist";
import { useToast } from "@/hooks/use-toast";
import vmakeLogo from "@assets/339076826_1147709369229224_1319750110613322317_n.jpg";

interface NavigationProps {
  onWishlistClick?: () => void;
}

export default function Navigation({ onWishlistClick }: NavigationProps) {
  const { user } = useAuth();
  const { wishlistCount } = useWishlist();
  const { toast } = useToast();
  const [location] = useLocation();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
      });
    },
  });

  return (
    <nav className="bg-black-secondary border-b border-black-accent sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/">
            <div className="flex items-center space-x-4 cursor-pointer">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gold rounded flex items-center justify-center overflow-hidden">
                  <img
                    src={vmakeLogo}
                    alt="Vmake Finessee Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h1 className="font-bold text-lg text-white">Vmake</h1>
                  <p className="text-xs text-gold">Finessee</p>
                </div>
              </div>
            </div>
          </Link>

          <div className="flex items-center space-x-4">
            {onWishlistClick && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onWishlistClick}
                className="relative text-gray-400 hover:text-gold"
              >
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gold text-black-primary text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                    {wishlistCount}
                  </span>
                )}
              </Button>
            )}



            {user?.isAdmin && (
              <Link href="/admin">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-gray-400 hover:text-gold ${
                    location === "/admin" ? "text-gold" : ""
                  }`}
                >
                  <Settings className="w-5 h-5" />
                </Button>
              </Link>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="text-gray-400 hover:text-gold"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
