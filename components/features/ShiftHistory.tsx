
import React, { useState, useMemo } from 'react';
import { CashDrawer, Employee, Transaction } from '../../types';
import { Calendar, DollarSign, Clock, TrendingUp, TrendingDown, Search, Filter, Download, User } from 'lucide-react';
import { formatTimestamp, formatRelativeTime } from '../../utils/dateUtils';

interface ShiftHistoryProps {
  cashDrawers: CashDrawer[];
  employees: Employee[];
  transactions: Transaction[];
}

const ShiftHistory: React.FC<ShiftHistoryProps> = ({ cashDrawers, employees, transactions }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'difference'>('date');

  const closedDrawers = useMemo(() => {
    return cashDrawers.filter(d => d.closedAt).sort((a, b) => {
      const dateA = new Date(a.closedAt || 0).getTime();
      const dateB = new Date(b.closedAt || 0).getTime();
      return dateB - dateA; // Most recent first
    });
  }, [cashDrawers]);

  const filteredDrawers = useMemo(() => {
    let filtered = closedDrawers;

    // Filter by employee
    if (selectedEmployee !== 'all') {
      filtered = filtered.filter(d => d.employeeId === selectedEmployee);
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const today = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filtered = filtered.filter(d => {
            const closeDate = new Date(d.closedAt || 0);
            return closeDate.toDateString() === today.toDateString();
          });
          break;
        case 'week':
          filterDate.setDate(today.getDate() - 7);
          filtered = filtered.filter(d => {
            const closeDate = new Date(d.closedAt || 0);
            return closeDate >= filterDate;
          });
          break;
        case 'month':
          filterDate.setMonth(today.getMonth() - 1);
          filtered = filtered.filter(d => {
            const closeDate = new Date(d.closedAt || 0);
            return closeDate >= filterDate;
          });
          break;
      }
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(d => {
        const employee = employees.find(e => e.id === d.employeeId);
        return (
          d.id.toLowerCase().includes(term) ||
          employee?.name.toLowerCase().includes(term) ||
          d.openingAmount.toString().includes(term) ||
          (d.closingAmount?.toString().includes(term) || '')
        );
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.closedAt || 0).getTime() - new Date(a.closedAt || 0).getTime();
        case 'amount':
          return (b.closingAmount || 0) - (a.closingAmount || 0);
        case 'difference':
          return Math.abs(b.difference || 0) - Math.abs(a.difference || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [closedDrawers, selectedEmployee, dateFilter, searchTerm, sortBy, employees]);

  const getEmployeeName = (employeeId: string) => {
    return employees.find(e => e.id === employeeId)?.name || 'Unknown';
  };

  const getShiftTransactions = (drawer: CashDrawer) => {
    return transactions.filter(t => drawer.transactions.includes(t.id));
  };

  const calculateShiftStats = (drawer: CashDrawer) => {
    const shiftTransactions = getShiftTransactions(drawer);
    const cashTransactions = shiftTransactions.filter(t => 
      t.payments.some(p => p.method === 'CASH')
    );
    
    const totalSales = shiftTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const cashSales = cashTransactions.reduce((sum, t) => {
      const cashPayment = t.payments.find(p => p.method === 'CASH');
      return sum + (cashPayment?.amount || 0);
    }, 0);
    const cardSales = shiftTransactions.reduce((sum, t) => {
      const cardPayment = t.payments.find(p => p.method === 'CREDIT_CARD' || p.method === 'DEBIT_CARD');
      return sum + (cardPayment?.amount || 0);
    }, 0);
    const mobileSales = shiftTransactions.reduce((sum, t) => {
      const mobilePayment = t.payments.find(p => p.method === 'GCASH' || p.method === 'PAYMAYA');
      return sum + (mobilePayment?.amount || 0);
    }, 0);
    const totalTips = shiftTransactions.reduce((sum, t) => sum + (t.tip || 0), 0);
    const orderCount = shiftTransactions.length;

    return {
      totalSales,
      cashSales,
      cardSales,
      mobileSales,
      totalTips,
      orderCount
    };
  };

  const overallStats = useMemo(() => {
    const allStats = filteredDrawers.map(d => calculateShiftStats(d));
    return {
      totalShifts: filteredDrawers.length,
      totalSales: allStats.reduce((sum, s) => sum + s.totalSales, 0),
      totalCash: allStats.reduce((sum, s) => sum + s.cashSales, 0),
      totalTips: allStats.reduce((sum, s) => sum + s.totalTips, 0),
      totalOrders: allStats.reduce((sum, s) => sum + s.orderCount, 0),
      totalDifference: filteredDrawers.reduce((sum, d) => sum + (d.difference || 0), 0)
    };
  }, [filteredDrawers, transactions]);

  return (
    <div className="flex flex-col h-full p-6 bg-white overflow-hidden">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">Financial Records</p>
          <h1 className="text-3xl font-black tracking-tighter text-black uppercase">Shift History</h1>
        </div>
        <button className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">
          <Download size={14} /> Export Report
        </button>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <StatsCard label="Total Shifts" value={overallStats.totalShifts.toString()} icon={<Clock size={16} />} />
        <StatsCard label="Total Sales" value={`₱${overallStats.totalSales.toLocaleString()}`} icon={<DollarSign size={16} />} />
        <StatsCard label="Cash Collected" value={`₱${overallStats.totalCash.toLocaleString()}`} icon={<DollarSign size={16} />} />
        <StatsCard label="Total Tips" value={`₱${overallStats.totalTips.toLocaleString()}`} icon={<TrendingUp size={16} />} />
        <StatsCard 
          label="Net Difference" 
          value={`₱${overallStats.totalDifference.toLocaleString()}`} 
          icon={overallStats.totalDifference >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          isWarning={overallStats.totalDifference < 0}
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search shifts..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:outline-none focus:border-black transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-black"
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
          >
            <option value="all">All Employees</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
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
            <option value="difference">Sort by Difference</option>
          </select>
        </div>
      </div>

      {/* Shift List */}
      <div className="flex-1 overflow-y-auto">
        {filteredDrawers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-300">
            <Clock size={64} className="mb-4 opacity-20" />
            <p className="text-sm font-black uppercase tracking-widest">No shifts found</p>
            <p className="text-[10px] text-gray-400 font-bold mt-1">Close a cash drawer to see shift records</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDrawers.map(drawer => {
              const employee = employees.find(e => e.id === drawer.employeeId);
              const stats = calculateShiftStats(drawer);
              const duration = drawer.closedAt && drawer.openedAt
                ? Math.floor((new Date(drawer.closedAt).getTime() - new Date(drawer.openedAt).getTime()) / 1000 / 60)
                : 0;

              return (
                <div key={drawer.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:border-black transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center font-black text-sm">
                          {employee?.name[0] || '?'}
                        </div>
                        <div>
                          <h3 className="text-base font-black tracking-tighter">{employee?.name || 'Unknown Employee'}</h3>
                          <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Shift #{drawer.id.slice(-6)}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-4 text-[9px] text-gray-500 font-bold">
                          <div className="flex items-center gap-1">
                            <Calendar size={10} />
                            <span>{formatTimestamp(drawer.openedAt)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={10} />
                            <span>
                              {new Date(drawer.openedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - 
                              {drawer.closedAt && new Date(drawer.closedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <span>{duration} min</span>
                        </div>
                        <p className="text-[8px] text-gray-400">{formatRelativeTime(drawer.closedAt || drawer.openedAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Closing Amount</p>
                      <p className="text-2xl font-black tracking-tighter">₱{(drawer.closingAmount || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Opening</p>
                      <p className="text-sm font-black">₱{drawer.openingAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Expected</p>
                      <p className="text-sm font-black">₱{(drawer.expectedAmount || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Difference</p>
                      <p className={`text-sm font-black ${(drawer.difference || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(drawer.difference || 0) >= 0 ? '+' : ''}₱{Math.abs(drawer.difference || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Orders</p>
                      <p className="text-sm font-black">{stats.orderCount}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Sales</p>
                      <p className="text-base font-black">₱{stats.totalSales.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Cash</p>
                      <p className="text-sm font-black">₱{stats.cashSales.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Card/Mobile</p>
                      <p className="text-sm font-black">₱{(stats.cardSales + stats.mobileSales).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Tips</p>
                      <p className="text-sm font-black">₱{stats.totalTips.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Denomination Breakdown */}
                  {drawer.denominationBreakdown && Object.keys(drawer.denominationBreakdown).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-3">Denomination Breakdown</p>
                      <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                        {Object.entries(drawer.denominationBreakdown)
                          .filter(([_, count]) => count > 0)
                          .sort(([a], [b]) => parseFloat(b) - parseFloat(a))
                          .map(([denomination, count]) => (
                            <div key={denomination} className="bg-gray-50 rounded-lg p-2">
                              <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">₱{denomination}</p>
                              <p className="text-sm font-black mt-1">{count}x</p>
                              <p className="text-[9px] font-bold text-gray-600">₱{(parseFloat(denomination) * (count as number)).toLocaleString()}</p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Cash Drops */}
                  {drawer.cashDrops && drawer.cashDrops.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <TrendingDown size={12} />
                        Cash Drops ({drawer.cashDrops.length})
                      </p>
                      <div className="space-y-2">
                        {drawer.cashDrops.map((drop: any) => {
                          const dropEmployee = employees.find(e => e.id === drop.droppedBy || e.id === drop.employee?.id);
                          return (
                            <div key={drop.id} className="bg-red-50 rounded-lg p-3 border border-red-100">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="text-[9px] font-black text-red-700">-₱{drop.amount.toLocaleString()}</p>
                                  <p className="text-[8px] text-red-600 font-bold mt-0.5">{drop.reason}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[8px] text-red-500 font-bold">{dropEmployee?.name || 'Unknown'}</p>
                                  <p className="text-[7px] text-red-400 mt-0.5">
                                    {new Date(drop.droppedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Cash Pickups */}
                  {drawer.cashPickups && drawer.cashPickups.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <TrendingUp size={12} />
                        Cash Pickups ({drawer.cashPickups.length})
                      </p>
                      <div className="space-y-2">
                        {drawer.cashPickups.map((pickup: any) => {
                          const pickupEmployee = employees.find(e => e.id === pickup.pickedUpBy || e.id === pickup.employee?.id);
                          return (
                            <div key={pickup.id} className="bg-green-50 rounded-lg p-3 border border-green-100">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="text-[9px] font-black text-green-700">+₱{pickup.amount.toLocaleString()}</p>
                                  <p className="text-[8px] text-green-600 font-bold mt-0.5">{pickup.reason}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[8px] text-green-500 font-bold">{pickupEmployee?.name || 'Unknown'}</p>
                                  <p className="text-[7px] text-green-400 mt-0.5">
                                    {new Date(pickup.pickedUpAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const StatsCard: React.FC<{ label: string; value: string; icon: React.ReactNode; isWarning?: boolean }> = ({ 
  label, 
  value, 
  icon, 
  isWarning 
}) => (
  <div className={`p-4 rounded-2xl border ${isWarning ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'} shadow-sm`}>
    <div className="flex items-center justify-between mb-2">
      <div className={`p-2 rounded-lg ${isWarning ? 'bg-red-100' : 'bg-gray-50'}`}>{icon}</div>
    </div>
    <p className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${isWarning ? 'text-red-600' : 'text-gray-500'}`}>{label}</p>
    <h3 className={`text-lg font-black tracking-tighter ${isWarning ? 'text-red-600' : 'text-black'}`}>{value}</h3>
  </div>
);

export default ShiftHistory;

