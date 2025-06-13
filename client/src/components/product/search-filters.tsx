import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Grid, List } from "lucide-react";

interface SearchFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: {
    category: string;
    finish: string;
    material: string;
    sortBy: string;
  };
  onFiltersChange: (filters: any) => void;
  onViewModeChange: (mode: "grid" | "list") => void;
  viewMode: "grid" | "list";
}

export default function SearchFilters({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  onViewModeChange,
  viewMode
}: SearchFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  // Dynamic filter queries that update based on current selections
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/filters/categories", filters.finish, filters.material],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.finish && filters.finish !== "all") params.set("finish", filters.finish);
      if (filters.material && filters.material !== "all") params.set("material", filters.material);

      const response = await fetch(`/api/filters/categories?${params}`);
      return response.json();
    },
  });

  const { data: finishes = [] } = useQuery({
    queryKey: ["/api/filters/finishes", filters.category, filters.material],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.category && filters.category !== "all") params.set("category", filters.category);
      if (filters.material && filters.material !== "all") params.set("material", filters.material);

      const response = await fetch(`/api/filters/finishes?${params}`);
      return response.json();
    },
  });

  const { data: materials = [] } = useQuery({
    queryKey: ["/api/filters/materials", filters.category, filters.finish],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.category && filters.category !== "all") params.set("category", filters.category);
      if (filters.finish && filters.finish !== "all") params.set("finish", filters.finish);

      const response = await fetch(`/api/filters/materials?${params}`);
      return response.json();
    },
  });

  const updateFilter = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };

    // If setting a filter to "all", keep other filters as they are
    if (value === "all") {
      onFiltersChange(newFilters);
      return;
    }

    // When changing a filter, check if current selections are still valid
    // This prevents invalid combinations but allows users to make selections
    onFiltersChange(newFilters);
  };

  // Check if current filter values are still available and reset if not
  // Only run this effect when the filter options change, not when filters themselves change
  useEffect(() => {
    // Skip if we don't have data yet
    if (categories.length === 0 && finishes.length === 0 && materials.length === 0) {
      return;
    }

    let needsUpdate = false;
    const updatedFilters = { ...filters };

    // Check if current category is still available
    if (filters.category !== "all" && categories.length > 0 && !categories.includes(filters.category)) {
      updatedFilters.category = "all";
      needsUpdate = true;
    }

    // Check if current finish is still available
    if (filters.finish !== "all" && finishes.length > 0 && !finishes.includes(filters.finish)) {
      updatedFilters.finish = "all";
      needsUpdate = true;
    }

    // Check if current material is still available
    if (filters.material !== "all" && materials.length > 0 && !materials.includes(filters.material)) {
      updatedFilters.material = "all";
      needsUpdate = true;
    }

    if (needsUpdate) {
      onFiltersChange(updatedFilters);
    }
  }, [categories, finishes, materials]); // Removed filters and onFiltersChange to prevent infinite loops

  return (
    <div className="mb-8">
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        {/* Search Bar */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search products, codes, categories..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-12 bg-black-secondary border-black-accent text-white placeholder-gray-500 search-focus"
            />
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex bg-black-secondary border border-black-accent rounded-lg p-1">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("grid")}
            className={viewMode === "grid"
              ? "bg-gold text-black-primary hover:bg-gold-light"
              : "text-gray-400 hover:text-white"
            }
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("list")}
            className={viewMode === "list"
              ? "bg-gold text-black-primary hover:bg-gold-light"
              : "text-gray-400 hover:text-white"
            }
          >
            <List className="w-4 h-4" />
          </Button>
        </div>

        {/* Filter Button */}
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="outline"
          className="bg-black-secondary border-black-accent text-white hover:border-gold"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-black-secondary border border-black-accent rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <Select value={filters.category} onValueChange={(value) => updateFilter("category", value)}>
                <SelectTrigger className="bg-black-primary border-black-accent text-white">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="bg-black-primary border-black-accent">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category: string) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Finish</label>
              <Select value={filters.finish} onValueChange={(value) => updateFilter("finish", value)}>
                <SelectTrigger className="bg-black-primary border-black-accent text-white">
                  <SelectValue placeholder="All Finishes" />
                </SelectTrigger>
                <SelectContent className="bg-black-primary border-black-accent">
                  <SelectItem value="all">All Finishes</SelectItem>
                  {finishes.map((finish: string) => (
                    <SelectItem key={finish} value={finish}>
                      {finish}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Material</label>
              <Select value={filters.material} onValueChange={(value) => updateFilter("material", value)}>
                <SelectTrigger className="bg-black-primary border-black-accent text-white">
                  <SelectValue placeholder="All Materials" />
                </SelectTrigger>
                <SelectContent className="bg-black-primary border-black-accent">
                  <SelectItem value="all">All Materials</SelectItem>
                  {materials.map((material: string) => (
                    <SelectItem key={material} value={material}>
                      {material}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
              <Select value={filters.sortBy} onValueChange={(value) => updateFilter("sortBy", value)}>
                <SelectTrigger className="bg-black-primary border-black-accent text-white">
                  <SelectValue placeholder="Select Sort Option" />
                </SelectTrigger>
                <SelectContent className="bg-black-primary border-black-accent">
                  <SelectItem value="name">Product Name</SelectItem>
                  <SelectItem value="code">Product Code</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => {
                  onFiltersChange({ category: "all", finish: "all", material: "all", sortBy: "name" });
                  onSearchChange("");
                }}
                className="w-full bg-gold hover:bg-gold-light text-black-primary font-semibold"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
