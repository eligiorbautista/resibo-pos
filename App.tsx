import React, { useState, useMemo } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  Role,
  Product,
  Transaction,
  Customer,
  Employee,
  SuspendedCart,
  Table,
  CashDrawer,
  OrderStatus,
  ShiftSchedule,
  WaitlistItem,
  TableReservation,
  OrderType,
  PaymentMethod,
  TimeRecord,
  BreakRecord,
  DiscountType,
} from "./types";
// Removed INITIAL_* imports - data now loaded from backend
import POSTerminal from "./components/features/POSTerminal";
import InventoryManager from "./components/features/InventoryManager";
import Dashboard from "./components/features/Dashboard";
import CustomerCRM from "./components/features/CustomerCRM";
import EmployeeTimeClock from "./components/features/EmployeeTimeClock";
import TableManagement from "./components/features/TableManagement";
import KitchenDisplaySystem from "./components/features/KitchenDisplaySystem";
import CashDrawerManager from "./components/features/CashDrawerManager";
import OrderHistory from "./components/features/OrderHistory";
import CustomerDisplay from "./components/features/CustomerDisplay";
import AuditLogViewer from "./components/features/AuditLogViewer";
import EMenu from "./components/features/EMenu";
import LoginScreen from "./components/layout/LoginScreen";
import Sidebar from "./components/layout/Sidebar";
import NotFound from "./components/common/NotFound";
import { useToast } from "./components/common/ToastProvider";
import {
  authApi,
  productsApi,
  customersApi,
  employeesApi,
  tablesApi,
  transactionsApi,
  cashDrawersApi,
} from "./services/apiService";
import { BRANDING, RESTAURANT_NAME } from "./constants";

