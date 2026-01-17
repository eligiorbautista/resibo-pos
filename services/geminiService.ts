
import { GoogleGenAI } from "@google/genai";
import { Transaction, Product, Employee, Table, CashDrawer, OrderType, OrderStatus } from "../types";

interface BusinessData {
  transactions: Transaction[];
  products: Product[];
  employees: Employee[];
  tables?: Table[];
  cashDrawers?: CashDrawer[];
}

export const getBusinessInsights = async (data: BusinessData): Promise<string | null> => {
  const { transactions, products, employees, tables = [], cashDrawers = [] } = data;
  
  // Check for API key (from vite.config.ts define)
  const apiKey = (process.env as any).GEMINI_API_KEY || (process.env as any).API_KEY;
  if (!apiKey) {
    return null; // Return null to indicate no API key
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Sales summary with more details
    const salesSummary = transactions.map(t => ({
      total: t.totalAmount,
      items: t.items.length,
      date: t.timestamp,
      orderType: t.orderType,
      status: t.status,
      tip: t.tip || 0,
      tax: t.tax || 0,
      serviceCharge: t.serviceCharge || 0
    }));

    // Stock summary
    const stockSummary = products.map(p => ({
      name: p.name,
      stock: p.totalStock,
      reorderPoint: p.reorderPoint,
      low: p.totalStock < p.reorderPoint,
      category: p.category
    }));

    // Employee performance
    const employeePerformance = employees.map(e => ({
      name: e.name,
      role: e.role,
      totalSales: e.totalSales,
      totalTips: e.totalTips || 0,
      status: e.status
    }));

    // Table utilization
    const tableUtilization = tables.map(t => ({
      number: t.number,
      status: t.status,
      capacity: t.capacity,
      location: t.location
    }));

    // Cash drawer status
    const drawerStatus = cashDrawers.map(d => ({
      isOpen: !d.closedAt,
      openingAmount: d.openingAmount,
      expectedAmount: d.expectedAmount,
      actualAmount: d.actualAmount,
      difference: d.difference
    }));

    // Order type breakdown
    const orderTypeBreakdown = transactions.reduce((acc, t) => {
      acc[t.orderType] = (acc[t.orderType] || 0) + 1;
      return acc;
    }, {} as Record<OrderType, number>);

    // Today's performance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTransactions = transactions.filter(t => new Date(t.timestamp) >= today);
    const todaySales = todayTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const todayOrders = todayTransactions.length;

    const prompt = `
    Act as a senior business consultant specializing in restaurant operations. Analyze this comprehensive POS data and provide 3-4 actionable insights.

    BUSINESS DATA:
    - Total Sales: ${transactions.reduce((sum, t) => sum + t.totalAmount, 0).toLocaleString()}
    - Total Orders: ${transactions.length}
    - Today's Sales: ${todaySales.toLocaleString()} (${todayOrders} orders)
    
    RECENT SALES (Last 10):
    ${JSON.stringify(salesSummary.slice(-10), null, 2)}
    
    INVENTORY STATUS:
    ${JSON.stringify(stockSummary.filter(s => s.low), null, 2)}
    
    EMPLOYEE PERFORMANCE:
    ${JSON.stringify(employeePerformance, null, 2)}
    
    TABLE UTILIZATION:
    ${JSON.stringify(tableUtilization, null, 2)}
    
    ORDER TYPE BREAKDOWN:
    ${JSON.stringify(orderTypeBreakdown, null, 2)}
    
    CASH DRAWER STATUS:
    ${JSON.stringify(drawerStatus, null, 2)}

    Provide insights focusing on:
    1. Revenue optimization opportunities
    2. Operational efficiency improvements
    3. Inventory management recommendations
    4. Staff performance insights (if applicable)

    Format the output in concise, actionable bullet points. Be specific and data-driven.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Could not generate insights at this time. Please check your connection and API key.";
  }
};
