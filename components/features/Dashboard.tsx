import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  AlertCircle,
  Clock,
  TrendingUp,
  ChefHat,
  CreditCard,
  Download,
  Calendar,
  X,
  Zap,
  Target,
  CheckCircle,
  ArrowRight,
  Activity,
  RefreshCw,
} from "lucide-react";
import {
  Transaction,
  Product,
  Employee,
  Table,
  CashDrawer,
  OrderStatus,
  OrderType,
  PaymentMethod,
  DiscountType,
  Customer,
} from "../../types";

interface DashboardProps {
  transactions: Transaction[];
  products: Product[];
  employees: Employee[];
  tables?: Table[];
  cashDrawers?: CashDrawer[];
  customers?: Customer[];
  onRefresh?: () => void;
  isLoading?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  products,
  employees,
  tables = [],
  cashDrawers = [],
  customers = [],
  onRefresh,
  isLoading = false,
}) => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<
    "today" | "week" | "month" | "year" | "all" | "custom"
  >("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareDateRange, setCompareDateRange] = useState<
    "previous" | "custom"
  >("previous");
  const [compareCustomStartDate, setCompareCustomStartDate] = useState("");
  const [compareCustomEndDate, setCompareCustomEndDate] = useState("");

  const filterTransactionsByDateRange = (
    txns: Transaction[]
  ): Transaction[] => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow

    switch (dateRange) {
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
      case "year":
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
        } else {
          return txns;
        }
        break;
      default:
        return txns;
    }

    return txns.filter((t) => {
      const tDate = new Date(t.timestamp);
      return tDate >= startDate && tDate <= endDate;
    });
  };

  const filteredTransactions = useMemo(
    () => filterTransactionsByDateRange(transactions),
    [transactions, dateRange, customStartDate, customEndDate]
  );

  const getComparisonTransactions = (): Transaction[] => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    if (compareDateRange === "custom") {
      if (compareCustomStartDate && compareCustomEndDate) {
        startDate = new Date(compareCustomStartDate);
        endDate = new Date(compareCustomEndDate);
        endDate.setHours(23, 59, 59, 999);
      } else {
        return [];
      }
    } else {
      // Previous period comparison
      const currentStart = (() => {
        const d = new Date();
        switch (dateRange) {
          case "today":
            d.setHours(0, 0, 0, 0);
            return d;
          case "week":
            d.setDate(d.getDate() - 7);
            return d;
          case "month":
            d.setMonth(d.getMonth() - 1);
            return d;
          case "year":
            d.setFullYear(d.getFullYear() - 1);
            return d;
          default:
            return new Date(0);
        }
      })();
      const currentEnd = filterTransactionsByDateRange(transactions)[0]
        ?.timestamp
        ? new Date(
            Math.max(
              ...filterTransactionsByDateRange(transactions).map((t) =>
                new Date(t.timestamp).getTime()
              )
            )
          )
        : new Date();

      const periodLength = currentEnd.getTime() - currentStart.getTime();
      endDate = currentStart;
      startDate = new Date(currentStart.getTime() - periodLength);
    }

    return transactions.filter((t) => {
      const tDate = new Date(t.timestamp);
      return tDate >= startDate && tDate <= endDate;
    });
  };

  const comparisonTransactions = useMemo(
    () => getComparisonTransactions(),
    [
      transactions,
      dateRange,
      compareDateRange,
      compareCustomStartDate,
      compareCustomEndDate,
      customStartDate,
      customEndDate,
    ]
  );

  const calculateProfitMargin = () => {
    const revenue = filteredTransactions.reduce(
      (sum, t) => sum + t.totalAmount,
      0
    );
    const cost = filteredTransactions.reduce((sum, t) => {
      return (
        sum +
        t.items.reduce((itemSum, item) => {
          const product = products.find((p) => p.id === item.productId);
          return itemSum + (product ? product.costPrice * item.quantity : 0);
        }, 0)
      );
    }, 0);
    const profit = revenue - cost;
    return {
      revenue,
      cost,
      profit,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0,
    };
  };

  const profitData = useMemo(
    () => calculateProfitMargin(),
    [filteredTransactions, products]
  );

  const exportToCSV = () => {
    const headers = [
      "Date",
      "Transaction ID",
      "Customer ID",
      "Items",
      "Subtotal",
      "Tax",
      "Service Charge",
      "Discount",
      "Tip",
      "Total",
      "Payment Method",
      "Status",
    ];
    const rows = filteredTransactions.map((t) => {
      const items = t.items.map((i) => `${i.quantity}x ${i.name}`).join("; ");
      const paymentMethods = t.payments
        .map((p) => `${p.method}: ₱${p.amount.toFixed(2)}`)
        .join("; ");
      return [
        new Date(t.timestamp).toLocaleString(),
        t.id,
        t.customerId || "Guest",
        items,
        t.subtotal.toFixed(2),
        t.tax.toFixed(2),
        t.serviceCharge.toFixed(2),
        t.discountTotal.toFixed(2),
        t.tip.toFixed(2),
        t.totalAmount.toFixed(2),
        paymentMethods,
        t.status,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Calculate metrics using filtered transactions
  const totalSales = useMemo(
    () => filteredTransactions.reduce((sum, t) => sum + t.totalAmount, 0),
    [filteredTransactions]
  );
  const totalOrders = filteredTransactions.length;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  const totalTips = useMemo(
    () => filteredTransactions.reduce((sum, t) => sum + (t.tip || 0), 0),
    [filteredTransactions]
  );
  const totalDiscounts = useMemo(
    () =>
      filteredTransactions.reduce((sum, t) => sum + (t.discountTotal || 0), 0),
    [filteredTransactions]
  );
  const pwdDiscounts = useMemo(
    () =>
      filteredTransactions.filter((t) => t.discountType === DiscountType.PWD)
        .length,
    [filteredTransactions]
  );
  const seniorDiscounts = useMemo(
    () =>
      filteredTransactions.filter(
        (t) => t.discountType === DiscountType.SENIOR_CITIZEN
      ).length,
    [filteredTransactions]
  );
  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status === "IN").length,
    [employees]
  );
  const lowStockItems = useMemo(
    () => products.filter((p) => p.totalStock < p.reorderPoint).length,
    [products]
  );
  const activeOrders = useMemo(
    () =>
      filteredTransactions.filter(
        (t) =>
          t.status !== OrderStatus.COMPLETED && t.status !== OrderStatus.VOIDED
      ).length,
    [filteredTransactions]
  );
  const activeDrawer = useMemo(
    () => cashDrawers.find((d) => !d.closedAt),
    [cashDrawers]
  );

  // Today's metrics
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaySales = useMemo(
    () =>
      filteredTransactions
        .filter((t) => new Date(t.timestamp) >= today)
        .reduce((sum, t) => sum + t.totalAmount, 0),
    [filteredTransactions]
  );
  const todayOrders = useMemo(
    () =>
      filteredTransactions.filter((t) => new Date(t.timestamp) >= today).length,
    [filteredTransactions]
  );

  // Last 7 days data
  const last7DaysData = useMemo(
    () =>
      [...Array(7)].map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        date.setHours(0, 0, 0, 0);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        return {
          name: date.toLocaleDateString("en-US", { weekday: "short" }),
          total: filteredTransactions
            .filter((t) => {
              const tDate = new Date(t.timestamp);
              return tDate >= date && tDate < nextDay;
            })
            .reduce((s, t) => s + t.totalAmount, 0),
        };
      }),
    [filteredTransactions]
  );

  // Order types breakdown
  const orderTypesData = useMemo(() => {
    const types = filteredTransactions.reduce((acc, t) => {
      acc[t.orderType] = (acc[t.orderType] || 0) + 1;
      return acc;
    }, {} as Record<OrderType, number>);
    return Object.entries(types).map(([name, value]) => ({
      name: name.replace("_", " "),
      value,
    }));
  }, [filteredTransactions]);

  // Payment methods breakdown
  const paymentMethodsData = useMemo(() => {
    const methods: Record<string, number> = {};
    filteredTransactions.forEach((t) => {
      t.payments.forEach((p) => {
        methods[p.method] = (methods[p.method] || 0) + p.amount;
      });
    });
    return Object.entries(methods).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  // Top selling products
  const topProducts = useMemo(() => {
    const productSales: Record<
      string,
      { name: string; quantity: number; revenue: number }
    > = {};
    filteredTransactions.forEach((t) => {
      t.items.forEach((item) => {
        if (!productSales[item.productId]) {
          const product = products.find((p) => p.id === item.productId);
          productSales[item.productId] = {
            name: product?.name || "Unknown",
            quantity: 0,
            revenue: 0,
          };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.price * item.quantity;
      });
    });
    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredTransactions, products]);

  // Top employees
  const topEmployees = useMemo(() => {
    return employees
      .filter((e) => e.totalSales > 0)
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 3);
  }, [employees]);

  // Generate actionable insights based on data
  const actionableInsights = useMemo(() => {
    const insights: Array<{
      type: "warning" | "success" | "info" | "action";
      title: string;
      description: string;
      action?: string;
    }> = [];

    // Low stock alerts
    const lowStockProducts = products.filter(
      (p) => p.totalStock < p.reorderPoint
    );
    if (lowStockProducts.length > 0) {
      insights.push({
        type: "warning",
        title: `${lowStockProducts.length} Item${
          lowStockProducts.length > 1 ? "s" : ""
        } Low on Stock`,
        description: `${lowStockProducts
          .slice(0, 3)
          .map((p) => p.name)
          .join(", ")}${
          lowStockProducts.length > 3 ? " and more" : ""
        } need restocking`,
        action: "View Inventory",
      });
    }

    // No active drawer
    if (!activeDrawer) {
      insights.push({
        type: "action",
        title: "No Active Cash Drawer",
        description: "Open a cash drawer to start processing transactions",
        action: "Open Drawer",
      });
    }

    // Peak hours analysis
    const hourlySales: Record<number, number> = {};
    filteredTransactions.forEach((t) => {
      const hour = new Date(t.timestamp).getHours();
      hourlySales[hour] = (hourlySales[hour] || 0) + t.totalAmount;
    });
    const peakHour = Object.entries(hourlySales).sort((a, b) => b[1] - a[1])[0];
    if (peakHour && filteredTransactions.length > 10) {
      insights.push({
        type: "info",
        title: "Peak Sales Hour",
        description: `${peakHour[0]}:00 is your busiest hour with ₱${parseInt(
          peakHour[1]
        ).toLocaleString()} in sales`,
        action: undefined,
      });
    }

    // Sales trend
    if (last7DaysData.length >= 2) {
      const recentDays = last7DaysData.slice(-3);
      const avgRecent =
        recentDays.reduce((sum, d) => sum + d.total, 0) / recentDays.length;
      const previousDays = last7DaysData.slice(-6, -3);
      const avgPrevious =
        previousDays.length > 0
          ? previousDays.reduce((sum, d) => sum + d.total, 0) /
            previousDays.length
          : avgRecent;

      if (avgRecent > avgPrevious * 1.1) {
        insights.push({
          type: "success",
          title: "Sales Trending Up",
          description: `Recent sales are ${(
            (avgRecent / avgPrevious - 1) *
            100
          ).toFixed(0)}% higher than previous period`,
          action: undefined,
        });
      } else if (avgRecent < avgPrevious * 0.9 && avgPrevious > 0) {
        insights.push({
          type: "warning",
          title: "Sales Declining",
          description: `Recent sales are ${(
            (1 - avgRecent / avgPrevious) *
            100
          ).toFixed(0)}% lower than previous period`,
          action: undefined,
        });
      }
    }

    // Top customer opportunity
    const customerTransactions: Record<
      string,
      { count: number; total: number }
    > = {};
    filteredTransactions.forEach((t) => {
      if (t.customerId) {
        if (!customerTransactions[t.customerId]) {
          customerTransactions[t.customerId] = { count: 0, total: 0 };
        }
        customerTransactions[t.customerId].count++;
        customerTransactions[t.customerId].total += t.totalAmount;
      }
    });
    const topCustomer = Object.entries(customerTransactions).sort(
      (a, b) => b[1].total - a[1].total
    )[0];

    if (topCustomer && topCustomer[1].count >= 3) {
      const customer = customers.find((c) => c.id === topCustomer[0]);
      insights.push({
        type: "info",
        title: "Top Customer",
        description: `${customer?.name || "Customer"} has made ${
          topCustomer[1].count
        } purchases worth ₱${topCustomer[1].total.toLocaleString()}`,
        action: "View CRM",
      });
    }

    // Average order value trend
    if (filteredTransactions.length > 10) {
      const recentOrders = filteredTransactions.slice(0, 10);
      const olderOrders = filteredTransactions.slice(10, 20);
      if (olderOrders.length > 0) {
        const recentAvg =
          recentOrders.reduce((sum, t) => sum + t.totalAmount, 0) /
          recentOrders.length;
        const olderAvg =
          olderOrders.reduce((sum, t) => sum + t.totalAmount, 0) /
          olderOrders.length;
        if (recentAvg > olderAvg * 1.15) {
          insights.push({
            type: "success",
            title: "Higher Order Values",
            description: `Average order value increased by ${(
              (recentAvg / olderAvg - 1) *
              100
            ).toFixed(0)}%`,
            action: undefined,
          });
        }
      }
    }

    // Payment method insights
    const cashPercentage =
      paymentMethodsData.find((m) => m.name === PaymentMethod.CASH)?.value || 0;
    const totalPaymentAmount = paymentMethodsData.reduce(
      (sum, m) => sum + m.value,
      0
    );
    if (totalPaymentAmount > 0 && cashPercentage / totalPaymentAmount > 0.7) {
      insights.push({
        type: "info",
        title: "High Cash Usage",
        description: `${((cashPercentage / totalPaymentAmount) * 100).toFixed(
          0
        )}% of payments are cash. Consider promoting digital payments.`,
        action: undefined,
      });
    }

    return insights.slice(0, 5); // Limit to 5 insights
  }, [
    filteredTransactions,
    products,
    activeDrawer,
    last7DaysData,
    paymentMethodsData,
  ]);

  // Quick actions
  const quickActions = useMemo(() => {
    const actions: Array<{
      label: string;
      icon: React.ComponentType<{ size?: number; className?: string }>;
      path: string;
    }> = [];

    if (!activeDrawer) {
      actions.push({
        label: "Open Cash Drawer",
        icon: DollarSign,
        path: "/cash",
      });
    }

    if (lowStockItems > 0) {
      actions.push({
        label: "View Low Stock",
        icon: AlertCircle,
        path: "/inventory",
      });
    }

    if (activeOrders > 0) {
      actions.push({
        label: "Kitchen Orders",
        icon: ChefHat,
        path: "/kitchen",
      });
    }

    actions.push({
      label: "Export Report",
      icon: Download,
      path: "/dashboard",
    });
    actions.push({ label: "Customer CRM", icon: Users, path: "/crm" });

    return actions.slice(0, 4);
  }, [activeDrawer, lowStockItems, activeOrders]);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-white">
      <div className="mb-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">
              Analytics
            </p>
            <h1 className="text-3xl font-black tracking-tighter text-black uppercase">
              Insights
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl p-1">
              <Calendar size={14} className="text-gray-400" />
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value as any);
                  if (e.target.value !== "custom") {
                    setShowDatePicker(false);
                  }
                }}
                className="px-3 py-1.5 bg-transparent border-0 text-[9px] font-black uppercase tracking-widest focus:outline-none"
              >
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="year">Last Year</option>
                <option value="custom">Custom Range</option>
                <option value="all">All Time</option>
              </select>
            </div>
            {dateRange === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-[9px] font-bold focus:outline-none focus:border-black"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-[9px] font-bold focus:outline-none focus:border-black"
                />
              </div>
            )}
            <button
              onClick={() => setCompareMode(!compareMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                compareMode
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-black hover:bg-gray-200"
              }`}
            >
              <TrendingUp size={14} /> Compare
            </button>
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw
                  size={14}
                  className={isLoading ? "animate-spin" : ""}
                />{" "}
                Refresh
              </button>
            )}
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {compareMode && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black uppercase tracking-widest">
              Period Comparison
            </h3>
            <button
              onClick={() => setCompareMode(false)}
              className="text-gray-500 hover:text-black"
            >
              <X size={16} />
            </button>
          </div>

          {/* Comparison Date Selection */}
          <div className="mb-4 p-3 bg-white rounded-lg border border-blue-100">
            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2">
              Compare Against
            </p>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setCompareDateRange("previous")}
                className={`px-3 py-2 rounded-lg text-xs font-black transition-all ${
                  compareDateRange === "previous"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-black hover:bg-gray-200"
                }`}
              >
                Previous Period
              </button>
              <button
                onClick={() => setCompareDateRange("custom")}
                className={`px-3 py-2 rounded-lg text-xs font-black transition-all ${
                  compareDateRange === "custom"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-black hover:bg-gray-200"
                }`}
              >
                Custom Range
              </button>
            </div>

            {compareDateRange === "custom" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={compareCustomStartDate}
                    onChange={(e) => setCompareCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={compareCustomEndDate}
                    onChange={(e) => setCompareCustomEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {compareDateRange === "previous" && (
              <p className="text-xs text-gray-600">
                Comparing against the equivalent previous period based on your
                current date range selection.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2">
                Current Period
              </p>
              <div className="space-y-1">
                <p className="text-xs font-black">
                  Sales: ₱
                  {filteredTransactions
                    .reduce((sum, t) => sum + t.totalAmount, 0)
                    .toLocaleString()}
                </p>
                <p className="text-xs font-black">
                  Orders: {filteredTransactions.length}
                </p>
              </div>
            </div>
            <div>
              <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2">
                Comparison Period
              </p>
              <div className="space-y-1">
                <p className="text-xs font-black">
                  Sales: ₱
                  {comparisonTransactions
                    .reduce((sum, t) => sum + t.totalAmount, 0)
                    .toLocaleString()}
                </p>
                <p className="text-xs font-black">
                  Orders: {comparisonTransactions.length}
                </p>
              </div>
            </div>
          </div>
          {(() => {
            const currentSales = filteredTransactions.reduce(
              (sum, t) => sum + t.totalAmount,
              0
            );
            const compareSales = comparisonTransactions.reduce(
              (sum, t) => sum + t.totalAmount,
              0
            );
            const change =
              compareSales > 0
                ? ((currentSales - compareSales) / compareSales) * 100
                : 0;
            return (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p
                  className={`text-sm font-black ${
                    change >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {change >= 0 ? "+" : ""}
                  {change.toFixed(1)}% Change
                </p>
              </div>
            );
          })()}
        </div>
      )}

      {profitData.revenue > 0 && (
        <div className="mb-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-black tracking-widest uppercase mb-4">
            Profit Margin Analysis
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">
                Revenue
              </p>
              <p className="text-xl font-black">
                ₱{profitData.revenue.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">
                Cost
              </p>
              <p className="text-xl font-black text-gray-600">
                ₱{profitData.cost.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">
                Profit Margin
              </p>
              <p
                className={`text-xl font-black ${
                  profitData.margin >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {profitData.margin.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <MetricCard
          title="Total Sales"
          value={`₱${totalSales.toLocaleString()}`}
          icon={<DollarSign size={16} />}
        />
        <MetricCard
          title="Total Orders"
          value={totalOrders.toString()}
          icon={<ShoppingBag size={16} />}
        />
        <MetricCard
          title="Avg Order"
          value={`₱${avgOrderValue.toFixed(0)}`}
          icon={<TrendingUp size={16} />}
        />
        <MetricCard
          title="Total Tips"
          value={`₱${totalTips.toLocaleString()}`}
          icon={<DollarSign size={16} />}
        />
        <MetricCard
          title="Today Sales"
          value={`₱${todaySales.toLocaleString()}`}
          icon={<Clock size={16} />}
        />
        <MetricCard
          title="Today Orders"
          value={todayOrders.toString()}
          icon={<ShoppingBag size={16} />}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <MetricCard
          title="Active Employees"
          value={activeEmployees.toString()}
          icon={<Users size={16} />}
        />
        <MetricCard
          title="Low Stock Items"
          value={lowStockItems.toString()}
          icon={<AlertCircle size={16} />}
          isWarning={lowStockItems > 0}
        />
        <MetricCard
          title="Active Orders"
          value={activeOrders.toString()}
          icon={<ChefHat size={16} />}
        />
      </div>

      {totalDiscounts > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <MetricCard
            title="Total Discounts Given"
            value={`₱${totalDiscounts.toLocaleString()}`}
            icon={<DollarSign size={16} />}
          />
          <MetricCard
            title="PWD Discounts"
            value={pwdDiscounts.toString()}
            icon={<Users size={16} />}
          />
          <MetricCard
            title="Senior Citizen Discounts"
            value={seniorDiscounts.toString()}
            icon={<Users size={16} />}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-black tracking-widest uppercase mb-6">
            Revenue Trend (7 Days)
          </h3>
          <div
            className="h-[250px] min-h-[250px] w-full"
            style={{ minWidth: 0, display: "block", position: "relative" }}
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
              minHeight={250}
              minWidth={0}
            >
              <AreaChart data={last7DaysData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f5f5f5"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#999", fontSize: 9, fontWeight: 900 }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
                    fontWeight: 900,
                    fontSize: "10px",
                  }}
                  formatter={(value: number) => [
                    `₱${value.toLocaleString()}`,
                    "Sales",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#000"
                  strokeWidth={3}
                  fill="#000"
                  fillOpacity={0.03}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-black tracking-widest uppercase mb-6">
            Order Types
          </h3>
          <div
            className="h-[250px] min-h-[250px] w-full"
            style={{ minWidth: 0, display: "block", position: "relative" }}
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
              minHeight={250}
              minWidth={0}
            >
              <PieChart>
                <Pie
                  data={orderTypesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {orderTypesData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        index === 0 ? "#000" : index === 1 ? "#666" : "#999"
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-black tracking-widest uppercase mb-6">
            Top Products
          </h3>
          <div className="space-y-3">
            {topProducts.length > 0 ? (
              topProducts.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-black text-xs">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-xs font-black text-black">
                        {product.name}
                      </div>
                      <div className="text-[9px] font-bold text-gray-500">
                        {product.quantity} sold
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-black text-black">
                    ₱{product.revenue.toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p className="text-[9px] font-black uppercase tracking-widest">
                  No Sales Data
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-black tracking-widest uppercase mb-6">
            Top Employees
          </h3>
          <div className="space-y-3">
            {topEmployees.length > 0 ? (
              topEmployees.map((emp, index) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs
                      ${
                        emp.status === "IN"
                          ? "bg-black text-white"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {emp.name[0]}
                    </div>
                    <div>
                      <div className="text-xs font-black text-black">
                        {emp.name}
                      </div>
                      <div className="text-[9px] font-bold text-gray-500">
                        {emp.role}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-black text-black">
                    ₱{emp.totalSales.toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p className="text-[9px] font-black uppercase tracking-widest">
                  No Sales Data
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-black rounded-lg">
              <Zap size={16} className="text-white" />
            </div>
            <h3 className="text-xs font-black tracking-widest uppercase">
              Quick Actions
            </h3>
          </div>
          <div className="space-y-2">
            {quickActions.map((action, index) => {
              const IconComponent = action.icon;
              return (
                <button
                  key={index}
                  onClick={() => {
                    if (action.path === "/dashboard") {
                      exportToCSV();
                    } else {
                      navigate(action.path);
                    }
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-black hover:text-white transition-all group text-left"
                >
                  <div className="flex items-center gap-3">
                    <IconComponent
                      size={14}
                      className="text-gray-400 group-hover:text-white"
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {action.label}
                    </span>
                  </div>
                  <ArrowRight
                    size={12}
                    className="text-gray-400 group-hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-black rounded-lg">
            <Target size={16} className="text-white" />
          </div>
          <h3 className="text-xs font-black tracking-widest uppercase">
            Business Insights
          </h3>
        </div>
        <div className="space-y-3">
          {actionableInsights.length > 0 ? (
            actionableInsights.map((insight, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border-2 ${
                  insight.type === "warning"
                    ? "bg-red-50 border-red-200"
                    : insight.type === "success"
                    ? "bg-green-50 border-green-200"
                    : insight.type === "action"
                    ? "bg-blue-50 border-blue-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  {insight.type === "warning" && (
                    <AlertCircle
                      size={16}
                      className="text-red-600 mt-0.5 flex-shrink-0"
                    />
                  )}
                  {insight.type === "success" && (
                    <TrendingUp
                      size={16}
                      className="text-green-600 mt-0.5 flex-shrink-0"
                    />
                  )}
                  {insight.type === "action" && (
                    <Zap
                      size={16}
                      className="text-blue-600 mt-0.5 flex-shrink-0"
                    />
                  )}
                  {insight.type === "info" && (
                    <Activity
                      size={16}
                      className="text-gray-600 mt-0.5 flex-shrink-0"
                    />
                  )}
                  <div className="flex-1">
                    <p
                      className={`text-xs font-black mb-1 ${
                        insight.type === "warning"
                          ? "text-red-700"
                          : insight.type === "success"
                          ? "text-green-700"
                          : insight.type === "action"
                          ? "text-blue-700"
                          : "text-gray-700"
                      }`}
                    >
                      {insight.title}
                    </p>
                    <p className="text-[10px] font-bold text-gray-600 leading-relaxed mb-2">
                      {insight.description}
                    </p>
                    {insight.action && (
                      <button
                        onClick={() => {
                          if (insight.action === "View Inventory")
                            navigate("/inventory");
                          else if (insight.action === "Open Drawer")
                            navigate("/cash");
                          else if (insight.action === "View CRM")
                            navigate("/crm");
                        }}
                        className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-black transition-colors"
                      >
                        {insight.action}
                        <ArrowRight size={10} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-400">
              <CheckCircle size={32} className="mx-auto mb-3 opacity-50" />
              <p className="text-[9px] font-black uppercase tracking-widest">
                All Systems Operational
              </p>
              <p className="text-[10px] font-bold text-gray-500 mt-1">
                No alerts or recommendations at this time
              </p>
            </div>
          )}
        </div>
      </div>

      {paymentMethodsData.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-black tracking-widest uppercase mb-6">
            Payment Methods
          </h3>
          <div
            className="h-[200px] min-h-[200px] w-full"
            style={{ minWidth: 0, display: "block", position: "relative" }}
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
              minHeight={200}
              minWidth={0}
            >
              <BarChart data={paymentMethodsData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f5f5f5"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#999", fontSize: 9, fontWeight: 900 }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
                    fontWeight: 900,
                    fontSize: "10px",
                  }}
                  formatter={(value: number) => [
                    `₱${value.toLocaleString()}`,
                    "Amount",
                  ]}
                />
                <Bar dataKey="value" fill="#000" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
  isWarning?: boolean;
}> = ({ title, value, icon, isWarning }) => (
  <div
    className={`p-4 rounded-2xl border shadow-sm flex items-center justify-between group hover:border-black transition-all
    ${isWarning ? "bg-red-50 border-red-200" : "bg-white border-gray-100"}`}
  >
    <div>
      <p
        className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${
          isWarning ? "text-red-600" : "text-gray-400"
        }`}
      >
        {title}
      </p>
      <h4
        className={`text-lg font-black tracking-tighter ${
          isWarning ? "text-red-700" : "text-black"
        }`}
      >
        {value}
      </h4>
    </div>
    <div
      className={`p-2 rounded-lg transition-all ${
        isWarning
          ? "bg-red-100 text-red-600"
          : "bg-gray-50 group-hover:bg-black group-hover:text-white"
      }`}
    >
      {icon}
    </div>
  </div>
);

export default Dashboard;
