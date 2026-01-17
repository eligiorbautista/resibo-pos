import React, { useEffect, useState, useMemo } from "react";
import {
  Transaction,
  Employee,
  Table,
  Customer,
  OrderStatus,
  OrderType,
  PaymentMethod,
  DiscountType,
  Role,
} from "../../types";
import {
  Search,
  Filter,
  History,
  Receipt,
  StickyNote,
  Edit2,
  Check,
  Printer,
  AlertCircle,
  Ban,
  Tag,
  X,
} from "lucide-react";
import { formatTimestamp, formatRelativeTime } from "../../utils/dateUtils";
import { RESTAURANT_NAME, BRANDING } from "../../constants";
import { transactionsApi } from "../../services/apiService";

interface OrderHistoryProps {
  transactions: Transaction[];
  employees: Employee[];
  tables: Table[];
  customers: Customer[];
  currentUser: Employee;
  onUpdateTransactionNote: (id: string, note: string) => void;
  onVoidTransaction: (id: string, note?: string) => void;
  onRefundTransaction?: (refund: {
    transactionId: string;
    amount: number;
    reason: string;
    items: { itemId: string; quantity: number }[];
    method: PaymentMethod;
  }) => void;
  onModifyTransaction?: (transactionId: string, modifiedItems: any[]) => void;
  onUpdateOrderStatus?: (id: string, status: OrderStatus) => void;
}

