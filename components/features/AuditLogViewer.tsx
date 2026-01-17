import React, { useState, useEffect } from 'react';
import { FileText, Search, Filter, Calendar, User, Activity, ChevronLeft, ChevronRight, Download, Eye } from 'lucide-react';
import { auditLogsApi, AuditLog } from '../../services/apiService';
import { useToast } from '../common/ToastProvider';
import { formatTimestamp } from '../../utils/dateUtils';

interface AuditLogViewerProps {
  currentUser: { id: string; role: string };
}

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ currentUser }) => {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    loadLogs();
  }, [pagination.page, startDate, endDate, actionFilter, entityTypeFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await auditLogsApi.getAll({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        action: actionFilter || undefined,
        entityType: entityTypeFilter || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      setLogs(response.logs);
      setPagination(response.pagination);
    } catch (error: any) {
      showToast('Failed to load audit logs', 'error');
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    setPagination({ ...pagination, page: 1 });
    loadLogs();
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setActionFilter('');
    setEntityTypeFilter('');
    setPagination({ ...pagination, page: 1 });
  };

  const getActionColor = (action: string) => {
    if (action.includes('LOGIN')) return 'bg-green-100 text-green-800';
    if (action.includes('CREATE')) return 'bg-blue-100 text-blue-800';
    if (action.includes('VOID') || action.includes('REFUND')) return 'bg-red-100 text-red-800';
    if (action.includes('UPDATE')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const actionLabels: Record<string, string> = {
    'LOGIN_SUCCESS': 'Login',
    'CREATE_TRANSACTION': 'Create Transaction',
    'VOID_TRANSACTION': 'Void Transaction',
    'REFUND_TRANSACTION': 'Refund Transaction',
    'GENERATE_Z_READING': 'Generate Z-Reading',
    'EXPORT_ESALES': 'Export eSales',
    'EINVOICE_SENT': 'E-Invoice Sent',
    'EINVOICE_FAILED': 'E-Invoice Failed',
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-black" />
            <h1 className="text-2xl font-bold text-black">Audit Logs</h1>
          </div>
          <div className="text-sm text-gray-600">
            Total: {pagination.total} entries
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="">All Actions</option>
              <option value="LOGIN_SUCCESS">Login</option>
              <option value="CREATE_TRANSACTION">Create Transaction</option>
              <option value="VOID_TRANSACTION">Void Transaction</option>
              <option value="REFUND_TRANSACTION">Refund Transaction</option>
              <option value="GENERATE_Z_READING">Generate Z-Reading</option>
              <option value="EXPORT_ESALES">Export eSales</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
            <select
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="">All Types</option>
              <option value="TRANSACTION">Transaction</option>
              <option value="EMPLOYEE">Employee</option>
              <option value="Z_READING">Z-Reading</option>
              <option value="REPORT">Report</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleFilter}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Apply Filters
          </button>
          <button
            onClick={clearFilters}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading audit logs...</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">No audit logs found</div>
          </div>
        ) : (
          <div className="p-6">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Timestamp</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">User</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Action</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Entity</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">IP Address</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatTimestamp(new Date(log.createdAt))}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {log.employee ? (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{log.employee.name}</span>
                          <span className="text-xs text-gray-500">({log.employee.role})</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">System</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                        {actionLabels[log.action] || log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {log.entityType && log.entityId ? (
                        <div>
                          <div className="font-medium">{log.entityType}</div>
                          <div className="text-xs text-gray-400">{log.entityId.substring(0, 8)}...</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {log.ipAddress || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="text-black hover:text-gray-600"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="border-t border-gray-200 p-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1}
              className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedLog(null)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black">Audit Log Details</h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Timestamp</label>
                <div className="text-gray-900">{formatTimestamp(new Date(selectedLog.createdAt))}</div>
              </div>
              
              {selectedLog.employee && (
                <div>
                  <label className="text-sm font-medium text-gray-700">User</label>
                  <div className="text-gray-900">{selectedLog.employee.name} ({selectedLog.employee.role})</div>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-700">Action</label>
                <div className="text-gray-900">{actionLabels[selectedLog.action] || selectedLog.action}</div>
              </div>
              
              {selectedLog.entityType && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Entity</label>
                  <div className="text-gray-900">
                    <div>Type: {selectedLog.entityType}</div>
                    {selectedLog.entityId && <div className="text-sm text-gray-500">ID: {selectedLog.entityId}</div>}
                  </div>
                </div>
              )}
              
              {selectedLog.ipAddress && (
                <div>
                  <label className="text-sm font-medium text-gray-700">IP Address</label>
                  <div className="text-gray-900">{selectedLog.ipAddress}</div>
                </div>
              )}
              
              {selectedLog.userAgent && (
                <div>
                  <label className="text-sm font-medium text-gray-700">User Agent</label>
                  <div className="text-gray-900 text-sm">{selectedLog.userAgent}</div>
                </div>
              )}
              
              {selectedLog.details && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Details</label>
                  <pre className="bg-gray-50 p-3 rounded text-sm text-gray-900 overflow-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogViewer;

