import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response.utils';
import { Prisma } from '@prisma/client';

// Generate Z-Reading for a specific business date
export const generateZReading = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { date } = req.query;
    const authReq = req as any;
    const generatedById = authReq.user.id;

    // Parse business date (default to today if not provided)
    const businessDate = date ? new Date(date as string) : new Date();
    businessDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(businessDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Check if Z-reading already exists for this date
    const existing = await prisma.dailyZReading.findUnique({
      where: { businessDate },
    });

    if (existing) {
      return sendError(res, 'Z-reading already exists for this date', 'Z_READING_EXISTS', 400);
    }

    // Get system counter for opening grand total
    const counter = await prisma.systemCounter.findUnique({ where: { id: 1 } });
    const openingGrandTotal = counter?.grandTotal || new Prisma.Decimal(0);

    // Calculate totals for transactions on this business date
    const transactions = await prisma.transaction.findMany({
      where: {
        timestamp: {
          gte: businessDate,
          lt: nextDay,
        },
        status: {
          not: 'VOIDED', // Exclude voided transactions from totals
        },
      },
      include: {
        items: true,
        payments: true,
      },
    });

    // Calculate voided transactions separately
    const voidedTransactions = await prisma.transaction.findMany({
      where: {
        timestamp: {
          gte: businessDate,
          lt: nextDay,
        },
        status: 'VOIDED',
      },
    });

    let totalGrossSales = new Prisma.Decimal(0);
    let totalVatSales = new Prisma.Decimal(0);
    let totalVatExempt = new Prisma.Decimal(0);
    let totalDiscounts = new Prisma.Decimal(0);
    let totalServiceCharge = new Prisma.Decimal(0);
    let totalVoidAmount = new Prisma.Decimal(0);

    transactions.forEach(tx => {
      totalGrossSales = totalGrossSales.plus(tx.totalAmount);
      totalServiceCharge = totalServiceCharge.plus(tx.serviceCharge);
      totalDiscounts = totalDiscounts.plus(tx.discountTotal);

      // VAT-exempt if PWD or Senior Citizen discount applied
      if (tx.discountType === 'PWD' || tx.discountType === 'SENIOR_CITIZEN') {
        totalVatExempt = totalVatExempt.plus(tx.totalAmount);
      } else {
        totalVatSales = totalVatSales.plus(tx.subtotal);
      }
    });

    voidedTransactions.forEach(tx => {
      totalVoidAmount = totalVoidAmount.plus(tx.totalAmount);
    });

    const closingGrandTotal = openingGrandTotal.plus(totalGrossSales);

    // Create Z-reading record
    const zReading = await prisma.dailyZReading.create({
      data: {
        businessDate,
        generatedById,
        openingGrandTotal,
        closingGrandTotal,
        totalGrossSales,
        totalVatSales,
        totalVatExempt,
        totalDiscounts,
        totalServiceCharge,
        totalVoidAmount,
        totalTransactions: transactions.length,
      },
      include: {
        generatedBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    // Log Z-reading generation
    await prisma.auditLog.create({
      data: {
        employeeId: generatedById,
        action: 'GENERATE_Z_READING',
        entityType: 'Z_READING',
        entityId: zReading.id,
        details: {
          businessDate: businessDate.toISOString(),
          openingGrandTotal: openingGrandTotal.toString(),
          closingGrandTotal: closingGrandTotal.toString(),
          totalGrossSales: totalGrossSales.toString(),
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    sendSuccess(res, {
      ...zReading,
      openingGrandTotal: parseFloat(zReading.openingGrandTotal.toString()),
      closingGrandTotal: parseFloat(zReading.closingGrandTotal.toString()),
      totalGrossSales: parseFloat(zReading.totalGrossSales.toString()),
      totalVatSales: parseFloat(zReading.totalVatSales.toString()),
      totalVatExempt: parseFloat(zReading.totalVatExempt.toString()),
      totalDiscounts: parseFloat(zReading.totalDiscounts.toString()),
      totalServiceCharge: parseFloat(zReading.totalServiceCharge.toString()),
      totalVoidAmount: parseFloat(zReading.totalVoidAmount.toString()),
    }, 'Z-reading generated successfully');
  } catch (error: any) {
    console.error('Error generating Z-reading:', error);
    next(error);
  }
};

// Get Z-Reading by date
export const getZReadingByDate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { date } = req.params;
    const businessDate = new Date(date);
    businessDate.setHours(0, 0, 0, 0);

    const zReading = await prisma.dailyZReading.findUnique({
      where: { businessDate },
      include: {
        generatedBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!zReading) {
      return sendError(res, 'Z-reading not found for this date', 'Z_READING_NOT_FOUND', 404);
    }

    sendSuccess(res, {
      ...zReading,
      openingGrandTotal: parseFloat(zReading.openingGrandTotal.toString()),
      closingGrandTotal: parseFloat(zReading.closingGrandTotal.toString()),
      totalGrossSales: parseFloat(zReading.totalGrossSales.toString()),
      totalVatSales: parseFloat(zReading.totalVatSales.toString()),
      totalVatExempt: parseFloat(zReading.totalVatExempt.toString()),
      totalDiscounts: parseFloat(zReading.totalDiscounts.toString()),
      totalServiceCharge: parseFloat(zReading.totalServiceCharge.toString()),
      totalVoidAmount: parseFloat(zReading.totalVoidAmount.toString()),
    });
  } catch (error) {
    next(error);
  }
};

// Get all Z-Readings
export const getAllZReadings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.businessDate = {};
      if (startDate) where.businessDate.gte = new Date(startDate as string);
      if (endDate) where.businessDate.lte = new Date(endDate as string);
    }

    const zReadings = await prisma.dailyZReading.findMany({
      where,
      include: {
        generatedBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        businessDate: 'desc',
      },
    });

    sendSuccess(res, zReadings.map(z => ({
      ...z,
      openingGrandTotal: parseFloat(z.openingGrandTotal.toString()),
      closingGrandTotal: parseFloat(z.closingGrandTotal.toString()),
      totalGrossSales: parseFloat(z.totalGrossSales.toString()),
      totalVatSales: parseFloat(z.totalVatSales.toString()),
      totalVatExempt: parseFloat(z.totalVatExempt.toString()),
      totalDiscounts: parseFloat(z.totalDiscounts.toString()),
      totalServiceCharge: parseFloat(z.totalServiceCharge.toString()),
      totalVoidAmount: parseFloat(z.totalVoidAmount.toString()),
    })));
  } catch (error) {
    next(error);
  }
};

// Export eSales data for BIR eSales portal (CSV/TXT format)
export const exportESales = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { month, format = 'csv' } = req.query; // month format: YYYY-MM

    if (!month) {
      return sendError(res, 'Month parameter is required (YYYY-MM)', 'MONTH_REQUIRED', 400);
    }

    const [year, monthNum] = (month as string).split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

    const transactions = await prisma.transaction.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          not: 'VOIDED',
        },
      },
      include: {
        employee: {
          select: {
            name: true,
          },
        },
        items: true,
        payments: true,
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    // Format data according to BIR eSales requirements
    // Note: Adjust format based on actual BIR eSales portal specifications
    const lines: string[] = [];
    
    if (format === 'csv') {
      // CSV header
      lines.push('Date,Invoice Number,Subtotal,VAT Amount,Service Charge,Discount Total,Total Amount,Payment Method');
      
      transactions.forEach(tx => {
        const date = tx.timestamp.toISOString().split('T')[0];
        const invoiceNum = tx.officialInvoiceNumber || '';
        const subtotal = tx.subtotal.toString();
        const vat = tx.tax.toString();
        const serviceCharge = tx.serviceCharge.toString();
        const discount = tx.discountTotal.toString();
        const total = tx.totalAmount.toString();
        const paymentMethod = tx.payments[0]?.method || 'CASH';
        
        lines.push(`${date},${invoiceNum},${subtotal},${vat},${serviceCharge},${discount},${total},${paymentMethod}`);
      });
    } else {
      // TXT format (pipe-delimited or fixed-width based on BIR spec)
      transactions.forEach(tx => {
        const date = tx.timestamp.toISOString().split('T')[0];
        const invoiceNum = tx.officialInvoiceNumber || '';
        const subtotal = tx.subtotal.toString();
        const vat = tx.tax.toString();
        const total = tx.totalAmount.toString();
        
        lines.push(`${date}|${invoiceNum}|${subtotal}|${vat}|${total}`);
      });
    }

    const content = lines.join('\n');
    const filename = `esales_${month}.${format}`;

    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);

    // Log export
    const authReq = req as any;
    await prisma.auditLog.create({
      data: {
        employeeId: authReq.user.id,
        action: 'EXPORT_ESALES',
        entityType: 'REPORT',
        details: {
          month,
          format,
          transactionCount: transactions.length,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });
  } catch (error: any) {
    console.error('Error exporting eSales:', error);
    next(error);
  }
};

// Get system grand total (current accumulating total)
export const getSystemGrandTotal = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const counter = await prisma.systemCounter.findUnique({ where: { id: 1 } });
    
    if (!counter) {
      return sendSuccess(res, {
        grandTotal: 0,
        lastInvoiceNumber: 0,
      });
    }

    sendSuccess(res, {
      grandTotal: parseFloat(counter.grandTotal.toString()),
      lastInvoiceNumber: counter.lastInvoiceNumber,
    });
  } catch (error) {
    next(error);
  }
};

