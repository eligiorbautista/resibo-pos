import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Package,
  Plus,
  Search,
  AlertCircle,
  ArrowUpRight,
  Edit2,
  Trash2,
  MoreVertical,
  X,
  TrendingUp,
  TrendingDown,
  History,
  Layers,
  Tag,
  Download,
  Upload,
} from "lucide-react";
import { Product, StockAdjustment, ProductVariant } from "../../types";
import { MODIFIER_GROUPS } from "../../constants";
import { useToast } from "../common/ToastProvider";
import ConfirmationDialog from "../common/ConfirmationDialog";
import {
  productsApi,
  modifiersApi,
  variantsApi,
} from "../../services/apiService";
import type {
  ModifierGroup,
  Modifier,
  ProductVariant as ApiProductVariant,
} from "../../services/apiService";

interface InventoryProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  currentUser?: { id: string; role: string };
  employees?: Employee[];
}

interface Employee {
  id: string;
  name: string;
}

const STOCK_ADJUSTMENT_REASONS = [
  "Damaged Goods",
  "Expired Items",
  "Theft/Loss",
  "Found Stock",
  "Returned Items",
  "Inventory Count Correction",
  "Transfer In",
  "Transfer Out",
  "Other",
];

const InventoryManager: React.FC<InventoryProps> = ({
  products,
  setProducts,
  currentUser,
  employees = [],
}) => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>(
    []
  );
  const [showStockAdjustment, setShowStockAdjustment] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(
    null
  );
  const [adjustmentQuantity, setAdjustmentQuantity] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [showAdjustmentHistory, setShowAdjustmentHistory] = useState(false);
  const [showVariantsModal, setShowVariantsModal] = useState(false);
  const [editingVariantsProduct, setEditingVariantsProduct] =
    useState<Product | null>(null);
  const [newVariant, setNewVariant] = useState({
    name: "",
    price: "",
    stock: "",
    sku: "",
  });
  const [showModifiersModal, setShowModifiersModal] = useState(false);
  const [editingModifiersProduct, setEditingModifiersProduct] =
    useState<Product | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [newModifierGroup, setNewModifierGroup] = useState({
    name: "",
    required: false,
    maxSelections: "",
  });
  const [editingModifierGroup, setEditingModifierGroup] =
    useState<ModifierGroup | null>(null);
  const [newModifier, setNewModifier] = useState({
    name: "",
    price: "",
    category: "",
  });
  const [editingModifier, setEditingModifier] = useState<Modifier | null>(null);
  const [showModifierForm, setShowModifierForm] = useState<string | null>(null); // modifierGroupId or null

  // Load products from backend
  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const fetchedProducts = await productsApi.getAll();
      // Map API response to Product type
      const mappedProducts: Product[] = fetchedProducts.map((prod: any) => ({
        id: prod.id,
        name: prod.name,
        category: prod.category,
        description: prod.description || "",
        basePrice:
          typeof prod.basePrice === "number"
            ? prod.basePrice
            : parseFloat(prod.basePrice),
        costPrice:
          typeof prod.costPrice === "number"
            ? prod.costPrice
            : parseFloat(prod.costPrice),
        imageUrl: prod.imageUrl || undefined,
        reorderPoint: prod.reorderPoint || 0,
        totalStock: prod.totalStock || 0,
        variants: prod.variants || [],
        modifierGroups: prod.modifierGroups || [],
      }));
      setProducts(mappedProducts);
    } catch (error: any) {
      showToast("Failed to load products", "error");
      console.error("Error loading products:", error);
    } finally {
      setLoadingProducts(false);
    }
  }, [setProducts, showToast]);

  // Helper function to update editing product with fresh data
  const updateEditingProduct = useCallback(async () => {
    if (!editingModifiersProduct) return;
    const updatedProducts = await productsApi.getAll();
    const updatedProduct = updatedProducts.find(
      (p: any) => p.id === editingModifiersProduct.id
    );
    if (updatedProduct) {
      setEditingModifiersProduct({
        id: updatedProduct.id,
        name: updatedProduct.name,
        category: updatedProduct.category,
        description: updatedProduct.description || "",
        basePrice:
          typeof updatedProduct.basePrice === "number"
            ? updatedProduct.basePrice
            : parseFloat(updatedProduct.basePrice),
        costPrice:
          typeof updatedProduct.costPrice === "number"
            ? updatedProduct.costPrice
            : parseFloat(updatedProduct.costPrice),
        imageUrl: updatedProduct.imageUrl || undefined,
        reorderPoint: updatedProduct.reorderPoint || 0,
        totalStock: updatedProduct.totalStock || 0,
        variants: updatedProduct.variants || [],
        modifierGroups: updatedProduct.modifierGroups || [],
      });
    }
  }, [editingModifiersProduct]);

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingRow) {
        const menuElement = menuRefs.current[editingRow];
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setEditingRow(null);
        }
      }
    };

    if (editingRow) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editingRow]);

  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    description: "",
    basePrice: "",
    costPrice: "",
    imageUrl: "",
    reorderPoint: "",
    totalStock: "",
  });

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Extract unique categories from existing products
  const existingCategories = React.useMemo(() => {
    const categories = new Set<string>();
    products.forEach((product) => {
      if (product.category && product.category.trim()) {
        categories.add(product.category.trim());
      }
    });

    // Default categories for restaurants/cafes
    const defaultCategories = [
      "Appetizers",
      "Soups",
      "Salads",
      "Main Courses",
      "Rice Meals",
      "Pasta",
      "Pizza",
      "Burgers",
      "Sandwiches",
      "Sides",
      "Desserts",
      "Bakery",
      "Pastries",
      "Beverages",
      "Coffee",
      "Tea",
      "Hot Drinks",
      "Cold Drinks",
      "Smoothies",
      "Juices",
      "Alcoholic Beverages",
      "Snacks",
      "Merchandise",
    ];

    // Add default categories to the set
    defaultCategories.forEach((cat) => categories.add(cat));

    return Array.from(categories).sort();
  }, [products]);

  const handleAddProduct = async () => {
    if (!newProduct.name.trim() || !newProduct.category.trim()) {
      showToast("Please fill in required fields", "error");
      return;
    }

    try {
      const createdProduct = await productsApi.create({
        name: newProduct.name.trim(),
        category: newProduct.category.trim(),
        description: newProduct.description.trim(),
        basePrice: parseFloat(newProduct.basePrice) || 0,
        costPrice: parseFloat(newProduct.costPrice) || 0,
        imageUrl: newProduct.imageUrl.trim() || undefined,
        reorderPoint: parseInt(newProduct.reorderPoint) || 10,
        totalStock: parseInt(newProduct.totalStock) || 0,
      });

      // Map API response to Product type
      const mappedProduct: Product = {
        id: createdProduct.id,
        name: createdProduct.name,
        category: createdProduct.category,
        description: createdProduct.description || "",
        basePrice:
          typeof createdProduct.basePrice === "number"
            ? createdProduct.basePrice
            : parseFloat(createdProduct.basePrice),
        costPrice:
          typeof createdProduct.costPrice === "number"
            ? createdProduct.costPrice
            : parseFloat(createdProduct.costPrice),
        imageUrl: createdProduct.imageUrl || undefined,
        reorderPoint: createdProduct.reorderPoint || 0,
        totalStock: createdProduct.totalStock || 0,
        variants: createdProduct.variants || [],
        modifierGroups: createdProduct.modifierGroups || [],
      };

      setProducts((prev) => [...prev, mappedProduct]);
      setShowAddModal(false);
      setNewProduct({
        name: "",
        category: "",
        description: "",
        basePrice: "",
        costPrice: "",
        imageUrl: "",
        reorderPoint: "",
        totalStock: "",
      });
      showToast(`${mappedProduct.name} added successfully`, "success");
    } catch (error: any) {
      showToast(error.message || "Failed to add product", "error");
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      category: product.category,
      description: product.description,
      basePrice: product.basePrice.toString(),
      costPrice: product.costPrice.toString(),
      imageUrl: product.imageUrl || "",
      reorderPoint: product.reorderPoint.toString(),
      totalStock: product.totalStock.toString(),
    });
    setShowEditModal(true);
    setEditingRow(null);
  };

  const handleUpdateProduct = async () => {
    if (
      !editingProduct ||
      !newProduct.name.trim() ||
      !newProduct.category.trim()
    ) {
      showToast("Please fill in required fields", "error");
      return;
    }

    try {
      const updatedProduct = await productsApi.update(editingProduct.id, {
        name: newProduct.name.trim(),
        category: newProduct.category.trim(),
        description: newProduct.description.trim(),
        basePrice: parseFloat(newProduct.basePrice) || 0,
        costPrice: parseFloat(newProduct.costPrice) || 0,
        imageUrl: newProduct.imageUrl.trim() || undefined,
        reorderPoint: parseInt(newProduct.reorderPoint) || 10,
        totalStock: parseInt(newProduct.totalStock) || 0,
      });

      // Map API response to Product type
      const mappedProduct: Product = {
        id: updatedProduct.id,
        name: updatedProduct.name,
        category: updatedProduct.category,
        description: updatedProduct.description || "",
        basePrice:
          typeof updatedProduct.basePrice === "number"
            ? updatedProduct.basePrice
            : parseFloat(updatedProduct.basePrice),
        costPrice:
          typeof updatedProduct.costPrice === "number"
            ? updatedProduct.costPrice
            : parseFloat(updatedProduct.costPrice),
        imageUrl: updatedProduct.imageUrl || undefined,
        reorderPoint: updatedProduct.reorderPoint || 0,
        totalStock: updatedProduct.totalStock || 0,
        variants: updatedProduct.variants || [],
        modifierGroups: updatedProduct.modifierGroups || [],
      };

      setProducts((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? mappedProduct : p))
      );
      setShowEditModal(false);
      setEditingProduct(null);
      setNewProduct({
        name: "",
        category: "",
        description: "",
        basePrice: "",
        costPrice: "",
        imageUrl: "",
        reorderPoint: "",
        totalStock: "",
      });
      showToast("Product updated successfully", "success");
    } catch (error: any) {
      showToast(error.message || "Failed to update product", "error");
    }
  };

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
    setShowDeleteConfirm(true);
    setEditingRow(null);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) {
      setShowDeleteConfirm(false);
      return;
    }

    try {
      await productsApi.delete(productToDelete.id);
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      showToast(`${productToDelete.name} deleted successfully`, "success");
      setProductToDelete(null);
    } catch (error: any) {
      showToast(error.message || "Failed to delete product", "error");
    }
    setShowDeleteConfirm(false);
  };

  const handleStockAdjustment = async () => {
    if (!adjustingProduct || !adjustmentQuantity || !adjustmentReason) {
      showToast("Please fill in all required fields", "error");
      return;
    }

    const quantity = parseFloat(adjustmentQuantity);
    if (isNaN(quantity) || quantity === 0) {
      showToast("Please enter a valid quantity", "error");
      return;
    }

    const newStock = adjustingProduct.totalStock + quantity;
    if (newStock < 0) {
      showToast("Stock cannot be negative", "error");
      return;
    }

    const adjustment: StockAdjustment = {
      id: "ADJ-" + Date.now(),
      productId: adjustingProduct.id,
      quantity,
      reason: adjustmentReason,
      adjustedBy: currentUser?.id || "SYSTEM",
      adjustedAt: new Date(),
      notes: adjustmentNotes.trim() || undefined,
    };

    try {
      // Update product stock via API
      const updatedProduct = await productsApi.update(adjustingProduct.id, {
        totalStock: newStock,
      });

      setStockAdjustments((prev) => [...prev, adjustment]);

      // Map API response to Product type
      const mappedProduct: Product = {
        id: updatedProduct.id,
        name: updatedProduct.name,
        category: updatedProduct.category,
        description: updatedProduct.description || "",
        basePrice:
          typeof updatedProduct.basePrice === "number"
            ? updatedProduct.basePrice
            : parseFloat(updatedProduct.basePrice),
        costPrice:
          typeof updatedProduct.costPrice === "number"
            ? updatedProduct.costPrice
            : parseFloat(updatedProduct.costPrice),
        imageUrl: updatedProduct.imageUrl || undefined,
        reorderPoint: updatedProduct.reorderPoint || 0,
        totalStock: updatedProduct.totalStock || 0,
        variants: updatedProduct.variants || [],
        modifierGroups: updatedProduct.modifierGroups || [],
      };

      setProducts((prev) =>
        prev.map((p) => (p.id === adjustingProduct.id ? mappedProduct : p))
      );
      showToast(
        `Stock adjusted: ${quantity > 0 ? "+" : ""}${quantity}`,
        "success"
      );
      setShowStockAdjustment(false);
      setAdjustingProduct(null);
      setAdjustmentQuantity("");
      setAdjustmentReason("");
      setAdjustmentNotes("");
    } catch (error: any) {
      showToast(error.message || "Failed to adjust stock", "error");
    }
  };

  return (
    <div className="flex flex-col h-full p-6 bg-white overflow-hidden">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">
            Stock Management
          </p>
          <h1 className="text-3xl font-black tracking-tighter text-black">
            INVENTORY
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {stockAdjustments.length > 0 && (
            <button
              onClick={() => setShowAdjustmentHistory(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
            >
              <History size={14} /> Adjustments ({stockAdjustments.length})
            </button>
          )}
          <button
            onClick={() => {
              const csv = [
                [
                  "ID",
                  "Name",
                  "Category",
                  "Price",
                  "Cost",
                  "Stock",
                  "Reorder Point",
                ].join(","),
                ...products.map((p) =>
                  [
                    p.id,
                    p.name,
                    p.category,
                    p.basePrice,
                    p.costPrice,
                    p.totalStock,
                    p.reorderPoint,
                  ].join(",")
                ),
              ].join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `inventory-export-${
                new Date().toISOString().split("T")[0]
              }.csv`;
              a.click();
              window.URL.revokeObjectURL(url);
              showToast("Inventory exported successfully", "success");
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
          >
            <Download size={14} /> Export
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
          >
            <Plus size={14} /> New Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <StatsCard
          label="Active SKU"
          value={products.length.toString()}
          icon={<Package size={18} />}
        />
        <StatsCard
          label="Low Stocks"
          value={products
            .filter((p) => p.totalStock < p.reorderPoint)
            .length.toString()}
          icon={<AlertCircle size={18} />}
          isWarning
        />
        <StatsCard
          label="Asset Value"
          value={`₱${products
            .reduce((acc, p) => acc + p.totalStock * p.costPrice, 0)
            .toLocaleString()}`}
          icon={<ArrowUpRight size={18} />}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center">
          <div className="relative flex-1 max-w-sm">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"
              size={14}
            />
            <input
              type="text"
              placeholder="Search inventory..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl text-xs font-bold focus:outline-none focus:border-black transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 sticky top-0 z-10">
              <tr className="border-b border-gray-100 text-gray-400 text-[8px] font-black uppercase tracking-widest">
                <th className="px-6 py-4">Item</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Pricing</th>
                <th className="px-6 py-4">Qty</th>
                <th className="px-6 py-4 text-right">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Package className="w-12 h-12 text-gray-300" />
                      <div>
                        <p className="font-black text-gray-900 text-sm mb-1">
                          {products.length === 0
                            ? "No Products Added"
                            : "No Products Found"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {products.length === 0
                            ? "Start by adding your first product to the inventory"
                            : "Try adjusting your search terms or add a new product"}
                        </p>
                      </div>
                      {products.length === 0 && (
                        <button
                          onClick={() => setShowAddModal(true)}
                          className="mt-3 px-4 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
                        >
                          <Plus size={14} />
                          Add First Product
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                                target.nextElementSibling?.classList.remove(
                                  "hidden"
                                );
                              }}
                            />
                          ) : null}
                          <Package
                            className={`w-4 h-4 text-gray-400 ${
                              product.imageUrl ? "hidden" : ""
                            }`}
                          />
                        </div>
                        <div>
                          <p className="font-black text-black text-xs">
                            {product.name}
                          </p>
                          <p className="text-[8px] text-gray-400 font-bold">
                            ID: {product.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <p className="font-black text-xs text-black">
                        ₱{product.basePrice.toLocaleString()}
                      </p>
                      <p className="text-[8px] text-gray-400 font-bold">
                        Cost: ₱{product.costPrice}
                      </p>
                    </td>
                    <td className="px-6 py-3 font-black text-xs">
                      {product.totalStock}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span
                        className={`px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest
                      ${
                        product.totalStock < product.reorderPoint
                          ? "bg-black text-white"
                          : "bg-gray-100 text-gray-500"
                      }`}
                      >
                        {product.totalStock <= 0
                          ? "Out"
                          : product.totalStock < product.reorderPoint
                          ? "Low"
                          : "OK"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div
                          className="relative"
                          ref={(el) => {
                            if (el) menuRefs.current[product.id] = el;
                          }}
                        >
                          <button
                            onClick={() => {
                              setEditingRow(
                                editingRow === product.id ? null : product.id
                              );
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical size={14} className="text-gray-600" />
                          </button>
                          {editingRow === product.id && (
                            <div className="absolute right-0 top-10 z-20 bg-white rounded-xl border border-gray-200 shadow-2xl p-2 min-w-[140px]">
                              <button
                                onClick={() => handleEditProduct(product)}
                                className="w-full text-left px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                              >
                                <Edit2 size={12} />
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setEditingVariantsProduct(product);
                                  setShowVariantsModal(true);
                                  setEditingRow(null);
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all hover:bg-purple-50 text-purple-600 flex items-center gap-2 mt-1"
                              >
                                <Layers size={12} />
                                Variants
                              </button>
                              <button
                                onClick={() => {
                                  setEditingModifiersProduct(product);
                                  setShowModifiersModal(true);
                                  setEditingRow(null);
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all hover:bg-indigo-50 text-indigo-600 flex items-center gap-2 mt-1"
                              >
                                <Tag size={12} />
                                Modifiers
                              </button>
                              <button
                                onClick={() => {
                                  setAdjustingProduct(product);
                                  setShowStockAdjustment(true);
                                  setEditingRow(null);
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all hover:bg-blue-50 text-blue-600 flex items-center gap-2 mt-1"
                              >
                                <TrendingUp size={12} />
                                Adjust Stock
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product)}
                                className="w-full text-left px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all hover:bg-red-50 text-red-600 flex items-center gap-2 mt-1"
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">
                  New Product
                </p>
                <h2 className="text-2xl font-black tracking-tighter text-black uppercase">
                  Add Item
                </h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, name: e.target.value })
                  }
                  placeholder="Enter product name"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  Category *
                </label>
                <select
                  value={newProduct.category}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, category: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold bg-white"
                >
                  <option value="">Select a category</option>
                  {existingCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  Image URL
                </label>
                <input
                  type="text"
                  value={newProduct.imageUrl}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, imageUrl: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  Description
                </label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      description: e.target.value,
                    })
                  }
                  placeholder="Product description"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  Base Price (₱) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newProduct.basePrice}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, basePrice: e.target.value })
                  }
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  Cost Price (₱) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newProduct.costPrice}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, costPrice: e.target.value })
                  }
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  Total Stock
                </label>
                <input
                  type="number"
                  value={newProduct.totalStock}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, totalStock: e.target.value })
                  }
                  placeholder="0"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  Reorder Point
                </label>
                <input
                  type="number"
                  value={newProduct.reorderPoint}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      reorderPoint: e.target.value,
                    })
                  }
                  placeholder="10"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewProduct({
                    name: "",
                    category: "",
                    description: "",
                    basePrice: "",
                    costPrice: "",
                    imageUrl: "",
                    reorderPoint: "",
                    totalStock: "",
                  });
                }}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-700 text-[9px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProduct}
                className="flex-1 px-4 py-3 rounded-xl bg-black text-white text-[9px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
              >
                Add Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <div
          className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4"
          onClick={() => {
            setShowEditModal(false);
            setEditingProduct(null);
          }}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">
                  Edit Product
                </p>
                <h2 className="text-2xl font-black tracking-tighter text-black uppercase">
                  Update Item
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingProduct(null);
                }}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, name: e.target.value })
                  }
                  placeholder="Enter product name"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  Category *
                </label>
                <select
                  value={newProduct.category}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, category: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold bg-white"
                >
                  <option value="">Select a category</option>
                  {existingCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  Image URL
                </label>
                <input
                  type="text"
                  value={newProduct.imageUrl}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, imageUrl: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  Description
                </label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      description: e.target.value,
                    })
                  }
                  placeholder="Product description"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  Base Price (₱) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newProduct.basePrice}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, basePrice: e.target.value })
                  }
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  Cost Price (₱) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newProduct.costPrice}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, costPrice: e.target.value })
                  }
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  Total Stock
                </label>
                <input
                  type="number"
                  value={newProduct.totalStock}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, totalStock: e.target.value })
                  }
                  placeholder="0"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  Reorder Point
                </label>
                <input
                  type="number"
                  value={newProduct.reorderPoint}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      reorderPoint: e.target.value,
                    })
                  }
                  placeholder="10"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingProduct(null);
                }}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-700 text-[9px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateProduct}
                className="flex-1 px-4 py-3 rounded-xl bg-black text-white text-[9px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
              >
                Update Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showStockAdjustment && adjustingProduct && (
        <div
          className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4"
          onClick={() => {
            setShowStockAdjustment(false);
            setAdjustingProduct(null);
          }}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">
                  Stock Adjustment
                </p>
                <h2 className="text-2xl font-black tracking-tighter text-black uppercase">
                  {adjustingProduct.name}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Current Stock: {adjustingProduct.totalStock}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowStockAdjustment(false);
                  setAdjustingProduct(null);
                }}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  Adjustment Quantity *
                </label>
                <input
                  type="number"
                  value={adjustmentQuantity}
                  onChange={(e) => setAdjustmentQuantity(e.target.value)}
                  placeholder="Positive to add, negative to subtract"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold"
                />
                <p className="text-[8px] text-gray-400 mt-1">
                  Enter positive number to add stock, negative to subtract
                </p>
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  Reason *
                </label>
                <select
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold"
                >
                  <option value="">Select reason</option>
                  {STOCK_ADJUSTMENT_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  placeholder="Additional details..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowStockAdjustment(false);
                  setAdjustingProduct(null);
                  setAdjustmentQuantity("");
                  setAdjustmentReason("");
                  setAdjustmentNotes("");
                }}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-700 text-[9px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleStockAdjustment}
                className="flex-1 px-4 py-3 rounded-xl bg-black text-white text-[9px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
              >
                Adjust Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Variants Modal */}
      {showVariantsModal && editingVariantsProduct && (
        <div
          className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4"
          onClick={() => {
            setShowVariantsModal(false);
            setEditingVariantsProduct(null);
          }}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">
                  Product Variants
                </p>
                <h2 className="text-2xl font-black tracking-tighter text-black uppercase">
                  {editingVariantsProduct.name}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowVariantsModal(false);
                  setEditingVariantsProduct(null);
                }}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                {editingVariantsProduct.variants.map((variant) => (
                  <div
                    key={variant.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                  >
                    <div>
                      <p className="text-sm font-black">{variant.name}</p>
                      <p className="text-xs text-gray-600">
                        SKU: {variant.sku} • Stock: {variant.stock}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black">
                        ₱{variant.price.toFixed(2)}
                      </span>
                      <button
                        onClick={async () => {
                          try {
                            await variantsApi.delete(variant.id);
                            await loadProducts();
                            showToast("Variant deleted", "success");
                          } catch (error: any) {
                            showToast(
                              error.message || "Failed to delete variant",
                              "error"
                            );
                          }
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">
                  Add New Variant
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newVariant.name}
                    onChange={(e) =>
                      setNewVariant({ ...newVariant, name: e.target.value })
                    }
                    placeholder="Variant name (e.g., Red / Large)"
                    className="px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold"
                  />
                  <input
                    type="text"
                    value={newVariant.sku}
                    onChange={(e) =>
                      setNewVariant({ ...newVariant, sku: e.target.value })
                    }
                    placeholder="SKU"
                    className="px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold"
                  />
                  <input
                    type="number"
                    value={newVariant.price}
                    onChange={(e) =>
                      setNewVariant({ ...newVariant, price: e.target.value })
                    }
                    placeholder="Price"
                    className="px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold"
                  />
                  <input
                    type="number"
                    value={newVariant.stock}
                    onChange={(e) =>
                      setNewVariant({ ...newVariant, stock: e.target.value })
                    }
                    placeholder="Stock"
                    className="px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (!newVariant.name || !newVariant.price) {
                      showToast(
                        "Please fill in variant name and price",
                        "error"
                      );
                      return;
                    }
                    try {
                      const createdVariant = await variantsApi.create({
                        productId: editingVariantsProduct.id,
                        name: newVariant.name,
                        price: parseFloat(newVariant.price) || 0,
                        stock: parseInt(newVariant.stock) || 0,
                        sku: newVariant.sku || undefined,
                      });

                      const variant: ProductVariant = {
                        id: createdVariant.id,
                        name: createdVariant.name,
                        price: createdVariant.price,
                        stock: createdVariant.stock,
                        sku: createdVariant.sku,
                      };

                      setProducts((prev) =>
                        prev.map((p) =>
                          p.id === editingVariantsProduct.id
                            ? { ...p, variants: [...p.variants, variant] }
                            : p
                        )
                      );
                      setNewVariant({
                        name: "",
                        price: "",
                        stock: "",
                        sku: "",
                      });
                      showToast("Variant added", "success");
                    } catch (error: any) {
                      showToast(
                        error.message || "Failed to add variant",
                        "error"
                      );
                    }
                  }}
                  className="w-full mt-3 py-3 bg-black text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
                >
                  Add Variant
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modifier Groups Modal */}
      {showModifiersModal && editingModifiersProduct && (
        <div
          className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4"
          onClick={() => {
            setShowModifiersModal(false);
            setEditingModifiersProduct(null);
          }}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">
                  Modifier Groups
                </p>
                <h2 className="text-2xl font-black tracking-tighter text-black uppercase">
                  {editingModifiersProduct.name}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowModifiersModal(false);
                  setEditingModifiersProduct(null);
                  setEditingModifierGroup(null);
                  setShowModifierForm(null);
                  setNewModifierGroup({
                    name: "",
                    required: false,
                    maxSelections: "",
                  });
                  setNewModifier({ name: "", price: "", category: "" });
                }}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Existing Modifier Groups */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    Modifier Groups
                  </p>
                  <button
                    onClick={() => {
                      setEditingModifierGroup(null);
                      setShowModifierForm(null);
                      setNewModifierGroup({
                        name: "",
                        required: false,
                        maxSelections: "",
                      });
                    }}
                    className="px-4 py-2 bg-black text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
                  >
                    <Plus size={12} className="inline mr-1" /> New Group
                  </button>
                </div>

                {(editingModifiersProduct.modifierGroups || []).map((group) => (
                  <div
                    key={group.id}
                    className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-black">{group.name}</p>
                          {group.required && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[8px] font-black uppercase">
                              Required
                            </span>
                          )}
                          {group.maxSelections && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[8px] font-black uppercase">
                              Max: {group.maxSelections}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600">
                          {group.modifiers?.length || 0} modifier(s)
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingModifierGroup(group);
                            setShowModifierForm(null);
                            setNewModifierGroup({
                              name: group.name,
                              required: group.required,
                              maxSelections:
                                group.maxSelections?.toString() || "",
                            });
                          }}
                          className="p-2 text-gray-600 hover:bg-gray-200 rounded"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await modifiersApi.deleteGroup(group.id);
                              await loadProducts();
                              await updateEditingProduct();
                              showToast("Modifier group deleted", "success");
                            } catch (error: any) {
                              showToast(
                                error.message ||
                                  "Failed to delete modifier group",
                                "error"
                              );
                            }
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Modifiers List */}
                    <div className="space-y-2 mt-3">
                      {group.modifiers?.map((modifier) => (
                        <div
                          key={modifier.id}
                          className="flex items-center justify-between p-2 bg-white rounded-lg"
                        >
                          <div>
                            <p className="text-xs font-black">
                              {modifier.name}
                            </p>
                            <p className="text-[9px] text-gray-500">
                              {modifier.category}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black">
                              ₱{modifier.price.toFixed(2)}
                            </span>
                            <button
                              onClick={() => {
                                setEditingModifier(modifier);
                                setNewModifier({
                                  name: modifier.name,
                                  price: modifier.price.toString(),
                                  category: modifier.category,
                                });
                                setShowModifierForm(group.id);
                              }}
                              className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await modifiersApi.deleteModifier(
                                    modifier.id
                                  );
                                  await loadProducts();
                                  await updateEditingProduct();
                                  showToast("Modifier deleted", "success");
                                } catch (error: any) {
                                  showToast(
                                    error.message ||
                                      "Failed to delete modifier",
                                    "error"
                                  );
                                }
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Modifier Form */}
                    {showModifierForm === group.id && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">
                          {editingModifier ? "Edit Modifier" : "Add Modifier"}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={newModifier.name}
                            onChange={(e) =>
                              setNewModifier({
                                ...newModifier,
                                name: e.target.value,
                              })
                            }
                            placeholder="Name (e.g., Small)"
                            className="px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:outline-none text-xs font-bold"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={newModifier.price}
                            onChange={(e) =>
                              setNewModifier({
                                ...newModifier,
                                price: e.target.value,
                              })
                            }
                            placeholder="Price"
                            className="px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:outline-none text-xs font-bold"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                if (!newModifier.name || !newModifier.price) {
                                  showToast(
                                    "Please fill in name and price",
                                    "error"
                                  );
                                  return;
                                }
                                try {
                                  if (editingModifier) {
                                    await modifiersApi.updateModifier(
                                      editingModifier.id,
                                      {
                                        name: newModifier.name,
                                        price: parseFloat(newModifier.price),
                                        category:
                                          newModifier.category || group.name,
                                      }
                                    );
                                    showToast("Modifier updated", "success");
                                  } else {
                                    await modifiersApi.createModifier({
                                      modifierGroupId: group.id,
                                      name: newModifier.name,
                                      price: parseFloat(newModifier.price),
                                      category:
                                        newModifier.category || group.name,
                                    });
                                    showToast("Modifier added", "success");
                                  }
                                  await loadProducts();
                                  await updateEditingProduct();
                                  setNewModifier({
                                    name: "",
                                    price: "",
                                    category: "",
                                  });
                                  setEditingModifier(null);
                                  setShowModifierForm(null);
                                } catch (error: any) {
                                  showToast(
                                    error.message || "Failed to save modifier",
                                    "error"
                                  );
                                }
                              }}
                              className="flex-1 px-3 py-2 bg-black text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
                            >
                              {editingModifier ? "Update" : "Add"}
                            </button>
                            <button
                              onClick={() => {
                                setNewModifier({
                                  name: "",
                                  price: "",
                                  category: "",
                                });
                                setEditingModifier(null);
                                setShowModifierForm(null);
                              }}
                              className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Add Modifier Button */}
                    {showModifierForm !== group.id && (
                      <button
                        onClick={() => {
                          setEditingModifier(null);
                          setNewModifier({ name: "", price: "", category: "" });
                          setShowModifierForm(group.id);
                        }}
                        className="w-full mt-2 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1"
                      >
                        <Plus size={12} /> Add Modifier
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Create New Modifier Group Form */}
              {!editingModifierGroup && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">
                    Create New Modifier Group
                  </p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newModifierGroup.name}
                      onChange={(e) =>
                        setNewModifierGroup({
                          ...newModifierGroup,
                          name: e.target.value,
                        })
                      }
                      placeholder="Group name (e.g., Size, Add-ons)"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold"
                    />
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newModifierGroup.required}
                          onChange={(e) =>
                            setNewModifierGroup({
                              ...newModifierGroup,
                              required: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                        />
                        <span className="text-xs font-black">Required</span>
                      </label>
                      <input
                        type="number"
                        value={newModifierGroup.maxSelections}
                        onChange={(e) =>
                          setNewModifierGroup({
                            ...newModifierGroup,
                            maxSelections: e.target.value,
                          })
                        }
                        placeholder="Max selections (optional)"
                        className="w-32 px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:outline-none text-xs font-bold"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        if (!newModifierGroup.name.trim()) {
                          showToast("Please enter a group name", "error");
                          return;
                        }
                        try {
                          await modifiersApi.createGroup({
                            productId: editingModifiersProduct.id,
                            name: newModifierGroup.name,
                            required: newModifierGroup.required,
                            maxSelections: newModifierGroup.maxSelections
                              ? parseInt(newModifierGroup.maxSelections)
                              : undefined,
                          });
                          await loadProducts();
                          await updateEditingProduct();
                          setNewModifierGroup({
                            name: "",
                            required: false,
                            maxSelections: "",
                          });
                          showToast("Modifier group created", "success");
                        } catch (error: any) {
                          showToast(
                            error.message || "Failed to create modifier group",
                            "error"
                          );
                        }
                      }}
                      className="w-full py-3 bg-black text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
                    >
                      Create Group
                    </button>
                  </div>
                </div>
              )}

              {/* Edit Modifier Group Form */}
              {editingModifierGroup && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">
                    Edit Modifier Group
                  </p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newModifierGroup.name}
                      onChange={(e) =>
                        setNewModifierGroup({
                          ...newModifierGroup,
                          name: e.target.value,
                        })
                      }
                      placeholder="Group name"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold"
                    />
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newModifierGroup.required}
                          onChange={(e) =>
                            setNewModifierGroup({
                              ...newModifierGroup,
                              required: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                        />
                        <span className="text-xs font-black">Required</span>
                      </label>
                      <input
                        type="number"
                        value={newModifierGroup.maxSelections}
                        onChange={(e) =>
                          setNewModifierGroup({
                            ...newModifierGroup,
                            maxSelections: e.target.value,
                          })
                        }
                        placeholder="Max selections (optional)"
                        className="w-32 px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:outline-none text-xs font-bold"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (!newModifierGroup.name.trim()) {
                            showToast("Please enter a group name", "error");
                            return;
                          }
                          try {
                            await modifiersApi.updateGroup(
                              editingModifierGroup.id,
                              {
                                name: newModifierGroup.name,
                                required: newModifierGroup.required,
                                maxSelections: newModifierGroup.maxSelections
                                  ? parseInt(newModifierGroup.maxSelections)
                                  : undefined,
                              }
                            );
                            await loadProducts();
                            await updateEditingProduct();
                            setEditingModifierGroup(null);
                            setNewModifierGroup({
                              name: "",
                              required: false,
                              maxSelections: "",
                            });
                            showToast("Modifier group updated", "success");
                          } catch (error: any) {
                            showToast(
                              error.message ||
                                "Failed to update modifier group",
                              "error"
                            );
                          }
                        }}
                        className="flex-1 py-3 bg-black text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
                      >
                        Update Group
                      </button>
                      <button
                        onClick={() => {
                          setEditingModifierGroup(null);
                          setNewModifierGroup({
                            name: "",
                            required: false,
                            maxSelections: "",
                          });
                        }}
                        className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment History Modal */}
      {showAdjustmentHistory && (
        <div
          className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4"
          onClick={() => setShowAdjustmentHistory(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">
                  Stock Adjustment History
                </p>
                <h2 className="text-2xl font-black tracking-tighter text-black uppercase">
                  All Adjustments
                </h2>
              </div>
              <button
                onClick={() => setShowAdjustmentHistory(false)}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {stockAdjustments.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <History size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    No adjustments recorded
                  </p>
                </div>
              ) : (
                stockAdjustments.map((adj) => {
                  const product = products.find((p) => p.id === adj.productId);
                  return (
                    <div
                      key={adj.id}
                      className="p-4 rounded-xl border border-gray-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-black text-black">
                            {product?.name || "Unknown Product"}
                          </p>
                          <p className="text-[9px] text-gray-500">
                            {new Date(adj.adjustedAt).toLocaleString()}
                          </p>
                        </div>
                        <span
                          className={`text-sm font-black ${
                            adj.quantity > 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {adj.quantity > 0 ? "+" : ""}
                          {adj.quantity}
                        </span>
                      </div>
                      <div className="text-[9px] text-gray-600">
                        <p>
                          <span className="font-black">Reason:</span>{" "}
                          {adj.reason}
                        </p>
                        {adj.notes && (
                          <p className="mt-1">
                            <span className="font-black">Notes:</span>{" "}
                            {adj.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        title="Delete Product"
        message={`Are you sure you want to delete ${productToDelete?.name}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteProduct}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setProductToDelete(null);
        }}
        variant="danger"
      />
    </div>
  );
};

const StatsCard: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
  isWarning?: boolean;
}> = ({ label, value, icon, isWarning }) => (
  <div
    className={`p-5 rounded-2xl border ${
      isWarning
        ? "bg-black text-white border-black"
        : "bg-white text-black border-gray-100 shadow-sm"
    }`}
  >
    <div className="flex justify-between items-start mb-3">
      <div
        className={`p-2 rounded-lg ${isWarning ? "bg-zinc-800" : "bg-gray-50"}`}
      >
        {icon}
      </div>
    </div>
    <p
      className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${
        isWarning ? "text-gray-400" : "text-gray-500"
      }`}
    >
      {label}
    </p>
    <h3 className="text-xl font-black tracking-tighter">{value}</h3>
  </div>
);

export default InventoryManager;
