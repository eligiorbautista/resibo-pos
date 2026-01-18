import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import dotenv from "dotenv";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";

// Routes
import authRoutes from "./routes/auth.routes";
import productRoutes from "./routes/product.routes";
import transactionRoutes from "./routes/transaction.routes";
import customerRoutes from "./routes/customer.routes";
import employeeRoutes from "./routes/employee.routes";
import tableRoutes from "./routes/table.routes";
import cashDrawerRoutes from "./routes/cashDrawer.routes";
import analyticsRoutes from "./routes/analytics.routes";
import shiftScheduleRoutes from "./routes/shiftSchedule.routes";
import modifierRoutes from "./routes/modifier.routes";
import variantRoutes from "./routes/variant.routes";
import auditLogRoutes from "./routes/auditLog.routes";
import reportsRoutes from "./routes/reports.routes";
import eInvoiceRoutes from "./routes/eInvoice.routes";
import paymentRoutes from "./routes/payment.routes";
import printerRoutes from "./routes/printer.routes";
import { initializePrinter } from "./controllers/printer.controller";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(morgan("dev")); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes list for debugging
app.get("/api/routes", (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods),
      });
    } else if (middleware.name === "router") {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods),
          });
        }
      });
    }
  });
  res.json({ routes, total: routes.length });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/cash-drawers", cashDrawerRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/shift-schedules", shiftScheduleRoutes);
app.use("/api/modifiers", modifierRoutes);
app.use("/api/variants", variantRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/einvoice", eInvoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/printer", printerRoutes);

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Export for serverless deployment
export default app;

// Start server only in development
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`🔗 API URL: http://localhost:${PORT}/api`);
    
    // Initialize printer if configured
    if (process.env.PRINTER_PORT_PATH) {
      console.log(`🖨️ Initializing printer on ${process.env.PRINTER_PORT_PATH}...`);
      try {
        await initializePrinter(process.env.PRINTER_PORT_PATH);
      } catch (error) {
        console.error('❌ Failed to initialize printer:', error);
        console.log('⚠️ Server will continue without printer support');
      }
    } else {
      console.log('⚠️ PRINTER_PORT_PATH not set in .env - printer disabled');
      console.log('💡 To enable automatic printing, set PRINTER_PORT_PATH in .env');
      console.log('💡 Run GET /api/printer/ports to list available ports');
    }
  });
}
