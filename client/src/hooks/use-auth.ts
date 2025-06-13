import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: 1,
    staleTime: 30000, // 30 seconds
  });

  return {
    user: data?.user || null,
    isLoading,
    isAuthenticated: !!data?.user,
    error,
  };
}
