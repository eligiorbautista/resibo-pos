import React, { useState, useEffect, useMemo } from "react";
import {
  UserPlus,
  Mail,
  Phone,
  Star,
  Search,
  ChevronRight,
  Edit2,
  Trash2,
  MoreVertical,
  X,
  Save,
  CreditCard,
  Printer,
  Tag,
  StickyNote,
  Calendar,
  TrendingUp,
  Award,
  Gift,
} from "lucide-react";
import {
  Customer,
  Transaction,
  CustomerTag,
  CustomerNote,
  VerifiedDiscountID,
  DiscountType,
} from "../../types";
import { useToast } from "../common/ToastProvider";
import ConfirmationDialog from "../common/ConfirmationDialog";
import { BRANDING } from "../../constants";
import { formatTimestamp, formatRelativeTime } from "../../utils/dateUtils";

interface CRMProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  transactions: Transaction[];
  currentUser?: { id: string; role: string };
}

const CustomerCRM: React.FC<CRMProps> = ({
  customers,
  setCustomers,
  transactions,
  currentUser,
}) => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(
    null
  );
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [customerForCard, setCustomerForCard] = useState<Customer | null>(null);
  const [customerTags, setCustomerTags] = useState<CustomerTag[]>([]);
  const [customerNotes, setCustomerNotes] = useState<CustomerNote[]>([]);
  const [verifiedDiscountIDs, setVerifiedDiscountIDs] = useState<
    VerifiedDiscountID[]
  >([]);
  const [showLoyaltyRules, setShowLoyaltyRules] = useState(false);
  const [loyaltyRules, setLoyaltyRules] = useState({
    pointsPerPeso: 0.1,
    redemptionRate: 0.1,
  });
  const [showCustomerNoteModal, setShowCustomerNoteModal] = useState(false);
  const [noteCustomerId, setNoteCustomerId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [selectedCustomerForDetails, setSelectedCustomerForDetails] =
    useState<Customer | null>(null);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#000000");
  const [showDiscountVerificationModal, setShowDiscountVerificationModal] =
    useState(false);
  const [discountCardNumber, setDiscountCardNumber] = useState("");
  const [discountType, setDiscountType] = useState<"PWD" | "SENIOR_CITIZEN">(
    "PWD"
  );
  const [discountCustomerName, setDiscountCustomerName] = useState("");

  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    loyaltyPoints: 0,
    birthday: "",
    tags: [] as string[],
  });

  // Generate unique membership card number
  const generateMembershipCardNumber = (): string => {
    const prefix = "TUB";
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `${prefix}-${timestamp}-${random}`;
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.membershipCardNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside any action menu or action button
      const isClickInsideMenu =
        target.closest(".action-menu-container") ||
        target.closest(".action-menu-button");
      if (!isClickInsideMenu) {
        setActionMenuOpen(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddCustomer = () => {
    if (
      !newCustomer.name.trim() ||
      !newCustomer.email.trim() ||
      !newCustomer.phone.trim()
    ) {
      showToast("Please fill in all required fields", "warning");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newCustomer.email)) {
      showToast("Please enter a valid email address", "warning");
      return;
    }

    // Check for duplicate email
    if (
      customers.some(
        (c) => c.email.toLowerCase() === newCustomer.email.toLowerCase()
      )
    ) {
      showToast("A customer with this email already exists", "warning");
      return;
    }

    const membershipCardNumber = generateMembershipCardNumber();
    const customer: Customer = {
      id: "CUST-" + Date.now(),
      membershipCardNumber,
      name: newCustomer.name.trim(),
      email: newCustomer.email.trim(),
      phone: newCustomer.phone.trim(),
      loyaltyPoints: newCustomer.loyaltyPoints || 0,
      purchaseHistory: [],
      joinedDate: new Date(),
      birthday: newCustomer.birthday
        ? new Date(newCustomer.birthday)
        : undefined,
      tags: newCustomer.tags,
    };

    setCustomers((prev) => [...prev, customer]);
    showToast("Customer added successfully", "success");
    setNewCustomer({
      name: "",
      email: "",
      phone: "",
      loyaltyPoints: 0,
      birthday: "",
      tags: [],
    });
    setShowAddModal(false);

    // Show card print option after adding
    setCustomerForCard(customer);
    setShowCardModal(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setNewCustomer({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      loyaltyPoints: customer.loyaltyPoints,
      birthday: customer.birthday
        ? new Date(customer.birthday).toISOString().split("T")[0]
        : "",
      tags: customer.tags || [],
    });
    setShowEditModal(true);
    setActionMenuOpen(null);
  };

  const handleUpdateCustomer = () => {
    if (!editingCustomer) return;

    if (
      !newCustomer.name.trim() ||
      !newCustomer.email.trim() ||
      !newCustomer.phone.trim()
    ) {
      showToast("Please fill in all required fields", "warning");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newCustomer.email)) {
      showToast("Please enter a valid email address", "warning");
      return;
    }

    // Check for duplicate email (excluding current customer)
    if (
      customers.some(
        (c) =>
          c.id !== editingCustomer.id &&
          c.email.toLowerCase() === newCustomer.email.toLowerCase()
      )
    ) {
      showToast("A customer with this email already exists", "warning");
      return;
    }

    setCustomers((prev) =>
      prev.map((c) =>
        c.id === editingCustomer.id
          ? {
              ...c,
              name: newCustomer.name.trim(),
              email: newCustomer.email.trim(),
              phone: newCustomer.phone.trim(),
              loyaltyPoints: newCustomer.loyaltyPoints,
              birthday: newCustomer.birthday
                ? new Date(newCustomer.birthday)
                : undefined,
              tags: newCustomer.tags,
            }
          : c
      )
    );
    showToast("Customer updated successfully", "success");
    setShowEditModal(false);
    setEditingCustomer(null);
    setNewCustomer({
      name: "",
      email: "",
      phone: "",
      loyaltyPoints: 0,
      birthday: "",
      tags: [],
    });
  };

  const handleDeleteCustomer = (customer: Customer) => {
    // Check if customer has transactions
    const hasTransactions = transactions.some(
      (t) => t.customerId === customer.id
    );
    if (hasTransactions) {
      showToast("Cannot delete customer with transaction history", "warning");
      setActionMenuOpen(null);
      return;
    }

    setCustomerToDelete(customer);
    setShowDeleteConfirm(true);
    setActionMenuOpen(null);
  };

  const confirmDelete = () => {
    if (customerToDelete) {
      setCustomers((prev) => prev.filter((c) => c.id !== customerToDelete.id));
      showToast("Customer deleted successfully", "success");
      setShowDeleteConfirm(false);
      setCustomerToDelete(null);
    }
  };

  const handlePrintCard = (customer: Customer) => {
    setCustomerForCard(customer);
    setShowCardModal(true);
    setActionMenuOpen(null);
  };

  const printMembershipCard = async () => {
    if (!customerForCard) return;

    // Convert image to base64 for printing
    let logoDataUrl = "";
    try {
      const response = await fetch(BRANDING.LOGO_BLACK);
      const blob = await response.blob();
      const reader = new FileReader();

      await new Promise<void>((resolve, reject) => {
        reader.onloadend = () => {
          logoDataUrl = reader.result as string;
          resolve();
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      showToast("Failed to load logo image", "error");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("Please allow popups to print the membership card", "warning");
      return;
    }

    const joinDate = new Date(customerForCard.joinedDate).toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    );

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Membership Card - ${customerForCard.name}</title>
          <style>
            @media print {
              @page { 
                size: 3.375in 2.125in; 
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
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              margin: 0;
              padding: 0;
              width: 3.375in;
              height: 2.125in;
              display: flex;
              align-items: center;
              justify-content: center;
              background: white;
            }
            .card {
              width: 100%;
              height: 100%;
              border: 3px solid #000;
              border-radius: 16px;
              padding: 14px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              background: linear-gradient(135deg, #ffffff 0%, #f8f8f8 100%);
              position: relative;
              overflow: hidden;
              box-sizing: border-box;
            }
            .card::before {
              content: '';
              position: absolute;
              top: 0;
              right: 0;
              width: 80px;
              height: 80px;
              background: radial-gradient(circle, rgba(0,0,0,0.03) 0%, transparent 70%);
              border-radius: 50%;
            }
            .card::after {
              content: '';
              position: absolute;
              bottom: 0;
              left: 0;
              width: 60px;
              height: 60px;
              background: radial-gradient(circle, rgba(0,0,0,0.02) 0%, transparent 70%);
              border-radius: 50%;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #000;
              padding-bottom: 8px;
              margin-bottom: 10px;
              position: relative;
              z-index: 1;
              flex-shrink: 0;
            }
            .logo {
              height: 22px;
              max-width: 130px;
              object-fit: contain;
              filter: drop-shadow(0 1px 1px rgba(0,0,0,0.1));
              border: none !important;
              outline: none !important;
              box-shadow: none !important;
              -webkit-box-shadow: none !important;
            }
            .member-label {
              font-size: 7px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 2.5px;
              color: #666;
              background: #f0f0f0;
              padding: 4px 8px;
              border-radius: 4px;
            }
            .content {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
              position: relative;
              z-index: 1;
            }
            .member-name {
              font-size: 18px;
              font-weight: 900;
              margin-bottom: 6px;
              color: #000;
              line-height: 1.2;
              letter-spacing: -0.5px;
            }
            .card-number {
              font-size: 9px;
              font-weight: 700;
              letter-spacing: 1px;
              color: #333;
              font-family: 'Courier New', monospace;
              background: #f5f5f5;
              padding: 4px 6px;
              border-radius: 4px;
              border: none !important;
              display: block;
              margin-bottom: 6px;
              width: fit-content;
            }
            .contact-info {
              display: flex;
              flex-direction: column;
              gap: 3px;
              margin-top: 4px;
            }
            .contact-item {
              font-size: 7px;
              font-weight: 600;
              color: #555;
              display: flex;
              align-items: center;
              gap: 3px;
            }
            .contact-label {
              font-weight: 900;
              color: #333;
              min-width: 35px;
            }
            .footer {
              display: flex;
              flex-direction: column;
              gap: 4px;
              margin-top: 8px;
              padding-top: 8px;
              border-top: 2px solid #000;
              position: relative;
              z-index: 1;
              flex-shrink: 0;
            }
            .date {
              font-weight: 700;
              color: #666;
              background: #f0f0f0;
              padding: 3px 8px;
              border-radius: 4px;
              align-self: flex-end;
              font-size: 7px;
            }
            .policy {
              font-size: 6px;
              font-weight: 700;
              color: #000 !important;
              line-height: 1.2;
              text-align: center;
              padding: 3px 2px 0 2px;
              border-top: 1px solid #d0d0d0;
              margin-top: 3px;
              display: block !important;
              visibility: visible !important;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <img src="${logoDataUrl}" alt="${
      BRANDING.SYSTEM_NAME
    }" class="logo" />
              <div class="member-label">Member Card</div>
            </div>
            <div class="content">
              <div class="member-name">${customerForCard.name}</div>
              <div class="card-number">Card #: ${
                customerForCard.membershipCardNumber || "N/A"
              }</div>
              <div class="contact-info">
                <div class="contact-item">
                  <span class="contact-label">Email:</span>
                  <span>${customerForCard.email}</span>
                </div>
                <div class="contact-item">
                  <span class="contact-label">Phone:</span>
                  <span>${customerForCard.phone}</span>
                </div>
              </div>
            </div>
            <div class="footer">
              <div class="date">Member Since ${joinDate}</div>
              <div class="policy">This card is non-transferable and must be presented with valid ID. Terms and conditions apply.</div>
            </div>
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
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">
            CRM
          </p>
          <h1 className="text-3xl font-black tracking-tighter text-black uppercase">
            Customers
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLoyaltyRules(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
          >
            <Award size={14} /> Loyalty Rules
          </button>
          <button
            onClick={() => setShowDiscountVerificationModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
          >
            <CreditCard size={14} /> Verify Discount ID
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
          >
            <UserPlus size={14} /> New Record
          </button>
        </div>
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
              placeholder="Search by name, email, phone, or card number..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl text-xs font-bold focus:outline-none focus:border-black transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                  <UserPlus className="w-8 h-8 text-gray-400" />
                </div>
                <div className="text-center">
                  <p className="font-black text-gray-900 text-lg mb-2">
                    {customers.length === 0
                      ? "No Customers Yet"
                      : "No Customers Found"}
                  </p>
                  <p className="text-sm text-gray-500 mb-4 max-w-md">
                    {customers.length === 0
                      ? "Start building your customer base by adding your first customer"
                      : "Try adjusting your search terms or add a new customer"}
                  </p>
                  {customers.length === 0 && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="px-6 py-3 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors flex items-center gap-2 mx-auto"
                    >
                      <UserPlus size={16} />
                      Add First Customer
                    </button>
                  )}
                </div>
              </div>
            ) : (
              filtered.map((customer) => {
                const sales = transactions.filter(
                  (t) => t.customerId === customer.id
                );
                return (
                  <div
                    key={customer.id}
                    className="bg-white border border-gray-50 rounded-3xl p-5 hover:border-black transition-all group relative overflow-hidden flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center font-black text-sm group-hover:bg-black group-hover:text-white transition-all">
                        {customer.name[0]}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 px-3 py-1 bg-black text-white rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg shadow-black/10">
                          <Star size={8} fill="currentColor" />{" "}
                          {customer.loyaltyPoints}
                        </div>
                        <div className="relative action-menu-container">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuOpen(
                                actionMenuOpen === customer.id
                                  ? null
                                  : customer.id
                              );
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors action-menu-button"
                          >
                            <MoreVertical size={14} className="text-gray-400" />
                          </button>
                          {actionMenuOpen === customer.id && (
                            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-[140px] overflow-hidden action-menu-container">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrintCard(customer);
                                }}
                                className="w-full px-4 py-2.5 text-left text-xs font-black hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Printer size={14} />
                                Print Card
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditCustomer(customer);
                                }}
                                className="w-full px-4 py-2.5 text-left text-xs font-black hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Edit2 size={14} />
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCustomer(customer);
                                }}
                                className="w-full px-4 py-2.5 text-left text-xs font-black text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 size={14} />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <h3 className="text-base font-black tracking-tighter mb-2 truncate">
                      {customer.name}
                    </h3>
                    <div className="space-y-1.5 mb-4 flex-1">
                      <div className="flex items-center gap-2 text-gray-400 text-[9px] font-bold truncate">
                        <Mail size={12} /> {customer.email}
                      </div>
                      <div className="flex items-center gap-2 text-gray-400 text-[9px] font-bold">
                        <Phone size={12} /> {customer.phone}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 text-[8px] font-black uppercase tracking-widest mt-2 pt-2 border-t border-gray-100">
                        <CreditCard size={10} />
                        <span className="font-mono">
                          {customer.membershipCardNumber || "N/A"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-4 border-t border-gray-50">
                      <div>
                        <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-0.5">
                          Spend
                        </p>
                        <p className="text-sm font-black tracking-tighter">
                          ₱
                          {sales
                            .reduce((s, t) => s + t.totalAmount, 0)
                            .toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-0.5">
                          Visits
                        </p>
                        <p className="text-sm font-black tracking-tighter">
                          {sales.length}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCustomerForDetails(customer);
                        setShowCustomerDetails(true);
                      }}
                      className="w-full mt-4 py-2 bg-gray-50 text-black rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1 hover:bg-black hover:text-white transition-all"
                    >
                      Profile <ChevronRight size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">
                  New Customer
                </p>
                <h2 className="text-2xl font-black tracking-tighter text-black uppercase">
                  Add Customer
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewCustomer({
                    name: "",
                    email: "",
                    phone: "",
                    loyaltyPoints: 0,
                  });
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-4">
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, name: e.target.value })
                  }
                  placeholder="Customer name"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, email: e.target.value })
                  }
                  placeholder="customer@email.com"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, phone: e.target.value })
                  }
                  placeholder="+63 123 456 7890"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Initial Loyalty Points
                </label>
                <input
                  type="number"
                  value={newCustomer.loyaltyPoints}
                  onChange={(e) =>
                    setNewCustomer({
                      ...newCustomer,
                      loyaltyPoints: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                  min="0"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Birthday (Optional)
                </label>
                <input
                  type="date"
                  value={newCustomer.birthday}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, birthday: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:border-black"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewCustomer({
                      name: "",
                      email: "",
                      phone: "",
                      loyaltyPoints: 0,
                      birthday: "",
                      tags: [],
                    });
                  }}
                  className="flex-1 py-3 bg-gray-100 text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCustomer}
                  className="flex-1 py-3 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
                >
                  Add Customer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && editingCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">
                  Edit Customer
                </p>
                <h2 className="text-2xl font-black tracking-tighter text-black uppercase">
                  Update Customer
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingCustomer(null);
                  setNewCustomer({
                    name: "",
                    email: "",
                    phone: "",
                    loyaltyPoints: 0,
                  });
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-4">
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, name: e.target.value })
                  }
                  placeholder="Customer name"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, email: e.target.value })
                  }
                  placeholder="customer@email.com"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, phone: e.target.value })
                  }
                  placeholder="+63 123 456 7890"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Loyalty Points
                </label>
                <input
                  type="number"
                  value={newCustomer.loyaltyPoints}
                  onChange={(e) =>
                    setNewCustomer({
                      ...newCustomer,
                      loyaltyPoints: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                  min="0"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Birthday (Optional)
                </label>
                <input
                  type="date"
                  value={newCustomer.birthday}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, birthday: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:border-black"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingCustomer(null);
                    setNewCustomer({
                      name: "",
                      email: "",
                      phone: "",
                      loyaltyPoints: 0,
                      birthday: "",
                      tags: [],
                    });
                  }}
                  className="flex-1 py-3 bg-gray-100 text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateCustomer}
                  className="flex-1 py-3 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Save size={14} />
                    Update
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        title="Delete Customer"
        message={`Are you sure you want to delete ${customerToDelete?.name}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setCustomerToDelete(null);
        }}
      />

      {/* Customer Details Modal with Analytics */}
      {showCustomerDetails && selectedCustomerForDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tighter text-black uppercase">
                  {selectedCustomerForDetails.name}
                </h2>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                  Customer Profile & Analytics
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCustomerDetails(false);
                  setSelectedCustomerForDetails(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">
                    Total Spent
                  </p>
                  <p className="text-2xl font-black">
                    ₱
                    {transactions
                      .filter(
                        (t) => t.customerId === selectedCustomerForDetails.id
                      )
                      .reduce((sum, t) => sum + t.totalAmount, 0)
                      .toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">
                    Total Visits
                  </p>
                  <p className="text-2xl font-black">
                    {
                      transactions.filter(
                        (t) => t.customerId === selectedCustomerForDetails.id
                      ).length
                    }
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">
                    Loyalty Points
                  </p>
                  <p className="text-2xl font-black">
                    {selectedCustomerForDetails.loyaltyPoints}
                  </p>
                </div>
              </div>

              {selectedCustomerForDetails.birthday && (
                <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
                  <Calendar size={20} className="text-blue-600" />
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      Birthday
                    </p>
                    <p className="text-sm font-black">
                      {new Date(
                        selectedCustomerForDetails.birthday
                      ).toLocaleDateString()}
                    </p>
                    {(() => {
                      const today = new Date();
                      const birthday = new Date(
                        selectedCustomerForDetails.birthday!
                      );
                      birthday.setFullYear(today.getFullYear());
                      const daysUntil = Math.ceil(
                        (birthday.getTime() - today.getTime()) /
                          (1000 * 60 * 60 * 24)
                      );
                      if (daysUntil >= 0 && daysUntil <= 30) {
                        return (
                          <p className="text-xs text-blue-600 mt-1">
                            Birthday in {daysUntil} days!
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    Purchase History
                  </p>
                  <button
                    onClick={() => {
                      const csv = [
                        ["Date", "Transaction ID", "Items", "Total"].join(","),
                        ...transactions
                          .filter(
                            (t) =>
                              t.customerId === selectedCustomerForDetails.id
                          )
                          .map((t) =>
                            [
                              new Date(t.timestamp).toLocaleString(),
                              t.id,
                              t.items
                                .map((i) => `${i.quantity}x ${i.name}`)
                                .join("; "),
                              t.totalAmount.toFixed(2),
                            ].join(",")
                          ),
                      ].join("\n");
                      const blob = new Blob([csv], { type: "text/csv" });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `customer-${selectedCustomerForDetails.id}-history.csv`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                      showToast("Purchase history exported", "success");
                    }}
                    className="text-[8px] font-black text-gray-500 uppercase tracking-widest hover:text-black"
                  >
                    Export CSV
                  </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {transactions
                    .filter(
                      (t) => t.customerId === selectedCustomerForDetails.id
                    )
                    .slice(0, 10)
                    .map((t) => (
                      <div key={t.id} className="p-3 bg-gray-50 rounded-xl">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-black">{t.id}</span>
                          <span className="text-sm font-black">
                            ₱{t.totalAmount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <p className="text-[9px] text-gray-600">
                            {formatTimestamp(t.timestamp)}
                          </p>
                          <p className="text-[8px] text-gray-500">
                            {formatRelativeTime(t.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    Customer Notes
                  </p>
                  <button
                    onClick={() => {
                      setNoteCustomerId(selectedCustomerForDetails.id);
                      setShowCustomerNoteModal(true);
                    }}
                    className="text-[8px] font-black text-gray-500 uppercase tracking-widest hover:text-black flex items-center gap-1"
                  >
                    <StickyNote size={12} /> Add Note
                  </button>
                </div>
                <div className="space-y-2">
                  {customerNotes
                    .filter(
                      (n) => n.customerId === selectedCustomerForDetails.id
                    )
                    .map((note) => (
                      <div key={note.id} className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-xs font-bold">{note.note}</p>
                        <p className="text-[8px] text-gray-500 mt-1">
                          {new Date(note.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  {customerNotes.filter(
                    (n) => n.customerId === selectedCustomerForDetails.id
                  ).length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">
                      No notes yet
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Note Modal */}
      {showCustomerNoteModal && noteCustomerId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-black tracking-tighter mb-4">
              Add Customer Note
            </h3>
            <div className="space-y-4">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Enter note..."
                rows={4}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:border-black resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (!newNote.trim()) {
                      showToast("Please enter a note", "error");
                      return;
                    }
                    const note: CustomerNote = {
                      id: "NOTE-" + Date.now(),
                      customerId: noteCustomerId,
                      note: newNote.trim(),
                      createdBy: currentUser?.id || "SYSTEM",
                      createdAt: new Date(),
                    };
                    setCustomerNotes((prev) => [...prev, note]);
                    setNewNote("");
                    setShowCustomerNoteModal(false);
                    setNoteCustomerId(null);
                    showToast("Note added", "success");
                  }}
                  className="flex-1 py-4 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
                >
                  Add Note
                </button>
                <button
                  onClick={() => {
                    setShowCustomerNoteModal(false);
                    setNewNote("");
                    setNoteCustomerId(null);
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

      {/* Loyalty Rules Modal */}
      {showLoyaltyRules && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-black tracking-tighter mb-4">
              Loyalty Program Rules
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Points Earned Per Peso Spent
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={loyaltyRules.pointsPerPeso}
                  onChange={(e) =>
                    setLoyaltyRules({
                      ...loyaltyRules,
                      pointsPerPeso: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:border-black"
                />
                <p className="text-[8px] text-gray-400 mt-1">
                  Current: 1 point per ₱10 spent (0.1 points/₱)
                </p>
              </div>
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Redemption Rate (Peso per Point)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={loyaltyRules.redemptionRate}
                  onChange={(e) =>
                    setLoyaltyRules({
                      ...loyaltyRules,
                      redemptionRate: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:border-black"
                />
                <p className="text-[8px] text-gray-400 mt-1">
                  Current: ₱0.10 per point
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    showToast("Loyalty rules updated", "success");
                    setShowLoyaltyRules(false);
                  }}
                  className="flex-1 py-4 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
                >
                  Save Rules
                </button>
                <button
                  onClick={() => setShowLoyaltyRules(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discount ID Verification Modal */}
      {showDiscountVerificationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-black tracking-tighter mb-4">
              Verify Discount ID
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Discount Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDiscountType("PWD")}
                    className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                      discountType === "PWD"
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    PWD
                  </button>
                  <button
                    onClick={() => setDiscountType("SENIOR_CITIZEN")}
                    className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                      discountType === "SENIOR_CITIZEN"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    Senior Citizen
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  ID Card Number *
                </label>
                <input
                  type="text"
                  value={discountCardNumber}
                  onChange={(e) => setDiscountCardNumber(e.target.value)}
                  placeholder="Enter ID number..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Customer Name (Optional)
                </label>
                <input
                  type="text"
                  value={discountCustomerName}
                  onChange={(e) => setDiscountCustomerName(e.target.value)}
                  placeholder="Enter customer name..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:border-black"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (!discountCardNumber.trim()) {
                      showToast("Please enter ID card number", "error");
                      return;
                    }
                    const verifiedID: VerifiedDiscountID = {
                      id: "VID-" + Date.now(),
                      cardNumber: discountCardNumber.trim(),
                      discountType:
                        discountType === "PWD"
                          ? DiscountType.PWD
                          : DiscountType.SENIOR_CITIZEN,
                      verifiedAt: new Date(),
                      verifiedBy: currentUser?.id || "SYSTEM",
                      customerName: discountCustomerName.trim() || undefined,
                      usageCount: 0,
                    };
                    setVerifiedDiscountIDs((prev) => [...prev, verifiedID]);
                    setDiscountCardNumber("");
                    setDiscountCustomerName("");
                    setShowDiscountVerificationModal(false);
                    showToast("Discount ID verified and stored", "success");
                  }}
                  className="flex-1 py-4 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
                >
                  Verify & Store
                </button>
                <button
                  onClick={() => {
                    setShowDiscountVerificationModal(false);
                    setDiscountCardNumber("");
                    setDiscountCustomerName("");
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

      {/* Membership Card Modal */}
      {showCardModal && customerForCard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">
                  Membership Card
                </p>
                <h2 className="text-2xl font-black tracking-tighter text-black uppercase">
                  Print Card
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowCardModal(false);
                  setCustomerForCard(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-8">
              {/* Printable Card Preview */}
              <div className="mb-6 flex justify-center">
                <div
                  className="bg-gradient-to-br from-white to-gray-50 border-[3px] border-black rounded-2xl p-3.5 shadow-xl relative overflow-hidden flex flex-col"
                  style={{ width: "324px", height: "204px" }}
                >
                  {/* Decorative circles */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-black/5 rounded-full -mr-10 -mt-10"></div>
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-black/3 rounded-full -ml-8 -mb-8"></div>

                  <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-2.5 relative z-10 flex-shrink-0">
                    <img
                      src={BRANDING.LOGO_BLACK}
                      alt={BRANDING.LOGO_ALT_TEXT}
                      className="h-5 object-contain drop-shadow-sm border-0 outline-none shadow-none"
                      style={{
                        boxShadow: "none",
                        WebkitBoxShadow: "none",
                        border: "none",
                      }}
                    />
                    <div className="text-[7px] font-black uppercase tracking-widest text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      Member Card
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-center mb-2.5 relative z-10 min-h-0">
                    <div
                      className="text-lg font-black mb-1.5 leading-tight tracking-tight"
                      style={{ fontSize: "18px", marginBottom: "6px" }}
                    >
                      {customerForCard.name}
                    </div>
                    <div
                      className="text-[9px] font-bold tracking-wide text-gray-700 font-mono bg-gray-100 rounded border-0 block w-fit mb-1.5"
                      style={{ padding: "4px 6px", marginBottom: "6px" }}
                    >
                      Card #: {customerForCard.membershipCardNumber || "N/A"}
                    </div>
                    <div
                      className="flex flex-col mt-1"
                      style={{ gap: "3px", marginTop: "4px" }}
                    >
                      <div
                        className="text-[7px] font-semibold text-gray-600 flex items-center"
                        style={{ gap: "3px" }}
                      >
                        <span
                          className="font-black text-gray-800"
                          style={{ minWidth: "35px" }}
                        >
                          Email:
                        </span>
                        <span className="truncate">
                          {customerForCard.email}
                        </span>
                      </div>
                      <div
                        className="text-[7px] font-semibold text-gray-600 flex items-center"
                        style={{ gap: "3px" }}
                      >
                        <span
                          className="font-black text-gray-800"
                          style={{ minWidth: "35px" }}
                        >
                          Phone:
                        </span>
                        <span>{customerForCard.phone}</span>
                      </div>
                    </div>
                  </div>
                  <div
                    className="flex flex-col border-t-2 border-black relative z-10 flex-shrink-0"
                    style={{ gap: "4px", marginTop: "8px", paddingTop: "8px" }}
                  >
                    <div className="flex justify-end">
                      <div
                        className="font-bold text-gray-600 bg-gray-100 rounded text-[7px]"
                        style={{ padding: "3px 8px" }}
                      >
                        Member Since{" "}
                        {new Date(
                          customerForCard.joinedDate
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                    <div
                      className="text-[6px] font-bold text-black text-center leading-tight border-t border-gray-300"
                      style={{ padding: "3px 2px 0 2px", marginTop: "3px" }}
                    >
                      This card is non-transferable and must be presented with
                      valid ID. Terms and conditions apply.
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCardModal(false);
                    setCustomerForCard(null);
                  }}
                  className="flex-1 py-3 bg-gray-100 text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={printMembershipCard}
                  className="flex-1 py-3 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all flex items-center justify-center gap-2"
                >
                  <Printer size={14} />
                  Print Card
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerCRM;
