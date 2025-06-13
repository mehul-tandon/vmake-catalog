import { useQuery } from "@tanstack/react-query";

interface UseProductsOptions {
  search?: string;
  category?: string;
  finish?: string;
  sortBy?: string;
}

export function useProducts(options: UseProductsOptions = {}) {
  return useQuery({
    queryKey: ["/api/products", options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.search) params.set("search", options.search);
      if (options.category) params.set("category", options.category);
      if (options.finish) params.set("finish", options.finish);
      if (options.sortBy) params.set("sortBy", options.sortBy);
      
      const response = await fetch(`/api/products?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }
      return response.json();
    },
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: ["/api/products", id],
    enabled: !!id,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["/api/categories"],
  });
}

export function useFinishes() {
  return useQuery({
    queryKey: ["/api/finishes"],
  });
}