// Main App Content Component (needs access to router hooks)
const AppContent: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [cashDrawers, setCashDrawers] = useState<CashDrawer[]>([]);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [suspendedCarts, setSuspendedCarts] = useState<SuspendedCart[]>([]);
  const [shiftSchedules, setShiftSchedules] = useState<ShiftSchedule[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistItem[]>([]);
  const [tableReservations, setTableReservations] = useState<
    TableReservation[]
  >([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [showLogin, setShowLogin] = useState(true);
  const [pin, setPin] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Store current route in localStorage whenever it changes (for route persistence on refresh)
  React.useEffect(() => {
    // Only store route if user is logged in (not on login screen)
    // Exclude special routes that shouldn't be persisted
    if (
      !showLogin &&
      currentUser &&
      location.pathname !== "/customer-display" &&
      location.pathname !== "/menu"
    ) {
      const routesToExclude = ["/", "/login", "/customer-display", "/menu"];
      if (!routesToExclude.includes(location.pathname)) {
        localStorage.setItem("lastRoute", location.pathname);
      }
    }
  }, [location.pathname, showLogin, currentUser]);

  // Check if user is already logged in on app start (skip for customer-display)
  React.useEffect(() => {
    // Capture the actual browser URL pathname (more reliable on refresh)
    const initialPath = window.location.pathname;

    // Skip auth check for public routes
    if (initialPath === "/customer-display" || initialPath === "/menu") {
      setIsCheckingAuth(false);
      return;
    }

    const checkAuth = async () => {
      try {
        // Check if token exists in localStorage
        const token = localStorage.getItem("authToken");
        if (!token) {
          setIsCheckingAuth(false);
          return;
        }

        // Verify token and get current user
        const response = await authApi.getCurrentUser();
        const employee = response.employee;

        // Map API response to Employee type
        const employeeData: Employee = {
          id: employee.id,
          name: employee.name,
          role: employee.role as Role,
          pin: "", // Don't store PIN
          status: employee.status as "IN" | "OUT",
          totalSales: (employee as any).totalSales || 0,
          timeRecords: [],
        };

        setCurrentUser(employeeData);
        setShowLogin(false);

        // Load data from backend after successful auth check
        await loadDataFromBackend(employeeData);

        // Restore route from localStorage only if on root or login page
        // Otherwise, preserve the current route (React Router handles it)
        const storedRoute = localStorage.getItem("lastRoute");
        const routesToExclude = ["/", "/login", "/customer-display", "/menu"];

        if (initialPath === "/" || initialPath === "/login") {
          // On root/login, restore from localStorage if available, otherwise use default
          if (storedRoute && !routesToExclude.includes(storedRoute)) {
            navigate(storedRoute, { replace: true });
          } else {
            // Use default route based on role
            if (employee.role === "MANAGER") {
              navigate("/dashboard", { replace: true });
            } else {
              navigate("/pos", { replace: true });
            }
          }
        }
        // If on any other valid route, preserve it (don't redirect - React Router handles it)
      } catch (error) {
        // Token is invalid or expired, clear it
        localStorage.removeItem("authToken");
        setShowLogin(true);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount to check auth, don't re-run on route changes

  const handleLogin = async (providedPin?: string) => {
    try {
      const targetPin = providedPin || pin;
      const response = await authApi.login(targetPin);

      // Map API response to Employee type
      const employeeData: Employee = {
        id: response.employee.id,
        name: response.employee.name,
        role: response.employee.role as Role,
        pin: "", // Don't store PIN for security
        status: response.employee.status as "IN" | "OUT",
        totalSales: 0,
        timeRecords: [],
      };

      setCurrentUser(employeeData);
      setShowLogin(false);
      setPin("");

      // Load data from backend after successful login
      await loadDataFromBackend(employeeData);

      // Show welcome toast
      const roleDisplay =
        response.employee.role.charAt(0) +
        response.employee.role.slice(1).toLowerCase();
      showToast(
        `Welcome, ${response.employee.name}! (${roleDisplay})`,
        "success"
      );

      if (response.employee.role === "MANAGER") {
        navigate("/dashboard");
      } else {
        navigate("/pos");
      }
    } catch (error: any) {
      showToast(error.message || "Invalid PIN. Try 0000 for Manager.", "error");
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Ignore errors on logout - still logout locally
    }
    setCurrentUser(null);
    setShowLogin(true);
    setIsSidebarCollapsed(false);
    // Clear stored route on logout
    localStorage.removeItem("lastRoute");
    navigate("/");
  };

  // Load data from backend
  // NOTE: We accept an optional user to avoid stale-closure issues right after setCurrentUser().
  // This fixes cases where POS tables/products don't load until visiting another page.
  const loadDataFromBackend = React.useCallback(
    async (userOverride?: Employee) => {
      const user = userOverride || currentUser;
      if (!user) return; // Don't load if not logged in

      setIsLoadingData(true);
      try {
        // Load all data in parallel
        const [
          productsData,
          customersData,
          employeesData,
          tablesData,
          transactionsData,
          cashDrawersData,
        ] = await Promise.all([
          productsApi.getAll(),
          customersApi.getAll(),
          employeesApi.getAll(),
          tablesApi.getAll(),
          transactionsApi.getAll(),
          cashDrawersApi.getAll(),
        ]);

        // Map products
        const mappedProducts: Product[] = productsData.map((prod: any) => ({
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

        // Map customers
        const mappedCustomers: Customer[] = customersData.map((cust: any) => ({
          id: cust.id,
          membershipCardNumber: cust.membershipCardNumber,
          name: cust.name,
          email: cust.email,
          phone: cust.phone,
          loyaltyPoints: cust.loyaltyPoints || 0,
          purchaseHistory: Array.isArray(cust.purchaseHistory)
            ? cust.purchaseHistory
            : [],
          joinedDate: new Date(cust.joinedDate),
          birthday: cust.birthday ? new Date(cust.birthday) : undefined,
          tags: Array.isArray(cust.tags)
            ? cust.tags
            : cust.tags
            ? JSON.parse(cust.tags)
            : [],
        }));

        // Map employees
        const mappedEmployees: Employee[] = employeesData.map((emp: any) => ({
          id: emp.id,
          name: emp.name,
          role: emp.role as Role,
          pin: "", // Don't store PIN
          status: emp.status as "IN" | "OUT",
          totalSales:
            typeof emp.totalSales === "number"
              ? emp.totalSales
              : parseFloat(emp.totalSales || 0),
          totalTips: emp.totalTips
            ? typeof emp.totalTips === "number"
              ? emp.totalTips
              : parseFloat(emp.totalTips)
            : undefined,
          hourlyRate: emp.hourlyRate
            ? typeof emp.hourlyRate === "number"
              ? emp.hourlyRate
              : parseFloat(emp.hourlyRate)
            : undefined,
          timeRecords: emp.timeRecords || [],
        }));

        // Map tables
        const mappedTables: Table[] = tablesData.map((table: any) => ({
          id: table.id,
          number: table.number,
          capacity: table.capacity,
          status: table.status as any,
          location: table.location || undefined,
          currentOrderId: table.currentOrderId || undefined,
          reservationName: table.reservationName || undefined,
        }));

        // Map transactions
        const mappedTransactions: Transaction[] = transactionsData.map(
          (txn: any) => ({
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
          })
        );

        // Map cash drawers
        const mappedCashDrawers: CashDrawer[] = cashDrawersData.map(
          (drawer: any) => ({
            id: drawer.id,
            employeeId: drawer.employeeId,
            openingAmount:
              typeof drawer.openingAmount === "number"
                ? drawer.openingAmount
                : parseFloat(drawer.openingAmount),
            closingAmount: drawer.closingAmount
              ? typeof drawer.closingAmount === "number"
                ? drawer.closingAmount
                : parseFloat(drawer.closingAmount)
              : undefined,
            expectedAmount: drawer.expectedAmount
              ? typeof drawer.expectedAmount === "number"
                ? drawer.expectedAmount
                : parseFloat(drawer.expectedAmount)
              : undefined,
            actualAmount: drawer.actualAmount
              ? typeof drawer.actualAmount === "number"
                ? drawer.actualAmount
                : parseFloat(drawer.actualAmount)
              : undefined,
            difference: drawer.difference
              ? typeof drawer.difference === "number"
                ? drawer.difference
                : parseFloat(drawer.difference)
              : undefined,
            openedAt: new Date(drawer.openedAt),
            closedAt: drawer.closedAt ? new Date(drawer.closedAt) : undefined,
            transactions: drawer.transactions || [],
            cashDrops: (drawer.cashDrops || []).map((drop: any) => ({
              ...drop,
              droppedAt: new Date(drop.droppedAt),
            })),
            cashPickups: (drawer.cashPickups || []).map((pickup: any) => ({
              ...pickup,
              pickedUpAt: new Date(pickup.pickedUpAt),
            })),
            shiftNotes: (drawer.shiftNotes || []).map((note: any) => ({
              ...note,
              createdAt: new Date(note.createdAt),
            })),
            denominationBreakdown: drawer.denominationBreakdown,
          })
        );

        setProducts(mappedProducts);
        setCustomers(mappedCustomers);
        setEmployees(mappedEmployees);
        setTables(mappedTables);
        setTransactions(mappedTransactions);
        setCashDrawers(mappedCashDrawers);
      } catch (error: any) {
        console.error("Error loading data from backend:", error);
        showToast("Failed to load data from server", "error");
        // Ensure transactions remain empty on error (no fallback to mock data)
        setTransactions([]);
      } finally {
        setIsLoadingData(false);
      }
    },
    [currentUser, showToast]
  );

  const addTransaction = async (transaction: Transaction) => {
    try {
      // Save transaction to backend
      const createdTransaction = (await transactionsApi.create({
        employeeId: transaction.employeeId,
        customerId: transaction.customerId,
        serverId: transaction.serverId,
        tableId: transaction.tableId,
        orderType: transaction.orderType,
        status: transaction.status,
        items: transaction.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          discount: item.discount,
          specialInstructions: item.specialInstructions,
          modifiers: item.modifiers || [],
        })),
        subtotal: transaction.subtotal,
        tax: transaction.tax,
        serviceCharge: transaction.serviceCharge,
        discountTotal: transaction.discountTotal,
        discountType: transaction.discountType,
        discountCardNumber: transaction.discountCardNumber,
        discountVerifiedBy: transaction.discountVerifiedBy,
        tip: transaction.tip,
        loyaltyPointsRedeemed: transaction.loyaltyPointsRedeemed,
        loyaltyPointsDiscount: transaction.loyaltyPointsDiscount,
        notes: transaction.notes,
        kitchenNotes: transaction.kitchenNotes,
        deliveryAddress: transaction.deliveryAddress,
        deliveryCustomerName: transaction.deliveryCustomerName,
        deliveryCustomerPhone: transaction.deliveryCustomerPhone,
        priority: transaction.priority,
        estimatedPrepTime: transaction.estimatedPrepTime,
        payments: transaction.payments,
      } as any)) as any;

      // Map backend response to Transaction type
      const mappedTransaction: Transaction = {
        id: createdTransaction.id,
        timestamp: new Date(createdTransaction.timestamp),
        items: createdTransaction.items || [],
        totalAmount:
          typeof createdTransaction.totalAmount === "number"
            ? createdTransaction.totalAmount
            : parseFloat(createdTransaction.totalAmount),
        subtotal:
          typeof createdTransaction.subtotal === "number"
            ? createdTransaction.subtotal
            : parseFloat(createdTransaction.subtotal),
        tax:
          typeof createdTransaction.tax === "number"
            ? createdTransaction.tax
            : parseFloat(createdTransaction.tax),
        serviceCharge:
          typeof createdTransaction.serviceCharge === "number"
            ? createdTransaction.serviceCharge
            : parseFloat(createdTransaction.serviceCharge),
        discountTotal:
          typeof createdTransaction.discountTotal === "number"
            ? createdTransaction.discountTotal
            : parseFloat(createdTransaction.discountTotal),
        discountType: createdTransaction.discountType as DiscountType,
        discountCardNumber: createdTransaction.discountCardNumber,
        discountVerifiedBy: createdTransaction.discountVerifiedBy,
        discountVerifiedAt: createdTransaction.discountVerifiedAt
          ? new Date(createdTransaction.discountVerifiedAt)
          : undefined,
        tip:
          typeof createdTransaction.tip === "number"
            ? createdTransaction.tip
            : parseFloat(createdTransaction.tip),
        payments: createdTransaction.payments || [],
        customerId: createdTransaction.customerId,
        employeeId: createdTransaction.employeeId,
        serverId: createdTransaction.serverId,
        tableId: createdTransaction.tableId,
        orderType: createdTransaction.orderType as OrderType,
        status: createdTransaction.status as OrderStatus,
        loyaltyPointsRedeemed: createdTransaction.loyaltyPointsRedeemed,
        loyaltyPointsDiscount: createdTransaction.loyaltyPointsDiscount
          ? typeof createdTransaction.loyaltyPointsDiscount === "number"
            ? createdTransaction.loyaltyPointsDiscount
            : parseFloat(createdTransaction.loyaltyPointsDiscount)
          : undefined,
        notes: createdTransaction.notes,
        kitchenNotes: createdTransaction.kitchenNotes,
        deliveryAddress: createdTransaction.deliveryAddress,
        deliveryCustomerName: createdTransaction.deliveryCustomerName,
        deliveryCustomerPhone: createdTransaction.deliveryCustomerPhone,
        priority: createdTransaction.priority,
        estimatedPrepTime: createdTransaction.estimatedPrepTime,
      };

      // Update local state
      setTransactions((prev) => [...prev, mappedTransaction]);

      // Add transaction to active cash drawer if payment includes cash
      const hasCashPayment = transaction.payments.some(
        (p) => p.method === "CASH"
      );
      if (hasCashPayment) {
        try {
          const activeDrawer = await cashDrawersApi.getActive();
          if (activeDrawer) {
            await cashDrawersApi.addTransaction(
              activeDrawer.id,
              mappedTransaction.id
            );
            // Reload cash drawers to reflect the new transaction
            const updatedCashDrawers = await cashDrawersApi.getAll();
            const mappedCashDrawers: CashDrawer[] = updatedCashDrawers.map(
              (drawer: any) => ({
                id: drawer.id,
                employeeId: drawer.employeeId,
                openingAmount:
                  typeof drawer.openingAmount === "number"
                    ? drawer.openingAmount
                    : parseFloat(drawer.openingAmount),
                closingAmount: drawer.closingAmount
                  ? typeof drawer.closingAmount === "number"
                    ? drawer.closingAmount
                    : parseFloat(drawer.closingAmount)
                  : undefined,
                expectedAmount: drawer.expectedAmount
                  ? typeof drawer.expectedAmount === "number"
                    ? drawer.expectedAmount
                    : parseFloat(drawer.expectedAmount)
                  : undefined,
                actualAmount: drawer.actualAmount
                  ? typeof drawer.actualAmount === "number"
                    ? drawer.actualAmount
                    : parseFloat(drawer.actualAmount)
                  : undefined,
                difference: drawer.difference
                  ? typeof drawer.difference === "number"
                    ? drawer.difference
                    : parseFloat(drawer.difference)
                  : undefined,
                openedAt: new Date(drawer.openedAt),
                closedAt: drawer.closedAt
                  ? new Date(drawer.closedAt)
                  : undefined,
                transactions: drawer.transactions || [],
                cashDrops: (drawer.cashDrops || []).map((drop: any) => ({
                  ...drop,
                  droppedAt: new Date(drop.droppedAt),
                })),
                cashPickups: (drawer.cashPickups || []).map((pickup: any) => ({
                  ...pickup,
                  pickedUpAt: new Date(pickup.pickedUpAt),
                })),
                shiftNotes: (drawer.shiftNotes || []).map((note: any) => ({
                  ...note,
                  createdAt: new Date(note.createdAt),
                })),
                denominationBreakdown: drawer.denominationBreakdown,
              })
            );
            setCashDrawers(mappedCashDrawers);
          }
        } catch (error) {
          console.error("Error adding transaction to cash drawer:", error);
          // Don't fail the transaction if cash drawer update fails
        }
      }

      // Reload products to get updated stock
      const updatedProducts = await productsApi.getAll();
      const mappedProducts: Product[] = updatedProducts.map((prod: any) => ({
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

      // Reload employees to get updated sales/tips
      const updatedEmployees = await employeesApi.getAll();
      const mappedEmployees: Employee[] = updatedEmployees.map((emp: any) => ({
        id: emp.id,
        name: emp.name,
        role: emp.role as Role,
        pin: "",
        status: emp.status as "IN" | "OUT",
        totalSales:
          typeof emp.totalSales === "number"
            ? emp.totalSales
            : parseFloat(emp.totalSales || 0),
        totalTips: emp.totalTips
          ? typeof emp.totalTips === "number"
            ? emp.totalTips
            : parseFloat(emp.totalTips)
          : undefined,
        hourlyRate: emp.hourlyRate
          ? typeof emp.hourlyRate === "number"
            ? emp.hourlyRate
            : parseFloat(emp.hourlyRate)
          : undefined,
        timeRecords: emp.timeRecords || [],
      }));
      setEmployees(mappedEmployees);

      // Reload customers to get updated loyalty points
      if (transaction.customerId) {
        const updatedCustomers = await customersApi.getAll();
        const mappedCustomers: Customer[] = updatedCustomers.map(
          (cust: any) => ({
            id: cust.id,
            membershipCardNumber: cust.membershipCardNumber,
            name: cust.name,
            email: cust.email,
            phone: cust.phone,
            loyaltyPoints: cust.loyaltyPoints || 0,
            purchaseHistory: Array.isArray(cust.purchaseHistory)
              ? cust.purchaseHistory
              : [],
            joinedDate: new Date(cust.joinedDate),
            birthday: cust.birthday ? new Date(cust.birthday) : undefined,
            tags: Array.isArray(cust.tags)
              ? cust.tags
              : cust.tags
              ? JSON.parse(cust.tags)
              : [],
          })
        );
        setCustomers(mappedCustomers);
      }

      // Reload tables to get updated status
      const updatedTables = await tablesApi.getAll();
      const mappedTables: Table[] = updatedTables.map((table: any) => ({
        id: table.id,
        number: table.number,
        capacity: table.capacity,
        status: table.status as any,
        location: table.location || undefined,
        currentOrderId: table.currentOrderId || undefined,
        reservationName: table.reservationName || undefined,
      }));
      setTables(mappedTables);

      // Add to active cash drawer if cash payment
      if (transaction.payments.some((p) => p.method === "CASH")) {
        const activeDrawer = cashDrawers.find((d) => !d.closedAt);
        if (activeDrawer) {
          setCashDrawers((prev) =>
            prev.map((d) =>
              d.id === activeDrawer.id
                ? {
                    ...d,
                    transactions: [...d.transactions, mappedTransaction.id],
                  }
                : d
            )
          );
        }
      }

      // Show success notification
      const totalAmount = mappedTransaction.totalAmount.toLocaleString(
        "en-PH",
        {
          style: "currency",
          currency: "PHP",
        }
      );
      showToast(
        `Order completed successfully! Total: ${totalAmount}`,
        "success"
      );
    } catch (error: any) {
      console.error("Error saving transaction:", error);
      showToast(error.message || "Failed to save transaction", "error");
      throw error; // Re-throw to prevent UI from updating if save failed
    }
  };

  const handleUpdateOrderStatus = async (
    transactionId: string,
    status: OrderStatus
  ) => {
    try {
      await transactionsApi.update(transactionId, { status });

      // Update local state
      setTransactions((prev) =>
        prev.map((t) => (t.id === transactionId ? { ...t, status } : t))
      );

      // If order is completed or voided, free up the table
      if (status === OrderStatus.COMPLETED || status === OrderStatus.VOIDED) {
        const transaction = transactions.find((t) => t.id === transactionId);
        if (transaction?.tableId) {
          // Reload tables from backend
          const updatedTables = await tablesApi.getAll();
          const mappedTables: Table[] = updatedTables.map((table: any) => ({
            id: table.id,
            number: table.number,
            capacity: table.capacity,
            status: table.status as any,
            location: table.location || undefined,
            currentOrderId: table.currentOrderId || undefined,
            reservationName: table.reservationName || undefined,
          }));
          setTables(mappedTables);
        }
      }
    } catch (error: any) {
      console.error("Error updating order status:", error);
      showToast(error.message || "Failed to update order status", "error");
    }
  };

  const handleUpdateTransactionNote = async (
    transactionId: string,
    note: string
  ) => {
    try {
      await transactionsApi.update(transactionId, { notes: note });
      setTransactions((prev) =>
        prev.map((t) => (t.id === transactionId ? { ...t, notes: note } : t))
      );
    } catch (error: any) {
      console.error("Error updating transaction note:", error);
      showToast(error.message || "Failed to update note", "error");
    }
  };

  const handleUpdateKitchenNotes = async (
    transactionId: string,
    kitchenNotes: string
  ) => {
    try {
      const updatedTransaction = (await transactionsApi.update(transactionId, {
        kitchenNotes,
      } as any)) as any;
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === transactionId
            ? {
                ...t,
                kitchenNotes: updatedTransaction.kitchenNotes || kitchenNotes,
              }
            : t
        )
      );
      showToast("Kitchen note saved successfully", "success");
    } catch (error: any) {
      console.error("Error updating kitchen notes:", error);
      showToast(error.message || "Failed to update kitchen notes", "error");
    }
  };

  const handleUpdatePriority = async (
    transactionId: string,
    priority: "LOW" | "NORMAL" | "HIGH" | "URGENT"
  ) => {
    try {
      await transactionsApi.update(transactionId, { priority } as any);
      setTransactions((prev) =>
        prev.map((t) => (t.id === transactionId ? { ...t, priority } : t))
      );
    } catch (error: any) {
      console.error("Error updating priority:", error);
      showToast(error.message || "Failed to update priority", "error");
    }
  };

  const handleUpdatePrepTime = async (
    transactionId: string,
    estimatedPrepTime: number
  ) => {
    try {
      await transactionsApi.update(transactionId, { estimatedPrepTime } as any);
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === transactionId ? { ...t, estimatedPrepTime } : t
        )
      );
    } catch (error: any) {
      console.error("Error updating prep time:", error);
      showToast(error.message || "Failed to update prep time", "error");
    }
  };

  const handleVoidTransaction = (transactionId: string, note?: string) => {
    const transaction = transactions.find((t) => t.id === transactionId);
    if (!transaction || transaction.status === OrderStatus.VOIDED) return;

    // Check status BEFORE updating to VOIDED
    const wasPending = transaction.status === OrderStatus.PENDING;

    setTransactions((prev) =>
      prev.map((t) =>
        t.id === transactionId
          ? { ...t, status: OrderStatus.VOIDED, notes: note || t.notes }
          : t
      )
    );

    // Restore stock only if voided before preparation (PENDING status)
    // If already PREPARING, READY, SERVED, or COMPLETED, don't restore stock
    // because the food was already prepared/cooked and inventory was consumed
    if (wasPending) {
      setProducts((prevProducts) =>
        prevProducts.map((p) => {
          const soldItems = transaction.items.filter(
            (i) => i.productId === p.id
          );
          if (soldItems.length === 0) return p;
          const totalReturned = soldItems.reduce(
            (sum, item) => sum + item.quantity,
            0
          );
          return { ...p, totalStock: p.totalStock + totalReturned };
        })
      );
    }

    // Deduct from employee sales
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === transaction.employeeId
          ? {
              ...e,
              totalSales: Math.max(0, e.totalSales - transaction.totalAmount),
            }
          : e
      )
    );

    // Deduct loyalty points
    if (transaction.customerId) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === transaction.customerId
            ? {
                ...c,
                loyaltyPoints: Math.max(
                  0,
                  c.loyaltyPoints - Math.floor(transaction.totalAmount / 10)
                ),
              }
            : c
        )
      );
    }
  };

  const lowStockCount = useMemo(
    () => products.filter((p) => p.totalStock < p.reorderPoint).length,
    [products]
  );

  const handleNavigateToPOS = () => {
    const hasActiveDrawer = cashDrawers.some((d) => !d.closedAt);
    if (!hasActiveDrawer) {
      showToast(
        "Please open a cash drawer first before accessing the POS terminal.",
        "warning"
      );
      navigate("/cash");
    } else {
      navigate("/pos");
    }
  };

  // Data is now loaded from backend via loadDataFromBackend() after login

  // Render public routes standalone (no auth, no layout) - check FIRST before anything else
  if (location.pathname === "/customer-display") {
    return <CustomerDisplay />;
  }

  // Render E-Menu standalone (no auth, no layout) - public access for customers
  if (location.pathname === "/menu") {
    return <EMenu products={products} />;
  }

  // Redirect to home if showing login screen and not on root path (exclude public routes)
  React.useEffect(() => {
    if (
      showLogin &&
      location.pathname !== "/" &&
      location.pathname !== "/customer-display" &&
      location.pathname !== "/menu"
    ) {
      navigate("/", { replace: true });
    }
  }, [showLogin, location.pathname, navigate]);

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (showLogin) {
    return (
      <LoginScreen
        pin={pin}
        setPin={setPin}
        onLogin={handleLogin}
        branchName={RESTAURANT_NAME}
      />
    );
  }

  // Protected route wrapper
  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar
        currentUser={currentUser}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        onLogout={handleLogout}
        cashDrawers={cashDrawers}
        lowStockCount={lowStockCount}
        branchName={RESTAURANT_NAME}
        onNavigateToPOS={handleNavigateToPOS}
      />

      <main className="flex-1 flex flex-col relative overflow-hidden transition-all duration-300">
        <Routes>
          <Route path="/" element={<Navigate to="/pos" replace />} />
          <Route
            path="/pos"
            element={
              <POSTerminal
                products={products}
                setProducts={setProducts}
                customers={customers}
                onCompleteSale={addTransaction}
                suspendedCarts={suspendedCarts}
                setSuspendedCarts={setSuspendedCarts}
                currentUser={currentUser}
                transactions={transactions}
                employees={employees}
                tables={tables}
                setTables={setTables}
                cashDrawers={cashDrawers}
                onVoidTransaction={handleVoidTransaction}
                onUpdateTransactionNote={handleUpdateTransactionNote}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                onRefundTransaction={(refund) => {
                  const transaction = transactions.find(
                    (t) => t.id === refund.transactionId
                  );
                  if (!transaction) {
                    showToast("Transaction not found", "error");
                    return;
                  }

                  const refundAmount = Math.round(
                    Object.entries(refund.items).reduce((sum, [idx, qty]) => {
                      const item = transaction.items[parseInt(idx)];
                      return sum + (item ? item.price * (qty as number) : 0);
                    }, 0)
                  );

                  const refundTransaction: Transaction = {
                    ...transaction,
                    id: "REFUND-" + Date.now(),
                    timestamp: new Date(),
                    totalAmount: -refundAmount,
                    items: Object.entries(refund.items)
                      .filter(([_, qty]) => (qty as number) > 0)
                      .map(([idx, qty]) => {
                        const originalItem = transaction.items[parseInt(idx)];
                        return originalItem
                          ? { ...originalItem, quantity: qty as number }
                          : null;
                      })
                      .filter(Boolean) as typeof transaction.items,
                    notes: `Refund: ${refund.reason}`,
                    status: OrderStatus.COMPLETED,
                  };

                  setTransactions((prev) => [...prev, refundTransaction]);

                  // Note: Stock is NOT restored for refunds because:
                  // - Food items were already prepared/cooked and cannot be reused
                  // - Physical inventory was already consumed
                  // - Restoring stock would create incorrect inventory counts

                  showToast(
                    `Refund of ₱${refundAmount.toLocaleString()} processed`,
                    "success"
                  );
                }}
                onModifyTransaction={(transactionId, modifiedItems) => {
                  setTransactions((prev) =>
                    prev.map((t) => {
                      if (t.id !== transactionId) return t;

                      // Recalculate subtotal from modified items
                      const newSubtotal = Math.round(
                        modifiedItems.reduce((sum, i) => {
                          const itemTotal = i.price * i.quantity;
                          const modifiersTotal =
                            (i.modifiers || []).reduce(
                              (mSum, m) => mSum + m.price,
                              0
                            ) * i.quantity;
                          return sum + itemTotal + modifiersTotal - i.discount;
                        }, 0)
                      );

                      // Recalculate discount
                      const newDiscountAmount =
                        t.discountType && t.discountType !== DiscountType.NONE
                          ? Math.round(newSubtotal * 0.2) // 20% for PWD/Senior
                          : 0;

                      const newSubtotalAfterDiscount = Math.round(
                        newSubtotal - newDiscountAmount
                      );

                      // Recalculate tax (VAT-exempt for PWD/Senior)
                      const newTax =
                        t.discountType === DiscountType.PWD ||
                        t.discountType === DiscountType.SENIOR_CITIZEN
                          ? 0
                          : Math.round(newSubtotalAfterDiscount * 0.12);

                      // Recalculate service charge (waived for PWD/Senior, only for dine-in)
                      const newServiceCharge =
                        t.discountType === DiscountType.PWD ||
                        t.discountType === DiscountType.SENIOR_CITIZEN
                          ? 0
                          : t.orderType === OrderType.DINE_IN
                          ? Math.round(newSubtotalAfterDiscount * 0.1)
                          : 0;

                      // Recalculate total
                      const newTotal = Math.round(
                        newSubtotalAfterDiscount +
                          newTax +
                          newServiceCharge +
                          t.tip -
                          (t.loyaltyPointsDiscount || 0)
                      );

                      return {
                        ...t,
                        items: modifiedItems,
                        subtotal: newSubtotal,
                        discountTotal: newDiscountAmount,
                        tax: newTax,
                        serviceCharge: newServiceCharge,
                        totalAmount: newTotal,
                      };
                    })
                  );
                }}
              />
            }
          />
          <Route
            path="/inventory"
            element={
              <InventoryManager
                products={products}
                setProducts={setProducts}
                currentUser={currentUser}
                employees={employees}
              />
            }
          />
          <Route
            path="/dashboard"
            element={
              <Dashboard
                transactions={transactions}
                products={products}
                employees={employees}
                tables={tables}
                cashDrawers={cashDrawers}
                customers={customers}
                onRefresh={loadDataFromBackend}
                isLoading={isLoadingData}
              />
            }
          />
          <Route
            path="/crm"
            element={
              <CustomerCRM
                customers={customers}
                setCustomers={setCustomers}
                transactions={transactions}
                currentUser={currentUser}
              />
            }
          />
          <Route
            path="/employees"
            element={
              <EmployeeTimeClock
                employees={employees}
                setEmployees={setEmployees}
                currentUser={currentUser}
                shiftSchedules={shiftSchedules}
                setShiftSchedules={setShiftSchedules}
              />
            }
          />
          <Route
            path="/tables"
            element={
              <TableManagement
                tables={tables}
                setTables={setTables}
                transactions={transactions}
              />
            }
          />
          <Route
            path="/kitchen"
            element={
              <KitchenDisplaySystem
                transactions={transactions}
                tables={tables}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                onUpdateKitchenNotes={handleUpdateKitchenNotes}
                onUpdatePriority={handleUpdatePriority}
                onUpdatePrepTime={handleUpdatePrepTime}
              />
            }
          />
          <Route
            path="/cash"
            element={
              <CashDrawerManager
                cashDrawers={cashDrawers}
                setCashDrawers={setCashDrawers}
                employees={employees}
                transactions={transactions}
                currentUser={currentUser}
              />
            }
          />
          {currentUser?.role === Role.MANAGER && (
            <Route
              path="/audit-logs"
              element={<AuditLogViewer currentUser={currentUser} />}
            />
          )}
          <Route
            path="/history"
            element={
              <OrderHistory
                transactions={transactions}
                employees={employees}
                tables={tables}
                customers={customers}
                currentUser={currentUser}
                onUpdateTransactionNote={handleUpdateTransactionNote}
                onVoidTransaction={handleVoidTransaction}
                onRefundTransaction={(refund) => {
                  const transaction = transactions.find(
                    (t) => t.id === refund.transactionId
                  );
                  if (!transaction) {
                    showToast("Transaction not found", "error");
                    return;
                  }

                  const refundAmount = Math.round(
                    Object.entries(refund.items).reduce((sum, [idx, qty]) => {
                      const item = transaction.items[parseInt(idx)];
                      return sum + (item ? item.price * (qty as number) : 0);
                    }, 0)
                  );

                  const refundTransaction: Transaction = {
                    ...transaction,
                    id: "REFUND-" + Date.now(),
                    timestamp: new Date(),
                    totalAmount: -refundAmount,
                    items: Object.entries(refund.items)
                      .filter(([_, qty]) => (qty as number) > 0)
                      .map(([idx, qty]) => {
                        const originalItem = transaction.items[parseInt(idx)];
                        return originalItem
                          ? { ...originalItem, quantity: qty as number }
                          : null;
                      })
                      .filter(Boolean) as typeof transaction.items,
                    notes: `Refund: ${refund.reason}`,
                    status: OrderStatus.COMPLETED,
                  };

                  setTransactions((prev) => [...prev, refundTransaction]);
                  showToast(
                    `Refund of ₱${refundAmount.toLocaleString()} processed`,
                    "success"
                  );
                }}
                onModifyTransaction={(transactionId, modifiedItems) => {
                  setTransactions((prev) =>
                    prev.map((t) => {
                      if (t.id !== transactionId) return t;

                      const newSubtotal = Math.round(
                        modifiedItems.reduce((sum, i) => {
                          const itemTotal = i.price * i.quantity;
                          const modifiersTotal =
                            (i.modifiers || []).reduce(
                              (mSum, m) => mSum + m.price,
                              0
                            ) * i.quantity;
                          return sum + itemTotal + modifiersTotal - i.discount;
                        }, 0)
                      );

                      const newDiscountAmount =
                        t.discountType && t.discountType !== DiscountType.NONE
                          ? Math.round(newSubtotal * 0.2)
                          : 0;

                      const newSubtotalAfterDiscount = Math.round(
                        newSubtotal - newDiscountAmount
                      );

                      const newTax =
                        t.discountType === DiscountType.PWD ||
                        t.discountType === DiscountType.SENIOR_CITIZEN
                          ? 0
                          : Math.round(newSubtotalAfterDiscount * 0.12);

                      const newServiceCharge =
                        t.discountType === DiscountType.PWD ||
                        t.discountType === DiscountType.SENIOR_CITIZEN
                          ? 0
                          : t.orderType === OrderType.DINE_IN
                          ? Math.round(newSubtotalAfterDiscount * 0.1)
                          : 0;

                      const newTotal = Math.round(
                        newSubtotalAfterDiscount +
                          newTax +
                          newServiceCharge +
                          t.tip -
                          (t.loyaltyPointsDiscount || 0)
                      );

                      return {
                        ...t,
                        items: modifiedItems,
                        subtotal: newSubtotal,
                        discountTotal: newDiscountAmount,
                        tax: newTax,
                        serviceCharge: newServiceCharge,
                        totalAmount: newTotal,
                      };
                    })
                  );
                }}
                onUpdateOrderStatus={handleUpdateOrderStatus}
              />
            }
          />
          <Route
            path="*"
            element={<NotFound onNavigateHome={() => navigate("/dashboard")} />}
          />
        </Routes>
      </main>
    </div>
  );
};

// Main App Component with Router
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
