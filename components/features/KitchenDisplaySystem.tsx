
import React, { useState, useMemo } from 'react';
import { Transaction, OrderStatus, Table } from '../../types';
import { Clock, CheckCircle, AlertCircle, ChefHat, Timer, History, Edit2, Star } from 'lucide-react';
import { formatRelativeTime, formatTimestamp } from '../../utils/dateUtils';

interface KitchenDisplaySystemProps {
  transactions: Transaction[];
  tables?: Table[];
  onUpdateOrderStatus: (transactionId: string, status: OrderStatus) => void;
  onUpdateKitchenNotes?: (transactionId: string, notes: string) => void;
  onUpdatePriority?: (transactionId: string, priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT') => void;
  onUpdatePrepTime?: (transactionId: string, minutes: number) => void;
}

const KitchenDisplaySystem: React.FC<KitchenDisplaySystemProps> = ({ 
  transactions, 
  tables = [],
  onUpdateOrderStatus,
  onUpdateKitchenNotes,
  onUpdatePriority,
  onUpdatePrepTime
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [filter, setFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [editingPrepTime, setEditingPrepTime] = useState<string | null>(null);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState('');
  const [historyDateRange, setHistoryDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [historyCustomStartDate, setHistoryCustomStartDate] = useState('');
  const [historyCustomEndDate, setHistoryCustomEndDate] = useState('');

  const activeOrders = useMemo(() => {
    return transactions.filter(t => 
      (t.orderType === 'DINE_IN' || t.orderType === 'TAKEOUT' || t.orderType === 'DELIVERY') && 
      t.status !== OrderStatus.COMPLETED && 
      t.status !== OrderStatus.VOIDED &&
      (filter === 'ALL' || t.status === filter)
    ).sort((a, b) => {
      // Sort by priority first (URGENT > HIGH > NORMAL > LOW)
      const priorityOrder = { URGENT: 4, HIGH: 3, NORMAL: 2, LOW: 1 };
      const aPriority = priorityOrder[a.priority || 'NORMAL'];
      const bPriority = priorityOrder[b.priority || 'NORMAL'];
      if (aPriority !== bPriority) return bPriority - aPriority;
      // Then by timestamp
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  }, [transactions, filter]);

  const completedOrders = useMemo(() => {
    let filtered = transactions.filter(t => 
      (t.orderType === 'DINE_IN' || t.orderType === 'TAKEOUT' || t.orderType === 'DELIVERY') && 
      (t.status === OrderStatus.COMPLETED || t.status === OrderStatus.SERVED)
    );

    // Apply date range filter
    if (historyDateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      let endDate: Date = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow

      switch (historyDateRange) {
        case 'today':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'custom':
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

      filtered = filtered.filter(t => {
        const tDate = new Date(t.timestamp);
        return tDate >= startDate && tDate <= endDate;
      });
    }

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions, historyDateRange, historyCustomStartDate, historyCustomEndDate]);

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case OrderStatus.PREPARING:
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case OrderStatus.READY:
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getElapsedTime = (timestamp: Date) => {
    // Returns elapsed time in minutes for sorting/display logic
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - new Date(timestamp).getTime()) / 1000 / 60);
    return elapsed;
  };

  const updateStatus = (orderId: string, currentStatus: OrderStatus, orderType: OrderType) => {
    let nextStatus: OrderStatus;
    switch (currentStatus) {
      case OrderStatus.PENDING:
        nextStatus = OrderStatus.PREPARING;
        break;
      case OrderStatus.PREPARING:
        nextStatus = OrderStatus.READY;
        break;
      case OrderStatus.READY:
        // For TAKEOUT/DELIVERY, mark as COMPLETED instead of SERVED
        nextStatus = (orderType === 'TAKEOUT' || orderType === 'DELIVERY') ? OrderStatus.COMPLETED : OrderStatus.SERVED;
        break;
      default:
        return;
    }
    onUpdateOrderStatus(orderId, nextStatus);
  };

  const groupedByStatus = useMemo(() => {
    const groups: Record<OrderStatus, Transaction[]> = {
      [OrderStatus.PENDING]: [],
      [OrderStatus.PREPARING]: [],
      [OrderStatus.READY]: [],
      [OrderStatus.SERVED]: [],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.VOIDED]: []
    };
    
    activeOrders.forEach(order => {
      if (groups[order.status]) {
        groups[order.status].push(order);
      }
    });
    
    return groups;
  }, [activeOrders]);

  return (
    <div className="flex flex-col h-full p-6 bg-gray-50 overflow-hidden">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">Kitchen Operations</p>
          <h1 className="text-3xl font-black tracking-tighter text-black uppercase flex items-center gap-3">
            <ChefHat size={32} />
            Kitchen Display
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-2 border border-gray-200 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all
                ${activeTab === 'active' 
                  ? 'bg-black text-white' 
                  : 'text-gray-500 hover:text-black'}`}
            >
              Active Orders
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2
                ${activeTab === 'history' 
                  ? 'bg-black text-white' 
                  : 'text-gray-500 hover:text-black'}`}
            >
              <History size={12} />
              History
            </button>
          </div>
          {activeTab === 'active' && (
            <div className="flex gap-2">
              {(['ALL', OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all
                    ${filter === f 
                      ? 'bg-black text-white' 
                      : 'bg-white text-gray-500 border border-gray-200 hover:border-black'}`}
                >
                  {f === 'ALL' ? 'All' : f}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeTab === 'active' ? (
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY].map(status => (
          <div key={status} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className={`p-4 border-b-2 ${getStatusColor(status).split(' ')[1]} ${getStatusColor(status).split(' ')[2]}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest">{status}</h3>
                <span className="text-xs font-black bg-white/20 px-2 py-1 rounded-full">
                  {groupedByStatus[status].length}
                </span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {groupedByStatus[status].length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-300">
                  <p className="text-[10px] font-black uppercase tracking-widest">No Orders</p>
                </div>
              ) : (
                groupedByStatus[status].map(order => {
                  const elapsed = getElapsedTime(order.timestamp);
                  const table = order.tableId ? tables.find(t => t.id === order.tableId) : null;
                  return (
                    <div
                      key={order.id}
                      className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                        elapsed > 15 ? 'border-red-300 bg-red-50' : 'border-gray-100'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-black text-black">#{order.id.slice(-4)}</span>
                            {table && (
                              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded">
                                Table {table.number}
                              </span>
                            )}
                            {order.orderType === 'TAKEOUT' && (
                              <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest bg-blue-100 px-2 py-0.5 rounded">
                                TAKEOUT
                              </span>
                            )}
                            {order.orderType === 'DELIVERY' && (
                              <span className="text-[8px] font-black text-purple-600 uppercase tracking-widest bg-purple-100 px-2 py-0.5 rounded">
                                DELIVERY
                              </span>
                            )}
                            {order.orderType === 'DINE_IN' && !table && (
                              <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded">
                                DINE IN
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[9px] text-gray-400 font-bold">
                            <Clock size={10} />
                            <span>{formatRelativeTime(order.timestamp)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-black">₱{order.totalAmount.toLocaleString()}</div>
                          {elapsed > 15 && (
                            <div className="flex items-center gap-1 text-[8px] text-red-600 font-black mt-1">
                              <AlertCircle size={10} />
                              <span>DELAYED</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-start justify-between text-[10px]">
                            <div className="flex-1">
                              <div className="font-black text-black">
                                {item.quantity}x {item.name}
                              </div>
                              {item.modifiers && item.modifiers.length > 0 && (
                                <div className="text-[8px] text-gray-500 mt-0.5">
                                  {item.modifiers.map(m => m.modifierName).join(', ')}
                                </div>
                              )}
                              {item.specialInstructions && (
                                <div className="text-[8px] text-orange-600 italic mt-0.5">
                                  Note: {item.specialInstructions}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {order.orderType === 'DELIVERY' && (order.deliveryCustomerName || order.deliveryCustomerPhone || order.deliveryAddress) && (
                        <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                          <p className="text-[8px] font-black text-purple-800 uppercase tracking-widest mb-1">Delivery Information</p>
                          {order.deliveryCustomerName && (
                            <p className="text-[9px] text-purple-900 font-bold">Name: {order.deliveryCustomerName}</p>
                          )}
                          {order.deliveryCustomerPhone && (
                            <p className="text-[9px] text-purple-900 font-bold">Phone: {order.deliveryCustomerPhone}</p>
                          )}
                          {order.deliveryAddress && (
                            <p className="text-[9px] text-purple-900 font-bold">Address: {order.deliveryAddress}</p>
                          )}
                        </div>
                      )}
                      {order.notes && (
                        <div className="mb-3 p-2 bg-gray-100 border border-gray-200 rounded-lg">
                          <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Order Notes</p>
                          <p className="text-[9px] text-gray-900 font-bold">{order.notes}</p>
                        </div>
                      )}
                      <div className="mb-3 flex items-center gap-2">
                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Priority:</span>
                        <select
                          value={order.priority || 'NORMAL'}
                          onChange={(e) => onUpdatePriority && onUpdatePriority(order.id, e.target.value as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT')}
                          className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded border-0 focus:outline-none ${
                            order.priority === 'URGENT' ? 'bg-red-600 text-white' :
                            order.priority === 'HIGH' ? 'bg-orange-600 text-white' :
                            order.priority === 'LOW' ? 'bg-gray-300 text-gray-700' :
                            'bg-blue-600 text-white'
                          }`}
                        >
                          <option value="LOW">Low</option>
                          <option value="NORMAL">Normal</option>
                          <option value="HIGH">High</option>
                          <option value="URGENT">Urgent</option>
                        </select>
                        <div className="flex items-center gap-2 ml-auto">
                          <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Prep Time:</span>
                          {editingPrepTime === order.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={prepTimeMinutes}
                                onChange={(e) => setPrepTimeMinutes(e.target.value)}
                                className="w-16 px-2 py-1 text-[9px] font-black border border-gray-300 rounded focus:outline-none"
                                placeholder="min"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const minutes = parseInt(prepTimeMinutes) || 0;
                                    if (onUpdatePrepTime) onUpdatePrepTime(order.id, minutes);
                                    setEditingPrepTime(null);
                                    setPrepTimeMinutes('');
                                  } else if (e.key === 'Escape') {
                                    setEditingPrepTime(null);
                                    setPrepTimeMinutes('');
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingPrepTime(order.id);
                                setPrepTimeMinutes(order.estimatedPrepTime?.toString() || '');
                              }}
                              className="text-[9px] font-black text-gray-600 hover:text-black flex items-center gap-1"
                            >
                              {order.estimatedPrepTime ? `${order.estimatedPrepTime} min` : 'Set time'}
                              <Edit2 size={10} />
                            </button>
                          )}
                        </div>
                      </div>
                      {order.kitchenNotes && (
                        <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[8px] font-black text-yellow-800 uppercase tracking-widest">Kitchen Note</p>
                            {onUpdateKitchenNotes && (
                              <button
                                onClick={() => {
                                  setEditingNotes(order.id);
                                  setNotesText(order.kitchenNotes || '');
                                }}
                                className="p-1 hover:bg-yellow-100 rounded"
                              >
                                <Edit2 size={10} className="text-yellow-800" />
                              </button>
                            )}
                          </div>
                          {editingNotes === order.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={notesText}
                                onChange={(e) => setNotesText(e.target.value)}
                                className="w-full px-2 py-1 text-[9px] font-bold border border-yellow-300 rounded focus:outline-none resize-none"
                                rows={2}
                                autoFocus
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter' && e.ctrlKey) {
                                    if (onUpdateKitchenNotes) {
                                      await onUpdateKitchenNotes(order.id, notesText);
                                    }
                                    setEditingNotes(null);
                                    setNotesText('');
                                  } else if (e.key === 'Escape') {
                                    setEditingNotes(null);
                                    setNotesText('');
                                  }
                                }}
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    if (onUpdateKitchenNotes) {
                                      await onUpdateKitchenNotes(order.id, notesText);
                                    }
                                    setEditingNotes(null);
                                    setNotesText('');
                                  }}
                                  className="px-2 py-1 bg-yellow-600 text-white rounded text-[8px] font-black uppercase hover:bg-yellow-700 transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingNotes(null);
                                    setNotesText('');
                                  }}
                                  className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-[8px] font-black uppercase hover:bg-gray-300 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[9px] text-yellow-900 font-bold">{order.kitchenNotes}</p>
                          )}
                        </div>
                      )}
                      {!order.kitchenNotes && onUpdateKitchenNotes && (
                        editingNotes === order.id ? (
                          <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg space-y-2">
                            <p className="text-[8px] font-black text-yellow-800 uppercase tracking-widest mb-1">Add Kitchen Note</p>
                            <textarea
                              value={notesText}
                              onChange={(e) => setNotesText(e.target.value)}
                              className="w-full px-2 py-1 text-[9px] font-bold border border-yellow-300 rounded focus:outline-none resize-none"
                              rows={2}
                              autoFocus
                              placeholder="Enter kitchen note..."
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter' && e.ctrlKey) {
                                  if (onUpdateKitchenNotes && notesText.trim()) {
                                    await onUpdateKitchenNotes(order.id, notesText);
                                  }
                                  setEditingNotes(null);
                                  setNotesText('');
                                } else if (e.key === 'Escape') {
                                  setEditingNotes(null);
                                  setNotesText('');
                                }
                              }}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  if (onUpdateKitchenNotes && notesText.trim()) {
                                    await onUpdateKitchenNotes(order.id, notesText);
                                  }
                                  setEditingNotes(null);
                                  setNotesText('');
                                }}
                                className="px-2 py-1 bg-yellow-600 text-white rounded text-[8px] font-black uppercase hover:bg-yellow-700 transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingNotes(null);
                                  setNotesText('');
                                }}
                                className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-[8px] font-black uppercase hover:bg-gray-300 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingNotes(order.id);
                              setNotesText('');
                            }}
                            className="mb-3 w-full py-2 text-[8px] font-black text-gray-500 uppercase tracking-widest border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:text-gray-600"
                          >
                            + Add Kitchen Note
                          </button>
                        )
                      )}

                      <button
                        onClick={() => updateStatus(order.id, status, order.orderType)}
                        className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all
                          ${status === OrderStatus.PENDING 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : status === OrderStatus.PREPARING
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                      >
                        {status === OrderStatus.PENDING && 'Start Preparing'}
                        {status === OrderStatus.PREPARING && 'Mark Ready'}
                        {status === OrderStatus.READY && (
                          order.orderType === 'TAKEOUT' ? 'Mark as Picked Up' :
                          order.orderType === 'DELIVERY' ? 'Mark as Completed' :
                          'Mark Served'
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-6">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tighter text-black mb-2">
                    Order History
                  </h2>
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                    {completedOrders.length} Completed Orders
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 border border-gray-200 rounded-xl p-1">
                    <select
                      value={historyDateRange}
                      onChange={(e) => {
                        setHistoryDateRange(e.target.value as any);
                        if (e.target.value !== 'custom') {
                          setHistoryCustomStartDate('');
                          setHistoryCustomEndDate('');
                        }
                      }}
                      className="px-3 py-1.5 bg-transparent border-0 text-[9px] font-black uppercase tracking-widest focus:outline-none"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">Last 7 Days</option>
                      <option value="month">Last 30 Days</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>
                  {historyDateRange === 'custom' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={historyCustomStartDate}
                        onChange={(e) => setHistoryCustomStartDate(e.target.value)}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-[9px] font-bold focus:outline-none focus:border-black"
                      />
                      <span className="text-gray-400 text-[9px]">to</span>
                      <input
                        type="date"
                        value={historyCustomEndDate}
                        onChange={(e) => setHistoryCustomEndDate(e.target.value)}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-[9px] font-bold focus:outline-none focus:border-black"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {completedOrders.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-300">
                <div className="text-center">
                  <History size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No Order History</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {completedOrders.map(order => {
                  const table = order.tableId ? tables.find(t => t.id === order.tableId) : null;
                  return (
                    <div
                      key={order.id}
                      className="p-4 rounded-xl border border-gray-200 hover:border-black transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-black text-black">Order #{order.id.slice(-4)}</span>
                            {table && (
                              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded">
                                Table {table.number}
                              </span>
                            )}
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                              order.status === OrderStatus.COMPLETED 
                                ? 'bg-green-100 text-green-700' 
                                : order.status === OrderStatus.SERVED
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {order.status === OrderStatus.SERVED && order.orderType === 'DINE_IN' ? 'SERVED' :
                               order.status === OrderStatus.COMPLETED && order.orderType === 'TAKEOUT' ? 'PICKED UP' :
                               order.status === OrderStatus.COMPLETED && order.orderType === 'DELIVERY' ? 'COMPLETED' :
                               order.status}
                            </span>
                            {(order.orderType === 'TAKEOUT' || order.orderType === 'DELIVERY') && (
                              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                order.orderType === 'TAKEOUT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                              }`}>
                                {order.orderType}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[9px] text-gray-400 font-bold">
                            <Clock size={10} />
                            <span>{formatTimestamp(order.timestamp)}</span>
                            <span className="text-gray-300">•</span>
                            <span>{formatRelativeTime(order.timestamp)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-black">₱{order.totalAmount.toLocaleString()}</div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {order.items.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="text-[10px] font-bold text-gray-600">
                            {item.quantity}x {item.name}
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="text-[9px] font-bold text-gray-400">
                            +{order.items.length - 3} more items
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default KitchenDisplaySystem;

