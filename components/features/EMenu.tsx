import React, { useState, useMemo, useEffect } from "react";
import { Product } from "../../types";
import { Package, Search } from "lucide-react";
import { productsApi } from "../../services/apiService";

interface EMenuProps {
  products?: Product[]; // Make products optional for when it's used publicly
}

const EMenu: React.FC<EMenuProps> = ({ products: initialProducts = [] }) => {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | "ALL">(
    "ALL"
  );

  // Load products when component is used publicly (no products passed in)
  useEffect(() => {
    if (initialProducts.length === 0) {
      const loadProducts = async () => {
        try {
          setIsLoading(true);
          const fetchedProducts = await productsApi.getAll();
          setProducts(fetchedProducts);
        } catch (error) {
          console.error("Failed to load products for public menu:", error);
          // Fallback to empty array, component will show "No items found"
          setProducts([]);
        } finally {
          setIsLoading(false);
        }
      };
      loadProducts();
    } else {
      setProducts(initialProducts);
    }
  }, [initialProducts]);

  // Get unique categories from products
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(products.map((product) => product.category))
    );
    return uniqueCategories.filter(Boolean);
  }, [products]);

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => product.totalStock > 0)
      .filter((product) => {
        const matchesSearch =
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          false;

        const matchesCategory =
          selectedCategory === "ALL" || product.category === selectedCategory;

        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, searchQuery, selectedCategory]);

  // Handle image errors with fallback
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = "none";
  };

  return (
    <div className="min-h-screen bg-white overflow-y-auto">
      {/* Loading State */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-black font-medium">Loading menu...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
          <div className="text-center mb-4 sm:mb-6">
            <p className="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-1">
              Menu
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-black uppercase mb-2">
              Our Menu
            </h1>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-600 font-medium max-w-2xl mx-auto px-4">
              Discover our delicious selection of food and beverages
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="relative max-w-full sm:max-w-md lg:max-w-lg mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-black placeholder-gray-400 font-medium transition-all"
              />
            </div>
          </div>

          {/* Category Filters - Always visible */}
          <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-xs sm:text-sm font-black text-gray-700 uppercase tracking-wider mb-3 text-center">
              Filter by Category
            </h3>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
              <button
                onClick={() => {
                  setSelectedCategory("ALL");
                }}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  selectedCategory === "ALL"
                    ? "bg-black text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <span className="hidden sm:inline">All Items</span>
                <span className="sm:hidden">All</span>
                <span className="ml-1">
                  ({products.filter((p) => p.totalStock > 0).length})
                </span>
              </button>
              {categories.map((category) => {
                const categoryCount = products.filter(
                  (p) => p.category === category && p.totalStock > 0
                ).length;
                return (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category);
                    }}
                    className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                      selectedCategory === category
                        ? "bg-black text-white"
                        : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    <span className="truncate max-w-[80px] sm:max-w-none">
                      {category}
                    </span>
                    <span className="ml-1">({categoryCount})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <Package className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-black text-black mb-2 uppercase tracking-wider">
              No items found
            </h3>
            <p className="text-gray-600 text-xs sm:text-sm font-medium px-4">
              Try adjusting your search or filter criteria
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
                >
                  {/* Product Image */}
                  <div className="relative h-32 sm:h-40 md:h-44 lg:h-48 bg-gray-50 overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={handleImageError}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-8 w-8 sm:h-12 sm:w-12 md:h-16 md:w-16 text-gray-300" />
                      </div>
                    )}

                    {/* Category Badge */}
                    {product.category && (
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-1 bg-black text-white text-xs font-black uppercase tracking-wider rounded">
                          {product.category}
                        </span>
                      </div>
                    )}

                    {/* Price Badge */}
                    <div className="absolute top-2 right-2">
                      <span className="px-3 py-1 bg-white text-black text-sm font-black border border-gray-200 rounded"></span>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3
                      className="font-black text-base sm:text-lg text-black mb-2 uppercase tracking-tight overflow-hidden"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {product.name}
                    </h3>

                    {product.description && (
                      <p
                        className="text-gray-600 text-xs sm:text-sm mb-3 font-medium overflow-hidden"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {product.description}
                      </p>
                    )}

                    {/* Additional Info */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div className="text-xs text-gray-500 font-medium">
                        {product.totalStock !== undefined && (
                          <span>
                            {product.totalStock > 0
                              ? "Available"
                              : "Out of Stock"}
                          </span>
                        )}
                      </div>

                      {/* Modifiers indicator */}
                      {product.modifierGroups &&
                        product.modifierGroups.length > 0 && (
                          <div className="text-xs text-black font-black uppercase tracking-wider">
                            Customizable
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="bg-black text-white py-6 sm:py-8 md:py-12 mt-8 sm:mt-12">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 text-center">
          <h3 className="text-base sm:text-lg md:text-xl font-black mb-2 uppercase tracking-wider">
            Ready to Order?
          </h3>
          <p className="text-gray-300 text-xs sm:text-sm md:text-base font-medium max-w-2xl mx-auto px-4">
            Visit us in-store or ask your server to place your order
          </p>
        </div>
      </div>
    </div>
  );
};

export default EMenu;
