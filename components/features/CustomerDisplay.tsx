import React, { useState, useEffect, useMemo } from "react";
import { Transaction, OrderStatus } from "../../types";
import { Clock, CheckCircle, ChefHat } from "lucide-react";
import { formatRelativeTime } from "../../utils/dateUtils";
import { BRANDING } from "../../constants";
import { transactionsApi } from "../../services/apiService";
import QRCode from "qrcode";

interface CustomerDisplayProps {
  transactions?: Transaction[];
  restaurantName?: string;
  restaurantLogo?: string;
}

interface PendingOrder {
  id: string;
  timestamp: string;
  items: any[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  totalAmount: number;
  discountTotal: number;
  discountType?: string;
  orderType: string;
  tableId?: string;
  tableNumber?: string;
  orderTypeLabel: string;
  deliveryAddress?: string;
  deliveryCustomerName?: string;
  deliveryCustomerPhone?: string;
}

interface PendingPayment {
  provider: string;
  method: string;
  status: string;
  amount: number;
  redirectUrl: string;
  updatedAt?: string;
}

const CustomerDisplay: React.FC<CustomerDisplayProps> = ({
  transactions: propsTransactions,
  restaurantName = BRANDING.SYSTEM_NAME,
  restaurantLogo = BRANDING.LOGO_WHITE,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>(
    propsTransactions || []
  );
  const [isLoading, setIsLoading] = useState(!propsTransactions);
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(
    null
  );
  const [paymentQrDataUrl, setPaymentQrDataUrl] = useState<string | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [previousPendingOrder, setPreviousPendingOrder] =
    useState<PendingOrder | null>(null);

  // Fetch transactions if not provided via props (for popup window)
  useEffect(() => {
    if (!propsTransactions) {
      const loadTransactions = async () => {
        try {
          setIsLoading(true);
          const data = await transactionsApi.getAll();
          const mappedTransactions: Transaction[] = data.map((txn: any) => ({
            id: txn.id,
            timestamp: new Date(txn.timestamp),
            items: txn.items || [],
            totalAmount:
              typeof txn.totalAmount === "number"
                ? txn.totalAmount
                : parseFloat(txn.totalAmount),
            subtotal:
              typeof txn.subtotal === "number"
                ? txn.subtotal
                : parseFloat(txn.subtotal),
            tax: typeof txn.tax === "number" ? txn.tax : parseFloat(txn.tax),
            serviceCharge:
              typeof txn.serviceCharge === "number"
                ? txn.serviceCharge
                : parseFloat(txn.serviceCharge),
            discountTotal:
              typeof txn.discountTotal === "number"
                ? txn.discountTotal
                : parseFloat(txn.discountTotal),
            discountType: txn.discountType,
            discountCardNumber: txn.discountCardNumber,
            discountVerifiedBy: txn.discountVerifiedBy,
            discountVerifiedAt: txn.discountVerifiedAt
              ? new Date(txn.discountVerifiedAt)
              : undefined,
            tip: typeof txn.tip === "number" ? txn.tip : parseFloat(txn.tip),
            payments: txn.payments || [],
            customerId: txn.customerId,
            employeeId: txn.employeeId,
            serverId: txn.serverId,
            tableId: txn.tableId,
            orderType: txn.orderType,
            status: txn.status as OrderStatus,
            loyaltyPointsRedeemed: txn.loyaltyPointsRedeemed,
            loyaltyPointsDiscount: txn.loyaltyPointsDiscount
              ? typeof txn.loyaltyPointsDiscount === "number"
                ? txn.loyaltyPointsDiscount
                : parseFloat(txn.loyaltyPointsDiscount)
              : undefined,
            notes: txn.notes,
            kitchenNotes: txn.kitchenNotes,
            deliveryAddress: txn.deliveryAddress,
            deliveryCustomerName: txn.deliveryCustomerName,
            deliveryCustomerPhone: txn.deliveryCustomerPhone,
            priority: txn.priority,
            estimatedPrepTime: txn.estimatedPrepTime,
          }));
          setTransactions(mappedTransactions);
        } catch (error) {
          console.error("Error loading transactions:", error);
        } finally {
          setIsLoading(false);
        }
      };

      loadTransactions();
      // Poll for updates every 2 seconds for real-time display
      const interval = setInterval(loadTransactions, 3000);
      return () => clearInterval(interval);
    }
  }, [propsTransactions]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for pending order and payment updates from localStorage
  useEffect(() => {
    const loadPendingOrder = () => {
      try {
        const stored = localStorage.getItem("pendingOrder");
        if (stored) {
          const order = JSON.parse(stored);
          setPendingOrder(order);
        } else {
          // Check if we had a pending order before and now it's cleared (payment completed)
          if (
            previousPendingOrder &&
            previousPendingOrder.items &&
            previousPendingOrder.items.length > 0
          ) {
            // Payment was successful - show thank you message
            setShowThankYou(true);
            // Hide thank you after 2 seconds
            setTimeout(() => {
              setShowThankYou(false);
            }, 3000);
          }
          setPendingOrder(null);
        }
      } catch (error) {
        console.error("Error loading pending order:", error);
        setPendingOrder(null);
      }
    };

    const loadPendingPayment = () => {
      try {
        const stored = localStorage.getItem("pendingPayment");
        if (stored) {
          setPendingPayment(JSON.parse(stored));
        } else {
          setPendingPayment(null);
        }
      } catch {
        setPendingPayment(null);
      }
    };

    // Load initially
    loadPendingOrder();
    loadPendingPayment();

    // Listen for storage events (when pending order is updated from another window)
    window.addEventListener("storage", loadPendingOrder);
    window.addEventListener("storage", loadPendingPayment);

    // Also poll localStorage every 500ms for same-window updates
    const interval = setInterval(() => {
      loadPendingOrder();
      loadPendingPayment();
    }, 500);

    return () => {
      window.removeEventListener("storage", loadPendingOrder);
      window.removeEventListener("storage", loadPendingPayment);
      clearInterval(interval);
    };
  }, [previousPendingOrder]);

  // Generate QR image for the pending payment (customer scans)
  useEffect(() => {
    const url = pendingPayment?.redirectUrl;
    if (!url) {
      setPaymentQrDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(url, { margin: 1, width: 520 })
      .then((dataUrl) => {
        if (!cancelled) setPaymentQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setPaymentQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pendingPayment?.redirectUrl]);

  // Track previous pending order to detect when payment is completed
  useEffect(() => {
    setPreviousPendingOrder(pendingOrder);
  }, [pendingOrder]);

  // Get active orders (PENDING, PREPARING, READY) sorted by timestamp
  // Only include orders from the last 30 minutes to avoid showing old orders
  const activeOrders = useMemo(() => {
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;

    const filtered = transactions
      .filter((t) => {
        // Check order type
        const validOrderType =
          t.orderType === "DINE_IN" ||
          t.orderType === "TAKEOUT" ||
          t.orderType === "DELIVERY";
        if (!validOrderType) return false;

        // Check if order is recent (within last 30 minutes) - this prevents old orders from showing
        const orderTime = new Date(t.timestamp).getTime();
        const isRecent = orderTime > thirtyMinutesAgo;
        if (!isRecent) return false;

        // Check status - handle both enum and string values
        const status = String(t.status).toUpperCase();
        const isActive =
          status === "PENDING" || status === "PREPARING" || status === "READY";
        const isNotVoided =
          status !== "VOIDED" && status !== "COMPLETED" && status !== "SERVED";

        return isActive && isNotVoided;
      })
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
      .slice(0, 5); // Show max 5 active orders

    return filtered;
  }, [transactions]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusText = (status: OrderStatus, orderType: string) => {
    if (status === OrderStatus.READY) {
      if (orderType === "TAKEOUT") return "Ready for Pickup";
      if (orderType === "DELIVERY") return "Ready for Delivery";
      return "Ready to Serve";
    }
    if (status === OrderStatus.PREPARING) return "Preparing";
    return "Order Received";
  };

  const getStatusColor = (status: OrderStatus) => {
    if (status === OrderStatus.READY)
      return "text-green-600 bg-green-50 border-green-200";
    if (status === OrderStatus.PREPARING)
      return "text-blue-600 bg-blue-50 border-blue-200";
    return "text-gray-600 bg-gray-50 border-gray-200";
  };

  // Show ONLY the pending order (current ticket being reviewed)
  // Do NOT show orders from the database - only show when checkout is active
  const displayOrders = useMemo(() => {
    // Only show if there's a pending order (checkout is open) with items
    if (pendingOrder && pendingOrder.items && pendingOrder.items.length > 0) {
      const pendingTransaction: Transaction = {
        id: pendingOrder.id,
        timestamp: new Date(pendingOrder.timestamp),
        items: pendingOrder.items,
        subtotal: pendingOrder.subtotal,
        tax: pendingOrder.tax,
        serviceCharge: pendingOrder.serviceCharge,
        totalAmount: pendingOrder.totalAmount,
        discountTotal: pendingOrder.discountTotal,
        discountType: pendingOrder.discountType as any,
        tip: 0,
        payments: [],
        customerId: undefined,
        employeeId: "", // Required by Transaction type, but not available in pending order
        serverId: undefined,
        orderType: pendingOrder.orderType as any,
        status: OrderStatus.PENDING,
        tableId: pendingOrder.tableId,
        deliveryAddress: pendingOrder.deliveryAddress,
        deliveryCustomerName: pendingOrder.deliveryCustomerName,
        deliveryCustomerPhone: pendingOrder.deliveryCustomerPhone,
      };
      return [pendingTransaction];
    }

    // No pending order = show idle state (logo)
    return [];
  }, [pendingOrder]);

  // Show thank you message for 2 seconds after payment
  if (showThankYou) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
        <div className="text-center px-8">
          <div className="mb-8">
            <CheckCircle
              size={120}
              className="mx-auto text-white"
              strokeWidth={2}
            />
          </div>
          <h1 className="text-6xl font-black text-white mb-4 tracking-tight">
            Thank You!
          </h1>
          <p className="text-2xl font-bold text-white/90">
            Your order has been received
          </p>
          <p className="text-lg font-bold text-white/80 mt-2">
            We appreciate your business!
          </p>
        </div>
      </div>
    );
  }

  // Show logo/idle screen when no active orders and no pending order
  if (displayOrders.length === 0) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <img
          src={restaurantLogo || BRANDING.LOGO_WHITE}
          alt={restaurantName || BRANDING.SYSTEM_NAME}
          className="w-auto h-auto max-w-[80%] max-h-[80%] object-contain"
          onError={(e) => {
            // Fallback to text if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
            const parent = target.parentElement;
            if (parent && !parent.querySelector(".fallback-text")) {
              const fallback = document.createElement("div");
              fallback.className =
                "fallback-text text-8xl font-black tracking-tighter text-white";
              fallback.textContent = restaurantName;
              parent.appendChild(fallback);
            }
          }}
        />
      </div>
    );
  }

  // Show active orders - responsive layout (receipt + optional payment QR)
  return (
    <div className="w-full h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 sm:p-6">
      <div className="h-full w-full max-w-5xl mx-auto">
        {displayOrders.map((order) => {
          const orderNumber = order.id.startsWith("PENDING-")
            ? "REVIEW"
            : order.id.slice(-4).toUpperCase();

          const showPaymentQr =
            !!pendingPayment &&
            !!paymentQrDataUrl &&
            pendingPayment.amount === order.totalAmount;

          return (
            <div
              key={order.id}
              className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6"
            >
              {/* Left/Top: Payment QR panel (only when available) */}
              {showPaymentQr && (
                <div className="bg-black rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                  <div className="px-6 sm:px-8 py-6 text-center border-b border-white/10">
                    <p className="text-[11px] font-black text-white/70 uppercase tracking-widest">
                      Scan to Pay
                    </p>
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1">
                      {pendingPayment!.method}
                    </h2>
                    <p className="text-white/80 font-bold mt-2">
                      Amount: ₱
                      {Math.round(pendingPayment!.amount).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex-1 p-5 sm:p-8 flex items-center justify-center">
                    <img
                      src={paymentQrDataUrl!}
                      alt="Payment QR"
                      className="w-full max-w-[520px] aspect-square object-contain bg-white rounded-2xl p-4"
                    />
                  </div>
                  <div className="px-6 sm:px-8 py-4 text-center border-t border-white/10">
                    <p className="text-[11px] font-bold text-white/70">
                      Scan this QR to open the payment link in your browser,
                      then confirm in your {pendingPayment!.method} app.
                    </p>
                  </div>
                </div>
              )}

              {/* Right/Bottom: Receipt panel */}
              <div
                className={`bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col ${
                  showPaymentQr ? "" : "lg:col-span-2"
                }`}
              >
                {/* Restaurant Header */}
                <div className="bg-black text-white px-6 sm:px-8 py-6 text-center">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
                    {restaurantName}
                  </h1>
                  <p className="text-sm text-gray-300 font-bold">
                    Order Receipt
                  </p>
                </div>

                {/* Scroll area to prevent overlap on smaller screens */}
                <div className="flex-1 overflow-auto">
                  {/* Order Info */}
                  <div className="px-6 sm:px-8 py-6 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 truncate">
                          {order.id.startsWith("PENDING-")
                            ? "Review Your Order"
                            : "Order Number"}
                        </p>
                        <p className="text-2xl font-black text-black">
                          #{orderNumber}
                        </p>
                      </div>
                      <div
                        className={`px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider flex-shrink-0 ${
                          order.id.startsWith("PENDING-")
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-200 text-gray-800"
                        }`}
                      >
                        {order.id.startsWith("PENDING-") ? "Review" : "Active"}
                      </div>
                    </div>
                    {order.orderType !== "DINE_IN" && (
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                          {order.orderType === "TAKEOUT"
                            ? "Takeout Order"
                            : "Delivery Order"}
                        </p>
                        {order.orderType === "DELIVERY" &&
                          order.deliveryCustomerName && (
                            <p className="text-sm font-black text-black">
                              {order.deliveryCustomerName}
                            </p>
                          )}
                      </div>
                    )}
                  </div>

                  {/* Order Items */}
                  <div className="px-6 sm:px-8 py-6">
                    <div className="space-y-4 mb-6">
                      {order.items.map((item, idx) => {
                        const itemTotal = item.price * item.quantity;
                        const modifiers = item.modifiers || [];

                        return (
                          <div
                            key={idx}
                            className="pb-4 border-b border-gray-100 last:border-0 last:pb-0"
                          >
                            <div className="flex items-start justify-between mb-2 gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                  <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-black flex-shrink-0">
                                    {item.quantity}
                                  </span>
                                  <p className="text-base sm:text-lg font-black text-black flex-1 truncate">
                                    {item.name}
                                  </p>
                                </div>
                                {modifiers.length > 0 && (
                                  <div className="ml-11 mt-2 space-y-1">
                                    {modifiers.map(
                                      (mod: any, modIdx: number) => (
                                        <p
                                          key={modIdx}
                                          className="text-sm text-gray-600 font-bold"
                                        >
                                          + {mod.modifierName}
                                        </p>
                                      )
                                    )}
                                  </div>
                                )}
                                {item.specialInstructions && (
                                  <p className="ml-11 mt-1 text-xs text-gray-500 italic">
                                    Note: {item.specialInstructions}
                                  </p>
                                )}
                              </div>
                              <p className="text-base sm:text-lg font-black text-black flex-shrink-0">
                                ₱{itemTotal.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Price Breakdown */}
                    <div className="bg-gray-50 rounded-xl p-5 space-y-3 mb-6">
                      {order.subtotal > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="font-bold text-gray-600">
                            Subtotal
                          </span>
                          <span className="font-black text-gray-800">
                            ₱{order.subtotal.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {order.discountTotal > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span className="font-bold">Discount</span>
                          <span className="font-black">
                            -₱{order.discountTotal.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {order.tax > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="font-bold text-gray-600">
                            Tax (12%)
                          </span>
                          <span className="font-black text-gray-800">
                            ₱{order.tax.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {order.serviceCharge > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="font-bold text-gray-600">
                            Service Charge (10%)
                          </span>
                          <span className="font-black text-gray-800">
                            ₱{order.serviceCharge.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Total */}
                    <div className="border-t-2 border-black pt-5">
                      <div className="flex items-end justify-between gap-4">
                        <p className="text-base sm:text-xl font-black text-black uppercase tracking-wide">
                          Total Amount
                        </p>
                        <p className="text-3xl sm:text-4xl font-black text-black">
                          ₱{Math.round(order.totalAmount).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 sm:px-8 py-4 bg-gray-50 border-t border-gray-200 text-center">
                  <p className="text-xs text-gray-500 font-bold">
                    Thank you for your order!
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CustomerDisplay;
