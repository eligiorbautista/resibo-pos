
import React, { useState, useEffect, useCallback } from 'react';
import { CashDrawer, Employee, Transaction, Role, CashDrop, CashPickup, ShiftNote } from '../../types';
import { DollarSign, Clock, AlertCircle, CheckCircle, XCircle, Calculator, History, TrendingDown, TrendingUp, StickyNote } from 'lucide-react';
import ShiftHistory from './ShiftHistory';
import { useToast } from '../common/ToastProvider';
import { formatTimestamp, formatRelativeTime } from '../../utils/dateUtils';
import { cashDrawersApi } from '../../services/apiService';

interface CashDrawerManagerProps {
  cashDrawers: CashDrawer[];
  setCashDrawers: React.Dispatch<React.SetStateAction<CashDrawer[]>>;
  employees: Employee[];
  transactions: Transaction[];
  currentUser: Employee;
}

const CashDrawerManager: React.FC<CashDrawerManagerProps> = ({
  cashDrawers,
  setCashDrawers,
  employees,
  transactions,
  currentUser
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [showOpenDrawer, setShowOpenDrawer] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');
  const [showCloseDrawer, setShowCloseDrawer] = useState(false);
  const [closingAmount, setClosingAmount] = useState('');
  const [cashDrops, setCashDrops] = useState<CashDrop[]>([]);
  const [cashPickups, setCashPickups] = useState<CashPickup[]>([]);
  const [shiftNotes, setShiftNotes] = useState<ShiftNote[]>([]);
  const [showCashDrop, setShowCashDrop] = useState(false);
  const [showCashPickup, setShowCashPickup] = useState(false);
  const [showShiftNote, setShowShiftNote] = useState(false);
  const [dropAmount, setDropAmount] = useState('');
  const [dropReason, setDropReason] = useState('');
  const [pickupAmount, setPickupAmount] = useState('');
  const [pickupReason, setPickupReason] = useState('');
  const [shiftNoteText, setShiftNoteText] = useState('');
  const [showDenominationModal, setShowDenominationModal] = useState(false);
  const [denominations, setDenominations] = useState<{ [key: string]: number }>({
    '1000': 0,
    '500': 0,
    '200': 0,
    '100': 0,
    '50': 0,
    '20': 0,
    '10': 0,
    '5': 0,
    '1': 0,
    '0.25': 0,
    '0.10': 0,
    '0.05': 0
  });
  const [isLoading, setIsLoading] = useState(false);

  const activeDrawer = cashDrawers.find(d => !d.closedAt);
  const employee = employees.find(e => e.id === currentUser.id);

  // Load cash drawers from backend
  const loadCashDrawers = useCallback(async () => {
    try {
      setIsLoading(true);
      const drawers = await cashDrawersApi.getAll();
      setCashDrawers(drawers);
      
      // Extract cash drops, pickups, and notes from active drawer
      const active = drawers.find(d => !d.closedAt);
      if (active) {
        setCashDrops((active as any).cashDrops || []);
        setCashPickups((active as any).cashPickups || []);
        setShiftNotes((active as any).shiftNotes || []);
      } else {
        setCashDrops([]);
        setCashPickups([]);
        setShiftNotes([]);
      }
    } catch (error: any) {
      console.error('Error loading cash drawers:', error);
      showToast('Failed to load cash drawers', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Load on mount
  useEffect(() => {
    loadCashDrawers();
  }, [loadCashDrawers]);

  const calculateExpectedAmount = () => {
    if (!activeDrawer) return 0;
    const cashTransactions = transactions
      .filter(t => 
        t.id && 
        activeDrawer.transactions.includes(t.id) &&
        t.payments.some(p => p.method === 'CASH')
      )
      .reduce((sum, t) => {
        const cashPayment = t.payments.find(p => p.method === 'CASH');
        return sum + (cashPayment?.amount || 0);
      }, 0);
    return activeDrawer.openingAmount + cashTransactions;
  };

  const handleOpenDrawer = async () => {
    if (!openingAmount || isNaN(parseFloat(openingAmount))) {
      showToast('Please enter a valid opening amount', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const newDrawer = await cashDrawersApi.open(parseFloat(openingAmount));
      await loadCashDrawers();
      setOpeningAmount('');
      setShowOpenDrawer(false);
      showToast('Cash drawer opened successfully', 'success');
    } catch (error: any) {
      console.error('Error opening cash drawer:', error);
      showToast(error.message || 'Failed to open cash drawer', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseDrawer = async () => {
    if (!activeDrawer || !closingAmount || isNaN(parseFloat(closingAmount))) {
      showToast('Please enter a valid closing amount', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const expected = calculateExpectedAmount();
      const actual = parseFloat(closingAmount);
      
      await cashDrawersApi.close(activeDrawer.id, {
        closingAmount: actual,
        expectedAmount: expected,
        denominationBreakdown: denominations
      });
      
      await loadCashDrawers();
      setClosingAmount('');
      setShowCloseDrawer(false);
      setShowDenominationModal(false);
      showToast('Cash drawer closed successfully', 'success');
    } catch (error: any) {
      console.error('Error closing cash drawer:', error);
      showToast(error.message || 'Failed to close cash drawer', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const addTransactionToDrawer = (transactionId: string) => {
    if (!activeDrawer) return;
    setCashDrawers(prev => prev.map(d => 
      d.id === activeDrawer.id
        ? { ...d, transactions: [...d.transactions, transactionId] }
        : d
    ));
  };

  const expectedAmount = calculateExpectedAmount();
  const isManager = currentUser.role === Role.MANAGER;

  const handleCashDrop = async () => {
    if (!activeDrawer || !dropAmount || !dropReason) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    const amount = parseFloat(dropAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }
    
    try {
      setIsLoading(true);
      await cashDrawersApi.addCashDrop(activeDrawer.id, amount, dropReason);
      await loadCashDrawers();
      setDropAmount('');
      setDropReason('');
      setShowCashDrop(false);
      showToast(`Cash drop of ₱${amount.toLocaleString()} recorded`, 'success');
    } catch (error: any) {
      console.error('Error recording cash drop:', error);
      showToast(error.message || 'Failed to record cash drop', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCashPickup = async () => {
    if (!activeDrawer || !pickupAmount || !pickupReason) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    const amount = parseFloat(pickupAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }
    
    try {
      setIsLoading(true);
      await cashDrawersApi.addCashPickup(activeDrawer.id, amount, pickupReason);
      await loadCashDrawers();
      setPickupAmount('');
      setPickupReason('');
      setShowCashPickup(false);
      showToast(`Cash pickup of ₱${amount.toLocaleString()} recorded`, 'success');
    } catch (error: any) {
      console.error('Error recording cash pickup:', error);
      showToast(error.message || 'Failed to record cash pickup', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddShiftNote = async () => {
    if (!activeDrawer || !shiftNoteText.trim()) {
      showToast('Please enter a note', 'error');
      return;
    }
    
    try {
      setIsLoading(true);
      await cashDrawersApi.addShiftNote(activeDrawer.id, shiftNoteText.trim());
      await loadCashDrawers();
      setShiftNoteText('');
      setShowShiftNote(false);
      showToast('Shift note added', 'success');
    } catch (error: any) {
      console.error('Error adding shift note:', error);
      showToast(error.message || 'Failed to add shift note', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Get drops, pickups, and notes from active drawer
  const drawerDrops = activeDrawer ? (activeDrawer as any).cashDrops || [] : [];
  const drawerPickups = activeDrawer ? (activeDrawer as any).cashPickups || [] : [];
  const drawerNotes = activeDrawer ? (activeDrawer as any).shiftNotes || [] : [];
  const netCashMovement = drawerDrops.reduce((sum, d) => sum + d.amount, 0) - drawerPickups.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="flex flex-col h-full p-6 bg-white overflow-hidden">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">Financial Control</p>
          <h1 className="text-3xl font-black tracking-tighter text-black uppercase">Cash Drawer</h1>
        </div>
        {!activeDrawer && activeTab === 'current' && (
          <button
            onClick={() => setShowOpenDrawer(true)}
            className="px-6 py-2.5 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
          >
            Open Drawer
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-100">
        <button
          onClick={() => setActiveTab('current')}
          className={`px-6 py-3 rounded-t-xl text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
            activeTab === 'current'
              ? 'border-black text-black bg-gray-50'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <DollarSign size={14} />
            Current Drawer
          </div>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 rounded-t-xl text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
            activeTab === 'history'
              ? 'border-black text-black bg-gray-50'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <History size={14} />
            Shift History
          </div>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'history' ? (
        <div className="flex-1 overflow-hidden -mx-6 -mb-6">
          <ShiftHistory cashDrawers={cashDrawers} employees={employees} transactions={transactions} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {activeDrawer ? (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Opening Amount</p>
                  <p className="text-2xl font-black tracking-tighter">₱{activeDrawer.openingAmount.toLocaleString()}</p>
                  <div className="flex flex-col gap-0.5 mt-1">
                    <p className="text-[8px] text-gray-400 font-bold">
                      {formatTimestamp(activeDrawer.openedAt)}
                    </p>
                    <p className="text-[7px] text-gray-500">{formatRelativeTime(activeDrawer.openedAt)}</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Expected Amount</p>
                  <p className="text-2xl font-black tracking-tighter">₱{expectedAmount.toLocaleString()}</p>
                  <p className="text-[8px] text-gray-400 font-bold mt-1">
                    {activeDrawer.transactions.length} transactions
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Cashier</p>
                  <p className="text-lg font-black tracking-tighter">{employee?.name || 'Unknown'}</p>
                  <p className="text-[8px] text-gray-400 font-bold mt-1">
                    Employee #{currentUser.id}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black uppercase tracking-widest">Shift Summary</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowCashDrop(true)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-1"
                    >
                      <TrendingDown size={12} /> Drop
                    </button>
                    <button
                      onClick={() => setShowCashPickup(true)}
                      className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-orange-700 transition-all flex items-center gap-1"
                    >
                      <TrendingUp size={12} /> Pickup
                    </button>
                    <button
                      onClick={() => setShowShiftNote(true)}
                      className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-gray-700 transition-all flex items-center gap-1"
                    >
                      <StickyNote size={12} /> Note
                    </button>
                    <button
                      onClick={() => setShowDenominationModal(true)}
                      className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-purple-700 transition-all flex items-center gap-1"
                    >
                      <Calculator size={12} /> Denomination
                    </button>
                    <button
                      onClick={() => setShowCloseDrawer(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-700 transition-all"
                    >
                      Close Drawer
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cash Sales</span>
                    <span className="text-sm font-black">₱{expectedAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Opening Cash</span>
                    <span className="text-sm font-black">₱{activeDrawer.openingAmount.toLocaleString()}</span>
                  </div>
                  {netCashMovement !== 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cash Movements</span>
                      <span className={`text-sm font-black ${netCashMovement > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {netCashMovement > 0 ? '+' : ''}₱{netCashMovement.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Expected Total</span>
                    <span className="text-lg font-black">₱{(expectedAmount + netCashMovement).toLocaleString()}</span>
                  </div>
                </div>

                {activeDrawer.denominationBreakdown && Object.values(activeDrawer.denominationBreakdown).some(v => v > 0) && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-4">
                    <h3 className="text-sm font-black uppercase tracking-widest mb-4">Denomination Breakdown</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(activeDrawer.denominationBreakdown)
                        .filter(([_, count]) => count > 0)
                        .map(([denom, count]) => (
                          <div key={denom} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                            <span className="text-xs font-black">₱{denom}</span>
                            <span className="text-xs font-black text-gray-600">x{count}</span>
                          </div>
                        ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total</span>
                        <span className="text-lg font-black">
                          ₱{Object.entries(activeDrawer.denominationBreakdown).reduce((sum, [denom, count]) => sum + (parseFloat(denom) * count), 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {drawerNotes.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Shift Notes</p>
                    <div className="space-y-2">
                      {drawerNotes.map(note => (
                        <div key={note.id} className="p-2 bg-gray-50 rounded-lg text-[9px]">
                          <p className="font-bold">{note.note}</p>
                          <div className="flex flex-col gap-0.5 mt-1">
                            <p className="text-gray-500 text-[8px]">{formatTimestamp(note.createdAt)}</p>
                            <p className="text-gray-400 text-[7px]">{formatRelativeTime(note.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <DollarSign size={64} className="mx-auto text-gray-300 mb-4" />
                <p className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2">No Active Drawer</p>
                <p className="text-[10px] text-gray-500 font-bold">Open a cash drawer to start your shift</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Open Drawer Modal */}
      {showOpenDrawer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-black tracking-tighter mb-4">Open Cash Drawer</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Opening Amount
                </label>
                <input
                  type="number"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-2xl font-black text-center bg-gray-50 border border-gray-100 rounded-xl py-4 focus:outline-none focus:border-black"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleOpenDrawer}
                  className="flex-1 py-4 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
                >
                  Open Drawer
                </button>
                <button
                  onClick={() => {
                    setShowOpenDrawer(false);
                    setOpeningAmount('');
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

      {/* Cash Drop Modal */}
      {showCashDrop && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-black tracking-tighter mb-4">Cash Drop</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  value={dropAmount}
                  onChange={(e) => setDropAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-2xl font-black text-center bg-gray-50 border border-gray-100 rounded-xl py-4 focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Reason
                </label>
                <input
                  type="text"
                  value={dropReason}
                  onChange={(e) => setDropReason(e.target.value)}
                  placeholder="e.g., Safe deposit, Bank deposit..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:border-black"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCashDrop}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all"
                >
                  Record Drop
                </button>
                <button
                  onClick={() => {
                    setShowCashDrop(false);
                    setDropAmount('');
                    setDropReason('');
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

      {/* Cash Pickup Modal */}
      {showCashPickup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-black tracking-tighter mb-4">Cash Pickup</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  value={pickupAmount}
                  onChange={(e) => setPickupAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-2xl font-black text-center bg-gray-50 border border-gray-100 rounded-xl py-4 focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Reason
                </label>
                <input
                  type="text"
                  value={pickupReason}
                  onChange={(e) => setPickupReason(e.target.value)}
                  placeholder="e.g., Change needed, Petty cash..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:border-black"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCashPickup}
                  className="flex-1 py-4 bg-orange-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-700 transition-all"
                >
                  Record Pickup
                </button>
                <button
                  onClick={() => {
                    setShowCashPickup(false);
                    setPickupAmount('');
                    setPickupReason('');
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

      {/* Shift Note Modal */}
      {showShiftNote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-black tracking-tighter mb-4">Add Shift Note</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Note
                </label>
                <textarea
                  value={shiftNoteText}
                  onChange={(e) => setShiftNoteText(e.target.value)}
                  placeholder="Enter shift note..."
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:border-black resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleAddShiftNote}
                  className="flex-1 py-4 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
                >
                  Add Note
                </button>
                <button
                  onClick={() => {
                    setShowShiftNote(false);
                    setShiftNoteText('');
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

      {/* Denomination Breakdown Modal */}
      {showDenominationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-black tracking-tighter mb-4">Cash Denomination Breakdown</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(denominations).map(([denom, count]) => (
                  <div key={denom} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-sm font-black">₱{denom}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDenominations(prev => ({ ...prev, [denom]: Math.max(0, prev[denom] - 1) }))}
                        className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-200"
                      >
                        <span className="text-xs">-</span>
                      </button>
                      <input
                        type="number"
                        value={count}
                        onChange={(e) => setDenominations(prev => ({ ...prev, [denom]: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="w-16 text-center font-black text-sm border-0 bg-transparent focus:outline-none"
                      />
                      <button
                        onClick={() => setDenominations(prev => ({ ...prev, [denom]: prev[denom] + 1 }))}
                        className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-200"
                      >
                        <span className="text-xs">+</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-black text-white p-4 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black uppercase tracking-widest">Total Counted</span>
                  <span className="text-2xl font-black">
                    ₱{Object.entries(denominations).reduce((sum, [denom, count]) => sum + (parseFloat(denom) * count), 0).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDenominationModal(false);
                  }}
                  className="flex-1 py-4 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowDenominationModal(false);
                    setDenominations({
                      '1000': 0, '500': 0, '200': 0, '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '1': 0, '0.25': 0, '0.10': 0, '0.05': 0
                    });
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

      {/* Close Drawer Modal */}
      {showCloseDrawer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-black tracking-tighter mb-4">Close Cash Drawer</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Expected Amount</p>
                <p className="text-3xl font-black">₱{expectedAmount.toLocaleString()}</p>
              </div>
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Actual Closing Amount
                </label>
                <input
                  type="number"
                  value={closingAmount}
                  onChange={(e) => setClosingAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-2xl font-black text-center bg-gray-50 border border-gray-100 rounded-xl py-4 focus:outline-none focus:border-black"
                />
              </div>
              {closingAmount && !isNaN(parseFloat(closingAmount)) && (
                <div className={`p-4 rounded-xl ${parseFloat(closingAmount) - expectedAmount >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest">Difference</span>
                    <span className={`text-xl font-black ${parseFloat(closingAmount) - expectedAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {parseFloat(closingAmount) - expectedAmount >= 0 ? '+' : ''}
                      ₱{(parseFloat(closingAmount) - expectedAmount).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleCloseDrawer}
                  className="flex-1 py-4 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all"
                >
                  Close Drawer
                </button>
                <button
                  onClick={() => {
                    setShowCloseDrawer(false);
                    setClosingAmount('');
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
    </div>
  );
};

export default CashDrawerManager;

