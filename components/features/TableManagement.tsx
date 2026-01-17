import React, { useState, useCallback, useEffect } from "react";
import { Table, TableStatus } from "../../types";
import { Users, XCircle, Plus, MapPin, Trash2, Edit2 } from "lucide-react";
import { useToast } from "../common/ToastProvider";
import { tablesApi } from "../../services/apiService";

interface TableManagementProps {
  tables: Table[];
  setTables: React.Dispatch<React.SetStateAction<Table[]>>;
  transactions?: any[];
  waitlist?: any[];
  setWaitlist?: any;
  tableReservations?: any[];
  setTableReservations?: any;
  onTableSelect?: (table: Table) => void;
}

const TableManagement: React.FC<TableManagementProps> = ({
  tables,
  setTables,
  onTableSelect,
}) => {
  const { showToast } = useToast();
  const [selectedLocation, setSelectedLocation] = useState<string>("All");
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [showEditTableModal, setShowEditTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [newTable, setNewTable] = useState({
    number: "",
    capacity: 4,
    location: "Indoor",
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load tables from backend
  const loadTables = useCallback(async () => {
    try {
      setIsLoading(true);
      const loadedTables = await tablesApi.getAll();
      setTables(loadedTables);
    } catch (error: any) {
      console.error("Error loading tables:", error);
      showToast("Failed to load tables", "error");
    } finally {
      setIsLoading(false);
    }
  }, [setTables, showToast]);

  // Load tables on mount
  useEffect(() => {
    loadTables();
  }, [loadTables]);

  const locations = [
    "All",
    ...Array.from(new Set(tables.map((t) => t.location || "Indoor"))),
  ];
  const filteredTables =
    selectedLocation === "All"
      ? tables
      : tables.filter((t) => t.location === selectedLocation);

  const handleTableClick = (table: Table) => {
    if (onTableSelect) {
      onTableSelect(table);
    }
  };

  const handleAddTable = async () => {
    if (!newTable.number.trim()) {
      showToast("Please enter a table number", "error");
      return;
    }

    try {
      setIsLoading(true);
      const createdTable = await tablesApi.create({
        number: newTable.number.trim(),
        capacity: newTable.capacity,
        location: newTable.location,
        status: "AVAILABLE",
      });

      await loadTables();
      setShowAddTableModal(false);
      setNewTable({ number: "", capacity: 4, location: "Indoor" });
      showToast(`Table ${createdTable.number} added successfully`, "success");
    } catch (error: any) {
      console.error("Error creating table:", error);
      showToast(error.message || "Failed to create table", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditTable = (table: Table) => {
    setEditingTable(table);
    setNewTable({
      number: table.number,
      capacity: table.capacity,
      location: table.location || "Indoor",
    });
    setShowEditTableModal(true);
  };

  const handleUpdateTable = async () => {
    if (!editingTable || !newTable.number.trim()) {
      showToast("Please enter a table number", "error");
      return;
    }

    try {
      setIsLoading(true);
      await tablesApi.update(editingTable.id, {
        number: newTable.number.trim(),
        capacity: newTable.capacity,
        location: newTable.location,
      });

      await loadTables();
      setShowEditTableModal(false);
      setEditingTable(null);
      setNewTable({ number: "", capacity: 4, location: "Indoor" });
      showToast("Table updated successfully", "success");
    } catch (error: any) {
      console.error("Error updating table:", error);
      showToast(error.message || "Failed to update table", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTable = async (table: Table) => {
    if (
      !window.confirm(`Are you sure you want to delete Table ${table.number}?`)
    ) {
      return;
    }

    try {
      setIsLoading(true);
      await tablesApi.delete(table.id);
      await loadTables();
      showToast(`Table ${table.number} deleted successfully`, "success");
    } catch (error: any) {
      console.error("Error deleting table:", error);
      showToast(error.message || "Failed to delete table", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-6 bg-white overflow-hidden">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">
            Tables
          </p>
          <h1 className="text-3xl font-black tracking-tighter text-black uppercase">
            Table Layout
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-2">
            {locations.map((loc) => (
              <button
                key={loc}
                onClick={() => setSelectedLocation(loc)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all
                  ${
                    selectedLocation === loc
                      ? "bg-black text-white"
                      : "bg-white text-gray-500 border border-gray-200 hover:border-black"
                  }`}
              >
                {loc}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAddTableModal(true)}
            className="px-4 py-2 rounded-xl bg-black text-white text-[9px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center gap-2"
          >
            <Plus size={14} />
            Manage Tables
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredTables.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <div className="text-center">
                <p className="font-black text-gray-900 text-lg mb-2">
                  {tables.length === 0 ? "No Tables Added" : "No Tables Found"}
                </p>
                <p className="text-sm text-gray-500 mb-4 max-w-md">
                  {tables.length === 0
                    ? "Set up your restaurant layout by adding tables"
                    : selectedLocation !== "All"
                    ? `No tables found in ${selectedLocation} location`
                    : "No tables match your current filters"}
                </p>
                {tables.length === 0 && (
                  <button
                    onClick={() => setShowAddTableModal(true)}
                    className="px-6 py-3 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors flex items-center gap-2 mx-auto"
                  >
                    <Plus size={16} />
                    Add First Table
                  </button>
                )}
              </div>
            </div>
          ) : (
            filteredTables.map((table) => (
              <div
                key={table.id}
                onClick={() => handleTableClick(table)}
                className="relative p-4 rounded-2xl border-2 border-gray-200 bg-white hover:border-black transition-all cursor-pointer"
              >
                <div className="mb-2">
                  <span className="text-lg font-black text-black">
                    Table {table.number}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[9px] font-bold text-gray-600">
                  <Users size={12} />
                  <span>{table.capacity} seats</span>
                  {table.location && (
                    <>
                      <MapPin size={12} />
                      <span>{table.location}</span>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Table Modal */}
      {showAddTableModal && (
        <div
          className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4"
          onClick={() => setShowAddTableModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">
                  New Table
                </p>
                <h2 className="text-2xl font-black tracking-tighter text-black uppercase">
                  Add Table
                </h2>
              </div>
              <button
                onClick={() => setShowAddTableModal(false)}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  Table Number *
                </label>
                <input
                  type="text"
                  value={newTable.number}
                  onChange={(e) =>
                    setNewTable({ ...newTable, number: e.target.value })
                  }
                  placeholder="e.g., 1, 2, A1"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={newTable.capacity}
                  onChange={(e) =>
                    setNewTable({
                      ...newTable,
                      capacity: parseInt(e.target.value) || 4,
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  Location
                </label>
                <select
                  value={newTable.location}
                  onChange={(e) =>
                    setNewTable({ ...newTable, location: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-sm font-bold"
                >
                  <option value="Indoor">Indoor</option>
                  <option value="Outdoor">Outdoor</option>
                  <option value="Bar">Bar</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddTableModal(false)}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-700 text-[9px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTable}
                className="flex-1 px-4 py-3 rounded-xl bg-black text-white text-[9px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
              >
                Add Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableManagement;
