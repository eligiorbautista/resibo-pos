import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Tag,
  CreditCard,
  Banknote,
  Smartphone,
  History,
  ShoppingCart,
  AlertCircle,
  Ban,
  ChevronDown,
  ChevronUp,
  Package,
  X,
  Receipt,
  Printer,
  StickyNote,
  Edit2,
  Check,
  Lock,
  DollarSign,
  Monitor,
  Settings,
} from "lucide-react";
import QRCode from "qrcode";
import {
  Product,
  CartItem,
  Transaction,
  Customer,
  PaymentMethod,
  SuspendedCart,
  Employee,
  Role,
  OrderType,
  Table,
  OrderStatus,
  CashDrawer,
  DiscountType,
} from "../../types";
import {
  CATEGORIES,
  TAX_RATE,
  SERVICE_CHARGE_RATE,
  MODIFIER_GROUPS,
  PWD_DISCOUNT_RATE,
  SENIOR_CITIZEN_DISCOUNT_RATE,
  RESTAURANT_NAME,
  BRANDING,
  BIR_CONFIG,
} from "../../constants";
import { useToast } from "../common/ToastProvider";
import { formatTimestamp, formatRelativeTime } from "../../utils/dateUtils";
import {
  paymentsApi,
  productsApi,
  PaymongoRedirectIntent,
} from "../../services/apiService";
import {
  ThermalPrinterService,
  PrinterConfig,
  COMMON_PRINTER_CONFIGS,
} from "../../services/thermalPrinterService";
import PrinterSettings from "../common/PrinterSettings";

interface POSProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  customers: Customer[];
  onCompleteSale: (t: Transaction) => void;
  suspendedCarts: SuspendedCart[];
  setSuspendedCarts: React.Dispatch<React.SetStateAction<SuspendedCart[]>>;
  currentUser: Employee;
  transactions: Transaction[];
  employees: Employee[];
  tables: Table[];
  setTables: React.Dispatch<React.SetStateAction<Table[]>>;
  cashDrawers: CashDrawer[];
  onVoidTransaction: (id: string, note?: string) => void;
  onUpdateTransactionNote: (id: string, note: string) => void;
  onUpdateOrderStatus?: (id: string, status: OrderStatus) => void;
  onRefundTransaction?: (refund: {
    transactionId: string;
    amount: number;
    reason: string;
    items: { itemId: string; quantity: number }[];
    method: PaymentMethod;
  }) => void;
  onModifyTransaction?: (
    transactionId: string,
    modifiedItems: CartItem[],
  ) => void;
}

