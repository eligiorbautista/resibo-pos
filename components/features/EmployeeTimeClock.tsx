import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  Award,
  UserCheck,
  LogIn,
  LogOut,
  UserPlus,
  X,
  Edit2,
  Trash2,
  MoreVertical,
  Clock,
  Calendar,
  History,
  Filter,
  Coffee,
  UtensilsCrossed,
  Download,
  CalendarDays,
  DollarSign,
} from "lucide-react";
import {
  Employee,
  Role,
  TimeRecord,
  BreakRecord,
  ShiftSchedule,
} from "../../types";
import { useToast } from "../common/ToastProvider";
import ConfirmationDialog from "../common/ConfirmationDialog";
import { employeesApi, shiftSchedulesApi } from "../../services/apiService";

interface TimeClockProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  currentUser: Employee;
  shiftSchedules?: ShiftSchedule[];
  setShiftSchedules?: React.Dispatch<React.SetStateAction<ShiftSchedule[]>>;
}

const EmployeeTimeClock: React.FC<TimeClockProps> = ({
  employees,
  setEmployees,
  currentUser,
  shiftSchedules = [],
  setShiftSchedules,
}) => {
  const { showToast } = useToast();

  // Load employees from backend
  const loadEmployees = useCallback(async () => {
    try {
      const fetchedEmployees = await employeesApi.getAll();
      // Map API response to Employee type
      const mappedEmployees: Employee[] = fetchedEmployees.map((emp) => ({
        id: emp.id,
        name: emp.name,
        role: emp.role as Role,
        pin: "", // Don't store PIN
        status: emp.status as "IN" | "OUT",
        lastClockIn: emp.lastClockIn ? new Date(emp.lastClockIn) : undefined,
        totalSales: emp.totalSales || 0,
        totalTips: emp.totalTips,
        hourlyRate: emp.hourlyRate,
        timeRecords:
          (emp as any).timeRecords?.map((tr: any) => ({
            id: tr.id,
            clockIn: new Date(tr.clockIn),
            clockOut: tr.clockOut ? new Date(tr.clockOut) : undefined,
            breaks:
              tr.breaks?.map((br: any) => ({
                id: br.id,
                startTime: new Date(br.startTime),
                endTime: br.endTime ? new Date(br.endTime) : undefined,
                type: br.type,
              })) || [],
          })) || [],
      }));
      setEmployees(mappedEmployees);
    } catch (error: any) {
      showToast("Failed to load employees", "error");
      console.error("Error loading employees:", error);
    }
  }, [setEmployees, showToast]);

  // Load employees on mount
  React.useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // Load shift schedules on mount
  const loadShiftSchedules = useCallback(async () => {
    if (!setShiftSchedules) return;

    try {
      const schedules = await shiftSchedulesApi.getAll();
      const mappedSchedules: ShiftSchedule[] = schedules.map((s) => ({
        id: s.id,
        employeeId: s.employeeId,
        startTime: new Date(s.startTime),
        endTime: new Date(s.endTime),
        dayOfWeek: s.dayOfWeek,
        isRecurring: s.isRecurring,
        endDate: s.endDate ? new Date(s.endDate) : undefined,
      }));
      setShiftSchedules(mappedSchedules);
    } catch (error: any) {
      console.error("Error loading shift schedules:", error);
      // Don't show toast for schedules - it's not critical
    }
  }, [setShiftSchedules]);

  React.useEffect(() => {
    loadShiftSchedules();
  }, [loadShiftSchedules]);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showEditEmployee, setShowEditEmployee] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(
    null
  );
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    role: Role.CASHIER,
    pin: "",
    hourlyRate: 0,
  });
  const [editEmployee, setEditEmployee] = useState({
    name: "",
    role: Role.CASHIER,
    pin: "",
    hourlyRate: 0,
  });
  const [activeTab, setActiveTab] = useState<
    "team" | "logs" | "schedule" | "payments"
  >("team");
  const [payrollPayments, setPayrollPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Load payroll payments
  const loadPayrollPayments = useCallback(async () => {
    if (activeTab !== "payments" || employees.length === 0) {
      if (activeTab !== "payments") {
        setPayrollPayments([]);
      }
      return;
    }

    setLoadingPayments(true);
    try {
      // Load payments for all employees
      const allPayments: any[] = [];
      for (const emp of employees) {
        try {
          const payments = await employeesApi.getPayrollPayments(emp.id);
          if (payments && payments.length > 0) {
            allPayments.push(
              ...payments.map((p: any) => ({
                ...p,
                employeeName: emp.name,
                employeeId: emp.id,
              }))
            );
          }
        } catch (error) {
          // Skip if employee has no payments or error
          console.debug(`No payments for employee ${emp.id}`);
        }
      }
      // Sort by payment date (newest first)
      allPayments.sort(
        (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
      );
      setPayrollPayments(allPayments);
    } catch (error: any) {
      showToast("Failed to load payment history", "error");
      console.error("Error loading payroll payments:", error);
    } finally {
      setLoadingPayments(false);
    }
  }, [employees, activeTab, showToast]);

  React.useEffect(() => {
    loadPayrollPayments();
  }, [loadPayrollPayments]);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ShiftSchedule | null>(
    null
  );
  const [showDeleteScheduleConfirm, setShowDeleteScheduleConfirm] =
    useState(false);
  const [scheduleToDelete, setScheduleToDelete] =
    useState<ShiftSchedule | null>(null);
  const [employeeToDeleteSchedules, setEmployeeToDeleteSchedules] =
    useState<Employee | null>(null);
  const [newSchedule, setNewSchedule] = useState({
    employeeId: "",
    startTime: "",
    endTime: "",
    selectedDays: [] as number[], // Array of selected days (1=Monday, 5=Friday)
    isRecurring: true,
    endDate: "",
  });
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [showBreakModal, setShowBreakModal] = useState<string | null>(null);
  const [breakType, setBreakType] = useState<"BREAK" | "LUNCH">("BREAK");
  const [showPayModal, setShowPayModal] = useState<Employee | null>(null);
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingRow) {
        const menuElement = menuRefs.current[editingRow];
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setEditingRow(null);
        }
      }
    };

    if (editingRow) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editingRow]);

  const toggleClock = async (id: string) => {
    try {
      const employee = employees.find((e) => e.id === id);
      if (!employee) return;

      const isClockingIn = employee.status === "OUT";

      let response;
      if (isClockingIn) {
        response = await employeesApi.clockIn(id);
      } else {
        response = await employeesApi.clockOut(id);
      }

      // Update local state with API response
      const updatedEmployee: Employee = {
        id: response.employee.id,
        name: response.employee.name,
        role: response.employee.role as Role,
        pin: "", // Don't store PIN
        status: response.employee.status as "IN" | "OUT",
        lastClockIn: response.employee.lastClockIn
          ? new Date(response.employee.lastClockIn)
          : undefined,
        totalSales: response.employee.totalSales || 0,
        totalTips: response.employee.totalTips,
        hourlyRate: response.employee.hourlyRate,
        timeRecords: [...(employee.timeRecords || [])],
      };

      // Update time records
      if (isClockingIn) {
        // Add new time record
        updatedEmployee.timeRecords = [
          {
            id: response.timeRecord.id,
            clockIn: new Date(response.timeRecord.clockIn),
            clockOut: response.timeRecord.clockOut
              ? new Date(response.timeRecord.clockOut)
              : undefined,
            breaks: response.timeRecord.breaks || [],
          },
          ...updatedEmployee.timeRecords,
        ];
      } else {
        // Update last time record
        const updatedRecords = [...updatedEmployee.timeRecords];
        if (updatedRecords.length > 0) {
          updatedRecords[0] = {
            id: response.timeRecord.id,
            clockIn: new Date(response.timeRecord.clockIn),
            clockOut: response.timeRecord.clockOut
              ? new Date(response.timeRecord.clockOut)
              : undefined,
            breaks: response.timeRecord.breaks.map((br: any) => ({
              id: br.id,
              startTime: new Date(br.startTime),
              endTime: br.endTime ? new Date(br.endTime) : undefined,
              type: br.type,
            })),
          };
        }
        updatedEmployee.timeRecords = updatedRecords;
      }

      setEmployees((prev) =>
        prev.map((e) => (e.id === id ? updatedEmployee : e))
      );
      showToast(
        `${isClockingIn ? "Clocked in" : "Clocked out"} successfully`,
        "success"
      );

      // Reload employees to get latest time records from database
      setTimeout(() => {
        loadEmployees();
      }, 500);
    } catch (error: any) {
      console.error("Clock in/out error:", error);
      showToast(error.message || "Failed to clock in/out", "error");
    }
  };

  const startBreak = async (employeeId: string, type: "BREAK" | "LUNCH") => {
    try {
      const response = await employeesApi.startBreak(employeeId, type);

      // Update local state
      setEmployees((prev) =>
        prev.map((e) => {
          if (e.id === employeeId && e.status === "IN") {
            const updatedRecords = [...(e.timeRecords || [])];
            if (updatedRecords.length > 0 && !updatedRecords[0].clockOut) {
              const newBreak: BreakRecord = {
                id: response.break.id,
                startTime: new Date(response.break.startTime),
                endTime: response.break.endTime
                  ? new Date(response.break.endTime)
                  : undefined,
                type: response.break.type,
              };
              updatedRecords[0] = {
                ...updatedRecords[0],
                breaks: [...(updatedRecords[0].breaks || []), newBreak],
              };
              return { ...e, timeRecords: updatedRecords };
            }
          }
          return e;
        })
      );

      setShowBreakModal(null);
      showToast(`${type === "BREAK" ? "Break" : "Lunch"} started`, "success");

      // Reload employees to get latest time records from database
      setTimeout(() => {
        loadEmployees();
      }, 500);
    } catch (error: any) {
      console.error("Start break error:", error);
      showToast(error.message || "Failed to start break", "error");
    }
  };

  const endBreak = async (employeeId: string) => {
    try {
      const response = await employeesApi.endBreak(employeeId);

      // Update local state
      setEmployees((prev) =>
        prev.map((e) => {
          if (e.id === employeeId && e.status === "IN") {
            const updatedRecords = [...(e.timeRecords || [])];
            if (updatedRecords.length > 0 && !updatedRecords[0].clockOut) {
              const updatedBreaks = updatedRecords[0].breaks.map((br) =>
                br.id === response.break.id
                  ? {
                      ...br,
                      endTime: new Date(response.break.endTime),
                    }
                  : br
              );
              updatedRecords[0] = {
                ...updatedRecords[0],
                breaks: updatedBreaks,
              };
              return { ...e, timeRecords: updatedRecords };
            }
          }
          return e;
        })
      );

      showToast("Break ended", "success");

      // Reload employees to get latest time records from database
      setTimeout(() => {
        loadEmployees();
      }, 500);
    } catch (error: any) {
      console.error("End break error:", error);
      showToast(error.message || "Failed to end break", "error");
    }
  };

  const getActiveBreak = (employee: Employee): BreakRecord | null => {
    if (
      employee.status !== "IN" ||
      !employee.timeRecords ||
      employee.timeRecords.length === 0
    )
      return null;
    const lastRecord = employee.timeRecords[employee.timeRecords.length - 1];
    if (
      lastRecord.clockOut ||
      !lastRecord.breaks ||
      lastRecord.breaks.length === 0
    )
      return null;
    const lastBreak = lastRecord.breaks[lastRecord.breaks.length - 1];
    return lastBreak.endTime ? null : lastBreak;
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.name.trim()) {
      showToast("Please enter employee name", "error");
      return;
    }
    if (
      !newEmployee.pin ||
      newEmployee.pin.length !== 4 ||
      !/^\d{4}$/.test(newEmployee.pin)
    ) {
      showToast("PIN must be exactly 4 digits", "error");
      return;
    }

    // Frontend validation (quick check before API call)
    if (employees.some((e) => e.pin === newEmployee.pin)) {
      showToast("This PIN is already in use", "error");
      return;
    }

    try {
      // Call backend API to create employee
      const createdEmployee = await employeesApi.create({
        name: newEmployee.name.trim(),
        role: newEmployee.role,
        pin: newEmployee.pin,
        hourlyRate: newEmployee.hourlyRate || undefined,
      });

      // Map API response to Employee type
      const employeeData: Employee = {
        id: createdEmployee.id,
        name: createdEmployee.name,
        role: createdEmployee.role as Role,
        pin: "", // Don't store PIN in frontend
        status: createdEmployee.status as "IN" | "OUT",
        totalSales: createdEmployee.totalSales || 0,
        totalTips: createdEmployee.totalTips,
        timeRecords: [],
        hourlyRate: createdEmployee.hourlyRate || undefined,
      };

      // Update local state
      setEmployees((prev) => [...prev, employeeData]);
      setNewEmployee({ name: "", role: Role.CASHIER, pin: "", hourlyRate: 0 });
      setShowAddEmployee(false);
      showToast(`${employeeData.name} has been added successfully`, "success");
    } catch (error: any) {
      // Handle API errors (including PIN already exists)
      const errorMessage = error.message || "Failed to create employee";
      showToast(errorMessage, "error");
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditEmployee({
      name: employee.name,
      role: employee.role,
      pin: employee.pin,
      hourlyRate: employee.hourlyRate || 0,
    });
    setShowEditEmployee(true);
  };

  const handleUpdateEmployee = () => {
    if (!editingEmployee) return;

    if (!editEmployee.name.trim()) {
      showToast("Please enter employee name", "error");
      return;
    }
    if (
      !editEmployee.pin ||
      editEmployee.pin.length !== 4 ||
      !/^\d{4}$/.test(editEmployee.pin)
    ) {
      showToast("PIN must be exactly 4 digits", "error");
      return;
    }
    // Check if PIN is already in use by another employee
    if (
      employees.some(
        (e) => e.pin === editEmployee.pin && e.id !== editingEmployee.id
      )
    ) {
      showToast("This PIN is already in use", "error");
      return;
    }

    setEmployees((prev) =>
      prev.map((e) => {
        if (e.id === editingEmployee.id) {
          return {
            ...e,
            name: editEmployee.name.trim(),
            role: editEmployee.role,
            pin: editEmployee.pin,
            hourlyRate: editEmployee.hourlyRate || 0,
            totalTips:
              editEmployee.role === Role.SERVER ? e.totalTips ?? 0 : undefined,
          };
        }
        return e;
      })
    );

    setShowEditEmployee(false);
    setEditingEmployee(null);
    setEditEmployee({ name: "", role: Role.CASHIER, pin: "", hourlyRate: 0 });
    showToast("Employee updated successfully", "success");
  };

  const handleDeleteEmployee = (employee: Employee) => {
    if (employee.id === currentUser.id) {
      showToast("You cannot delete your own account", "error");
      return;
    }

    setEmployeeToDelete(employee);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteEmployee = async () => {
    if (!employeeToDelete) {
      setShowDeleteConfirm(false);
      return;
    }

    try {
      await employeesApi.delete(employeeToDelete.id);

      // Update local state
      setEmployees((prev) => prev.filter((e) => e.id !== employeeToDelete.id));
      showToast(`${employeeToDelete.name} has been deleted`, "success");
      setEmployeeToDelete(null);
      setShowDeleteConfirm(false);
    } catch (error: any) {
      showToast(error.message || "Failed to delete employee", "error");
      setShowDeleteConfirm(false);
    }
  };

  const handleViewHistory = (employeeId: string) => {
    setFilterEmployeeId(employeeId);
    setActiveTab("logs");
  };

  const allTimeRecords = useMemo(() => {
    const records: Array<{ employee: Employee; record: TimeRecord }> = [];
    employees.forEach((emp) => {
      if (emp.timeRecords && emp.timeRecords.length > 0) {
        emp.timeRecords.forEach((record) => {
          records.push({ employee: emp, record });
        });
      }
    });
    return records.sort(
      (a, b) =>
        new Date(b.record.clockIn).getTime() -
        new Date(a.record.clockIn).getTime()
    );
  }, [employees]);

  const filteredTimeRecords = useMemo(() => {
    let filtered = allTimeRecords;

    // Filter by employee
    if (filterEmployeeId !== "all") {
      filtered = filtered.filter((tr) => tr.employee.id === filterEmployeeId);
    }

    // Filter by date
    if (dateFilter !== "all") {
      const today = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
        case "today":
          filtered = filtered.filter((tr) => {
            const clockIn = new Date(tr.record.clockIn);
            return clockIn.toDateString() === today.toDateString();
          });
          break;
        case "week":
          filterDate.setDate(today.getDate() - 7);
          filtered = filtered.filter((tr) => {
            const clockIn = new Date(tr.record.clockIn);
            return clockIn >= filterDate;
          });
          break;
        case "month":
          filterDate.setMonth(today.getMonth() - 1);
          filtered = filtered.filter((tr) => {
            const clockIn = new Date(tr.record.clockIn);
            return clockIn >= filterDate;
          });
          break;
      }
    }

    return filtered;
  }, [allTimeRecords, filterEmployeeId, dateFilter]);

  // Calculate hours worked for an employee
  const calculateHoursWorked = (
    employee: Employee,
    period: "week" | "month" | "all" = "all"
  ): number => {
    if (!employee.timeRecords || employee.timeRecords.length === 0) return 0;

    let records = employee.timeRecords;
    const now = new Date();

    if (period === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      records = records.filter((r) => new Date(r.clockIn) >= weekAgo);
    } else if (period === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      records = records.filter((r) => new Date(r.clockIn) >= monthAgo);
    }

    let totalHours = 0;
    records.forEach((record) => {
      if (record.clockOut) {
        const hours =
          (new Date(record.clockOut).getTime() -
            new Date(record.clockIn).getTime()) /
          (1000 * 60 * 60);
        totalHours += hours;
      } else if (employee.status === "IN" && record.clockIn) {
        // Currently clocked in
        const hours =
          (now.getTime() - new Date(record.clockIn).getTime()) /
          (1000 * 60 * 60);
        totalHours += hours;
      }
    });

    return Math.round(totalHours * 100) / 100; // Round to 2 decimal places
  };

  // Calculate overtime hours for an employee (hours over 40 per week)
  const calculateOvertimeHours = (
    employee: Employee,
    period: "week" | "month" | "all" = "all"
  ): number => {
    if (period === "week") {
      const hoursWorked = calculateHoursWorked(employee, "week");
      return Math.max(0, hoursWorked - 40); // Overtime is hours over 40 per week
    } else if (period === "month") {
      // For monthly, calculate weekly average and apply overtime threshold
      const hoursWorked = calculateHoursWorked(employee, "month");
      const weeksInMonth = 4.33; // Average weeks per month
      const weeklyAverage = hoursWorked / weeksInMonth;
      const weeklyOvertime = Math.max(0, weeklyAverage - 40);
      return Math.round(weeklyOvertime * weeksInMonth * 100) / 100;
    } else {
      // For 'all', calculate based on weekly periods
      const hoursWorked = calculateHoursWorked(employee, "all");
      // Estimate weeks worked based on total hours (assuming 40 hour weeks)
      const estimatedWeeks = hoursWorked / 40;
      const weeklyAverage = hoursWorked / Math.max(1, estimatedWeeks);
      const weeklyOvertime = Math.max(0, weeklyAverage - 40);
      return Math.round(weeklyOvertime * estimatedWeeks * 100) / 100;
    }
  };

  // Calculate gross pay for an employee (including overtime at 1.5x rate)
  const calculateGrossPay = (
    employee: Employee,
    period: "week" | "month" | "all" = "all"
  ): number => {
    const regularHours = calculateHoursWorked(employee, period);
    const overtimeHours = calculateOvertimeHours(employee, period);
    const rate = employee.hourlyRate || 0;

    const regularPay = Math.max(0, regularHours - overtimeHours) * rate;
    const overtimePay = overtimeHours * rate * 1.5; // Overtime at 1.5x rate

    return Math.round((regularPay + overtimePay) * 100) / 100;
  };

  return (
    <div className="flex flex-col h-full p-6 bg-white overflow-hidden">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">
            Payroll & Time
          </p>
          <h1 className="text-3xl font-black tracking-tighter text-black uppercase">
            Payroll
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-2 border border-gray-200 rounded-xl p-1">
            <button
              onClick={() => setActiveTab("team")}
              className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all
                ${
                  activeTab === "team"
                    ? "bg-black text-white"
                    : "text-gray-500 hover:text-black"
                }`}
            >
              Time Clock
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2
                ${
                  activeTab === "logs"
                    ? "bg-black text-white"
                    : "text-gray-500 hover:text-black"
                }`}
            >
              <History size={12} />
              Time Records
            </button>
            {currentUser.role === Role.MANAGER && (
              <>
                <button
                  onClick={() => setActiveTab("schedule")}
                  className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2
                    ${
                      activeTab === "schedule"
                        ? "bg-black text-white"
                        : "text-gray-500 hover:text-black"
                    }`}
                >
                  <CalendarDays size={12} />
                  Schedule
                </button>
                <button
                  onClick={() => setActiveTab("payments")}
                  className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2
                    ${
                      activeTab === "payments"
                        ? "bg-black text-white"
                        : "text-gray-500 hover:text-black"
                    }`}
                >
                  <DollarSign size={12} />
                  Payment History
                </button>
              </>
            )}
          </div>
          {activeTab === "team" && currentUser.role === Role.MANAGER && (
            <button
              onClick={() => setShowAddEmployee(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
            >
              <UserPlus size={14} /> New Employee
            </button>
          )}
          {activeTab === "logs" && currentUser.role === Role.MANAGER && (
            <button
              onClick={() => {
                const csvData = employees.map((emp) => {
                  const hours = calculateHoursWorked(emp, "month");
                  const overtime = calculateOvertimeHours(emp, "month");
                  const grossPay = calculateGrossPay(emp, "month");
                  return {
                    "Employee ID": emp.id,
                    Name: emp.name,
                    Role: emp.role,
                    "Hours Worked": hours.toFixed(2),
                    "Overtime Hours": overtime.toFixed(2),
                    "Hourly Rate": emp.hourlyRate || 0,
                    "Regular Pay": (
                      (hours - overtime) *
                      (emp.hourlyRate || 0)
                    ).toFixed(2),
                    "Overtime Pay": (
                      overtime *
                      (emp.hourlyRate || 0) *
                      1.5
                    ).toFixed(2),
                    "Gross Pay": grossPay.toFixed(2),
                  };
                });
                const headers = Object.keys(csvData[0] || {});
                const csvContent = [
                  headers.join(","),
                  ...csvData.map((row) =>
                    headers
                      .map((h) => `"${row[h as keyof typeof row]}"`)
                      .join(",")
                  ),
                ].join("\n");
                const blob = new Blob([csvContent], { type: "text/csv" });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `payroll-${
                  new Date().toISOString().split("T")[0]
                }.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
                showToast("Payroll exported successfully", "success");
              }}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
            >
              <Download size={14} /> Export Payroll
            </button>
          )}
        </div>
      </div>

      {activeTab === "team" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full overflow-hidden">
          <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                  <tr className="text-gray-400 text-[8px] font-black uppercase tracking-widest">
                    <th className="px-6 py-4">Staff</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Output</th>
                    <th className="px-6 py-4">Time In/Out</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {employees.map((emp) => (
                    <React.Fragment key={emp.id}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs transition-all
                            ${
                              emp.status === "IN"
                                ? "bg-black text-white"
                                : "bg-gray-100 text-gray-400"
                            }`}
                            >
                              {emp.name[0]}
                            </div>
                            <div>
                              <p className="font-black text-black text-xs">
                                {emp.name}
                              </p>
                              <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">
                                Employee #{emp.id}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">
                            {emp.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs font-black text-black">
                            {calculateHoursWorked(emp, "week")} hrs
                          </div>
                          {calculateOvertimeHours(emp, "week") > 0 && (
                            <div className="text-[8px] text-orange-600 font-bold">
                              +{calculateOvertimeHours(emp, "week")} OT
                            </div>
                          )}
                          {emp.hourlyRate ? (
                            <div className="text-[8px] text-gray-400 font-bold">
                              ₱{emp.hourlyRate}/hr
                            </div>
                          ) : (
                            <div className="text-[8px] text-gray-300 font-bold">
                              No rate set
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs font-black text-black">
                            ₱{calculateGrossPay(emp, "week").toLocaleString()}
                          </div>
                          <div className="text-[8px] text-gray-400 font-bold">
                            This week
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {emp.status === "IN" && emp.lastClockIn && (
                              <div className="flex items-center gap-1 text-[9px] font-bold text-black">
                                <Clock size={10} />
                                <span>
                                  In:{" "}
                                  {new Date(emp.lastClockIn).toLocaleTimeString(
                                    "en-US",
                                    { hour: "2-digit", minute: "2-digit" }
                                  )}
                                </span>
                              </div>
                            )}
                            {emp.timeRecords && emp.timeRecords.length > 0 && (
                              <button
                                onClick={() => handleViewHistory(emp.id)}
                                className="text-[8px] font-black text-gray-500 uppercase tracking-widest hover:text-black transition-colors flex items-center gap-1"
                              >
                                <Calendar size={10} />
                                View History ({emp.timeRecords.length})
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(() => {
                              const activeBreak = getActiveBreak(emp);
                              return emp.status === "IN" && !activeBreak ? (
                                <>
                                  <button
                                    onClick={() => {
                                      setShowBreakModal(emp.id);
                                      setBreakType("BREAK");
                                    }}
                                    disabled={
                                      currentUser.role !== Role.MANAGER &&
                                      emp.id !== currentUser.id
                                    }
                                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all bg-blue-100 text-blue-700 hover:bg-blue-200 ${
                                      currentUser.role !== Role.MANAGER &&
                                      emp.id !== currentUser.id
                                        ? "opacity-20 cursor-not-allowed"
                                        : ""
                                    }`}
                                  >
                                    <Coffee size={10} className="inline mr-1" />{" "}
                                    Break
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowBreakModal(emp.id);
                                      setBreakType("LUNCH");
                                    }}
                                    disabled={
                                      currentUser.role !== Role.MANAGER &&
                                      emp.id !== currentUser.id
                                    }
                                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all bg-orange-100 text-orange-700 hover:bg-orange-200 ${
                                      currentUser.role !== Role.MANAGER &&
                                      emp.id !== currentUser.id
                                        ? "opacity-20 cursor-not-allowed"
                                        : ""
                                    }`}
                                  >
                                    <UtensilsCrossed
                                      size={10}
                                      className="inline mr-1"
                                    />{" "}
                                    Lunch
                                  </button>
                                </>
                              ) : activeBreak ? (
                                <button
                                  onClick={() => endBreak(emp.id)}
                                  disabled={
                                    currentUser.role !== Role.MANAGER &&
                                    emp.id !== currentUser.id
                                  }
                                  className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all bg-green-100 text-green-700 hover:bg-green-200 ${
                                    currentUser.role !== Role.MANAGER &&
                                    emp.id !== currentUser.id
                                      ? "opacity-20 cursor-not-allowed"
                                      : ""
                                  }`}
                                >
                                  End {activeBreak.type}
                                </button>
                              ) : null;
                            })()}
                            <button
                              onClick={() => toggleClock(emp.id)}
                              disabled={
                                currentUser.role !== Role.MANAGER &&
                                emp.id !== currentUser.id
                              }
                              className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${
                                emp.status === "OUT"
                                  ? "bg-black text-white hover:scale-105"
                                  : "bg-gray-100 text-gray-400 hover:text-black hover:bg-white border hover:border-black"
                              } ${
                                currentUser.role !== Role.MANAGER &&
                                emp.id !== currentUser.id
                                  ? "opacity-20 cursor-not-allowed"
                                  : ""
                              }`}
                            >
                              {emp.status === "OUT" ? (
                                <LogIn size={10} className="inline mr-1" />
                              ) : (
                                <LogOut size={10} className="inline mr-1" />
                              )}
                              {emp.status === "OUT" ? "In" : "Out"}
                            </button>
                            {currentUser.role === Role.MANAGER && (
                              <div
                                className="relative"
                                ref={(el) => {
                                  if (el) menuRefs.current[emp.id] = el;
                                }}
                              >
                                <button
                                  onClick={() => {
                                    setEditingRow(
                                      editingRow === emp.id ? null : emp.id
                                    );
                                  }}
                                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  <MoreVertical
                                    size={14}
                                    className="text-gray-600"
                                  />
                                </button>
                                {editingRow === emp.id && (
                                  <div className="absolute right-0 top-10 z-20 bg-white rounded-xl border border-gray-200 shadow-2xl p-2 min-w-[140px]">
                                    <button
                                      onClick={() => {
                                        handleEditEmployee(emp);
                                        setEditingRow(null);
                                      }}
                                      className="w-full text-left px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                                    >
                                      <Edit2 size={12} />
                                      Edit
                                    </button>
                                    {emp.id !== currentUser.id && (
                                      <button
                                        onClick={() => {
                                          handleDeleteEmployee(emp);
                                          setEditingRow(null);
                                        }}
                                        className="w-full text-left px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all hover:bg-red-50 text-red-600 flex items-center gap-2 mt-1"
                                      >
                                        <Trash2 size={12} />
                                        Delete
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        setShowPayModal(emp);
                                        setEditingRow(null);
                                      }}
                                      className="w-full text-left px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all hover:bg-green-50 text-green-600 flex items-center gap-2 mt-1"
                                      disabled={
                                        calculateGrossPay(emp, "week") === 0
                                      }
                                    >
                                      <UserCheck size={12} />
                                      Mark as Paid
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-black text-white p-6 rounded-2xl shadow-xl">
              <div className="flex items-center gap-2 mb-6">
                <Clock size={16} />
                <h3 className="text-xs font-black uppercase tracking-widest">
                  Payroll Summary
                </h3>
              </div>
              <div className="space-y-4 mb-4">
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    Total Hours (Week)
                  </span>
                  <span className="font-black text-sm">
                    {employees
                      .reduce(
                        (sum, emp) => sum + calculateHoursWorked(emp, "week"),
                        0
                      )
                      .toFixed(1)}{" "}
                    hrs
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    Total Gross Pay
                  </span>
                  <span className="font-black text-sm">
                    ₱
                    {employees
                      .reduce(
                        (sum, emp) => sum + calculateGrossPay(emp, "week"),
                        0
                      )
                      .toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    Active Employees
                  </span>
                  <span className="font-black text-sm">
                    {employees.filter((e) => e.status === "IN").length}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Award size={14} />
                <h3 className="font-black text-[9px] uppercase tracking-widest">
                  Top Performers
                </h3>
              </div>
              {employees
                .sort((a, b) => b.totalSales - a.totalSales)
                .slice(0, 3)
                .map((emp, i) => (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest truncate max-w-[100px]">
                      {i + 1}. {emp.name}
                    </span>
                    <span className="font-black text-xs text-black">
                      ₱{emp.totalSales.toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "logs" && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-gray-400" />
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    Filters
                  </span>
                </div>
                <select
                  value={filterEmployeeId}
                  onChange={(e) => setFilterEmployeeId(e.target.value)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-[9px] font-black uppercase tracking-widest focus:outline-none focus:border-black transition-all"
                >
                  <option value="all">All Employees</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-[9px] font-black uppercase tracking-widest focus:outline-none focus:border-black transition-all"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                {filteredTimeRecords.length} Records
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {filteredTimeRecords.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-300">
                  <div className="text-center">
                    <History size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-[10px] font-black uppercase tracking-widest">
                      No Time Records
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTimeRecords.map(({ employee, record }) => {
                    const clockIn = new Date(record.clockIn);
                    const clockOut = record.clockOut
                      ? new Date(record.clockOut)
                      : null;
                    const duration = clockOut
                      ? Math.floor(
                          (clockOut.getTime() - clockIn.getTime()) / 1000 / 60
                        )
                      : null;

                    return (
                      <div
                        key={record.id}
                        className="p-4 rounded-xl border border-gray-200 hover:border-black transition-all bg-white"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs
                              ${
                                employee.status === "IN"
                                  ? "bg-black text-white"
                                  : "bg-gray-100 text-gray-400"
                              }`}
                            >
                              {employee.name[0]}
                            </div>
                            <div>
                              <div className="text-sm font-black text-black">
                                {employee.name}
                              </div>
                              <div className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">
                                {employee.role}
                              </div>
                            </div>
                          </div>
                          {!clockOut && (
                            <div className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-[8px] font-black uppercase tracking-widest">
                              In Progress
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">
                              Clock In
                            </div>
                            <div className="text-xs font-black text-black">
                              {clockIn.toLocaleDateString()}
                            </div>
                            <div className="text-[10px] font-bold text-gray-600">
                              {clockIn.toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                          {clockOut ? (
                            <>
                              <div>
                                <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                  Clock Out
                                </div>
                                <div className="text-xs font-black text-black">
                                  {clockOut.toLocaleDateString()}
                                </div>
                                <div className="text-[10px] font-bold text-gray-600">
                                  {clockOut.toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </div>
                              <div>
                                <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                  Duration
                                </div>
                                <div className="text-xs font-black text-black">
                                  {duration !== null
                                    ? `${Math.floor(duration / 60)}h ${
                                        duration % 60
                                      }m`
                                    : "N/A"}
                                </div>
                                <div className="text-[10px] font-bold text-gray-600">
                                  {duration !== null
                                    ? `${duration} minutes`
                                    : ""}
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="col-span-2">
                              <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                Status
                              </div>
                              <div className="text-xs font-black text-yellow-700">
                                Currently Clocked In
                              </div>
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
        </div>
      )}

      {activeTab === "schedule" && currentUser.role === Role.MANAGER && (
        <div className="flex-1 overflow-y-auto pt-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black uppercase tracking-widest">
              Shift Schedules
            </h3>
            <button
              onClick={() => {
                setNewSchedule({
                  employeeId: "",
                  startTime: "",
                  endTime: "",
                  selectedDays: [],
                  isRecurring: true,
                  endDate: "",
                });
                setEditingSchedule(null);
                setShowScheduleModal(true);
              }}
              className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
            >
              <CalendarDays size={14} /> New Schedule
            </button>
          </div>

          {/* Employee List */}
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employees.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                    <UserPlus className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-gray-900 text-lg mb-2">
                      No Employees Added
                    </p>
                    <p className="text-sm text-gray-500 mb-4 max-w-md">
                      Start by adding employees to manage schedules and track
                      time
                    </p>
                    <button
                      onClick={() => setShowAddEmployeeModal(true)}
                      className="px-6 py-3 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors flex items-center gap-2 mx-auto"
                    >
                      <UserPlus size={16} />
                      Add First Employee
                    </button>
                  </div>
                </div>
              ) : (
                employees.map((employee) => {
                  const employeeSchedules = shiftSchedules.filter(
                    (s) => s.employeeId === employee.id
                  );
                  const scheduleCount = employeeSchedules.length;
                  const dayNames = [
                    "Sun",
                    "Mon",
                    "Tue",
                    "Wed",
                    "Thu",
                    "Fri",
                    "Sat",
                  ];
                  const scheduledDays = employeeSchedules
                    .map((s) => dayNames[s.dayOfWeek])
                    .join(", ");

                  return (
                    <div
                      key={employee.id}
                      className="bg-white rounded-xl border border-gray-100 p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm
                          ${
                            employee.status === "IN"
                              ? "bg-black text-white"
                              : "bg-gray-100 text-gray-400"
                          }`}
                          >
                            {employee.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-black text-black truncate">
                              {employee.name}
                            </h4>
                            <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">
                              {employee.role}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mb-3 space-y-1">
                        <div className="flex items-center justify-between text-[9px]">
                          <span className="text-gray-500 font-bold">
                            Schedules:
                          </span>
                          <span className="text-black font-black">
                            {scheduleCount}
                          </span>
                        </div>
                        {scheduleCount > 0 && (
                          <div className="text-[8px] text-gray-400 font-bold">
                            Days: {scheduledDays || "None"}
                          </div>
                        )}
                        {scheduleCount === 0 && (
                          <div className="text-[8px] text-gray-400 font-bold italic">
                            No schedules assigned
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (scheduleCount === 0) {
                              setNewSchedule({
                                employeeId: employee.id,
                                startTime: "",
                                endTime: "",
                                selectedDays: [],
                                isRecurring: true,
                                endDate: "",
                              });
                              setEditingSchedule(null);
                              setShowScheduleModal(true);
                            } else {
                              // Load all schedules for this employee - use the first one's times as default
                              const firstSchedule = employeeSchedules[0];
                              const startTime = new Date(
                                firstSchedule.startTime
                              )
                                .toTimeString()
                                .slice(0, 5);
                              const endTime = new Date(firstSchedule.endTime)
                                .toTimeString()
                                .slice(0, 5);
                              // Get all days that have schedules for this employee
                              const allDays = employeeSchedules.map(
                                (s) => s.dayOfWeek
                              );
                              // Check if all schedules have the same times and recurring setting
                              const allSameTime = employeeSchedules.every(
                                (s) => {
                                  const sStart = new Date(s.startTime)
                                    .toTimeString()
                                    .slice(0, 5);
                                  const sEnd = new Date(s.endTime)
                                    .toTimeString()
                                    .slice(0, 5);
                                  return (
                                    sStart === startTime && sEnd === endTime
                                  );
                                }
                              );
                              const allRecurring = employeeSchedules.every(
                                (s) =>
                                  s.isRecurring === firstSchedule.isRecurring
                              );
                              const allEndDate = employeeSchedules.every(
                                (s) => {
                                  const firstEnd = firstSchedule.endDate
                                    ? new Date(firstSchedule.endDate)
                                        .toISOString()
                                        .split("T")[0]
                                    : "";
                                  const sEnd = s.endDate
                                    ? new Date(s.endDate)
                                        .toISOString()
                                        .split("T")[0]
                                    : "";
                                  return firstEnd === sEnd;
                                }
                              );

                              setEditingSchedule(firstSchedule);
                              setNewSchedule({
                                employeeId: firstSchedule.employeeId,
                                startTime: startTime,
                                endTime: endTime,
                                selectedDays: allDays, // Show all days that have schedules
                                isRecurring: allRecurring
                                  ? firstSchedule.isRecurring
                                  : true,
                                endDate:
                                  allEndDate && firstSchedule.endDate
                                    ? new Date(firstSchedule.endDate)
                                        .toISOString()
                                        .split("T")[0]
                                    : "",
                              });
                              setShowScheduleModal(true);
                            }
                          }}
                          className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center gap-2"
                          title={
                            scheduleCount === 0
                              ? "Add schedule"
                              : "Edit schedules"
                          }
                        >
                          <Edit2 size={12} className="text-gray-600" />
                          <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest">
                            {scheduleCount === 0 ? "Add" : "Edit"}
                          </span>
                        </button>
                        {scheduleCount > 0 && (
                          <button
                            onClick={() => {
                              setEmployeeToDeleteSchedules(employee);
                              setShowDeleteScheduleConfirm(true);
                            }}
                            className="px-3 py-2 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center gap-2"
                            title="Delete all schedules"
                          >
                            <Trash2 size={12} className="text-red-600" />
                            <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">
                              Delete
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Day-by-Day Grid View */}
          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
              (day, idx) => (
                <div
                  key={day}
                  className="bg-white rounded-xl border border-gray-100 p-4"
                >
                  <h4 className="text-xs font-black uppercase tracking-widest mb-3">
                    {day}
                  </h4>
                  <div className="space-y-2">
                    {shiftSchedules
                      .filter((s) => s.dayOfWeek === idx)
                      .map((schedule) => {
                        const employee = employees.find(
                          (e) => e.id === schedule.employeeId
                        );
                        return (
                          <div
                            key={schedule.id}
                            className="p-2 bg-gray-50 rounded-lg text-[8px]"
                          >
                            <p className="font-black">
                              {employee?.name || "Unknown"}
                            </p>
                            <p className="text-gray-600">
                              {new Date(schedule.startTime).toLocaleTimeString(
                                "en-US",
                                { hour: "2-digit", minute: "2-digit" }
                              )}{" "}
                              -{" "}
                              {new Date(schedule.endTime).toLocaleTimeString(
                                "en-US",
                                { hour: "2-digit", minute: "2-digit" }
                              )}
                            </p>
                            {schedule.isRecurring && (
                              <p className="text-gray-400">Recurring</p>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && setShiftSchedules && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-black tracking-tighter mb-4">
              {editingSchedule ? "Edit Schedule" : "New Schedule"}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              {editingSchedule
                ? "Edit the schedule details below."
                : "Select multiple days to create schedules for the same time slot."}
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Employee
                </label>
                <select
                  value={newSchedule.employeeId}
                  onChange={(e) =>
                    setNewSchedule((prev) => ({
                      ...prev,
                      employeeId: e.target.value,
                    }))
                  }
                  disabled={!!editingSchedule}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-black disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">
                    Days of Week
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (newSchedule.selectedDays.length === 7) {
                        // Deselect all
                        setNewSchedule((prev) => ({
                          ...prev,
                          selectedDays: [],
                        }));
                      } else {
                        // Select all
                        setNewSchedule((prev) => ({
                          ...prev,
                          selectedDays: [0, 1, 2, 3, 4, 5, 6],
                        }));
                      }
                    }}
                    className="text-[8px] font-black text-gray-600 uppercase tracking-widest hover:text-black transition-colors"
                  >
                    {newSchedule.selectedDays.length === 7
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 0, label: "Sunday" },
                      { value: 1, label: "Monday" },
                      { value: 2, label: "Tuesday" },
                      { value: 3, label: "Wednesday" },
                      { value: 4, label: "Thursday" },
                      { value: 5, label: "Friday" },
                      { value: 6, label: "Saturday" },
                    ].map((day) => (
                      <label
                        key={day.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={newSchedule.selectedDays.includes(day.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewSchedule((prev) => ({
                                ...prev,
                                selectedDays: [...prev.selectedDays, day.value],
                              }));
                            } else {
                              setNewSchedule((prev) => ({
                                ...prev,
                                selectedDays: prev.selectedDays.filter(
                                  (d) => d !== day.value
                                ),
                              }));
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                        />
                        <span className="text-xs font-bold text-gray-700">
                          {day.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={newSchedule.startTime}
                    onChange={(e) =>
                      setNewSchedule((prev) => ({
                        ...prev,
                        startTime: e.target.value,
                      }))
                    }
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={newSchedule.endTime}
                    onChange={(e) =>
                      setNewSchedule((prev) => ({
                        ...prev,
                        endTime: e.target.value,
                      }))
                    }
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-black"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newSchedule.isRecurring}
                  onChange={(e) =>
                    setNewSchedule((prev) => ({
                      ...prev,
                      isRecurring: e.target.checked,
                    }))
                  }
                  className="w-4 h-4"
                />
                <label className="text-xs font-black">Recurring Weekly</label>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    if (
                      !newSchedule.employeeId ||
                      !newSchedule.startTime ||
                      !newSchedule.endTime
                    ) {
                      showToast("Please fill all fields", "error");
                      return;
                    }
                    if (newSchedule.selectedDays.length === 0) {
                      showToast("Please select at least one day", "error");
                      return;
                    }

                    try {
                      if (editingSchedule) {
                        // Update schedules for this employee - handle day changes
                        const employeeSchedules = shiftSchedules.filter(
                          (s) => s.employeeId === editingSchedule.employeeId
                        );
                        const existingDays = employeeSchedules.map(
                          (s) => s.dayOfWeek
                        );
                        const selectedDays = newSchedule.selectedDays;

                        // Days to delete (in existing but not in selected)
                        const daysToDelete = existingDays.filter(
                          (day) => !selectedDays.includes(day)
                        );
                        // Days to update (in both existing and selected)
                        const daysToUpdate = existingDays.filter((day) =>
                          selectedDays.includes(day)
                        );
                        // Days to create (in selected but not in existing)
                        const daysToCreate = selectedDays.filter(
                          (day) => !existingDays.includes(day)
                        );

                        const promises: Promise<any>[] = [];

                        // Delete schedules for removed days
                        for (const day of daysToDelete) {
                          const scheduleToDelete = employeeSchedules.find(
                            (s) => s.dayOfWeek === day
                          );
                          if (scheduleToDelete) {
                            promises.push(
                              shiftSchedulesApi.delete(scheduleToDelete.id)
                            );
                          }
                        }

                        // Update schedules for existing days
                        for (const day of daysToUpdate) {
                          const scheduleToUpdate = employeeSchedules.find(
                            (s) => s.dayOfWeek === day
                          );
                          if (scheduleToUpdate) {
                            promises.push(
                              shiftSchedulesApi.update(scheduleToUpdate.id, {
                                startTime: `2000-01-01T${newSchedule.startTime}`,
                                endTime: `2000-01-01T${newSchedule.endTime}`,
                                dayOfWeek: day,
                                isRecurring: newSchedule.isRecurring,
                                endDate: newSchedule.endDate || undefined,
                              })
                            );
                          }
                        }

                        // Create schedules for new days
                        if (daysToCreate.length > 0) {
                          promises.push(
                            shiftSchedulesApi.create({
                              employeeId: editingSchedule.employeeId,
                              startTime: `2000-01-01T${newSchedule.startTime}`,
                              endTime: `2000-01-01T${newSchedule.endTime}`,
                              daysOfWeek: daysToCreate,
                              isRecurring: newSchedule.isRecurring,
                              endDate: newSchedule.endDate || undefined,
                            })
                          );
                        }

                        await Promise.all(promises);

                        // Reload schedules from backend
                        await loadShiftSchedules();

                        const actions = [];
                        if (daysToDelete.length > 0)
                          actions.push(`deleted ${daysToDelete.length}`);
                        if (daysToUpdate.length > 0)
                          actions.push(`updated ${daysToUpdate.length}`);
                        if (daysToCreate.length > 0)
                          actions.push(`created ${daysToCreate.length}`);

                        showToast(
                          `Schedule changes: ${actions.join(", ")}`,
                          "success"
                        );
                      } else {
                        // Create new schedules for selected days
                        const createdSchedules = await shiftSchedulesApi.create(
                          {
                            employeeId: newSchedule.employeeId,
                            startTime: `2000-01-01T${newSchedule.startTime}`,
                            endTime: `2000-01-01T${newSchedule.endTime}`,
                            daysOfWeek: newSchedule.selectedDays,
                            isRecurring: newSchedule.isRecurring,
                            endDate: newSchedule.endDate || undefined,
                          }
                        );

                        const schedulesData: ShiftSchedule[] =
                          createdSchedules.map((s) => ({
                            id: s.id,
                            employeeId: s.employeeId,
                            startTime: new Date(s.startTime),
                            endTime: new Date(s.endTime),
                            dayOfWeek: s.dayOfWeek,
                            isRecurring: s.isRecurring,
                            endDate: s.endDate
                              ? new Date(s.endDate)
                              : undefined,
                          }));

                        if (setShiftSchedules) {
                          setShiftSchedules((prev) => [
                            ...prev,
                            ...schedulesData,
                          ]);
                        }
                        showToast(
                          `Schedule created for ${newSchedule.selectedDays.length} day(s)`,
                          "success"
                        );
                      }

                      setShowScheduleModal(false);
                      setEditingSchedule(null);
                      setNewSchedule({
                        employeeId: "",
                        startTime: "",
                        endTime: "",
                        selectedDays: [],
                        isRecurring: true,
                        endDate: "",
                      });
                      // Reload schedules from backend
                      await loadShiftSchedules();
                    } catch (error: any) {
                      showToast(
                        error.message || "Failed to save schedule",
                        "error"
                      );
                    }
                  }}
                  className="flex-1 py-4 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowScheduleModal(false);
                    setEditingSchedule(null);
                    setNewSchedule({
                      employeeId: "",
                      startTime: "",
                      endTime: "",
                      selectedDays: [],
                      isRecurring: true,
                      endDate: "",
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

      {activeTab === "payments" && currentUser.role === Role.MANAGER && (
        <div className="flex-1 overflow-y-auto pt-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black uppercase tracking-widest">
              Payment History
            </h3>
            <button
              onClick={loadPayrollPayments}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-gray-200 transition-all"
              disabled={loadingPayments}
            >
              <History size={12} /> {loadingPayments ? "Loading..." : "Refresh"}
            </button>
          </div>

          {loadingPayments ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-t-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 text-sm font-medium">
                  Loading payment history...
                </p>
              </div>
            </div>
          ) : payrollPayments.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <DollarSign size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  No Payment History
                </p>
                <p className="text-[9px] text-gray-500 mt-2">
                  Payments will appear here after salaries are marked as paid
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {payrollPayments.map((payment: any) => {
                const paidDate = new Date(payment.paidAt);
                const periodStart = new Date(payment.periodStart);
                const periodEnd = new Date(payment.periodEnd);

                return (
                  <div
                    key={payment.id}
                    className="bg-white rounded-xl border border-gray-100 p-6 hover:border-black transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-green-100 text-green-700 flex items-center justify-center font-black text-sm">
                          <DollarSign size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-black">
                            {payment.employeeName}
                          </h4>
                          <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">
                            Period: {periodStart.toLocaleDateString()} -{" "}
                            {periodEnd.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-black">
                          ₱{parseFloat(payment.amount).toLocaleString()}
                        </div>
                        <div className="text-[8px] font-bold text-gray-500">
                          {paidDate.toLocaleDateString()}{" "}
                          {paidDate.toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                      <div>
                        <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">
                          Hours Worked
                        </div>
                        <div className="text-sm font-black text-black">
                          {parseFloat(payment.hoursWorked).toFixed(2)} hrs
                        </div>
                      </div>
                      <div>
                        <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">
                          Regular Pay
                        </div>
                        <div className="text-sm font-black text-black">
                          ₱{parseFloat(payment.regularPay).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">
                          Overtime Pay
                        </div>
                        <div className="text-sm font-black text-black">
                          ₱{parseFloat(payment.overtimePay).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">
                          Paid By
                        </div>
                        <div className="text-sm font-black text-black">
                          {payment.paidByEmployee?.name || "Unknown"}
                        </div>
                      </div>
                    </div>

                    {payment.notes && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">
                          Notes
                        </div>
                        <div className="text-xs font-bold text-gray-600">
                          {payment.notes}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black tracking-tighter">
                Add New Employee
              </h3>
              <button
                onClick={() => {
                  setShowAddEmployee(false);
                  setNewEmployee({
                    name: "",
                    role: Role.CASHIER,
                    pin: "",
                    hourlyRate: 0,
                  });
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newEmployee.name}
                  onChange={(e) =>
                    setNewEmployee((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Enter employee name"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-black transition-all"
                />
              </div>

              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Role
                </label>
                <select
                  value={newEmployee.role}
                  onChange={(e) =>
                    setNewEmployee((prev) => ({
                      ...prev,
                      role: e.target.value as Role,
                    }))
                  }
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-black transition-all"
                >
                  <option value={Role.MANAGER}>Manager</option>
                  <option value={Role.CASHIER}>Cashier</option>
                  <option value={Role.SERVER}>Server</option>
                  <option value={Role.KITCHEN}>Kitchen</option>
                </select>
              </div>

              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  PIN (4 digits)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={newEmployee.pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setNewEmployee((prev) => ({ ...prev, pin: value }));
                  }}
                  placeholder="0000"
                  className="w-full text-center text-2xl font-black tracking-[0.5em] bg-gray-50 border border-gray-100 rounded-xl py-3 focus:outline-none focus:border-black transition-all"
                />
                <p className="text-[8px] text-gray-400 font-bold mt-2">
                  Employee will use this PIN to log in
                </p>
              </div>

              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Hourly Rate (₱)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newEmployee.hourlyRate || ""}
                  onChange={(e) =>
                    setNewEmployee((prev) => ({
                      ...prev,
                      hourlyRate: parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="0.00"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-black transition-all"
                />
                <p className="text-[8px] text-gray-400 font-bold mt-2">
                  Used for payroll calculations
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddEmployee}
                className="flex-1 py-4 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
              >
                Add Employee
              </button>
              <button
                onClick={() => {
                  setShowAddEmployee(false);
                  setNewEmployee({
                    name: "",
                    role: Role.CASHIER,
                    pin: "",
                    hourlyRate: 0,
                  });
                }}
                className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditEmployee && editingEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black tracking-tighter">
                Edit Employee
              </h3>
              <button
                onClick={() => {
                  setShowEditEmployee(false);
                  setEditingEmployee(null);
                  setEditEmployee({
                    name: "",
                    role: Role.CASHIER,
                    pin: "",
                    hourlyRate: 0,
                  });
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editEmployee.name}
                  onChange={(e) =>
                    setEditEmployee((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Enter employee name"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-black transition-all"
                />
              </div>

              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Role
                </label>
                <select
                  value={editEmployee.role}
                  onChange={(e) =>
                    setEditEmployee((prev) => ({
                      ...prev,
                      role: e.target.value as Role,
                    }))
                  }
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-black transition-all"
                >
                  <option value={Role.MANAGER}>Manager</option>
                  <option value={Role.CASHIER}>Cashier</option>
                  <option value={Role.SERVER}>Server</option>
                  <option value={Role.KITCHEN}>Kitchen</option>
                </select>
              </div>

              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  PIN (4 digits)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={editEmployee.pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setEditEmployee((prev) => ({ ...prev, pin: value }));
                  }}
                  placeholder="0000"
                  className="w-full text-center text-2xl font-black tracking-[0.5em] bg-gray-50 border border-gray-100 rounded-xl py-3 focus:outline-none focus:border-black transition-all"
                />
                <p className="text-[8px] text-gray-400 font-bold mt-2">
                  Employee will use this PIN to log in
                </p>
              </div>

              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Hourly Rate (₱)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editEmployee.hourlyRate || ""}
                  onChange={(e) =>
                    setEditEmployee((prev) => ({
                      ...prev,
                      hourlyRate: parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="0.00"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-black transition-all"
                />
                <p className="text-[8px] text-gray-400 font-bold mt-2">
                  Used for payroll calculations
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateEmployee}
                className="flex-1 py-4 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
              >
                Update Employee
              </button>
              <button
                onClick={() => {
                  setShowEditEmployee(false);
                  setEditingEmployee(null);
                  setEditEmployee({
                    name: "",
                    role: Role.CASHIER,
                    pin: "",
                    hourlyRate: 0,
                  });
                }}
                className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Employee Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        title="Delete Employee"
        message={`Are you sure you want to delete ${employeeToDelete?.name}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteEmployee}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setEmployeeToDelete(null);
        }}
        variant="danger"
      />

      {/* Delete Schedule Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteScheduleConfirm}
        title="Delete Schedules"
        message={
          employeeToDeleteSchedules
            ? `Are you sure you want to delete all schedules for ${employeeToDeleteSchedules.name}? This action cannot be undone.`
            : scheduleToDelete
            ? `Are you sure you want to delete this schedule? This action cannot be undone.`
            : `Are you sure you want to delete this schedule? This action cannot be undone.`
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={async () => {
          if (employeeToDeleteSchedules) {
            // Delete all schedules for this employee
            const schedulesToDelete = shiftSchedules.filter(
              (s) => s.employeeId === employeeToDeleteSchedules.id
            );
            try {
              await Promise.all(
                schedulesToDelete.map((schedule) =>
                  shiftSchedulesApi.delete(schedule.id)
                )
              );
              if (setShiftSchedules) {
                setShiftSchedules((prev) =>
                  prev.filter(
                    (s) => s.employeeId !== employeeToDeleteSchedules.id
                  )
                );
              }
              showToast(
                `All schedules for ${employeeToDeleteSchedules.name} deleted successfully`,
                "success"
              );
              await loadShiftSchedules();
              setShowDeleteScheduleConfirm(false);
              setEmployeeToDeleteSchedules(null);
            } catch (error: any) {
              showToast(error.message || "Failed to delete schedules", "error");
              setShowDeleteScheduleConfirm(false);
              setEmployeeToDeleteSchedules(null);
            }
          } else if (scheduleToDelete) {
            // Delete single schedule
            try {
              await shiftSchedulesApi.delete(scheduleToDelete.id);
              if (setShiftSchedules) {
                setShiftSchedules((prev) =>
                  prev.filter((s) => s.id !== scheduleToDelete.id)
                );
              }
              showToast("Schedule deleted successfully", "success");
              await loadShiftSchedules();
              setShowDeleteScheduleConfirm(false);
              setScheduleToDelete(null);
            } catch (error: any) {
              showToast(error.message || "Failed to delete schedule", "error");
              setShowDeleteScheduleConfirm(false);
              setScheduleToDelete(null);
            }
          } else {
            setShowDeleteScheduleConfirm(false);
            setEmployeeToDeleteSchedules(null);
            setScheduleToDelete(null);
          }
        }}
        onCancel={() => {
          setShowDeleteScheduleConfirm(false);
          setEmployeeToDeleteSchedules(null);
          setScheduleToDelete(null);
        }}
        variant="danger"
      />

      {/* Break Modal */}
      {showBreakModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-black tracking-tighter mb-4">
              Start {breakType === "BREAK" ? "Break" : "Lunch"}
            </h3>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 font-bold">
                This will record the start time of your{" "}
                {breakType.toLowerCase()}.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => startBreak(showBreakModal, breakType)}
                  className="flex-1 py-4 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
                >
                  Start {breakType === "BREAK" ? "Break" : "Lunch"}
                </button>
                <button
                  onClick={() => setShowBreakModal(null)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark Salary as Paid Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-black tracking-tighter mb-4">
              Mark Salary as Paid
            </h3>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm font-black text-black mb-2">
                  {showPayModal.name}
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-bold">
                      Hours Worked (Week):
                    </span>
                    <span className="font-black text-black">
                      {calculateHoursWorked(showPayModal, "week").toFixed(2)}{" "}
                      hrs
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-bold">
                      Overtime Hours:
                    </span>
                    <span className="font-black text-black">
                      {calculateOvertimeHours(showPayModal, "week").toFixed(2)}{" "}
                      hrs
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-bold">
                      Regular Pay:
                    </span>
                    <span className="font-black text-black">
                      ₱
                      {(
                        (calculateHoursWorked(showPayModal, "week") -
                          calculateOvertimeHours(showPayModal, "week")) *
                        (showPayModal.hourlyRate || 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-bold">
                      Overtime Pay:
                    </span>
                    <span className="font-black text-black">
                      ₱
                      {(
                        calculateOvertimeHours(showPayModal, "week") *
                        (showPayModal.hourlyRate || 0) *
                        1.5
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="text-gray-600 font-bold">
                      Total Gross Pay:
                    </span>
                    <span className="font-black text-black text-lg">
                      ₱
                      {calculateGrossPay(showPayModal, "week").toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                <p className="font-bold mb-1">Note: This will:</p>
                <ul className="list-disc list-inside space-y-1 text-[10px]">
                  <li>Record the payment in payroll history</li>
                  <li>Reset time records for this week</li>
                  <li>Start fresh calculations for next period</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    try {
                      const now = new Date();
                      const weekStart = new Date(now);
                      weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
                      weekStart.setHours(0, 0, 0, 0);
                      const weekEnd = new Date(weekStart);
                      weekEnd.setDate(weekStart.getDate() + 6);
                      weekEnd.setHours(23, 59, 59, 999);

                      const hoursWorked = calculateHoursWorked(
                        showPayModal,
                        "week"
                      );
                      const overtimeHours = calculateOvertimeHours(
                        showPayModal,
                        "week"
                      );
                      const regularHours = hoursWorked - overtimeHours;
                      const regularPay =
                        regularHours * (showPayModal.hourlyRate || 0);
                      const overtimePay =
                        overtimeHours * (showPayModal.hourlyRate || 0) * 1.5;
                      const totalPay = calculateGrossPay(showPayModal, "week");

                      await employeesApi.markSalaryAsPaid(showPayModal.id, {
                        periodStart: weekStart.toISOString(),
                        periodEnd: weekEnd.toISOString(),
                        amount: totalPay,
                        hoursWorked,
                        regularPay,
                        overtimePay,
                      });

                      showToast(
                        `Salary marked as paid for ${showPayModal.name}`,
                        "success"
                      );
                      setShowPayModal(null);
                      await loadEmployees(); // Reload to get updated time records
                    } catch (error: any) {
                      showToast(
                        error.message || "Failed to mark salary as paid",
                        "error"
                      );
                    }
                  }}
                  className="flex-1 py-4 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
                >
                  Confirm Payment
                </button>
                <button
                  onClick={() => setShowPayModal(null)}
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

export default EmployeeTimeClock;