const OrderHistory: React.FC<OrderHistoryProps> = ({
  transactions,
  employees,
  tables,
  customers,
  currentUser,
  onUpdateTransactionNote,
  onVoidTransaction,
  onRefundTransaction,
  onModifyTransaction,
  onUpdateOrderStatus,
}) => {
  // Local list that can be refreshed from the backend so the history updates even when
  // a sale is finalized asynchronously (e.g., e-wallet payments).
  const [liveTransactions, setLiveTransactions] =
    useState<Transaction[]>(transactions);

  useEffect(() => {
    setLiveTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await transactionsApi.getAll();
        const mapped: Transaction[] = (data as any[]).map((txn: any) => ({
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
          discountType: txn.discountType as DiscountType,
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
          orderType: txn.orderType as OrderType,
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

        if (!cancelled) setLiveTransactions(mapped);
      } catch {
        // ignore: keep showing current list
      }
    };

    // Initial load + polling
    load();
    const interval = window.setInterval(load, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");

  // Note editing state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState("");
  const [voidConfirmId, setVoidConfirmId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [managerPin, setManagerPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState<string | null>(null);
  const [refundItems, setRefundItems] = useState<Record<string, number>>({});
  const [showModifyOrder, setShowModifyOrder] = useState<string | null>(null);

  const filteredTransactions = useMemo(() => {
    let filtered = [...liveTransactions];

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    // Filter by payment method
    if (paymentMethodFilter !== "all") {
      filtered = filtered.filter((t) =>
        t.payments.some((p) => p.method === paymentMethodFilter)
      );
    }

    // Filter by employee
    if (employeeFilter !== "all") {
      filtered = filtered.filter((t) => t.employeeId === employeeFilter);
    }

    // Filter by order type
    if (orderTypeFilter !== "all") {
      filtered = filtered.filter((t) => t.orderType === orderTypeFilter);
    }

    // Filter by date
    if (dateFilter !== "all") {
      const today = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
        case "today":
          filtered = filtered.filter((t) => {
            const txDate = new Date(t.timestamp);
            return txDate.toDateString() === today.toDateString();
          });
          break;
        case "week":
          filterDate.setDate(today.getDate() - 7);
          filtered = filtered.filter((t) => {
            const txDate = new Date(t.timestamp);
            return txDate >= filterDate;
          });
          break;
        case "month":
          filterDate.setMonth(today.getMonth() - 1);
          filtered = filtered.filter((t) => {
            const txDate = new Date(t.timestamp);
            return txDate >= filterDate;
          });
          break;
      }
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((t) => {
        const employee = employees.find((e) => e.id === t.employeeId);
        const customer = t.customerId
          ? customers.find((c) => c.id === t.customerId)
          : null;
        const table = t.tableId
          ? tables.find((tbl) => tbl.id === t.tableId)
          : null;

        return (
          t.id.toLowerCase().includes(term) ||
          t.totalAmount.toString().includes(term) ||
          (t.notes && t.notes.toLowerCase().includes(term)) ||
          employee?.name.toLowerCase().includes(term) ||
          customer?.name.toLowerCase().includes(term) ||
          table?.number.toLowerCase().includes(term) ||
          t.items.some((item) => item.name.toLowerCase().includes(term))
        );
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return (
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        case "amount":
          return b.totalAmount - a.totalAmount;
        default:
          return 0;
      }
    });

    return filtered;
  }, [
    liveTransactions,
    statusFilter,
    paymentMethodFilter,
    employeeFilter,
    orderTypeFilter,
    dateFilter,
    searchTerm,
    sortBy,
    employees,
    customers,
    tables,
  ]);

  const startEditingNote = (trx: Transaction) => {
    setEditingNoteId(trx.id);
    setTempNote(trx.notes || "");
  };

  const saveNote = (id: string) => {
    onUpdateTransactionNote(id, tempNote);
    setEditingNoteId(null);
    setTempNote("");
  };

  const handleVoid = () => {
    if (!voidConfirmId) return;

    // Require 4-digit manager PIN
    if (managerPin.length !== 4) {
      setPinError(true);
      return;
    }

    // Verify that the PIN belongs to a manager
    const manager = employees.find(
      (e) => e.role === Role.MANAGER && e.pin === managerPin
    );

    if (!manager) {
      setPinError(true);
      return;
    }

    onVoidTransaction(voidConfirmId, voidReason || undefined);
    setVoidConfirmId(null);
    setVoidReason("");
    setManagerPin("");
    setPinError(false);
  };

  const startModifyingOrder = (trx: Transaction) => {
    setShowModifyOrder(trx.id);
    // Initialize refund items with current quantities
    const items: Record<string, number> = {};
    trx.items.forEach((_, idx) => {
      items[idx] = trx.items[idx].quantity;
    });
    setRefundItems(items);
  };

  const printReceipt = (transaction: Transaction) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      return;
    }

    const employee = employees.find((e) => e.id === transaction.employeeId);
    const customer = transaction.customerId
      ? customers.find((c) => c.id === transaction.customerId)
      : null;
    const table = transaction.tableId
      ? tables.find((t) => t.id === transaction.tableId)
      : null;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${transaction.id}</title>
          <style>
            @media print {
              @page { 
                size: 80mm auto; 
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
              width: 80mm;
              padding: 12mm 8mm;
              font-size: 11px;
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
            .item-variant {
              margin: 1px 0;
              padding-left: 12px;
              color: #666;
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
              <div class="receipt-number">Receipt #${transaction.id}</div>
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
                    " "
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
                    ${baseName}
                  </div>
                  <div class="item-price">₱${Math.round(
                    lineTotal
                  ).toLocaleString()}</div>
                </div>
                <div class="item-quantity-price">
                  ${item.quantity} × ₱${Math.round(unitPrice).toLocaleString()}
                </div>
                ${
                  variantName
                    ? `
                  <div class="item-variant">
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
                    `
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
                  transaction.discountTotal
                ).toLocaleString()}</span>
              </div>
              <div class="total-row label amount">
                <span>Subtotal After Discount:</span>
                <span>₱${Math.round(
                  transaction.subtotal - transaction.discountTotal
                ).toLocaleString()}</span>
              </div>
            `
                : ""
            }
            
            ${
              transaction.tax > 0
                ? `
              <div class="total-row label amount">
                <span>VAT (12%):</span>
                <span>₱${Math.round(transaction.tax).toLocaleString()}</span>
              </div>
            `
                : transaction.discountType === DiscountType.PWD ||
                  transaction.discountType === DiscountType.SENIOR_CITIZEN
                ? `
              <div class="total-row vat-exempt">
                <span>VAT:</span>
                <span>VAT-Exempt</span>
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
                  transaction.serviceCharge
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
                transaction.totalAmount
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
                  p.method
                )}:</span>
                <span>₱${Math.round(p.amount).toLocaleString()}</span>
              </div>
            `
              )
              .join("")}
            ${(() => {
              const totalPaid = transaction.payments.reduce(
                (sum, p) => sum + p.amount,
                0
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
                      Math.abs(change)
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
            <p class="footer-disclaimer">This is a computer-generated receipt. No signature required.</p>
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

  return (
    <div className="flex flex-col h-full p-6 bg-white overflow-hidden">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">
            Business Records
          </p>
          <h1 className="text-3xl font-black tracking-tighter text-black uppercase">
            Order History
          </h1>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
          <div className="lg:col-span-2 relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={14}
            />
            <input
              type="text"
              placeholder="Search transactions..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:outline-none focus:border-black transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-black"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value={OrderStatus.PENDING}>Pending</option>
            <option value={OrderStatus.PREPARING}>Preparing</option>
            <option value={OrderStatus.READY}>Ready</option>
            <option value={OrderStatus.SERVED}>Served</option>
            <option value={OrderStatus.COMPLETED}>Completed</option>
            <option value={OrderStatus.VOIDED}>Voided</option>
          </select>

          <select
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-black"
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
          >
            <option value="all">All Payments</option>
            <option value={PaymentMethod.CASH}>Cash</option>
            <option value={PaymentMethod.DEBIT_CARD}>Debit Card</option>
            <option value={PaymentMethod.GCASH}>GCash</option>
            <option value={PaymentMethod.PAYMAYA}>PayMaya</option>
          </select>

          <select
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-black"
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
          >
            <option value="all">All Employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>

          <select
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-black"
            value={orderTypeFilter}
            onChange={(e) => setOrderTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value={OrderType.DINE_IN}>Dine In</option>
            <option value={OrderType.TAKEOUT}>Takeout</option>
            <option value={OrderType.DELIVERY}>Delivery</option>
          </select>

          <select
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-black"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>

          <select
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-black"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="date">Sort by Date</option>
            <option value="amount">Sort by Amount</option>
          </select>
        </div>
      </div>

      {/* Transaction List */}
      <div className="flex-1 overflow-y-auto">
        {filteredTransactions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-300">
            <History size={64} strokeWidth={1} className="mb-4 opacity-20" />
            <p className="text-[12px] uppercase tracking-widest font-black">
              No transactions found
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredTransactions.map((trx) => {
              const isVoided = trx.status === OrderStatus.VOIDED;
              const isEditing = editingNoteId === trx.id;
              const employee = employees.find((e) => e.id === trx.employeeId);
              const customer = trx.customerId
                ? customers.find((c) => c.id === trx.customerId)
                : null;
              const table = trx.tableId
                ? tables.find((t) => t.id === trx.tableId)
                : null;

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
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
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
                      {trx.orderType === "TAKEOUT" && (
                        <span className="bg-blue-100 text-blue-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                          TAKEOUT
                        </span>
                      )}
                      {trx.orderType === "DELIVERY" && (
                        <span className="bg-purple-100 text-purple-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                          DELIVERY
                        </span>
                      )}
                      {trx.orderType === "DINE_IN" && (
                        <span className="bg-gray-100 text-gray-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                          DINE IN
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-2xl font-black tracking-tighter mb-1 ${
                        isVoided ? "text-red-600 line-through" : "text-black"
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
                              trx.notes ? "text-black italic" : "text-gray-300"
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                      {trx.items.map((item, idx) => {
                        // Extract variant name from item name if it contains " - "
                        const nameParts = item.name.split(" - ");
                        const baseName = nameParts[0];
                        const variantName =
                          nameParts.length > 1
                            ? nameParts.slice(1).join(" - ")
                            : null;

                        return (
                          <div
                            key={idx}
                            className="border-b border-gray-200/50 pb-2"
                          >
                            <div className="flex justify-between items-start text-[11px] font-bold mb-1">
                              <div className="flex-1">
                                <span className="text-black">
                                  {item.quantity}x {baseName}
                                </span>
                                {variantName && (
                                  <span className="text-gray-500 text-[10px] font-medium block mt-0.5">
                                    Variant: {variantName}
                                  </span>
                                )}
                              </div>
                              <span className="text-gray-400 font-black ml-2">
                                ₱
                                {Math.round(
                                  item.price * item.quantity
                                ).toLocaleString()}
                              </span>
                            </div>
                            {item.modifiers && item.modifiers.length > 0 && (
                              <div className="mt-1.5 space-y-0.5">
                                {item.modifiers.map((modifier, modIdx) => (
                                  <div
                                    key={modIdx}
                                    className="text-[9px] text-gray-600 pl-3"
                                  >
                                    • {modifier.modifierName}
                                    {modifier.price > 0
                                      ? ` (+₱${Math.round(
                                          modifier.price
                                        ).toLocaleString()})`
                                      : ""}
                                  </div>
                                ))}
                              </div>
                            )}
                            {item.specialInstructions && (
                              <div className="mt-1 text-[9px] text-gray-500 italic pl-3">
                                Note: {item.specialInstructions}
                              </div>
                            )}
                          </div>
                        );
                      })}
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
                              -₱{Math.round(trx.discountTotal).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[9px]">
                            <span className="text-gray-400 uppercase tracking-widest">
                              Subtotal After Discount
                            </span>
                            <span className="text-gray-600 font-black">
                              ₱
                              {Math.round(
                                trx.subtotal - trx.discountTotal
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
                          trx.discountType === DiscountType.SENIOR_CITIZEN) && (
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
                            ₱{Math.round(trx.serviceCharge).toLocaleString()}
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
                        <span className="uppercase tracking-widest">Total</span>
                        <span className="text-lg">
                          ₱{Math.round(trx.totalAmount).toLocaleString()}
                        </span>
                      </div>

                      {trx.orderType === OrderType.DELIVERY &&
                        (trx.deliveryCustomerName ||
                          trx.deliveryCustomerPhone ||
                          trx.deliveryAddress) && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest mb-2">
                              Delivery Information
                            </p>
                            <div className="space-y-1">
                              {trx.deliveryCustomerName && (
                                <div className="text-[10px] font-bold text-gray-700">
                                  <span className="text-gray-500">Name:</span>{" "}
                                  {trx.deliveryCustomerName}
                                </div>
                              )}
                              {trx.deliveryCustomerPhone && (
                                <div className="text-[10px] font-bold text-gray-700">
                                  <span className="text-gray-500">Phone:</span>{" "}
                                  {trx.deliveryCustomerPhone}
                                </div>
                              )}
                              {trx.deliveryAddress && (
                                <div className="text-[10px] font-bold text-gray-700">
                                  <span className="text-gray-500">
                                    Address:
                                  </span>{" "}
                                  {trx.deliveryAddress}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

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
                                ₱{Math.round(payment.amount).toLocaleString()}
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
                          currentUser.role === Role.MANAGER &&
                          onRefundTransaction && (
                            <button
                              onClick={() => {
                                setShowRefundModal(trx.id);
                                const items: Record<string, number> = {};
                                trx.items.forEach((_, idx) => {
                                  items[idx] = 0;
                                });
                                setRefundItems(items);
                              }}
                              className="w-full py-3 bg-white text-orange-600 border border-orange-100 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-600 hover:text-white transition-all shadow-sm mb-2"
                            >
                              <Tag size={14} /> Refund
                            </button>
                          )}
                        {(trx.status === OrderStatus.PENDING ||
                          trx.status === OrderStatus.PREPARING) &&
                          onModifyTransaction && (
                            <button
                              onClick={() => startModifyingOrder(trx)}
                              className="w-full py-3 bg-white text-blue-600 border border-blue-100 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all shadow-sm mb-2"
                            >
                              <Edit2 size={14} /> Modify Order
                            </button>
                          )}
                        {onVoidTransaction && (
                          <button
                            onClick={() => setVoidConfirmId(trx.id)}
                            className="w-full py-3 bg-white text-red-600 border border-red-100 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                          >
                            <AlertCircle size={14} /> Void Transaction
                          </button>
                        )}
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

      {/* Void Confirmation Dialog */}
      {voidConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h4 className="text-xl font-black tracking-tighter mb-2 text-center">
              Void Transaction
            </h4>
            <p className="text-xs text-gray-500 font-bold leading-relaxed mb-4 text-center">
              Are you sure you want to void this transaction? This action cannot
              be undone.
            </p>
            <textarea
              className="w-full text-xs font-bold bg-gray-50 border border-gray-100 rounded-xl p-3 focus:outline-none focus:border-black mb-4 h-20 resize-none"
              placeholder="Reason for void (optional)..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />
            <div className="mb-4">
              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                Manager PIN
              </label>
              <input
                type="password"
                maxLength={4}
                placeholder="••••"
                className={`w-full text-center text-sm font-black tracking-[0.5em] bg-gray-50 border ${
                  pinError ? "border-red-600" : "border-gray-100"
                } rounded-xl py-2.5 focus:outline-none focus:border-black transition-colors`}
                value={managerPin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  if (value.length <= 4) {
                    setManagerPin(value);
                    if (pinError) setPinError(false);
                  }
                }}
              />
              {pinError && (
                <p className="text-[8px] text-red-600 font-black uppercase mt-1 text-center">
                  Valid manager PIN is required to void a transaction.
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setVoidConfirmId(null);
                  setVoidReason("");
                  setManagerPin("");
                  setPinError(false);
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleVoid}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all"
              >
                Void Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