const POSTerminal: React.FC<POSProps> = ({
  products,
  setProducts,
  customers,
  onCompleteSale,
  suspendedCarts,
  setSuspendedCarts,
  currentUser,
  transactions,
  employees,
  tables,
  setTables,
  cashDrawers,
  onVoidTransaction,
  onUpdateTransactionNote,
  onUpdateOrderStatus,
  onRefundTransaction,
  onModifyTransaction,
}) => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Load products from backend when component mounts (separate API call for terminal)
  useEffect(() => {
    const loadProducts = async () => {
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
        console.error("Error loading products in terminal:", error);
        // Don't show error toast to avoid interrupting the user experience
        // The products prop might already have data from App.tsx
      }
    };

    // Load products when terminal mounts (separate API call for terminal)
    // Only load if products array is empty to avoid unnecessary API calls
    if (products.length === 0) {
      loadProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [orderType, setOrderType] = useState<OrderType>(OrderType.DINE_IN);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedServer, setSelectedServer] = useState<Employee | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymongoIntent, setPaymongoIntent] =
    useState<PaymongoRedirectIntent | null>(null);
  const [isCreatingPaymongo, setIsCreatingPaymongo] = useState(false);
  const [paymongoError, setPaymongoError] = useState<string | null>(null);
  const [paymongoQrDataUrl, setPaymongoQrDataUrl] = useState<string | null>(
    null,
  );
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyDateRange, setHistoryDateRange] = useState<
    "all" | "today" | "week" | "month" | "custom"
  >("all");
  const [historyCustomStartDate, setHistoryCustomStartDate] = useState("");
  const [historyCustomEndDate, setHistoryCustomEndDate] = useState("");
  const [voidConfirmId, setVoidConfirmId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [managerPin, setManagerPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [tipAmount, setTipAmount] = useState(0);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCustomerName, setDeliveryCustomerName] = useState("");
  const [deliveryCustomerPhone, setDeliveryCustomerPhone] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>(
    DiscountType.NONE,
  );
  const [showModifiers, setShowModifiers] = useState<string | null>(null);
  const [showVariants, setShowVariants] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<
    Record<string, string>
  >({});
  const [selectedModifiers, setSelectedModifiers] = useState<
    Record<string, string[]>
  >({});
  const [specialInstructions, setSpecialInstructions] = useState<
    Record<string, string>
  >({});
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Note editing state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState("");

  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0);
  const [showDiscountVerification, setShowDiscountVerification] =
    useState(false);
  const [discountCardNumber, setDiscountCardNumber] = useState("");
  const [showSuspendCart, setShowSuspendCart] = useState(false);
  const [suspendCartName, setSuspendCartName] = useState("");
  const [editingItemPrice, setEditingItemPrice] = useState<string | null>(null);
  const [newItemPrice, setNewItemPrice] = useState("");
  const [showRefundModal, setShowRefundModal] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundItems, setRefundItems] = useState<Record<string, number>>({});
  const [showModifyOrder, setShowModifyOrder] = useState<string | null>(null);
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(() => {
    const saved = localStorage.getItem("thermalPrinterConfig");
    return saved ? JSON.parse(saved) : { connectionType: "bluetooth", paperWidth: 32 };
  });

  const filteredProducts = products.filter(
    (p) =>
      (activeCategory === "All" || p.category === activeCategory) &&
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.includes(searchQuery)),
  );

  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers;
    const query = customerSearchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.membershipCardNumber.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        c.phone.includes(query),
    );
  }, [customers, customerSearchQuery]);

  const cartSubtotal = useMemo(() => {
    return Math.round(
      cart.reduce((sum, item) => {
        const itemTotal = item.price * item.quantity;
        const modifiersTotal =
          (item.modifiers || []).reduce((mSum, m) => mSum + m.price, 0) *
          item.quantity;
        return sum + itemTotal + modifiersTotal - item.discount;
      }, 0),
    );
  }, [cart]);

  // Calculate discount amount (PWD and Senior Citizen get 20% discount)
  const discountAmount = useMemo(() => {
    if (discountType === DiscountType.NONE) return 0;
    const discountRate =
      discountType === DiscountType.PWD
        ? PWD_DISCOUNT_RATE
        : SENIOR_CITIZEN_DISCOUNT_RATE;
    return Math.round(cartSubtotal * discountRate);
  }, [cartSubtotal, discountType]);

  // Calculate subtotal after discount
  const subtotalAfterDiscount = useMemo(() => {
    return Math.round(cartSubtotal - discountAmount);
  }, [cartSubtotal, discountAmount]);

  // PWD and Senior Citizen are VAT-exempt, so tax is calculated on subtotal after discount
  const tax = useMemo(() => {
    if (
      discountType === DiscountType.PWD ||
      discountType === DiscountType.SENIOR_CITIZEN
    ) {
      return 0; // VAT-exempt for PWD and Senior Citizen
    }
    return Math.round(subtotalAfterDiscount * TAX_RATE);
  }, [subtotalAfterDiscount, discountType]);

  const serviceCharge = useMemo(() => {
    if (
      discountType === DiscountType.PWD ||
      discountType === DiscountType.SENIOR_CITIZEN
    ) {
      return 0; // Service charge is typically waived for PWD and Senior Citizen
    }
    return orderType === OrderType.DINE_IN
      ? Math.round(subtotalAfterDiscount * SERVICE_CHARGE_RATE)
      : 0;
  }, [subtotalAfterDiscount, orderType, discountType]);

  // Calculate loyalty points discount (rounded to whole peso)
  const loyaltyPointsDiscount = useMemo(() => {
    if (!selectedCustomer || loyaltyPointsToRedeem <= 0) return 0;
    const maxRedeemable = Math.floor(selectedCustomer.loyaltyPoints);
    const pointsToUse = Math.min(loyaltyPointsToRedeem, maxRedeemable);
    return Math.round(pointsToUse * 0.1); // 1 point = ₱0.10, rounded to whole peso
  }, [selectedCustomer, loyaltyPointsToRedeem]);

  const cartTotal = useMemo(() => {
    const baseTotal = subtotalAfterDiscount + tax + serviceCharge + tipAmount;
    return Math.max(0, Math.round(baseTotal - loyaltyPointsDiscount));
  }, [
    subtotalAfterDiscount,
    tax,
    serviceCharge,
    tipAmount,
    loyaltyPointsDiscount,
  ]);

  const servers = useMemo(
    () => employees.filter((e) => e.role === Role.SERVER && e.status === "IN"),
    [employees],
  );

  // Update pending order in localStorage whenever cart or related values change
  // This makes the customer display show the ticket automatically when items are added
  useEffect(() => {
    if (cart.length > 0) {
      // Store pending order in localStorage for customer display
      const pendingOrder = {
        id: "PENDING-" + Date.now(),
        timestamp: new Date().toISOString(),
        items: cart,
        subtotal: cartSubtotal,
        tax: tax,
        serviceCharge: serviceCharge,
        totalAmount: cartTotal,
        discountTotal: discountAmount,
        discountType:
          discountType !== DiscountType.NONE ? discountType : undefined,
        orderType: orderType,
        tableId: selectedTable?.id,
        tableNumber: selectedTable?.number,
        orderTypeLabel:
          orderType === OrderType.DINE_IN
            ? "DINE IN"
            : orderType === OrderType.TAKEOUT
              ? "TAKEOUT"
              : "DELIVERY",
        deliveryAddress:
          orderType === OrderType.DELIVERY ? deliveryAddress : undefined,
        deliveryCustomerName:
          orderType === OrderType.DELIVERY ? deliveryCustomerName : undefined,
        deliveryCustomerPhone:
          orderType === OrderType.DELIVERY ? deliveryCustomerPhone : undefined,
      };
      localStorage.setItem("pendingOrder", JSON.stringify(pendingOrder));
      window.dispatchEvent(new Event("storage"));
    } else {
      // Clear pending order when cart is empty - shows idle state
      localStorage.removeItem("pendingOrder");
      window.dispatchEvent(new Event("storage"));
    }
  }, [
    cart,
    cartSubtotal,
    tax,
    serviceCharge,
    cartTotal,
    discountAmount,
    discountType,
    orderType,
    selectedTable,
    deliveryAddress,
    deliveryCustomerName,
    deliveryCustomerPhone,
  ]);

  // Close customer dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(event.target as Node)
      ) {
        setShowCustomerDropdown(false);
      }
    };

    if (showCustomerDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showCustomerDropdown]);

  const addToCart = (product: Product) => {
    // If product has variants, show variant selection
    if (product.variants && product.variants.length > 0) {
      setShowVariants(product.id);
      return;
    }
    // If product has modifiers, show modifier selection
    if (product.modifierGroups && product.modifierGroups.length > 0) {
      setShowModifiers(product.id);
      return;
    }
    // Otherwise, add directly to cart
    setCart((prev) => {
      const existing = prev.find(
        (i) =>
          i.productId === product.id &&
          !i.variantId &&
          JSON.stringify(i.modifiers) === JSON.stringify([]),
      );
      if (existing)
        return prev.map((i) =>
          i.productId === product.id &&
          !i.variantId &&
          JSON.stringify(i.modifiers) === JSON.stringify([])
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        );
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.basePrice,
          quantity: 1,
          discount: 0,
          modifiers: [],
        },
      ];
    });
  };

  const addToCartWithVariant = (product: Product) => {
    const variantId = selectedVariant[product.id];
    if (!variantId) {
      showToast("Please select a variant", "error");
      return;
    }

    const variant = product.variants?.find((v) => v.id === variantId);
    if (!variant) {
      showToast("Selected variant not found", "error");
      return;
    }

    // Check if product also has modifiers
    if (product.modifierGroups && product.modifierGroups.length > 0) {
      setShowVariants(null);
      setShowModifiers(product.id);
      return;
    }

    // Add to cart with variant
    setCart((prev) => [
      ...prev,
      {
        productId: product.id,
        variantId: variant.id,
        name: `${product.name} - ${variant.name}`,
        price: variant.price,
        quantity: 1,
        discount: 0,
        modifiers: [],
      },
    ]);

    setShowVariants(null);
    setSelectedVariant((prev) => {
      const next = { ...prev };
      delete next[product.id];
      return next;
    });
  };

  const addToCartWithModifiers = (product: Product) => {
    const productModifiers = selectedModifiers[product.id] || [];
    const modifierDetails =
      product.modifierGroups?.flatMap((group) =>
        group.modifiers
          .filter((m) => productModifiers.includes(m.id))
          .map((m) => ({
            modifierId: m.id,
            modifierName: m.name,
            price: m.price,
          })),
      ) || [];

    // Check if product has a selected variant
    const variantId = selectedVariant[product.id];
    const variant = variantId
      ? product.variants?.find((v) => v.id === variantId)
      : null;
    const basePrice = variant ? variant.price : product.basePrice;
    const itemName = variant
      ? `${product.name} - ${variant.name}`
      : product.name;

    const itemPrice =
      basePrice + modifierDetails.reduce((sum, m) => sum + m.price, 0);

    setCart((prev) => [
      ...prev,
      {
        productId: product.id,
        variantId: variant?.id,
        name: itemName,
        price: itemPrice,
        quantity: 1,
        discount: 0,
        modifiers: modifierDetails,
        specialInstructions: specialInstructions[product.id] || undefined,
      },
    ]);

    setShowModifiers(null);
    setShowVariants(null);
    setSelectedModifiers((prev) => {
      const next = { ...prev };
      delete next[product.id];
      return next;
    });
    setSelectedVariant((prev) => {
      const next = { ...prev };
      delete next[product.id];
      return next;
    });
    setSpecialInstructions((prev) => {
      const next = { ...prev };
      delete next[product.id];
      return next;
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) => {
      const updated = prev
        .map((item) => {
          if (item.productId === id) {
            const newQty = Math.max(0, item.quantity + delta);
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((i) => i.quantity > 0);

      // Clear pending order if cart becomes empty
      if (updated.length === 0) {
        localStorage.removeItem("pendingOrder");
        window.dispatchEvent(new Event("storage"));
      }

      return updated;
    });
  };

  const finalizeSale = (
    payments: { method: PaymentMethod; amount: number }[],
  ) => {
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(totalPaid - cartTotal) > 0.01) {
      showToast("Payment amount must equal total amount", "error");
      return;
    }

    // Validate delivery information
    if (orderType === OrderType.DELIVERY) {
      if (!deliveryCustomerName.trim()) {
        showToast("Customer name is required for delivery orders", "error");
        return;
      }
      if (!deliveryCustomerPhone.trim()) {
        showToast("Contact number is required for delivery orders", "error");
        return;
      }
      if (!deliveryAddress.trim()) {
        showToast("Delivery address is required", "error");
        return;
      }
    }

    // All orders start as PENDING so they can be cooked in the kitchen first
    const initialStatus = OrderStatus.PENDING;

    const transaction: Transaction = {
      id: "TRX-" + Date.now(),
      timestamp: new Date(),
      items: [...cart],
      subtotal: cartSubtotal,
      tax: tax,
      serviceCharge: serviceCharge,
      totalAmount: cartTotal, // Final amount after loyalty points discount (what customer pays)
      discountTotal: discountAmount,
      discountType:
        discountType !== DiscountType.NONE ? discountType : undefined,
      discountCardNumber:
        discountType !== DiscountType.NONE ? discountCardNumber : undefined,
      discountVerifiedBy:
        discountType !== DiscountType.NONE ? currentUser.id : undefined,
      discountVerifiedAt:
        discountType !== DiscountType.NONE ? new Date() : undefined,
      tip: tipAmount,
      payments,
      customerId: selectedCustomer?.id,
      loyaltyPointsRedeemed:
        loyaltyPointsToRedeem > 0 ? loyaltyPointsToRedeem : undefined,
      loyaltyPointsDiscount:
        loyaltyPointsDiscount > 0 ? loyaltyPointsDiscount : undefined,
      employeeId: currentUser.id,
      serverId: selectedServer?.id,
      tableId: selectedTable?.id,
      orderType: orderType,
      status: initialStatus,
      notes: orderNotes.trim() || undefined,
      deliveryAddress:
        orderType === OrderType.DELIVERY ? deliveryAddress.trim() : undefined,
      deliveryCustomerName:
        orderType === OrderType.DELIVERY
          ? deliveryCustomerName.trim()
          : undefined,
      deliveryCustomerPhone:
        orderType === OrderType.DELIVERY
          ? deliveryCustomerPhone.trim()
          : undefined,
    };

    onCompleteSale(transaction);

    // Automatically print receipt to thermal printer
    printReceipt(transaction);

    // Update table status if dine-in
    if (orderType === OrderType.DINE_IN && selectedTable) {
      setTables((prev) =>
        prev.map((t) =>
          t.id === selectedTable.id
            ? {
                ...t,
                status: "OCCUPIED" as any,
                currentOrderId: transaction.id,
              }
            : t,
        ),
      );
    }

    // Clear pending order from localStorage after payment
    localStorage.removeItem("pendingOrder");
    window.dispatchEvent(new Event("storage"));

    setCart([]);
    setSelectedCustomer(null);
    setSelectedTable(null);
    setSelectedServer(null);
    setTipAmount(0);
    setDeliveryAddress("");
    setDeliveryCustomerName("");
    setDeliveryCustomerPhone("");
    setOrderNotes("");
    setDiscountType(DiscountType.NONE);
    setDiscountCardNumber("");
    // Default back to TAKEOUT so the cashier can immediately start a new order
    // without being blocked by a required table selection.
    setOrderType(OrderType.TAKEOUT);
    setShowCheckout(false);
    setLoyaltyPointsToRedeem(0);

    // Store loyalty points redeemed for deduction (we'll track this via a custom property)
    // Note: This will be handled in App.tsx by checking payment amounts
  };

  const handleSuspendCart = () => {
    if (cart.length === 0) {
      showToast("Cart is empty", "error");
      return;
    }

    const suspendedCart: SuspendedCart = {
      id: "SUSP-" + Date.now(),
      customerName: suspendCartName.trim() || undefined,
      items: [...cart],
      timestamp: new Date(),
      orderType,
      tableId: selectedTable?.id,
      serverId: selectedServer?.id,
      customerId: selectedCustomer?.id,
      notes: orderNotes.trim() || undefined,
    };

    setSuspendedCarts((prev) => [...prev, suspendedCart]);
    setCart([]);
    setSuspendCartName("");
    setShowSuspendCart(false);
    showToast("Cart suspended successfully", "success");
  };

  const handleResumeCart = (suspendedCart: SuspendedCart) => {
    setCart(suspendedCart.items);
    setOrderType(suspendedCart.orderType || OrderType.DINE_IN);
    if (suspendedCart.tableId) {
      const table = tables.find((t) => t.id === suspendedCart.tableId);
      setSelectedTable(table || null);
    }
    if (suspendedCart.serverId) {
      const server = servers.find((s) => s.id === suspendedCart.serverId);
      setSelectedServer(server || null);
    }
    if (suspendedCart.customerId) {
      const customer = customers.find((c) => c.id === suspendedCart.customerId);
      setSelectedCustomer(customer || null);
    }
    setOrderNotes(suspendedCart.notes || "");
    setSuspendedCarts((prev) =>
      prev.filter((sc) => sc.id !== suspendedCart.id),
    );
    showToast("Cart resumed", "success");
  };

  const handlePriceOverride = (itemId: string) => {
    const item = cart.find((i) => i.productId === itemId);
    if (!item) return;

    if (currentUser.role !== Role.MANAGER) {
      showToast("Only managers can override prices", "error");
      return;
    }

    const newPrice = parseFloat(newItemPrice);
    if (isNaN(newPrice) || newPrice < 0) {
      showToast("Invalid price", "error");
      return;
    }

    setCart((prev) =>
      prev.map((i) => (i.productId === itemId ? { ...i, price: newPrice } : i)),
    );
    setEditingItemPrice(null);
    setNewItemPrice("");
    showToast("Price updated", "success");
  };

  const handleLoyaltyPointsRedeem = () => {
    if (!selectedCustomer) {
      showToast("Please select a customer first", "error");
      return;
    }

    const pointsValue = loyaltyPointsToRedeem * 0.1; // 1 point = ₱0.10
    const maxRedeemable = Math.floor(selectedCustomer.loyaltyPoints);

    if (loyaltyPointsToRedeem > maxRedeemable) {
      showToast(`Maximum redeemable: ${maxRedeemable} points`, "error");
      return;
    }

    if (loyaltyPointsToRedeem <= 0) {
      showToast("Please enter points to redeem", "error");
      return;
    }

    // Apply discount to cart total
    const discount = pointsValue;
    const newTotal = Math.max(0, cartTotal - discount);

    // Add as a payment method
    const payments = [{ method: PaymentMethod.GCASH, amount: newTotal }];
    finalizeSale(payments);
  };

  const handleRefund = () => {
    if (!showRefundModal) return;
    const transaction = transactions.find((t) => t.id === showRefundModal);
    if (!transaction) return;

    const refundedItems = Object.entries(refundItems)
      .filter(([_, qty]) => (qty as number) > 0)
      .map(([itemIdx, qty]) => ({
        itemId: transaction.items[parseInt(itemIdx)].productId,
        quantity: qty as number,
      }));

    if (refundedItems.length === 0) {
      showToast("Please select items to refund", "error");
      return;
    }

    if (!refundReason.trim()) {
      showToast("Please enter a refund reason", "error");
      return;
    }

    const refundAmount = refundedItems.reduce((sum, item) => {
      const originalItem = transaction.items.find(
        (i) => i.productId === item.itemId,
      );
      if (!originalItem) return sum;
      return sum + originalItem.price * item.quantity;
    }, 0);

    if (onRefundTransaction) {
      onRefundTransaction({
        transactionId: transaction.id,
        amount: refundAmount,
        reason: refundReason,
        items: refundedItems,
        method: transaction.payments[0]?.method || PaymentMethod.CASH,
      });
      showToast(
        `Refund of ₱${Math.round(refundAmount).toLocaleString()} processed`,
        "success",
      );
    } else {
      showToast("Refund functionality not available", "error");
    }

    setShowRefundModal(null);
    setRefundReason("");
    setRefundItems({});
  };

  const startPaymongoPayment = async (method: "GCASH" | "PAYMAYA") => {
    try {
      setIsCreatingPaymongo(true);
      setPaymongoError(null);
      setPaymongoQrDataUrl(null);
      const intent = await paymentsApi.paymongoCreateRedirect({
        amount: cartTotal,
        method,
        description: `POS Payment (${method}) - ${RESTAURANT_NAME}`,
      });
      setPaymongoIntent(intent);
    } catch (e: any) {
      const msg = e?.message || "Failed to create online payment";
      setPaymongoError(msg);
      showToast(msg, "error");
    } finally {
      setIsCreatingPaymongo(false);
    }
  };

  // Generate a scannable QR for the invoice URL (customer scans to open and pay)
  useEffect(() => {
    const url = paymongoIntent?.redirectUrl;
    if (!url) {
      setPaymongoQrDataUrl(null);
      return;
    }

    let cancelled = false;
    QRCode.toDataURL(url, { margin: 1, width: 260 })
      .then((dataUrl) => {
        if (!cancelled) setPaymongoQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setPaymongoQrDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [paymongoIntent?.redirectUrl]);

  // Publish PayMongo payment info to Customer Display via localStorage
  useEffect(() => {
    try {
      if (!showCheckout || !paymongoIntent?.redirectUrl) {
        localStorage.removeItem("pendingPayment");
        window.dispatchEvent(new Event("storage"));
        return;
      }
      localStorage.setItem(
        "pendingPayment",
        JSON.stringify({
          provider: "PAYMONGO",
          method: paymongoIntent.method,
          status: paymongoIntent.status,
          amount: cartTotal,
          redirectUrl: paymongoIntent.redirectUrl,
          updatedAt: new Date().toISOString(),
        }),
      );
      window.dispatchEvent(new Event("storage"));
    } catch {
      // ignore
    }
  }, [
    showCheckout,
    paymongoIntent?.redirectUrl,
    paymongoIntent?.status,
    paymongoIntent?.method,
    cartTotal,
  ]);

  // Poll PayMongo status while checkout modal is open
  useEffect(() => {
    if (!showCheckout) return;
    if (!paymongoIntent?.intentId) return;
    if (paymongoIntent.status === "PAID" || paymongoIntent.status === "EXPIRED")
      return;

    const timer = window.setInterval(async () => {
      try {
        const updated = await paymentsApi.paymongoGetRedirectStatus(
          paymongoIntent.intentId,
        );
        setPaymongoIntent(updated);
      } catch {
        // ignore poll errors; user can retry manually
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [showCheckout, paymongoIntent?.intentId, paymongoIntent?.status]);

  // If PayMongo reports PAID, finalize the sale and clear the intent
  useEffect(() => {
    if (!paymongoIntent) return;
    if (paymongoIntent.status !== "PAID") return;
    finalizeSale([{ method: paymongoIntent.method as any, amount: cartTotal }]);
    setPaymongoIntent(null);
    setPaymongoQrDataUrl(null);
    localStorage.removeItem("pendingPayment");
    window.dispatchEvent(new Event("storage"));
  }, [paymongoIntent, cartTotal]);

  const handleModifyOrder = () => {
    if (!showModifyOrder) return;
    const transaction = transactions.find((t) => t.id === showModifyOrder);
    if (!transaction) return;

    if (
      transaction.status === OrderStatus.COMPLETED ||
      transaction.status === OrderStatus.VOIDED
    ) {
      showToast("Cannot modify completed or voided orders", "error");
      return;
    }

    if (onModifyTransaction && cart.length > 0) {
      onModifyTransaction(transaction.id, cart);
      showToast("Order modified successfully", "success");
      setShowModifyOrder(null);
      setCart([]);
    } else {
      showToast("Order modification not available", "error");
    }
  };

  const startModifyingOrder = (transaction: Transaction) => {
    if (
      transaction.status === OrderStatus.COMPLETED ||
      transaction.status === OrderStatus.VOIDED
    ) {
      showToast("Cannot modify completed or voided orders", "error");
      return;
    }
    setCart(transaction.items);
    setShowModifyOrder(transaction.id);
    if (transaction.tableId) {
      const table = tables.find((t) => t.id === transaction.tableId);
      setSelectedTable(table || null);
    }
    if (transaction.customerId) {
      const customer = customers.find((c) => c.id === transaction.customerId);
      setSelectedCustomer(customer || null);
    }
    setOrderType(transaction.orderType);
    setOrderNotes(transaction.notes || "");
  };

  const formatPaymentMethod = (method: PaymentMethod): string => {
    switch (method) {
      case PaymentMethod.CASH:
        return "Cash";
      case PaymentMethod.CREDIT_CARD:
        return "Credit Card";
      case PaymentMethod.DEBIT_CARD:
        return "Debit Card";
      case PaymentMethod.GCASH:
        return "GCash";
      case PaymentMethod.PAYMAYA:
        return "PayMaya";
      default:
        return String(method).replace(/_/g, " ");
    }
  };

  const printReceipt = async (transaction: Transaction) => {
    try {
      const employee = employees.find((e) => e.id === transaction.employeeId);
      const customer = transaction.customerId
        ? customers.find((c) => c.id === transaction.customerId)
        : null;
      const table = transaction.tableId
        ? tables.find((t) => t.id === transaction.tableId)
        : null;

      // Try backend printing first (automatic, no picker!)
      try {
        const { printerApi } = await import('../../services/printerApi');
        const result = await printerApi.printReceipt({
          transaction,
          employee,
          customer,
          table,
        });

        if (result.success) {
          showToast("Receipt sent to printer automatically", "success");
          return;
        } else {
          console.warn("Backend printing failed:", result.message);
          // Fall through to browser printing
        }
      } catch (backendError) {
        console.warn("Backend printer not available:", backendError);
        // Fall through to browser printing
      }

      // Fallback: Use browser Bluetooth (requires user interaction)
      console.log("📱 Falling back to browser Bluetooth printing...");
      const printer = new ThermalPrinterService(printerConfig);
      await printer.print(transaction, employee, customer, table);

      showToast("Receipt sent to thermal printer", "success");
    } catch (error) {
      console.error("Thermal printing failed:", error);
      showToast(
        error instanceof Error
          ? `Printing failed: ${error.message}`
          : "Failed to print receipt. Check printer settings.",
        "error",
      );
    }
  };

  const printPendingReceipt = async () => {
    if (!paymongoIntent) return;

    try {
      // Create a pending transaction for printing
      const pendingTransaction: Transaction = {
        id: "PENDING-" + Date.now(),
        timestamp: new Date(),
        items: [...cart],
        subtotal: cartSubtotal,
        tax: tax,
        serviceCharge: serviceCharge,
        totalAmount: cartTotal,
        discountTotal: discountAmount,
        discountType:
          discountType !== DiscountType.NONE ? discountType : undefined,
        discountCardNumber:
          discountType !== DiscountType.NONE ? discountCardNumber : undefined,
        tip: tipAmount,
        payments: [
          {
            method: paymongoIntent.method as PaymentMethod,
            amount: cartTotal,
          },
        ],
        customerId: selectedCustomer?.id,
        loyaltyPointsRedeemed:
          loyaltyPointsToRedeem > 0 ? loyaltyPointsToRedeem : undefined,
        loyaltyPointsDiscount:
          loyaltyPointsDiscount > 0 ? loyaltyPointsDiscount : undefined,
        employeeId: currentUser.id,
        serverId: selectedServer?.id,
        tableId: selectedTable?.id,
        orderType: orderType,
        status: OrderStatus.PENDING,
        notes: `PENDING ${paymongoIntent.method} PAYMENT\n${orderNotes}`.trim(),
      };

      await printReceipt(pendingTransaction);
    } catch (error) {
      console.error("Failed to print pending receipt:", error);
      showToast("Failed to print pending receipt", "error");
    }
  };

  const printReceiptBrowser = (transaction: Transaction) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("Please allow popups to print receipt", "warning");
      return;
    }

    const employee = employees.find((e) => e.id === transaction.employeeId);
    const customer = transaction.customerId
      ? customers.find((c) => c.id === transaction.customerId)
      : null;
    const table = transaction.tableId
      ? tables.find((t) => t.id === transaction.tableId)
      : null;

    // For printing, we'll use a text-based header with styling
    // The logo can be added later via base64 if needed

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${transaction.id}</title>
          <style>
            @media print {
              @page { 
                size: 58mm auto; 
                margin: 0; 
              }
              body { 
                margin: 0; 
                padding: 0; 
              }
            }
            * { 
              margin: 0; 
              padding: 0; 
              box-sizing: border-box; 
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
              width: 58mm;
              padding: 8mm 4mm;
              font-size: 10px;
              line-height: 1.4;
              color: #000;
            }
            .header { 
              text-align: center; 
              margin-bottom: 12px; 
              padding-bottom: 10px; 
              border-bottom: 1px solid #000;
            }
            .logo {
              max-width: 120px;
              height: auto;
              margin: 0 auto 8px;
              display: block;
            }
            .header-info {
              font-size: 9px;
              color: #666;
              margin-top: 4px;
            }
            .branch-location {
              font-size: 9px;
              color: #555;
              font-weight: 600;
              margin-top: 6px;
              margin-bottom: 4px;
              letter-spacing: 0.5px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 4px;
            }
            .location-icon {
              width: 10px;
              height: 10px;
              display: inline-block;
              vertical-align: middle;
            }
            .receipt-number {
              font-weight: 700;
              font-size: 10px;
              margin-top: 6px;
            }
            .info { 
              margin-bottom: 10px; 
              font-size: 10px;
              padding: 8px 0;
              border-bottom: 1px dashed #ccc;
            }
            .info-row { 
              display: flex; 
              justify-content: space-between;
              margin: 3px 0; 
            }
            .info-label {
              font-weight: 600;
              color: #555;
            }
            .items { 
              margin: 12px 0; 
              padding: 8px 0;
            }
            .item { 
              margin: 6px 0; 
              font-size: 10px;
              padding: 4px 0;
              border-bottom: 1px dotted #e5e5e5;
            }
            .item-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 2px;
            }
            .item-name { 
              flex: 1; 
              font-weight: 600;
              line-height: 1.3;
            }
            .item-price { 
              text-align: right; 
              font-weight: 700;
              margin-left: 8px;
            }
            .item-details {
              font-size: 9px;
              color: #666;
              margin-top: 2px;
              padding-left: 0;
            }
            .item-modifier {
              margin: 1px 0;
              padding-left: 12px;
            }
            .item-quantity-price {
              font-size: 9px;
              color: #666;
              margin-top: 2px;
            }
            .totals { 
              margin-top: 10px;
              padding-top: 8px;
              border-top: 1px dashed #ccc;
            }
            .total-row { 
              display: flex; 
              justify-content: space-between; 
              margin: 4px 0; 
              font-size: 10px;
            }
            .total-row.label {
              font-weight: 600;
              color: #555;
            }
            .total-row.amount {
              font-weight: 700;
            }
            .total-row.discount {
              color: #059669;
            }
            .total-row.vat-exempt {
              color: #666;
              font-size: 9px;
            }
            .total-row.total { 
              font-weight: 900; 
              font-size: 13px; 
              border-top: 2px solid #000; 
              padding-top: 6px; 
              margin-top: 8px;
              margin-bottom: 4px;
            }
            .payments { 
              margin-top: 10px; 
              padding-top: 8px;
              border-top: 1px dashed #ccc;
              font-size: 10px;
            }
            .payment-row { 
              display: flex; 
              justify-content: space-between; 
              margin: 3px 0;
              font-weight: 600;
            }
            .payment-method {
            }
            .footer { 
              text-align: center; 
              margin-top: 15px; 
              padding-top: 12px; 
              border-top: 2px solid #000; 
              font-size: 9px;
              color: #555;
            }
            .footer-title {
              font-weight: 700;
              font-size: 10px;
              color: #000;
              margin-bottom: 6px;
              letter-spacing: 0.3px;
            }
            .footer-text {
              margin: 3px 0;
              line-height: 1.5;
            }
            .footer-disclaimer {
              margin-top: 8px;
              font-size: 8px;
              color: #888;
              font-style: italic;
            }
            .notes {
              margin-top: 10px;
              padding: 6px;
              background: #f5f5f5;
              border-radius: 4px;
              font-size: 9px;
              font-style: italic;
              color: #555;
            }
            .divider {
              border-top: 1px dashed #ccc;
              margin: 8px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/logos/main-black-text.png" alt="${
              BRANDING.SYSTEM_NAME
            }" class="logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <div style="display: none; font-size: 18px; font-weight: 900; letter-spacing: 1px; margin-bottom: 6px;">${
              BRANDING.SYSTEM_NAME
            }</div>
            <div class="branch-location">
              <svg class="location-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              ${RESTAURANT_NAME}
            </div>
            <div class="header-info">
              <div style="font-size: 8px; color: #666; margin-bottom: 4px;">TIN: ${
                BIR_CONFIG.TIN
              }</div>
              ${
                BIR_CONFIG.BUSINESS_ADDRESS !== "[YOUR_BUSINESS_ADDRESS_HERE]"
                  ? `<div style="font-size: 8px; color: #666; margin-bottom: 4px;">${BIR_CONFIG.BUSINESS_ADDRESS}</div>`
                  : ""
              }
              <div class="receipt-number">Invoice #${
                (transaction as any).officialInvoiceNumber ||
                transaction.id.substring(0, 8)
              }</div>
              <div style="font-size: 9px; color: #666;">Receipt #${
                transaction.id
              }</div>
              <div>${new Date(transaction.timestamp).toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}</div>
            </div>
          </div>
          
          <div class="info">
            ${
              employee
                ? `<div class="info-row"><span class="info-label">Cashier:</span><span>${employee.name}</span></div>`
                : ""
            }
            ${
              customer
                ? `<div class="info-row"><span class="info-label">Customer:</span><span>${customer.name}</span></div>`
                : ""
            }
            ${
              table
                ? `<div class="info-row"><span class="info-label">Table:</span><span>${table.number}</span></div>`
                : ""
            }
            ${
              transaction.orderType
                ? `<div class="info-row"><span class="info-label">Order Type:</span><span>${transaction.orderType.replace(
                    "_",
                    " ",
                  )}</span></div>`
                : ""
            }
            ${
              transaction.serverId
                ? `<div class="info-row"><span class="info-label">Server:</span><span>${
                    employees.find((e) => e.id === transaction.serverId)
                      ?.name || "N/A"
                  }</span></div>`
                : ""
            }
          </div>
          
          <div class="items">
            ${transaction.items
              .map((item) => {
                const unitPrice = item.price;
                const lineTotal = item.price * item.quantity;
                // Extract variant name from item name if it contains " - "
                const nameParts = item.name.split(" - ");
                const baseName = nameParts[0];
                const variantName =
                  nameParts.length > 1 ? nameParts.slice(1).join(" - ") : null;

                return `
              <div class="item">
                <div class="item-header">
                  <div class="item-name">
                    ${baseName}${variantName ? ` - ${variantName}` : ""}
                  </div>
                  <div class="item-price">₱${Math.round(
                    lineTotal,
                  ).toLocaleString()}</div>
                </div>
                <div class="item-quantity-price">
                  ${item.quantity} × ₱${Math.round(unitPrice).toLocaleString()}
                </div>
                ${
                  variantName
                    ? `
                  <div class="item-details" style="color: #666; font-size: 9px; margin-top: 2px;">
                    Variant: ${variantName}
                  </div>
                `
                    : ""
                }
                ${
                  item.modifiers && item.modifiers.length > 0
                    ? `
                  <div class="item-details">
                    ${item.modifiers
                      .map(
                        (m) => `
                      <div class="item-modifier">• ${m.modifierName}${
                        m.price > 0
                          ? ` (+₱${Math.round(m.price).toLocaleString()})`
                          : ""
                      }</div>
                    `,
                      )
                      .join("")}
                  </div>
                `
                    : ""
                }
                ${
                  item.specialInstructions
                    ? `
                  <div class="item-details" style="font-style: italic; margin-top: 2px;">
                    Note: ${item.specialInstructions}
                  </div>
                `
                    : ""
                }
              </div>
            `;
              })
              .join("")}
          </div>
          
          <div class="totals">
            <div class="total-row label amount">
              <span>Subtotal:</span>
              <span>₱${Math.round(transaction.subtotal).toLocaleString()}</span>
            </div>
            
            ${
              transaction.discountTotal > 0
                ? `
              <div class="total-row discount">
                <span>${
                  transaction.discountType === DiscountType.PWD
                    ? "PWD Discount (20%)"
                    : transaction.discountType === DiscountType.SENIOR_CITIZEN
                      ? "Senior Citizen Discount (20%)"
                      : "Discount"
                }:</span>
                <span>-₱${Math.round(
                  transaction.discountTotal,
                ).toLocaleString()}</span>
              </div>
              <div class="total-row label amount">
                <span>Subtotal After Discount:</span>
                <span>₱${Math.round(
                  transaction.subtotal - transaction.discountTotal,
                ).toLocaleString()}</span>
              </div>
            `
                : ""
            }
            
            ${
              transaction.tax > 0
                ? `
              <div class="total-row label amount">
                <span>VAT Sales:</span>
                <span>₱${Math.round(
                  transaction.subtotal - transaction.discountTotal,
                ).toLocaleString()}</span>
              </div>
              <div class="total-row label amount">
                <span>VAT Amount (12%):</span>
                <span>₱${Math.round(transaction.tax).toLocaleString()}</span>
              </div>
            `
                : transaction.discountType === DiscountType.PWD ||
                    transaction.discountType === DiscountType.SENIOR_CITIZEN
                  ? `
              <div class="total-row vat-exempt">
                <span>VAT Sales:</span>
                <span>₱0.00</span>
              </div>
              <div class="total-row vat-exempt">
                <span>VAT-Exempt Sales:</span>
                <span>₱${Math.round(
                  transaction.subtotal - transaction.discountTotal,
                ).toLocaleString()}</span>
              </div>
              <div class="total-row vat-exempt">
                <span>VAT Amount:</span>
                <span>₱0.00 (VAT-Exempt)</span>
              </div>
            `
                  : ""
            }
            
            ${
              transaction.serviceCharge > 0
                ? `
              <div class="total-row label amount">
                <span>Service Charge (10%):</span>
                <span>₱${Math.round(
                  transaction.serviceCharge,
                ).toLocaleString()}</span>
              </div>
            `
                : ""
            }
            
            ${
              transaction.tip > 0
                ? `
              <div class="total-row label amount">
                <span>Tip:</span>
                <span>₱${Math.round(transaction.tip).toLocaleString()}</span>
              </div>
            `
                : ""
            }
            
            <div class="total-row total">
              <span>TOTAL:</span>
              <span>₱${Math.round(
                transaction.totalAmount,
              ).toLocaleString()}</span>
            </div>
          </div>
          
          <div class="payments">
            <div style="font-weight: 700; margin-bottom: 4px; font-size: 10px;">Payment:</div>
            ${transaction.payments
              .map(
                (p) => `
              <div class="payment-row">
                <span class="payment-method">${formatPaymentMethod(
                  p.method,
                )}:</span>
                <span>₱${Math.round(p.amount).toLocaleString()}</span>
              </div>
            `,
              )
              .join("")}
            ${(() => {
              const totalPaid = transaction.payments.reduce(
                (sum, p) => sum + p.amount,
                0,
              );
              const change = totalPaid - transaction.totalAmount;
              if (change > 0) {
                return `
                  <div class="payment-row" style="font-weight: 700; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #ccc;">
                    <span>Change:</span>
                    <span>₱${Math.round(change).toLocaleString()}</span>
                  </div>
                `;
              } else if (change < 0) {
                return `
                  <div class="payment-row" style="color: #dc2626; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #ccc;">
                    <span>Balance Due:</span>
                    <span>₱${Math.round(
                      Math.abs(change),
                    ).toLocaleString()}</span>
                  </div>
                `;
              }
              return "";
            })()}
          </div>
          
          ${
            transaction.notes
              ? `<div class="notes">Note: ${transaction.notes}</div>`
              : ""
          }
          
          ${
            transaction.discountCardNumber
              ? `
            <div class="info" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #ccc; font-size: 9px;">
              <div class="info-row">
                <span class="info-label">${
                  transaction.discountType === DiscountType.PWD
                    ? "PWD ID:"
                    : "Senior Citizen ID:"
                }</span>
                <span>${transaction.discountCardNumber}</span>
              </div>
            </div>
          `
              : ""
          }
          
          <div class="footer">
            <p class="footer-title">Thank you for your business!</p>
            <p class="footer-text">${new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</p>
            <p class="footer-text" style="font-weight: 600;">We appreciate your visit</p>
            ${
              !BIR_CONFIG.HAS_PTU
                ? `
            <div style="margin-top: 10px; padding: 8px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; font-size: 8px; color: #856404; text-align: center; font-weight: 600;">
              ⚠️ THIS IS NOT AN OFFICIAL RECEIPT<br/>
              Official Receipt will be issued upon BIR Permit to Use (PTU) approval
            </div>
            `
                : BIR_CONFIG.PTU_NUMBER
                  ? `
            <div style="margin-top: 10px; padding: 8px; background: #d1f2eb; border: 1px solid #27ae60; border-radius: 4px; font-size: 8px; color: #1e8449; text-align: center; font-weight: 600;">
              ✓ Official Receipt<br/>
              PTU No: ${BIR_CONFIG.PTU_NUMBER}
            </div>
            `
                  : ""
            }
            <p class="footer-disclaimer" style="margin-top: 8px;">This is a computer-generated receipt. No signature required.</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handlePrinterConfigSave = (config: PrinterConfig) => {
    setPrinterConfig(config);
    localStorage.setItem("thermalPrinterConfig", JSON.stringify(config));
    showToast("Printer settings saved", "success");
  };

  const handleVoid = (id: string) => {
    if (managerPin.length !== 4) {
      setPinError(true);
      showToast("Manager PIN must be 4 digits", "error");
      return;
    }

    const manager = employees.find(
      (e) => e.role === Role.MANAGER && e.pin === managerPin,
    );
    if (!manager) {
      setPinError(true);
      showToast("Invalid Manager PIN", "error");
      return;
    }

    onVoidTransaction(id, voidReason);
    setVoidConfirmId(null);
    setVoidReason("");
    setManagerPin("");
    setPinError(false);
  };

  const startEditingNote = (trx: Transaction) => {
    setEditingNoteId(trx.id);
    setTempNote(trx.notes || "");
  };

  const saveNote = (id: string) => {
    onUpdateTransactionNote(id, tempNote);
    setEditingNoteId(null);
  };

  const filteredHistory = useMemo(() => {
    let filtered = transactions;

    // Apply date range filter
    if (historyDateRange !== "all") {
      const now = new Date();
      let startDate: Date;
      let endDate: Date = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow

      switch (historyDateRange) {
        case "today":
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
          break;
        case "custom":
          if (historyCustomStartDate && historyCustomEndDate) {
            startDate = new Date(historyCustomStartDate);
            endDate = new Date(historyCustomEndDate);
            endDate.setHours(23, 59, 59, 999);
          } else {
            startDate = new Date(0);
          }
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter((t) => {
        const tDate = new Date(t.timestamp);
        return tDate >= startDate && tDate <= endDate;
      });
    }

    // Apply search filter
    if (historySearch.trim()) {
      filtered = filtered.filter(
        (t) =>
          t.id.toLowerCase().includes(historySearch.toLowerCase()) ||
          t.totalAmount.toString().includes(historySearch) ||
          (t.notes &&
            t.notes.toLowerCase().includes(historySearch.toLowerCase())),
      );
    }

    return filtered.reverse();
  }, [
    transactions,
    historySearch,
    historyDateRange,
    historyCustomStartDate,
    historyCustomEndDate,
  ]);

  const activeDrawer = cashDrawers.find((d) => !d.closedAt);

  // If no drawer is open, show blocker message
  if (!activeDrawer) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50/50 p-6">
        <div className="bg-white rounded-3xl p-12 max-w-md w-full shadow-xl border border-gray-100 text-center">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <DollarSign size={40} className="text-yellow-600" />
          </div>
          <h3 className="text-2xl font-black tracking-tighter mb-3">
            Cash Drawer Required
          </h3>
          <p className="text-sm text-gray-600 font-bold mb-6 leading-relaxed">
            You must open a cash drawer before accessing the POS terminal. This
            ensures proper cash management and transaction tracking.
          </p>
          <div className="space-y-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
              Please open a cash drawer from the Cash Drawer page to continue.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full p-2 sm:p-4 gap-2 sm:gap-4 bg-gray-50/50 relative">
      {/* Left Column: Products */}
      <div className="flex-1 flex flex-col space-y-2 sm:space-y-4">
        <div className="bg-white p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="flex-1 relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Search items..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm focus:outline-none focus:bg-white focus:border-black transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => navigate("/history")}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 text-black bg-white border border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all whitespace-nowrap"
          >
            <History size={16} />
            <span className="hidden sm:inline lg:hidden xl:inline">
              History
            </span>
          </button>
          <button
            onClick={() => setShowPrinterSettings(true)}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 text-black bg-white border border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all whitespace-nowrap"
            title="Thermal Printer Settings"
          >
            <Settings size={16} />
            <span className="hidden sm:inline lg:hidden xl:inline">
              Printer
            </span>
          </button>
          <button
            onClick={() => {
              const width = 1920;
              const height = 1080;
              const left = (screen.width - width) / 2;
              const top = (screen.height - height) / 2;
              const customerDisplayWindow = window.open(
                "/customer-display",
                "CustomerDisplay",
                `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes,location=no,status=no`,
              );
              if (!customerDisplayWindow) {
                showToast(
                  "Please allow popups to open customer display",
                  "warning",
                );
              }
            }}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 text-black bg-white border border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all whitespace-nowrap"
            title="Open Customer Display (for second monitor)"
          >
            <Monitor size={16} />
            <span className="hidden sm:inline lg:hidden xl:inline">
              Customer Display
            </span>
          </button>
        </div>

        <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 sm:px-6 py-2 rounded-full whitespace-nowrap font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all
                ${
                  activeCategory === cat
                    ? "bg-black text-white"
                    : "bg-white text-gray-500 border border-gray-200 hover:border-black hover:text-black"
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-4 pb-4 items-start">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                <Package className="w-8 h-8 text-gray-300" />
              </div>
              <div className="text-center">
                <p className="font-black text-gray-900 text-lg mb-2">
                  {products.length === 0
                    ? "No Products Available"
                    : "No Products Found"}
                </p>
                <p className="text-sm text-gray-500">
                  {products.length === 0
                    ? "Add products to your inventory to start selling"
                    : activeCategory === "All"
                      ? "Try adjusting your search terms"
                      : `No products found in ${activeCategory} category`}
                </p>
              </div>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                // Don't block sales when stock is 0; many deployments treat inventory as advisory.
                className="bg-white p-1 tablet:p-1.5 sm:p-3 rounded-md tablet:rounded-lg sm:rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-black transition-all text-left flex flex-col group relative h-fit"
              >
                <div className="aspect-square rounded-md overflow-hidden mb-1 tablet:mb-1.5 sm:mb-3 bg-gray-100 flex items-center justify-center">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        target.nextElementSibling?.classList.remove("hidden");
                      }}
                    />
                  ) : null}
                  <div
                    className={`flex flex-col items-center justify-center text-gray-400 ${
                      product.imageUrl ? "hidden" : ""
                    }`}
                  >
                    <Package className="w-5 h-5 tablet:w-6 tablet:h-6 mb-1" />
                    <span className="text-[10px] tablet:text-xs font-bold">
                      {product.category}
                    </span>
                  </div>
                </div>
                <p className="font-black text-black text-[9px] tablet:text-[10px] sm:text-sm tracking-tight leading-tight mb-0.5">
                  {product.name}
                </p>
                <p className="text-[7px] tablet:text-[8px] text-gray-400 uppercase font-black tracking-widest mb-1 tablet:mb-1.5">
                  {product.category}
                </p>
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-black font-black text-[10px] tablet:text-xs sm:text-base">
                    ₱{Math.round(product.basePrice).toLocaleString()}
                  </span>
                  <span
                    className={`text-[6px] tablet:text-[7px] px-1 py-0.5 rounded-md font-black uppercase tracking-widest ${
                      product.totalStock < product.reorderPoint
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    Stock: {product.totalStock}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Column: Order Ticket */}
      <div className="w-full tablet:w-72 lg:w-80 xl:w-96 flex flex-col bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-2 tablet:p-3 sm:p-5 bg-black text-white flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black tracking-tighter">TICKET</h2>
            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">
              ORDER # {transactions.length + 1}
            </p>
          </div>
          <button
            onClick={() => setCart([])}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="p-2 tablet:p-2.5 sm:p-3 border-b border-gray-100 space-y-1.5 tablet:space-y-2">
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => setOrderType(OrderType.DINE_IN)}
              className={`py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all
                ${
                  orderType === OrderType.DINE_IN
                    ? "bg-black text-white"
                    : "bg-gray-50 text-gray-500 border border-gray-200"
                }`}
            >
              Dine-In
            </button>
            <button
              onClick={() => setOrderType(OrderType.TAKEOUT)}
              className={`py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all
                ${
                  orderType === OrderType.TAKEOUT
                    ? "bg-black text-white"
                    : "bg-gray-50 text-gray-500 border border-gray-200"
                }`}
            >
              Takeout
            </button>
            <button
              onClick={() => setOrderType(OrderType.DELIVERY)}
              className={`py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all
                ${
                  orderType === OrderType.DELIVERY
                    ? "bg-black text-white"
                    : "bg-gray-50 text-gray-500 border border-gray-200"
                }`}
            >
              Delivery
            </button>
          </div>

          {orderType === OrderType.DINE_IN && (
            <select
              className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-[10px] font-bold focus:outline-none focus:border-black"
              onChange={(e) => {
                const table = tables.find((t) => t.id === e.target.value);
                setSelectedTable(table || null);
              }}
              value={selectedTable?.id || ""}
            >
              <option value="">Select Table</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  Table {t.number} ({t.capacity} seats)
                </option>
              ))}
            </select>
          )}

          {orderType === OrderType.DINE_IN && servers.length > 0 && (
            <select
              className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-[10px] font-bold focus:outline-none focus:border-black"
              onChange={(e) =>
                setSelectedServer(
                  servers.find((s) => s.id === e.target.value) || null,
                )
              }
              value={selectedServer?.id || ""}
            >
              <option value="">Assign Server</option>
              {servers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          {orderType === OrderType.DELIVERY && (
            <div className="space-y-1.5">
              <input
                type="text"
                placeholder="Customer Name *"
                className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-[10px] font-bold focus:outline-none focus:border-black"
                value={deliveryCustomerName}
                onChange={(e) => setDeliveryCustomerName(e.target.value)}
                required
              />
              <input
                type="tel"
                placeholder="Contact Number *"
                className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-[10px] font-bold focus:outline-none focus:border-black"
                value={deliveryCustomerPhone}
                onChange={(e) => setDeliveryCustomerPhone(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Delivery Address *"
                className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-[10px] font-bold focus:outline-none focus:border-black"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                required
              />
            </div>
          )}

          <div className="relative" ref={customerDropdownRef}>
            <div
              onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
              className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-[10px] font-bold focus:outline-none focus:border-black cursor-pointer flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                {selectedCustomer ? (
                  <div>
                    <div className="text-[10px] font-bold text-black truncate">
                      {selectedCustomer.name}
                    </div>
                    <div className="text-[8px] font-bold text-gray-500 font-mono truncate">
                      {selectedCustomer.membershipCardNumber || "No Card"}
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-400">Select Member</span>
                )}
              </div>
              <ChevronDown
                size={12}
                className={`text-gray-400 transition-transform flex-shrink-0 ${
                  showCustomerDropdown ? "rotate-180" : ""
                }`}
              />
            </div>

            {showCustomerDropdown && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-64 overflow-hidden flex flex-col">
                <div className="p-3 border-b border-gray-100">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Search by name, card number, email, or phone..."
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold focus:outline-none focus:border-black"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="overflow-y-auto max-h-48">
                  <button
                    onClick={() => {
                      setSelectedCustomer(null);
                      setShowCustomerDropdown(false);
                      setCustomerSearchQuery("");
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                      !selectedCustomer ? "bg-gray-50" : ""
                    }`}
                  >
                    <div className="text-xs font-bold text-gray-600">
                      Guest Customer
                    </div>
                  </button>
                  {filteredCustomers.length === 0 ? (
                    <div className="px-4 py-6 text-center text-gray-400">
                      <div className="text-[9px] font-bold uppercase tracking-widest">
                        No customers found
                      </div>
                    </div>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setShowCustomerDropdown(false);
                          setCustomerSearchQuery("");
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 ${
                          selectedCustomer?.id === customer.id
                            ? "bg-gray-50"
                            : ""
                        }`}
                      >
                        <div className="text-xs font-bold text-black">
                          {customer.name}
                        </div>
                        <div className="text-[9px] font-bold text-gray-500 font-mono mt-0.5">
                          {customer.membershipCardNumber || "No Card"}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Discount Selection */}
          <div className="space-y-1 tablet:space-y-1.5">
            <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block">
              Discount
            </label>
            <div className="flex gap-1.5">
              <button
                onClick={() => setDiscountType(DiscountType.NONE)}
                className={`flex-1 px-2 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                  discountType === DiscountType.NONE
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                None
              </button>
              <button
                onClick={() => {
                  setDiscountType(DiscountType.SENIOR_CITIZEN);
                  setShowDiscountVerification(true);
                }}
                className={`flex-1 px-2 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                  discountType === DiscountType.SENIOR_CITIZEN
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Senior
              </button>
              <button
                onClick={() => {
                  setDiscountType(DiscountType.PWD);
                  setShowDiscountVerification(true);
                }}
                className={`flex-1 px-2 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                  discountType === DiscountType.PWD
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                PWD
              </button>
            </div>
            {discountType !== DiscountType.NONE && (
              <div className="px-2 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-[7px] font-black text-gray-500 uppercase tracking-widest mb-0.5">
                  {discountType === DiscountType.PWD
                    ? "PWD Discount"
                    : "Senior Citizen Discount"}
                </div>
                <div className="text-[8px] font-bold text-gray-700">
                  20% Discount • VAT-Exempt • No Service Charge
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5 tablet:p-2 space-y-1 flex flex-col">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-30">
              <ShoppingCart size={32} className="mb-2" />
              <p className="font-black text-[8px] uppercase tracking-widest">
                Empty Ticket
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-1 tablet:gap-1.5 p-1 tablet:p-1.5 rounded-lg border border-gray-50 hover:border-gray-200 transition-all group flex-shrink-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="font-bold text-[10px] text-black truncate">
                      {item.name}
                    </p>
                    {currentUser.role === Role.MANAGER && (
                      <button
                        onClick={() => {
                          setEditingItemPrice(item.productId);
                          setNewItemPrice(item.price.toString());
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded transition-all flex-shrink-0"
                      >
                        <Edit2 size={8} />
                      </button>
                    )}
                  </div>
                  {editingItemPrice === item.productId ? (
                    <div className="flex items-center gap-1 mt-0.5">
                      <input
                        type="number"
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(e.target.value)}
                        className="w-16 px-1.5 py-0.5 bg-white border border-black rounded text-[10px] font-bold focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handlePriceOverride(item.productId);
                          } else if (e.key === "Escape") {
                            setEditingItemPrice(null);
                            setNewItemPrice("");
                          }
                        }}
                      />
                      <button
                        onClick={() => handlePriceOverride(item.productId)}
                        className="p-0.5 bg-black text-white rounded"
                      >
                        <Check size={8} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingItemPrice(null);
                          setNewItemPrice("");
                        }}
                        className="p-0.5 bg-gray-200 rounded"
                      >
                        <X size={8} />
                      </button>
                    </div>
                  ) : (
                    <p className="text-[8px] text-gray-400 font-bold">
                      ₱{Math.round(item.price).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => updateQuantity(item.productId, -1)}
                    className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center hover:bg-black hover:text-white"
                  >
                    <Minus size={8} />
                  </button>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const qty = Math.max(1, parseInt(e.target.value) || 1);
                      setCart((prev) =>
                        prev.map((i) =>
                          i.productId === item.productId
                            ? { ...i, quantity: qty }
                            : i,
                        ),
                      );
                    }}
                    className="w-6 text-center font-black text-[10px] border-0 focus:outline-none focus:ring-0 bg-transparent"
                    min="1"
                  />
                  <button
                    onClick={() => updateQuantity(item.productId, 1)}
                    className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center hover:bg-black hover:text-white"
                  >
                    <Plus size={8} />
                  </button>
                </div>
                <div className="text-right min-w-[45px] flex-shrink-0">
                  <p className="font-black text-[10px]">
                    ₱{(item.price * item.quantity).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-2 tablet:p-2.5 sm:p-3 bg-gray-50 border-t border-gray-200 space-y-2">
          <div className="space-y-1 text-[8px]">
            <div className="flex justify-between">
              <span className="font-black text-gray-400 uppercase tracking-widest">
                Subtotal
              </span>
              <span className="font-black">
                ₱{cartSubtotal.toLocaleString()}
              </span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span className="font-black uppercase tracking-widest text-[7px]">
                  {discountType === DiscountType.PWD
                    ? "PWD Disc (20%)"
                    : "Senior Disc (20%)"}
                </span>
                <span className="font-black">
                  -₱{discountAmount.toLocaleString()}
                </span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="font-black text-gray-400 uppercase tracking-widest text-[7px]">
                  After Discount
                </span>
                <span className="font-black">
                  ₱{subtotalAfterDiscount.toLocaleString()}
                </span>
              </div>
            )}
            {tax > 0 && (
              <div className="flex justify-between">
                <span className="font-black text-gray-400 uppercase tracking-widest text-[7px]">
                  Tax (12%)
                </span>
                <span className="font-black">₱{tax.toLocaleString()}</span>
              </div>
            )}
            {discountType !== DiscountType.NONE && (
              <div className="flex justify-between text-gray-500">
                <span className="font-black uppercase tracking-widest text-[7px]">
                  Tax
                </span>
                <span className="font-black text-[7px]">VAT-Exempt</span>
              </div>
            )}
            {serviceCharge > 0 && (
              <div className="flex justify-between">
                <span className="font-black text-gray-400 uppercase tracking-widest text-[7px]">
                  Service (10%)
                </span>
                <span className="font-black">
                  ₱{serviceCharge.toLocaleString()}
                </span>
              </div>
            )}
            {orderType === OrderType.DINE_IN && (
              <div className="flex items-center gap-1.5 pt-1 border-t border-gray-200">
                <span className="font-black text-gray-400 uppercase tracking-widest text-[7px]">
                  Tip
                </span>
                <input
                  type="number"
                  value={tipAmount || ""}
                  onChange={(e) =>
                    setTipAmount(Math.round(parseFloat(e.target.value) || 0))
                  }
                  placeholder="0"
                  className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1 text-[10px] font-black focus:outline-none focus:border-black"
                />
              </div>
            )}
            {loyaltyPointsDiscount > 0 && (
              <div className="flex justify-between text-blue-600 pt-1 border-t border-gray-200">
                <span className="font-black uppercase tracking-widest text-[7px]">
                  Loyalty Points ({loyaltyPointsToRedeem} pts)
                </span>
                <span className="font-black">
                  -₱{loyaltyPointsDiscount.toLocaleString()}
                </span>
              </div>
            )}
          </div>
          <div className="flex justify-between items-end pt-1 border-t-2 border-gray-300">
            <span className="text-[8px] font-black tracking-widest text-gray-400 uppercase">
              Total Due
            </span>
            <span className="text-2xl font-black tracking-tighter">
              ₱{cartTotal.toLocaleString()}
            </span>
          </div>
          <div className="space-y-1.5">
            <button
              onClick={() => {
                // Pending order is already stored in localStorage via useEffect
                // Just open the checkout modal
                setShowCheckout(true);
              }}
              disabled={
                cart.length === 0 ||
                (orderType === OrderType.DINE_IN && !selectedTable)
              }
              className="w-full py-3 bg-black text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:hover:scale-100 transition-all"
            >
              Collect Payment
            </button>
            {cart.length > 0 && (
              <button
                onClick={() => setShowSuspendCart(true)}
                className="w-full py-1.5 bg-gray-100 text-gray-600 rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-gray-200 transition-all"
              >
                Suspend Cart
              </button>
            )}
          </div>
        </div>
      </div>

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-6">
          <div className="bg-white rounded-[32px] w-full max-w-5xl h-full max-h-[85vh] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-3xl font-black tracking-tighter">
                  BUSINESS LOGS
                </h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                  Order History, Notes & Voids
                </p>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Search TRX ID, amount, or notes..."
                    className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:outline-none focus:border-black w-64"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 border border-gray-200 rounded-xl p-1.5 bg-white shadow-sm">
                    <select
                      value={historyDateRange}
                      onChange={(e) => {
                        setHistoryDateRange(e.target.value as any);
                        if (e.target.value !== "custom") {
                          setHistoryCustomStartDate("");
                          setHistoryCustomEndDate("");
                        }
                      }}
                      className="px-3 py-1.5 bg-transparent border-0 text-[10px] font-black uppercase tracking-widest focus:outline-none cursor-pointer min-w-[150px] appearance-none"
                      style={{
                        backgroundImage:
                          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23000' d='M6 9L1 4h10z'/%3E%3C/svg%3E\")",
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 8px center",
                        paddingRight: "28px",
                      }}
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">Last 7 Days</option>
                      <option value="month">Last 30 Days</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>
                  {historyDateRange === "custom" && (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={historyCustomStartDate}
                        onChange={(e) =>
                          setHistoryCustomStartDate(e.target.value)
                        }
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] font-bold focus:outline-none focus:border-black bg-white"
                      />
                      <span className="text-gray-400 text-[10px] font-bold">
                        to
                      </span>
                      <input
                        type="date"
                        value={historyCustomEndDate}
                        onChange={(e) =>
                          setHistoryCustomEndDate(e.target.value)
                        }
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] font-bold focus:outline-none focus:border-black bg-white"
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 pt-4">
              {filteredHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-300">
                  <History
                    size={64}
                    strokeWidth={1}
                    className="mb-4 opacity-20"
                  />
                  <p className="text-[12px] uppercase tracking-widest font-black">
                    No transactions recorded yet
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredHistory.map((trx) => {
                    const isVoided = trx.status === OrderStatus.VOIDED;
                    const isEditing = editingNoteId === trx.id;

                    return (
                      <div
                        key={trx.id}
                        className={`p-6 rounded-3xl border transition-all flex flex-col md:flex-row gap-6 ${
                          isVoided
                            ? "bg-red-50/50 border-red-100"
                            : "bg-gray-50 border-gray-100 hover:border-black hover:bg-white"
                        }`}
                      >
                        <div className="md:w-1/4">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`text-[10px] font-black uppercase tracking-widest ${
                                isVoided ? "text-red-400" : "text-gray-400"
                              }`}
                            >
                              {trx.id}
                            </span>
                            {isVoided && (
                              <span className="bg-red-100 text-red-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                                VOID
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-2xl font-black tracking-tighter mb-1 ${
                              isVoided
                                ? "text-red-600 line-through"
                                : "text-black"
                            }`}
                          >
                            ₱{Math.round(trx.totalAmount).toLocaleString()}
                          </p>
                          <div className="flex flex-col gap-0.5">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                              {formatTimestamp(trx.timestamp)}
                            </p>
                            <p className="text-[8px] text-gray-500 font-medium">
                              {formatRelativeTime(trx.timestamp)}
                            </p>
                          </div>

                          {/* Note Section */}
                          <div className="mt-4">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                              <StickyNote size={10} /> Remarks
                            </p>
                            {isEditing ? (
                              <div className="flex gap-1">
                                <textarea
                                  autoFocus
                                  className="w-full text-[10px] font-bold bg-white border border-black rounded-lg p-2 focus:outline-none h-16 resize-none"
                                  value={tempNote}
                                  onChange={(e) => setTempNote(e.target.value)}
                                  placeholder="Add details..."
                                />
                                <button
                                  onClick={() => saveNote(trx.id)}
                                  className="self-end p-2 bg-black text-white rounded-lg hover:scale-105 transition-transform"
                                >
                                  <Check size={12} />
                                </button>
                              </div>
                            ) : (
                              <div className="group/note relative">
                                <p
                                  className={`text-[10px] font-bold leading-tight ${
                                    trx.notes
                                      ? "text-black italic"
                                      : "text-gray-300"
                                  }`}
                                >
                                  {trx.notes || "No notes added"}
                                </p>
                                {currentUser.role === Role.MANAGER && (
                                  <button
                                    onClick={() => startEditingNote(trx)}
                                    className="absolute -right-6 top-0 opacity-0 group-hover/note:opacity-100 p-1 hover:bg-gray-200 rounded transition-all"
                                  >
                                    <Edit2 size={10} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex-1">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Receipt size={12} /> Order Items
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                            {trx.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between items-center text-[11px] font-bold border-b border-gray-200/50 pb-1"
                              >
                                <span className="text-black">
                                  {item.quantity}x {item.name}
                                </span>
                                <span className="text-gray-400 font-black">
                                  ₱
                                  {(
                                    item.price * item.quantity
                                  ).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-gray-500 uppercase tracking-widest">
                                Subtotal
                              </span>
                              <span className="text-gray-700 font-black">
                                ₱{Math.round(trx.subtotal).toLocaleString()}
                              </span>
                            </div>

                            {trx.discountTotal > 0 && trx.discountType && (
                              <>
                                <div className="flex justify-between items-center text-[10px] font-bold">
                                  <span className="text-green-600 uppercase tracking-widest">
                                    {trx.discountType === DiscountType.PWD
                                      ? "PWD Discount (20%)"
                                      : "Senior Citizen Discount (20%)"}
                                  </span>
                                  <span className="text-green-600 font-black">
                                    -₱
                                    {Math.round(
                                      trx.discountTotal,
                                    ).toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-[9px]">
                                  <span className="text-gray-400 uppercase tracking-widest">
                                    Subtotal After Discount
                                  </span>
                                  <span className="text-gray-600 font-black">
                                    ₱
                                    {Math.round(
                                      trx.subtotal - trx.discountTotal,
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              </>
                            )}

                            {trx.tax > 0 ? (
                              <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="text-gray-500 uppercase tracking-widest">
                                  VAT (12%)
                                </span>
                                <span className="text-gray-700 font-black">
                                  ₱{Math.round(trx.tax).toLocaleString()}
                                </span>
                              </div>
                            ) : (
                              (trx.discountType === DiscountType.PWD ||
                                trx.discountType ===
                                  DiscountType.SENIOR_CITIZEN) && (
                                <div className="flex justify-between items-center text-[9px] text-gray-500">
                                  <span className="uppercase tracking-widest">
                                    VAT
                                  </span>
                                  <span className="font-black">VAT-Exempt</span>
                                </div>
                              )
                            )}

                            {trx.serviceCharge > 0 && (
                              <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="text-gray-500 uppercase tracking-widest">
                                  Service Charge (10%)
                                </span>
                                <span className="text-gray-700 font-black">
                                  ₱
                                  {Math.round(
                                    trx.serviceCharge,
                                  ).toLocaleString()}
                                </span>
                              </div>
                            )}

                            {trx.tip > 0 && (
                              <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="text-gray-500 uppercase tracking-widest">
                                  Tip
                                </span>
                                <span className="text-gray-700 font-black">
                                  ₱{Math.round(trx.tip).toLocaleString()}
                                </span>
                              </div>
                            )}

                            <div className="flex justify-between items-center text-[11px] font-black pt-2 border-t border-gray-300">
                              <span className="uppercase tracking-widest">
                                Total
                              </span>
                              <span className="text-lg">
                                ₱{Math.round(trx.totalAmount).toLocaleString()}
                              </span>
                            </div>

                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                Payment Method
                              </p>
                              <div className="space-y-1">
                                {trx.payments.map((payment, idx) => (
                                  <div
                                    key={idx}
                                    className="flex justify-between items-center text-[10px] font-bold"
                                  >
                                    <span className="text-gray-600">
                                      {formatPaymentMethod(payment.method)}
                                    </span>
                                    <span className="text-gray-800 font-black">
                                      ₱
                                      {Math.round(
                                        payment.amount,
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                Order Status
                              </p>
                              <span
                                className={`inline-block px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                  trx.status === OrderStatus.COMPLETED
                                    ? "bg-green-100 text-green-700"
                                    : trx.status === OrderStatus.VOIDED
                                      ? "bg-red-100 text-red-700"
                                      : trx.status === OrderStatus.PENDING
                                        ? "bg-yellow-100 text-yellow-700"
                                        : trx.status === OrderStatus.PREPARING
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {trx.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="md:w-1/5 flex flex-col justify-center items-end gap-2">
                          {!isVoided && (
                            <>
                              {trx.status === OrderStatus.COMPLETED &&
                                currentUser.role === Role.MANAGER && (
                                  <button
                                    onClick={() => {
                                      setShowRefundModal(trx.id);
                                      setRefundItems({});
                                      trx.items.forEach((_, idx) => {
                                        setRefundItems((prev) => ({
                                          ...prev,
                                          [idx]: 0,
                                        }));
                                      });
                                    }}
                                    className="w-full py-3 bg-white text-orange-600 border border-orange-100 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-600 hover:text-white transition-all shadow-sm mb-2"
                                  >
                                    <Tag size={14} /> Refund
                                  </button>
                                )}
                              {(trx.status === OrderStatus.PENDING ||
                                trx.status === OrderStatus.PREPARING) && (
                                <button
                                  onClick={() => startModifyingOrder(trx)}
                                  className="w-full py-3 bg-white text-blue-600 border border-blue-100 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all shadow-sm mb-2"
                                >
                                  <Edit2 size={14} /> Modify Order
                                </button>
                              )}
                              <button
                                onClick={() => setVoidConfirmId(trx.id)}
                                className="w-full py-3 bg-white text-red-600 border border-red-100 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                              >
                                <AlertCircle size={14} /> Void Transaction
                              </button>
                            </>
                          )}
                          {isVoided && (
                            <div className="w-full py-3 bg-red-100 text-red-600 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                              <Ban size={14} /> Voided Order
                            </div>
                          )}
                          <button
                            onClick={() => printReceipt(trx)}
                            className="w-full py-3 bg-gray-200 text-gray-500 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black hover:text-white transition-all"
                          >
                            <Printer size={14} /> Reprint
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Void Confirmation Dialog with Authorization PIN */}
      {voidConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock size={32} />
            </div>
            <h4 className="text-xl font-black tracking-tighter mb-2 text-center">
              Manager Authorization
            </h4>
            <p className="text-xs text-gray-500 font-bold leading-relaxed mb-6 text-center">
              Reverting transactions requires a Manager PIN for security and
              inventory auditing.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                  Manager PIN
                </label>
                <div className="relative">
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="••••"
                    className={`w-full text-center text-lg font-black tracking-[0.5em] bg-gray-50 border ${
                      pinError ? "border-red-600" : "border-gray-100"
                    } rounded-xl py-3 focus:outline-none focus:border-black transition-colors`}
                    value={managerPin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, ""); // Only allow numbers
                      if (value.length <= 4) {
                        setManagerPin(value);
                        setPinError(false);
                      }
                    }}
                  />
                  {pinError && (
                    <p className="text-[8px] text-red-600 font-black uppercase mt-1 text-center">
                      Invalid Manager PIN. Try 0000
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                  Void Reason
                </label>
                <textarea
                  placeholder="e.g., Mistaken entry, Customer changed mind..."
                  className="w-full text-xs font-bold bg-gray-50 border border-gray-100 rounded-xl p-3 focus:outline-none focus:border-red-600 transition-colors h-24 resize-none"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleVoid(voidConfirmId)}
                className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
              >
                Authorize & Void
              </button>
              <button
                onClick={() => {
                  setVoidConfirmId(null);
                  setVoidReason("");
                  setManagerPin("");
                  setPinError(false);
                }}
                className="w-full py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Cart Modal */}
      {showSuspendCart && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-black tracking-tighter mb-4">
              Suspend Cart
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Customer Name (Optional)
                </label>
                <input
                  type="text"
                  value={suspendCartName}
                  onChange={(e) => setSuspendCartName(e.target.value)}
                  placeholder="Enter customer name..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:border-black"
                />
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Cart Summary
                </p>
                <p className="text-sm font-black">{cart.length} items</p>
                <p className="text-xs text-gray-600">
                  Total: ₱{cartTotal.toLocaleString()}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSuspendCart}
                  className="flex-1 py-4 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
                >
                  Suspend
                </button>
                <button
                  onClick={() => {
                    setShowSuspendCart(false);
                    setSuspendCartName("");
                  }}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discount Verification Modal */}
      {showDiscountVerification && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-black tracking-tighter mb-4">
              Verify Discount ID
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  {discountType === DiscountType.PWD
                    ? "PWD ID Number"
                    : "Senior Citizen ID Number"}
                </label>
                <input
                  type="text"
                  value={discountCardNumber}
                  onChange={(e) => setDiscountCardNumber(e.target.value)}
                  placeholder="Enter ID number..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:border-black"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (discountCardNumber.trim()) {
                      setShowDiscountVerification(false);
                      showToast("Discount ID verified", "success");
                    } else {
                      showToast("Please enter ID number", "error");
                    }
                  }}
                  className="flex-1 py-4 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
                >
                  Verify
                </button>
                <button
                  onClick={() => {
                    setShowDiscountVerification(false);
                    setDiscountCardNumber("");
                  }}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal &&
        (() => {
          const transaction = transactions.find(
            (t) => t.id === showRefundModal,
          );
          if (!transaction) return null;

          return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-[32px] p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-2xl font-black tracking-tighter mb-4">
                  Process Refund
                </h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      Transaction
                    </p>
                    <p className="text-sm font-black">{transaction.id}</p>
                    <p className="text-xs text-gray-600">
                      Total: ₱{transaction.totalAmount.toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">
                      Select Items to Refund
                    </p>
                    <div className="space-y-2">
                      {transaction.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-black">{item.name}</p>
                            <p className="text-xs text-gray-600">
                              ₱{Math.round(item.price).toLocaleString()} each
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() =>
                                setRefundItems((prev) => ({
                                  ...prev,
                                  [idx]: Math.max(0, (prev[idx] || 0) - 1),
                                }))
                              }
                              className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-black hover:text-white"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-8 text-center font-black">
                              {refundItems[idx] || 0}
                            </span>
                            <button
                              onClick={() =>
                                setRefundItems((prev) => ({
                                  ...prev,
                                  [idx]: Math.min(
                                    item.quantity,
                                    (prev[idx] || 0) + 1,
                                  ),
                                }))
                              }
                              className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-black hover:text-white"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                      Refund Reason *
                    </label>
                    <textarea
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="Enter reason for refund..."
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:border-black resize-none"
                    />
                  </div>

                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">
                        Refund Amount
                      </span>
                      <span className="text-2xl font-black text-blue-600">
                        ₱
                        {Math.round(
                          Object.entries(refundItems).reduce(
                            (sum, [idx, qty]) => {
                              const item = transaction.items[parseInt(idx)];
                              return (
                                sum + (item ? item.price * (qty as number) : 0)
                              );
                            },
                            0,
                          ),
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleRefund}
                      className="flex-1 py-4 bg-orange-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-700 transition-all"
                    >
                      Process Refund
                    </button>
                    <button
                      onClick={() => {
                        setShowRefundModal(null);
                        setRefundReason("");
                        setRefundItems({});
                      }}
                      className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Modify Order Modal */}
      {showModifyOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black tracking-tighter">
                Modify Order
              </h3>
              <button
                onClick={() => {
                  setShowModifyOrder(null);
                  setCart([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Edit items in the cart below, then click "Save Changes"
              </p>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Current Cart
                </p>
                <div className="space-y-2">
                  {cart.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-white rounded-lg"
                    >
                      <span className="text-sm font-black">
                        {item.quantity}x {item.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.productId, -1)}
                          className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:bg-black hover:text-white"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="w-6 text-center font-black text-xs">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, 1)}
                          className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:bg-black hover:text-white"
                        >
                          <Plus size={10} />
                        </button>
                        <button
                          onClick={() =>
                            setCart((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleModifyOrder}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setShowModifyOrder(null);
                    setCart([]);
                  }}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suspended Carts Display */}
      {suspendedCarts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 bg-white rounded-2xl border border-gray-200 shadow-2xl p-4 max-w-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-black uppercase tracking-widest">
              Suspended Carts
            </h4>
            <button
              onClick={() => setSuspendedCarts([])}
              className="text-gray-400 hover:text-black"
            >
              <X size={16} />
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {suspendedCarts.map((sc) => (
              <div
                key={sc.id}
                className="p-3 bg-gray-50 rounded-xl border border-gray-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black">
                    {sc.customerName || "Unnamed"}
                  </span>
                  <span className="text-[9px] text-gray-500">
                    {formatRelativeTime(sc.timestamp)}
                  </span>
                </div>
                <div className="text-[9px] text-gray-600 mb-2">
                  {sc.items.length} items • ₱
                  {sc.items
                    .reduce((sum, i) => sum + i.price * i.quantity, 0)
                    .toLocaleString()}
                </div>
                <button
                  onClick={() => handleResumeCart(sc)}
                  className="w-full py-2 bg-black text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
                >
                  Resume
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modifiers Modal */}
      {showModifiers &&
        (() => {
          const product = products.find((p) => p.id === showModifiers);
          if (!product) return null;
          const productModifiers = product.modifierGroups || [];
          const selected = selectedModifiers[product.id] || [];

          return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[65] flex items-center justify-center p-4">
              <div className="bg-white rounded-[32px] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-black tracking-tighter">
                      {product.name}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">
                      {product.description}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowModifiers(null);
                      setSelectedModifiers((prev) => {
                        const next = { ...prev };
                        delete next[product.id];
                        return next;
                      });
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6 mb-6">
                  {productModifiers.map((group) => (
                    <div
                      key={group.id}
                      className="border-b border-gray-100 pb-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-black uppercase tracking-widest">
                          {group.name}
                        </h4>
                        {group.required && (
                          <span className="text-[8px] font-black text-red-600 uppercase tracking-widest">
                            Required
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {group.modifiers.map((modifier) => {
                          const isSelected = selected.includes(modifier.id);
                          const selectedFromThisGroup = selected.filter((id) =>
                            group.modifiers.some((m) => m.id === id),
                          );
                          const canSelect =
                            !group.maxSelections ||
                            selectedFromThisGroup.length < group.maxSelections;

                          return (
                            <button
                              key={modifier.id}
                              onClick={() => {
                                if (group.maxSelections === 1) {
                                  // Single selection - replace only modifiers from this group
                                  setSelectedModifiers((prev) => {
                                    const current = prev[product.id] || [];
                                    // Remove all modifiers from this group, then add the selected one
                                    const otherGroupModifiers = current.filter(
                                      (id) =>
                                        !group.modifiers.some(
                                          (m) => m.id === id,
                                        ),
                                    );
                                    return {
                                      ...prev,
                                      [product.id]: [
                                        ...otherGroupModifiers,
                                        modifier.id,
                                      ],
                                    };
                                  });
                                } else {
                                  // Multiple selection - toggle
                                  setSelectedModifiers((prev) => ({
                                    ...prev,
                                    [product.id]: isSelected
                                      ? (prev[product.id] || []).filter(
                                          (id) => id !== modifier.id,
                                        )
                                      : [
                                          ...(prev[product.id] || []),
                                          modifier.id,
                                        ],
                                  }));
                                }
                              }}
                              disabled={!isSelected && !canSelect}
                              className={`w-full p-3 rounded-xl border-2 text-left transition-all
                              ${
                                isSelected
                                  ? "border-black bg-black text-white"
                                  : "border-gray-200 bg-white hover:border-gray-400"
                              }
                              ${
                                !canSelect && !isSelected
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black">
                                  {modifier.name}
                                </span>
                                {modifier.price > 0 && (
                                  <span
                                    className={`text-xs font-black ${
                                      isSelected ? "text-white" : "text-black"
                                    }`}
                                  >
                                    +₱
                                    {Math.round(
                                      modifier.price,
                                    ).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mb-4">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                    Special Instructions
                  </label>
                  <textarea
                    value={specialInstructions[product.id] || ""}
                    onChange={(e) =>
                      setSpecialInstructions((prev) => ({
                        ...prev,
                        [product.id]: e.target.value,
                      }))
                    }
                    placeholder="e.g., No onions, extra spicy..."
                    className="w-full text-xs font-bold bg-gray-50 border border-gray-100 rounded-xl p-3 focus:outline-none focus:border-black h-20 resize-none"
                  />
                </div>

                <button
                  onClick={() => {
                    // Check required modifiers
                    const hasRequired = productModifiers.every(
                      (group) =>
                        !group.required ||
                        (selectedModifiers[product.id] || []).some((id) =>
                          group.modifiers.some((m) => m.id === id),
                        ),
                    );

                    if (!hasRequired) {
                      showToast(
                        "Please select all required modifiers",
                        "warning",
                      );
                      return;
                    }

                    addToCartWithModifiers(product);
                  }}
                  className="w-full py-4 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          );
        })()}

      {/* Checkout Modal */}
      {showCheckout && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={(e) => {
            // Close modal when clicking outside
            if (e.target === e.currentTarget) {
              localStorage.removeItem("pendingOrder");
              localStorage.removeItem("pendingPayment");
              window.dispatchEvent(new Event("storage"));
              setShowCheckout(false);
              setLoyaltyPointsToRedeem(0);
              setPaymongoIntent(null);
              setPaymongoError(null);
              setPaymongoQrDataUrl(null);
            }
          }}
        >
          <div className="bg-white rounded-[40px] w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto lg:overflow-hidden flex flex-col">
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2">
              {/* Left: Summary + Actions */}
              {/* Add extra bottom padding so sticky footer never covers payment buttons on small screens */}
              <div className="p-4 sm:p-6 lg:p-8 pb-24 min-h-0 overflow-visible lg:overflow-hidden flex flex-col">
                <div className="text-center space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
                    Amount to Settle
                  </p>
                  <h4 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter">
                    ₱{cartTotal.toLocaleString()}
                  </h4>
                </div>

                <div className="mt-4 sm:mt-6 bg-gray-50 rounded-2xl p-4 text-left space-y-2 text-[9px]">
                  <div className="flex justify-between">
                    <span className="font-black text-gray-400 uppercase tracking-widest">
                      Subtotal
                    </span>
                    <span className="font-black">
                      ₱{cartSubtotal.toLocaleString()}
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <>
                      <div className="flex justify-between text-green-600">
                        <span className="font-black uppercase tracking-widest">
                          {discountType === DiscountType.PWD
                            ? "PWD Discount (20%)"
                            : "Senior Discount (20%)"}
                        </span>
                        <span className="font-black">
                          -₱{discountAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-black text-gray-400 uppercase tracking-widest">
                          Subtotal After Discount
                        </span>
                        <span className="font-black">
                          ₱{subtotalAfterDiscount.toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                  {tax > 0 && (
                    <div className="flex justify-between">
                      <span className="font-black text-gray-400 uppercase tracking-widest">
                        Tax
                      </span>
                      <span className="font-black">
                        ₱{tax.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {discountType !== DiscountType.NONE && (
                    <div className="flex justify-between text-gray-500">
                      <span className="font-black uppercase tracking-widest text-[8px]">
                        Tax
                      </span>
                      <span className="font-black text-[8px]">VAT-Exempt</span>
                    </div>
                  )}
                  {serviceCharge > 0 && (
                    <div className="flex justify-between">
                      <span className="font-black text-gray-400 uppercase tracking-widest">
                        Service Charge
                      </span>
                      <span className="font-black">
                        ₱{serviceCharge.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {tipAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="font-black text-gray-400 uppercase tracking-widest">
                        Tip
                      </span>
                      <span className="font-black">
                        ₱{Math.round(tipAmount).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {loyaltyPointsDiscount > 0 && (
                    <div className="flex justify-between text-blue-600 border-t border-gray-200 pt-2">
                      <span className="font-black uppercase tracking-widest">
                        Loyalty Points ({loyaltyPointsToRedeem} pts)
                      </span>
                      <span className="font-black">
                        -₱{loyaltyPointsDiscount.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {selectedCustomer && selectedCustomer.loyaltyPoints > 0 && (
                  <div className="mt-3 sm:mt-4 bg-blue-50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-gray-600 uppercase">
                        Available Points
                      </span>
                      <span className="text-sm font-black">
                        {selectedCustomer.loyaltyPoints}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={loyaltyPointsToRedeem || ""}
                        onChange={(e) =>
                          setLoyaltyPointsToRedeem(
                            Math.max(0, parseInt(e.target.value) || 0),
                          )
                        }
                        placeholder="Points to redeem"
                        max={selectedCustomer.loyaltyPoints}
                        className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold focus:outline-none focus:border-black"
                      />
                      <button
                        onClick={() => {
                          if (!selectedCustomer) {
                            showToast(
                              "Please select a customer first",
                              "error",
                            );
                            return;
                          }

                          const maxRedeemable = Math.floor(
                            selectedCustomer.loyaltyPoints,
                          );
                          if (loyaltyPointsToRedeem > maxRedeemable) {
                            showToast(
                              `Maximum redeemable: ${maxRedeemable} points`,
                              "error",
                            );
                            return;
                          }

                          if (loyaltyPointsToRedeem <= 0) {
                            showToast("Please enter points to redeem", "error");
                            return;
                          }

                          // Points are automatically deducted from cartTotal
                          // Just proceed to payment selection with updated total
                          showToast(
                            `${loyaltyPointsToRedeem} points applied (₱${Math.round(
                              loyaltyPointsToRedeem * 0.1,
                            ).toLocaleString()} discount)`,
                            "success",
                          );
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-700"
                      >
                        Apply Points
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-3 sm:mt-4 space-y-2">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block text-left">
                    Order Notes (Optional)
                  </label>
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Add any special notes for this order..."
                    className="w-full text-xs font-bold bg-gray-50 border border-gray-100 rounded-xl p-3 focus:outline-none focus:border-black h-16 resize-none"
                  />
                </div>
                <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-3">
                  <PaymentBtn
                    icon={<Banknote size={28} />}
                    label="Cash"
                    onClick={() => {
                      finalizeSale([
                        { method: PaymentMethod.CASH, amount: cartTotal },
                      ]);
                    }}
                  />
                  <PaymentBtn
                    icon={<CreditCard size={28} />}
                    label="Debit"
                    onClick={() => {
                      showToast(
                        "Debit payments are not yet available",
                        "error",
                      );
                    }}
                  />
                  <PaymentBtn
                    icon={<Smartphone size={28} />}
                    label="GCash"
                    disabled={isCreatingPaymongo || !!paymongoIntent}
                    onClick={() => {
                      startPaymongoPayment("GCASH");
                    }}
                  />
                  <PaymentBtn
                    icon={<Smartphone size={28} />}
                    label="PayMaya"
                    disabled={isCreatingPaymongo || !!paymongoIntent}
                    onClick={() => {
                      startPaymongoPayment("PAYMAYA");
                    }}
                  />
                </div>

                {/* Sticky footer so primary escape action is never pushed below the modal */}
                <div className="mt-4 sm:mt-6 pt-3 border-t border-gray-100 sticky bottom-0 bg-white z-10">
                  <button
                    onClick={() => {
                      // Clear pending order when closing checkout without payment
                      localStorage.removeItem("pendingOrder");
                      localStorage.removeItem("pendingPayment");
                      window.dispatchEvent(new Event("storage"));
                      setShowCheckout(false);
                      setLoyaltyPointsToRedeem(0);
                      setPaymongoIntent(null);
                      setPaymongoError(null);
                      setPaymongoQrDataUrl(null);
                    }}
                    className="w-full py-3 bg-white border border-gray-200 rounded-xl font-black text-[10px] uppercase tracking-widest text-gray-600 hover:border-black hover:text-black transition-colors"
                  >
                    Go Back to Cart
                  </button>
                </div>
              </div>

              {/* Right: PayMongo QR panel (no scroll on large, stacks on small) */}
              <div className="bg-gray-50 border-t lg:border-t-0 lg:border-l border-gray-200 p-4 sm:p-6 lg:p-8 min-h-0 overflow-visible lg:overflow-hidden">
                {paymongoIntent ? (
                  <div className="h-full flex flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                          Online Payment
                        </p>
                        <p className="text-2xl font-black tracking-tight mt-1">
                          {paymongoIntent.method}
                        </p>
                        <p className="text-[11px] font-bold text-gray-500 mt-1">
                          via PayMongo
                        </p>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 mt-1">
                        {paymongoIntent.status}
                      </span>
                    </div>

                    <div className="mt-4 sm:mt-6 flex-1 min-h-0 flex items-center justify-center">
                      {paymongoQrDataUrl ? (
                        <img
                          src={paymongoQrDataUrl}
                          alt="Payment QR"
                          className="w-full max-w-[280px] sm:max-w-[360px] lg:max-w-[420px] aspect-square object-contain bg-white rounded-2xl p-4 shadow-sm border border-gray-200"
                        />
                      ) : (
                        <div className="w-full max-w-[280px] sm:max-w-[360px] lg:max-w-[420px] aspect-square bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex items-center justify-center">
                          <p className="text-sm font-bold text-gray-500">
                            Generating QR…
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 sm:mt-6 flex gap-3">
                      <button
                        onClick={async () => {
                          try {
                            const updated =
                              await paymentsApi.paymongoGetRedirectStatus(
                                paymongoIntent.intentId,
                              );
                            setPaymongoIntent(updated);
                          } catch (e: any) {
                            showToast(
                              e?.message || "Failed to refresh payment status",
                              "error",
                            );
                          }
                        }}
                        className="flex-1 py-3 bg-white border border-gray-200 rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-black transition-colors"
                      >
                        Refresh
                      </button>
                      <button
                        onClick={() => {
                          setPaymongoIntent(null);
                          setPaymongoError(null);
                          setPaymongoQrDataUrl(null);
                          localStorage.removeItem("pendingPayment");
                          window.dispatchEvent(new Event("storage"));
                        }}
                        className="flex-1 py-3 bg-white border border-gray-200 rounded-xl font-black text-[10px] uppercase tracking-widest text-gray-500 hover:border-black hover:text-black transition-colors"
                      >
                        Cancel
                      </button>
                    </div>

                    {paymongoIntent.redirectUrl && (
                      <>
                        <button
                          onClick={() =>
                            window.open(
                              paymongoIntent.redirectUrl as string,
                              "_blank",
                              "noopener,noreferrer",
                            )
                          }
                          className="mt-3 w-full py-3 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.01] transition-all"
                        >
                          Open Payment Link
                        </button>
                        <button
                          onClick={() => printPendingReceipt()}
                          className="mt-3 w-full py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
                        >
                          <Printer size={16} /> Print Pending Receipt
                        </button>
                      </>
                    )}

                    {paymongoError && (
                      <p className="mt-3 text-[11px] font-bold text-red-600">
                        {paymongoError}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center px-6">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      Online Payment
                    </p>
                    <p className="text-lg font-black text-gray-800 mt-2">
                      Select GCash or PayMaya
                    </p>
                    <p className="text-sm font-bold text-gray-500 mt-2">
                      A QR will appear here for the customer to scan.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Variant Selection Modal */}
      {showVariants &&
        (() => {
          const product = products.find((p) => p.id === showVariants);
          if (!product || !product.variants || product.variants.length === 0)
            return null;

          return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
              <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">
                      Select Variant
                    </p>
                    <h3 className="text-2xl font-black tracking-tighter">
                      {product.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowVariants(null);
                      setSelectedVariant((prev) => {
                        const next = { ...prev };
                        delete next[product.id];
                        return next;
                      });
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-2 mb-6">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() =>
                        setSelectedVariant((prev) => ({
                          ...prev,
                          [product.id]: variant.id,
                        }))
                      }
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        selectedVariant[product.id] === variant.id
                          ? "border-black bg-black text-white"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-black text-sm">{variant.name}</p>
                          {variant.stock !== undefined && (
                            <p className="text-xs opacity-70 mt-0.5">
                              Stock: {variant.stock}
                            </p>
                          )}
                        </div>
                        <p
                          className={`font-black text-lg ${
                            selectedVariant[product.id] === variant.id
                              ? "text-white"
                              : "text-black"
                          }`}
                        >
                          ₱{variant.price.toFixed(2)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowVariants(null);
                      setSelectedVariant((prev) => {
                        const next = { ...prev };
                        delete next[product.id];
                        return next;
                      });
                    }}
                    className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => addToCartWithVariant(product)}
                    disabled={!selectedVariant[product.id]}
                    className="flex-1 py-3 bg-black text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-gray-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Modifiers Selection Modal */}
      {showModifiers &&
        (() => {
          const product = products.find((p) => p.id === showModifiers);
          if (
            !product ||
            !product.modifierGroups ||
            product.modifierGroups.length === 0
          )
            return null;

          return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
              <div className="bg-white rounded-[32px] p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">
                      Select Modifiers
                    </p>
                    <h3 className="text-2xl font-black tracking-tighter">
                      {product.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowModifiers(null);
                      setSelectedModifiers((prev) => {
                        const next = { ...prev };
                        delete next[product.id];
                        return next;
                      });
                      setSpecialInstructions((prev) => {
                        const next = { ...prev };
                        delete next[product.id];
                        return next;
                      });
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6 mb-6">
                  {product.modifierGroups.map((group) => (
                    <div key={group.id}>
                      <div className="flex items-center gap-2 mb-3">
                        <p className="font-black text-sm">{group.name}</p>
                        {group.required && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-[8px] font-black uppercase">
                            Required
                          </span>
                        )}
                        {group.maxSelections && (
                          <span className="text-xs text-gray-500">
                            (Max {group.maxSelections})
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {group.modifiers.map((modifier) => {
                          const isSelected = (
                            selectedModifiers[product.id] || []
                          ).includes(modifier.id);
                          const canSelect =
                            !group.maxSelections ||
                            (selectedModifiers[product.id] || []).length <
                              group.maxSelections;

                          return (
                            <button
                              key={modifier.id}
                              onClick={() => {
                                const current =
                                  selectedModifiers[product.id] || [];
                                if (isSelected) {
                                  setSelectedModifiers((prev) => ({
                                    ...prev,
                                    [product.id]: current.filter(
                                      (id) => id !== modifier.id,
                                    ),
                                  }));
                                } else if (canSelect) {
                                  setSelectedModifiers((prev) => ({
                                    ...prev,
                                    [product.id]: [...current, modifier.id],
                                  }));
                                }
                              }}
                              disabled={!isSelected && !canSelect}
                              className={`w-full p-3 rounded-xl border-2 transition-all text-left flex items-center justify-between ${
                                isSelected
                                  ? "border-black bg-black text-white"
                                  : canSelect
                                    ? "border-gray-200 hover:border-gray-300"
                                    : "border-gray-100 opacity-50 cursor-not-allowed"
                              }`}
                            >
                              <span className="font-bold text-sm">
                                {modifier.name}
                              </span>
                              <span
                                className={`font-black ${
                                  isSelected ? "text-white" : "text-black"
                                }`}
                              >
                                {modifier.price > 0
                                  ? `+₱${modifier.price.toFixed(2)}`
                                  : "Free"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mb-6">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                    Special Instructions (Optional)
                  </label>
                  <textarea
                    value={specialInstructions[product.id] || ""}
                    onChange={(e) =>
                      setSpecialInstructions((prev) => ({
                        ...prev,
                        [product.id]: e.target.value,
                      }))
                    }
                    placeholder="Add any special instructions..."
                    className="w-full text-xs font-bold bg-gray-50 border border-gray-100 rounded-xl p-3 focus:outline-none focus:border-black h-20 resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowModifiers(null);
                      setSelectedModifiers((prev) => {
                        const next = { ...prev };
                        delete next[product.id];
                        return next;
                      });
                      setSpecialInstructions((prev) => {
                        const next = { ...prev };
                        delete next[product.id];
                        return next;
                      });
                    }}
                    className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => addToCartWithModifiers(product)}
                    className="flex-1 py-3 bg-black text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-gray-800 transition-all"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Printer Settings Modal */}
      <PrinterSettings
        isOpen={showPrinterSettings}
        onClose={() => setShowPrinterSettings(false)}
        onSave={handlePrinterConfigSave}
        currentConfig={printerConfig}
      />
    </div>
  );
};

const PaymentBtn: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}> = ({ icon, label, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={!!disabled}
    className={`flex flex-col items-center gap-2 p-4 sm:p-6 rounded-3xl border-2 transition-all group ${
      disabled
        ? "bg-gray-100 border-transparent opacity-60 cursor-not-allowed"
        : "bg-gray-50 border-transparent hover:border-black hover:bg-white"
    }`}
  >
    <div
      className={`text-black ${
        disabled ? "" : "group-hover:scale-110 transition-transform"
      }`}
    >
      {icon}
    </div>
    <span className="font-black text-black text-[9px] uppercase tracking-widest">
      {label}
    </span>
  </button>
);

export default POSTerminal;
