import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ExcelUpload from "./excel-upload";
import {
  Package,
  Upload,
  BarChart3,
  Users,
  Edit,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Download,
  Search,
  Filter,
  TrendingUp,
  Calendar,
  Star,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Product, User } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";

interface ProductFormData {
  name: string;
  code: string;
  category: string;
  length: number;
  breadth: number;
  height: number;
  finish: string;
  material: string;
  imageUrl: string;
  imageUrls: string[];
  description: string;
  status: string;
}

interface UserWishlistData {
  user: User;
  wishlist: any[];
}

const tabs = [
  { id: "products", label: "Products", icon: <Package className="w-5 h-5" /> },
  { id: "upload", label: "Excel Upload", icon: <Upload className="w-5 h-5" /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 className="w-5 h-5" /> },
  { id: "users", label: "Users", icon: <Users className="w-5 h-5" /> },
];

export default function AdminPanel() {
  const { toast } = useToast();
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductFormData>({
    name: "",
    code: "",
    category: "",
    length: 0,
    breadth: 0,
    height: 0,
    finish: "",
    material: "",
    imageUrl: "",
    imageUrls: [],
    description: "",
    status: "active"
  });
  const [userDetailModalOpen, setUserDetailModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWishlistData | null>(null);
  const [activeTab, setActiveTab] = useState("products");

  // Product management state
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [finishFilter, setFinishFilter] = useState("all");
  const [materialFilter, setMaterialFilter] = useState("all");
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50); // Default 50 items per page

  // Image management state
  const [newImageUrl, setNewImageUrl] = useState("");
  const [showImageManager, setShowImageManager] = useState(false);

  // Fetch products with server-side filtering and pagination
  const { data: productData, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products", searchTerm, categoryFilter, finishFilter, materialFilter, currentPage, itemsPerPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      params.set("category", categoryFilter);
      params.set("finish", finishFilter);
      params.set("material", materialFilter);
      params.set("page", currentPage.toString());
      params.set("limit", itemsPerPage.toString());

      const response = await fetch(`/api/products?${params}`);
      return response.json();
    },
  });

  // Handle both old format (array) and new format (object with products array)
  const products = Array.isArray(productData) ? productData : (productData?.products || []);
  const pagination = productData?.pagination || { page: 1, limit: itemsPerPage, total: products.length, totalPages: 1 };

  // Fetch users for admin
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });



  // Fetch categories, finishes, and materials for filters using dynamic filtering
  const { data: categories = [] } = useQuery<string[]>({
    queryKey: ["/api/filters/categories", finishFilter, materialFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (finishFilter && finishFilter !== "all") params.set("finish", finishFilter);
      if (materialFilter && materialFilter !== "all") params.set("material", materialFilter);

      const response = await fetch(`/api/filters/categories?${params}`);
      return response.json();
    },
  });

  const { data: finishes = [] } = useQuery<string[]>({
    queryKey: ["/api/filters/finishes", categoryFilter, materialFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter && categoryFilter !== "all") params.set("category", categoryFilter);
      if (materialFilter && materialFilter !== "all") params.set("material", materialFilter);

      const response = await fetch(`/api/filters/finishes?${params}`);
      return response.json();
    },
  });

  const { data: materials = [] } = useQuery<string[]>({
    queryKey: ["/api/filters/materials", categoryFilter, finishFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter && categoryFilter !== "all") params.set("category", categoryFilter);
      if (finishFilter && finishFilter !== "all") params.set("finish", finishFilter);

      const response = await fetch(`/api/filters/materials?${params}`);
      return response.json();
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      await apiRequest("DELETE", `/api/products/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setSelectedProducts(new Set());
      toast({
        title: "Product Deleted",
        description: "Product successfully removed from catalogue",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  // Bulk delete products mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (productIds: number[]) => {
      await Promise.all(
        productIds.map(id => apiRequest("DELETE", `/api/products/${id}`))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setSelectedProducts(new Set());
      toast({
        title: "Products Deleted",
        description: `${selectedProducts.size} products successfully removed from catalogue`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Delete Failed",
        description: error.message || "Failed to delete selected products",
        variant: "destructive",
      });
    },
  });



  // Create/Update product mutation
  const saveProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      if (editingProduct) {
        // Update existing product
        await apiRequest("PUT", `/api/products/${editingProduct.id}`, data);
      } else {
        // Create new product
        await apiRequest("POST", "/api/products", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: editingProduct ? "Product Updated" : "Product Created",
        description: editingProduct
          ? "Product details have been updated"
          : "New product has been added to the catalogue",
      });
      setProductModalOpen(false);
      resetProductForm();
    },
    onError: (error: any) => {
      toast({
        title: "Operation Failed",
        description: error.message || "Failed to save product",
        variant: "destructive",
      });
    },
  });

  // Fetch user details with wishlist
  const getUserDetails = async (userId: number) => {
    try {
      const response = await apiRequest("GET", `/api/admin/users/${userId}`);
      setSelectedUser(await response.json());
      setUserDetailModalOpen(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load user details",
        variant: "destructive",
      });
    }
  };

  // Reset product form
  const resetProductForm = () => {
    setProductForm({
      name: "",
      code: "",
      category: "",
      length: 0,
      breadth: 0,
      height: 0,
      finish: "",
      material: "",
      imageUrl: "",
      imageUrls: [],
      description: "",
      status: "active"
    });
    setEditingProduct(null);
  };

  // Open product modal for editing
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      code: product.code,
      category: product.category,
      length: product.length,
      breadth: product.breadth,
      height: product.height,
      finish: product.finish,
      material: product.material || "",
      imageUrl: product.imageUrl || "",
      imageUrls: (product as any).imageUrls || [],
      description: (product as any).description || "",
      status: (product as any).status || "active"
    });
    setProductModalOpen(true);
  };

  // Open product modal for creating
  const handleAddProduct = () => {
    resetProductForm();
    setProductModalOpen(true);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Convert numeric fields
    if (['length', 'breadth', 'height'].includes(name)) {
      setProductForm({
        ...productForm,
        [name]: parseFloat(value) || 0
      });
    } else {
      setProductForm({
        ...productForm,
        [name]: value
      });
    }
  };

  // Handle form submission
  const handleSubmitProduct = (e: React.FormEvent) => {
    e.preventDefault();
    saveProductMutation.mutate(productForm);
  };

  // Products are already filtered server-side, so we use them directly
  const filteredProducts = products;

  // Product selection handlers
  const handleSelectProduct = (productId: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map((p: any) => p.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedProducts.size === 0) return;

    if (confirm(`Are you sure you want to delete ${selectedProducts.size} selected products?`)) {
      bulkDeleteMutation.mutate(Array.from(selectedProducts));
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setFinishFilter("all");
    setMaterialFilter("all");
    setCurrentPage(1); // Reset to first page when clearing filters
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedProducts(new Set()); // Clear selections when changing pages
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
    setSelectedProducts(new Set()); // Clear selections
  };

  // Image management functions
  const addImageUrl = () => {
    if (newImageUrl.trim()) {
      setProductForm(prev => ({
        ...prev,
        imageUrls: [...prev.imageUrls, newImageUrl.trim()]
      }));
      setNewImageUrl("");
    }
  };

  const removeImageUrl = (index: number) => {
    setProductForm(prev => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== index)
    }));
  };

  const moveImageUp = (index: number) => {
    if (index > 0) {
      setProductForm(prev => {
        const newUrls = [...prev.imageUrls];
        [newUrls[index - 1], newUrls[index]] = [newUrls[index], newUrls[index - 1]];
        return { ...prev, imageUrls: newUrls };
      });
    }
  };

  const moveImageDown = (index: number) => {
    setProductForm(prev => {
      if (index < prev.imageUrls.length - 1) {
        const newUrls = [...prev.imageUrls];
        [newUrls[index], newUrls[index + 1]] = [newUrls[index + 1], newUrls[index]];
        return { ...prev, imageUrls: newUrls };
      }
      return prev;
    });
  };

  // Fetch all products for analytics (without pagination)
  const { data: allProductsData } = useQuery({
    queryKey: ["/api/products/analytics"],
    queryFn: async () => {
      const response = await fetch("/api/products?limit=999999"); // Get all products for analytics
      return response.json();
    },
  });

  // Handle both old format (array) and new format (object with products array)
  const allProducts = Array.isArray(allProductsData) ? allProductsData : (allProductsData?.products || []);

  // Calculate analytics using ALL products, not just paginated ones
  const totalUsers = users?.length || 0;
  const totalProducts = pagination?.total || allProducts?.length || 0; // Use pagination total or all products count
  const totalCategories = categories?.length || 0;

  // Analytics by category using ALL products
  const productsByCategory = useMemo(() => {
    const categoryCount: Record<string, number> = {};
    allProducts.forEach((product: any) => {
      categoryCount[product.category] = (categoryCount[product.category] || 0) + 1;
    });
    return Object.entries(categoryCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  }, [allProducts]);

  // Recent activity (last 7 days)
  const recentUsers = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return users.filter(user => {
      if (!user.createdAt) return false;
      return new Date(user.createdAt) > sevenDaysAgo;
    }).length;
  }, [users]);

  // Static system stats (no auto-refresh to avoid interrupting user interactions)
  const systemStats = useMemo(() => ({
    status: 'Online',
    lastUpdated: new Date().toLocaleTimeString(),
    serverUptime: '2d 14h 32m', // Static uptime display
    memoryUsage: 58, // Static memory usage percentage
    activeConnections: 12, // Static connection count
    requestsPerMinute: 35 // Static request rate
  }), []); // Empty dependency array means this only calculates once

  function UserManagement() {
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
      name: "",
      whatsappNumber: "",
      password: "",
      isAdmin: false,
      isPrimaryAdmin: false,
    });

    const { toast } = useToast();

    // Fetch users
    const fetchUsers = useCallback(async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/users");

        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }

        const data = await response.json();
        setUsers(data);
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to load users",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }, [toast]);

    // Initial fetch
    useEffect(() => {
      fetchUsers();
    }, [fetchUsers]);

    // Create/update user
    const handleSubmitUser = async (e: React.FormEvent) => {
      e.preventDefault();

      try {
        const payload = {
          ...formData,
          whatsappNumber: formData.whatsappNumber.startsWith("+91")
            ? formData.whatsappNumber
            : `+91${formData.whatsappNumber.replace(/^0+/, "")}`,
        };

        let response;

        if (selectedUser) {
          // Update existing user
          response = await fetch(`/api/users/${selectedUser.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          // Create new user
          response = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to save user");
        }

        toast({
          title: selectedUser ? "User Updated" : "User Created",
          description: selectedUser
            ? `${payload.name} has been updated successfully`
            : `${payload.name} has been added successfully`,
        });

        setIsModalOpen(false);
        fetchUsers();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to save user",
          variant: "destructive",
        });
      }
    };

    // Delete user
    const handleDeleteUser = async (userId: number) => {
      if (!confirm("Are you sure you want to delete this user?")) {
        return;
      }

      try {
        const response = await fetch(`/api/users/${userId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to delete user");
        }

        toast({
          title: "User Deleted",
          description: "User has been deleted successfully",
        });

        fetchUsers();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to delete user",
          variant: "destructive",
        });
      }
    };

    // Export users
    const handleExportUsers = async () => {
      try {
        const response = await fetch("/api/users/export");

        if (!response.ok) {
          throw new Error("Failed to export users");
        }

        // Create a blob from the response
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        // Create a temporary link and trigger download
        const a = document.createElement("a");
        a.href = url;
        a.download = `Vmake_Finessee_Users_${new Date().getTime()}.xlsx`;
        document.body.appendChild(a);
        a.click();

        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Users Exported",
          description: "User data has been exported successfully",
        });
      } catch (error: any) {
        toast({
          title: "Export Failed",
          description: error.message || "Failed to export users",
          variant: "destructive",
        });
      }
    };

    // Add/edit user modal
    const handleAddEditUser = (user?: any) => {
      if (user) {
        // Edit existing user
        setFormData({
          name: user.name,
          whatsappNumber: user.whatsappNumber,
          password: "", // Don't populate password for security
          isAdmin: user.isAdmin,
          isPrimaryAdmin: user.isPrimaryAdmin,
        });
        setSelectedUser(user);
      } else {
        // Add new user
        setFormData({
          name: "",
          whatsappNumber: "",
          password: "",
          isAdmin: false,
          isPrimaryAdmin: false,
        });
        setSelectedUser(null);
      }

      setIsModalOpen(true);
    };

  return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-white">User Management</h2>
          <div className="flex space-x-2">
            <Button
              onClick={handleExportUsers}
              className="bg-gold hover:bg-gold-light text-black-primary font-semibold"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Users
            </Button>
            <Button
              onClick={() => handleAddEditUser()}
              className="bg-black-secondary hover:bg-black-accent border border-gold text-gold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-black-secondary rounded-lg border border-black-accent p-4 animate-pulse"
              >
                <div className="h-6 bg-black-accent rounded w-1/4 mb-4"></div>
                <div className="h-4 bg-black-accent rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-black-accent rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-black-secondary rounded-lg border border-black-accent overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-black-accent">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">WhatsApp</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Admin Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Created</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-black-accent">
                    <td className="px-4 py-3 text-white">{user.name}</td>
                    <td className="px-4 py-3 text-white">{user.whatsappNumber}</td>
                    <td className="px-4 py-3">
                      {user.isPrimaryAdmin ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gold text-black-primary">
                          Primary Admin
                        </span>
                      ) : user.isAdmin ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                          User
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => getUserDetails(user.id)}
                          className="text-gray-400 hover:text-white"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddEditUser(user)}
                          className="text-gray-400 hover:text-white"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-gray-400 hover:text-red-500"
                          disabled={user.isPrimaryAdmin}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add/Edit User Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="bg-black-secondary border-black-accent text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedUser ? "Edit User" : "Add New User"}</DialogTitle>
              <DialogDescription className="text-gray-400">
                {selectedUser
                  ? "Update user information below."
                  : "Fill in the details to create a new user."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitUser} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter user name"
                  className="bg-black-primary border-black-accent"
                  required
                />
              </div>

              <div>
                <Label htmlFor="whatsapp">WhatsApp Number</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    +91
                  </span>
                  <Input
                    id="whatsapp"
                    value={formData.whatsappNumber.replace("+91", "")}
                    onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                    placeholder="9876543210"
                    className="bg-black-primary border-black-accent pl-12"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">
                  Password {selectedUser && "(leave blank to keep unchanged)"}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter password"
                    className="bg-black-primary border-black-accent pr-12"
                    required={!selectedUser}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gold transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isAdmin"
                  checked={formData.isAdmin}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      isAdmin: !!checked,
                      // If not admin, can't be primary admin
                      isPrimaryAdmin: !!checked ? formData.isPrimaryAdmin : false
                    })
                  }
                />
                <Label htmlFor="isAdmin" className="cursor-pointer">
                  Is Admin User
                </Label>
              </div>

              {formData.isAdmin && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isPrimaryAdmin"
                    checked={formData.isPrimaryAdmin}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isPrimaryAdmin: !!checked })
                    }
                  />
                  <Label htmlFor="isPrimaryAdmin" className="cursor-pointer">
                    Is Primary Admin
                  </Label>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-black-primary border-black-accent text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gold hover:bg-gold-light text-black-primary font-semibold"
                >
                  {selectedUser ? "Update User" : "Create User"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black-primary text-white">
      <header className="bg-black-secondary border-b border-black-accent">
        {/* ... existing header ... */}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-black-secondary border border-black-accent rounded-lg p-4 mb-6">
          <nav className="flex space-x-1">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                className={
                  activeTab === tab.id
                    ? "bg-gold text-black-primary hover:bg-gold-light"
                    : "text-gray-400 hover:text-white"
                }
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span className="ml-2">{tab.label}</span>
              </Button>
            ))}
          </nav>
        </div>

        {activeTab === "products" ? (
          <div className="space-y-6">
            {/* Header with actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-semibold text-white">Product Management</h2>
              <div className="flex flex-wrap gap-2">
                {selectedProducts.size > 0 && (
                  <Button
                    onClick={handleBulkDelete}
                    disabled={bulkDeleteMutation.isPending}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected ({selectedProducts.size})
                  </Button>
                )}
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="outline"
                  className="border-gold text-gold hover:bg-gold hover:text-black-primary"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
                <Button
                  className="bg-gold hover:bg-gold-light text-black-primary font-semibold"
                  onClick={handleAddProduct}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </div>
            </div>

            {/* Search and Filters */}
            <Card className="bg-black-secondary border-black-accent">
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search products by name, code, or category..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-black-primary border-black-accent text-white"
                    />
                  </div>

                  {/* Filters */}
                  {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-black-accent">
                      <div>
                        <Label className="text-gray-300">Category</Label>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                          <SelectTrigger className="bg-black-primary border-black-accent text-white">
                            <SelectValue placeholder="All Categories" />
                          </SelectTrigger>
                          <SelectContent className="bg-black-secondary border-black-accent">
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-gray-300">Finish</Label>
                        <Select value={finishFilter} onValueChange={setFinishFilter}>
                          <SelectTrigger className="bg-black-primary border-black-accent text-white">
                            <SelectValue placeholder="All Finishes" />
                          </SelectTrigger>
                          <SelectContent className="bg-black-secondary border-black-accent">
                            <SelectItem value="all">All Finishes</SelectItem>
                            {finishes.map((finish) => (
                              <SelectItem key={finish} value={finish}>
                                {finish}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-gray-300">Material</Label>
                        <Select value={materialFilter} onValueChange={setMaterialFilter}>
                          <SelectTrigger className="bg-black-primary border-black-accent text-white">
                            <SelectValue placeholder="All Materials" />
                          </SelectTrigger>
                          <SelectContent className="bg-black-secondary border-black-accent">
                            <SelectItem value="all">All Materials</SelectItem>
                            {materials.map((material) => (
                              <SelectItem key={material} value={material}>
                                {material}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-end">
                        <Button
                          onClick={clearFilters}
                          variant="outline"
                          className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Clear Filters
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Results Summary and Pagination Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-gray-400">
                <span>
                  Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, pagination.total)} of {pagination.total} products
                  {searchTerm && ` for "${searchTerm}"`}
                </span>
                {selectedProducts.size > 0 && (
                  <span>{selectedProducts.size} products selected</span>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Label className="text-gray-400">Items per page:</Label>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => handleItemsPerPageChange(parseInt(value))}>
                  <SelectTrigger className="w-20 bg-black-primary border-black-accent text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black-secondary border-black-accent">
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Products Table */}
            <Card className="bg-black-secondary border-black-accent">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-black-accent">
                      <tr>
                        <th className="text-left p-4 text-gray-300 font-semibold w-12">
                          <Checkbox
                            checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                            onCheckedChange={handleSelectAll}
                            className="border-gray-400"
                          />
                        </th>
                        <th className="text-left p-4 text-gray-300 font-semibold">Product</th>
                        <th className="text-left p-4 text-gray-300 font-semibold">Code</th>
                        <th className="text-left p-4 text-gray-300 font-semibold">Category</th>
                        <th className="text-left p-4 text-gray-300 font-semibold">Material</th>
                        <th className="text-left p-4 text-gray-300 font-semibold">Dimensions</th>
                        <th className="text-left p-4 text-gray-300 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productsLoading ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-400">
                            Loading products...
                          </td>
                        </tr>
                      ) : filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-400">
                            {searchTerm || categoryFilter !== "all" || finishFilter !== "all" || materialFilter !== "all"
                              ? "No products match your search criteria"
                              : "No products found"}
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((product: Product) => (
                          <tr key={product.id} className="border-b border-black-accent hover:bg-black-accent transition-colors">
                            <td className="p-4">
                              <Checkbox
                                checked={selectedProducts.has(product.id)}
                                onCheckedChange={() => handleSelectProduct(product.id)}
                                className="border-gray-400"
                              />
                            </td>
                            <td className="p-4">
                              <div className="flex items-center space-x-3">
                                {product.imageUrl && (
                                  <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="w-12 h-12 object-cover rounded"
                                  />
                                )}
                                <span className="text-white font-medium">{product.name}</span>
                              </div>
                            </td>
                            <td className="p-4 text-gold">{product.code}</td>
                            <td className="p-4 text-white">{product.category}</td>
                            <td className="p-4 text-white">{product.material || "Not specified"}</td>
                            <td className="p-4 text-white">
                              {product.length}×{product.breadth}×{product.height} cm
                            </td>
                            <td className="p-4">
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditProduct(product)}
                                  className="text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-white"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => deleteProductMutation.mutate(product.id)}
                                  disabled={deleteProductMutation.isPending}
                                  className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Pagination Navigation */}
            {pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-sm text-gray-400">
                  Page {currentPage} of {pagination.totalPages}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    First
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Previous
                  </Button>

                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className={
                            currentPage === pageNum
                              ? "bg-gold text-black-primary hover:bg-gold-light"
                              : "border-gray-600 text-gray-300 hover:bg-gray-700"
                          }
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Next
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={currentPage === pagination.totalPages}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Last
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === "users" ? (
          <UserManagement />
        ) : activeTab === "upload" ? (
          <ExcelUpload />
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Analytics Dashboard</h2>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-black-secondary border-black-accent">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Total Products</CardTitle>
                  <Package className="h-4 w-4 text-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gold">{totalProducts}</div>
                  <p className="text-xs text-gray-400">
                    {totalCategories} categories
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-black-secondary border-black-accent">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gold">{totalUsers}</div>
                  <p className="text-xs text-gray-400">
                    {recentUsers} new this week
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-black-secondary border-black-accent">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Admin Users</CardTitle>
                  <Star className="h-4 w-4 text-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gold">
                    {users.filter(u => u.isAdmin).length}
                  </div>
                  <p className="text-xs text-gray-400">
                    {users.filter(u => u.isPrimaryAdmin).length} primary admin
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-black-secondary border-black-accent">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Categories</CardTitle>
                  <TrendingUp className="h-4 w-4 text-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gold">{totalCategories}</div>
                  <p className="text-xs text-gray-400">
                    Product categories
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts and Detailed Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Products by Category Chart */}
              <Card className="bg-black-secondary border-black-accent">
                <CardHeader>
                  <CardTitle className="text-white">Products by Category ({productsByCategory.length} total)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {productsByCategory.map((category, index) => (
                      <div key={category.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: `hsl(${(index * 60) % 360}, 70%, 50%)`
                            }}
                          />
                          <span className="text-white text-sm">{category.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-black-accent rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-gold"
                              style={{
                                width: `${(category.count / totalProducts) * 100}%`
                              }}
                            />
                          </div>
                          <span className="text-gold text-sm font-medium">{category.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="bg-black-secondary border-black-accent">
                <CardHeader>
                  <CardTitle className="text-white">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-gold" />
                      <div>
                        <p className="text-white text-sm">New Users This Week</p>
                        <p className="text-2xl font-bold text-gold">{recentUsers}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Package className="h-4 w-4 text-gold" />
                      <div>
                        <p className="text-white text-sm">Total Products</p>
                        <p className="text-2xl font-bold text-gold">{totalProducts}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Users className="h-4 w-4 text-gold" />
                      <div>
                        <p className="text-white text-sm">Active Users</p>
                        <p className="text-2xl font-bold text-gold">{users.filter(u => !u.isAdmin).length}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Real-Time System Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-black-secondary border-black-accent">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-gold" />
                    System Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Uptime</span>
                      <span className="text-gold font-medium">{systemStats.serverUptime}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Memory Usage</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-black-accent rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-gold"
                            style={{ width: `${systemStats.memoryUsage}%` }}
                          />
                        </div>
                        <span className="text-gold font-medium text-sm">{systemStats.memoryUsage}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Active Connections</span>
                      <span className="text-gold font-medium">{systemStats.activeConnections}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black-secondary border-black-accent">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-gold" />
                    Traffic Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Requests/Min</span>
                      <span className="text-gold font-medium">{systemStats.requestsPerMinute}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Total Products</span>
                      <span className="text-gold font-medium">{totalProducts.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Categories</span>
                      <span className="text-gold font-medium">{totalCategories}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black-secondary border-black-accent">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-gold" />
                    Live Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Status</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-500 font-medium">{systemStats.status}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Last Updated</span>
                      <span className="text-gold font-medium text-sm">
                        {systemStats.lastUpdated}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Total Users</span>
                      <span className="text-gold font-medium">{totalUsers}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Product Add/Edit Modal */}
        <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
          <DialogContent className="bg-black-secondary border-black-accent text-white sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
              <DialogDescription className="text-gray-400">
                {editingProduct
                  ? "Update product information below."
                  : "Fill in the details to create a new product."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitProduct} className="space-y-4">
              <div>
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={productForm.name}
                  onChange={handleInputChange}
                  placeholder="Enter product name"
                  className="bg-black-primary border-black-accent"
                  required
                />
              </div>

              <div>
                <Label htmlFor="code">Product Code</Label>
                <Input
                  id="code"
                  name="code"
                  value={productForm.code}
                  onChange={handleInputChange}
                  placeholder="Enter unique product code"
                  className="bg-black-primary border-black-accent"
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  name="category"
                  value={productForm.category}
                  onChange={handleInputChange}
                  placeholder="Enter product category"
                  className="bg-black-primary border-black-accent"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="length">Length (cm)</Label>
                  <Input
                    id="length"
                    name="length"
                    type="number"
                    value={productForm.length}
                    onChange={handleInputChange}
                    className="bg-black-primary border-black-accent"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="breadth">Breadth (cm)</Label>
                  <Input
                    id="breadth"
                    name="breadth"
                    type="number"
                    value={productForm.breadth}
                    onChange={handleInputChange}
                    className="bg-black-primary border-black-accent"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    name="height"
                    type="number"
                    value={productForm.height}
                    onChange={handleInputChange}
                    className="bg-black-primary border-black-accent"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="finish">Finish</Label>
                <Input
                  id="finish"
                  name="finish"
                  value={productForm.finish}
                  onChange={handleInputChange}
                  placeholder="Enter product finish"
                  className="bg-black-primary border-black-accent"
                  required
                />
              </div>

              <div>
                <Label htmlFor="material">Material</Label>
                <Input
                  id="material"
                  name="material"
                  value={productForm.material}
                  onChange={handleInputChange}
                  placeholder="Enter product material"
                  className="bg-black-primary border-black-accent"
                  required
                />
              </div>

              <div>
                <Label htmlFor="imageUrl">Primary Image URL (optional)</Label>
                <Input
                  id="imageUrl"
                  name="imageUrl"
                  value={productForm.imageUrl}
                  onChange={handleInputChange}
                  placeholder="Enter primary product image URL"
                  className="bg-black-primary border-black-accent"
                />
              </div>

              {/* Multiple Images Section - Collapsible */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Additional Images ({productForm.imageUrls.length})</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowImageManager(!showImageManager)}
                    className="text-xs"
                  >
                    {showImageManager ? 'Hide' : 'Manage'}
                  </Button>
                </div>

                {showImageManager && (
                  <>
                    {/* Add new image URL */}
                    <div className="flex space-x-2">
                      <Input
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        placeholder="Enter additional image URL"
                        className="bg-black-primary border-black-accent flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addImageUrl();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={addImageUrl}
                        disabled={!newImageUrl.trim()}
                        className="bg-gold hover:bg-gold-light text-black-primary"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Display existing images */}
                    {productForm.imageUrls.length > 0 && (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {productForm.imageUrls.map((url, index) => (
                          <div key={index} className="flex items-center space-x-2 bg-black-accent p-2 rounded text-xs">
                            <img
                              src={url}
                              alt={`Image ${index + 1}`}
                              className="w-8 h-8 object-contain bg-gray-100 rounded"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-image.png';
                              }}
                            />
                            <span className="text-gray-300 flex-1 truncate">{url}</span>
                            <div className="flex space-x-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => moveImageUp(index)}
                                disabled={index === 0}
                                className="h-5 w-5 p-0 border-gray-600 text-xs"
                              >
                                ↑
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => moveImageDown(index)}
                                disabled={index === productForm.imageUrls.length - 1}
                                className="h-5 w-5 p-0 border-gray-600 text-xs"
                              >
                                ↓
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => removeImageUrl(index)}
                                className="h-5 w-5 p-0 border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                              >
                                <X className="w-2 h-2" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <textarea
                  id="description"
                  name="description"
                  value={productForm.description}
                  onChange={handleInputChange}
                  placeholder="Enter product description"
                  className="w-full min-h-[80px] px-3 py-2 bg-black-primary border border-black-accent rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent resize-vertical"
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProductModalOpen(false)}
                  className="bg-black-primary border-black-accent text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saveProductMutation.isPending}
                  className="bg-gold hover:bg-gold-light text-black-primary font-semibold"
                >
                  {saveProductMutation.isPending
                    ? "Saving..."
                    : (editingProduct ? "Update Product" : "Create Product")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* User Detail Modal with Wishlist */}
        <Dialog open={userDetailModalOpen} onOpenChange={setUserDetailModalOpen}>
          <DialogContent className="bg-black-secondary border-black-accent text-white sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
            </DialogHeader>

            {selectedUser && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-black-primary border-black-accent">
              <CardHeader>
                      <CardTitle className="text-white text-lg">Personal Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <span className="text-gray-400">Name:</span>
                        <p className="text-white font-medium">{selectedUser.user.name}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">WhatsApp:</span>
                        <p className="text-white font-medium">{selectedUser.user.whatsappNumber}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Admin Status:</span>
                        <p className="text-white font-medium">
                          {selectedUser.user.isPrimaryAdmin
                            ? "Primary Admin"
                            : selectedUser.user.isAdmin
                              ? "Admin"
                              : "Regular User"}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">Registered On:</span>
                        <p className="text-white font-medium">
                          {selectedUser.user.createdAt ? new Date(selectedUser.user.createdAt).toLocaleDateString() : "N/A"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-black-primary border-black-accent">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-white text-lg">Wishlist</CardTitle>
                      {selectedUser.wishlist.length > 0 && (
                        <Button
                          size="sm"
                          className="bg-gold hover:bg-gold-light text-black-primary font-semibold"
                          onClick={() => {
                            window.open(`/api/wishlist/export/excel?userId=${selectedUser.user.id}`, '_blank');
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export Excel
                        </Button>
                      )}
              </CardHeader>
              <CardContent>
                      {selectedUser.wishlist.length === 0 ? (
                        <p className="text-gray-400">No items in wishlist</p>
                      ) : (
                        <div className="text-sm">
                          <p className="text-gray-400 mb-2">
                            {selectedUser.wishlist.length} {selectedUser.wishlist.length === 1 ? 'item' : 'items'} in wishlist
                          </p>
                        </div>
                      )}
              </CardContent>
            </Card>
          </div>

                {selectedUser.wishlist.length > 0 && (
                  <Card className="bg-black-primary border-black-accent">
            <CardHeader>
                      <CardTitle className="text-white text-lg">Wishlist Items</CardTitle>
            </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-black-accent">
                            <tr>
                              <th className="text-left p-3 text-gray-300 font-medium">Product</th>
                              <th className="text-left p-3 text-gray-300 font-medium">Code</th>
                              <th className="text-left p-3 text-gray-300 font-medium">Category</th>
                              <th className="text-left p-3 text-gray-300 font-medium">Material</th>
                              <th className="text-left p-3 text-gray-300 font-medium">Dimensions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedUser.wishlist.map((item: any) => (
                              <tr key={item.product.id} className="border-b border-black-accent">
                                <td className="p-3">
                                  <div className="flex items-center space-x-3">
                                    {item.product.imageUrl && (
                                      <img
                                        src={item.product.imageUrl}
                                        alt={item.product.name}
                                        className="w-10 h-10 object-contain bg-gray-100 rounded"
                                      />
                                    )}
                                    <span className="text-white">{item.product.name}</span>
                                  </div>
                                </td>
                                <td className="p-3 text-gold">{item.product.code}</td>
                                <td className="p-3 text-white">{item.product.category}</td>
                                <td className="p-3 text-white">{item.product.material || "Not specified"}</td>
                                <td className="p-3 text-white">
                                  {item.product.length}×{item.product.breadth}×{item.product.height} cm
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
            </CardContent>
          </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
