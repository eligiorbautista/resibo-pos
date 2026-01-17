import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response.utils';
import { Prisma } from '@prisma/client';

// Get all transactions
export const getAllTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate as string);
      if (endDate) where.timestamp.lte = new Date(endDate as string);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        server: {
          select: {
            id: true,
            name: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            membershipCardNumber: true,
          },
        },
        table: {
          select: {
            id: true,
            number: true,
          },
        },
        items: {
          include: {
            modifiers: true,
          },
        },
        payments: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    // Convert Decimal to number
    const formattedTransactions = transactions.map(transaction => ({
      ...transaction,
      subtotal: parseFloat(transaction.subtotal.toString()),
      tax: parseFloat(transaction.tax.toString()),
      serviceCharge: parseFloat(transaction.serviceCharge.toString()),
      discountTotal: parseFloat(transaction.discountTotal.toString()),
      tip: parseFloat(transaction.tip.toString()),
      totalAmount: parseFloat(transaction.totalAmount.toString()),
      loyaltyPointsDiscount: transaction.loyaltyPointsDiscount ? parseFloat(transaction.loyaltyPointsDiscount.toString()) : null,
      items: transaction.items.map(item => ({
        ...item,
        price: parseFloat(item.price.toString()),
        discount: parseFloat(item.discount.toString()),
        modifiers: item.modifiers.map(modifier => ({
          ...modifier,
          price: parseFloat(modifier.price.toString()),
        })),
      })),
      payments: transaction.payments.map(payment => ({
        ...payment,
        amount: parseFloat(payment.amount.toString()),
      })),
    }));

    sendSuccess(res, formattedTransactions);
  } catch (error) {
    next(error);
  }
};

// Get transaction by ID
export const getTransactionById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        server: {
          select: {
            id: true,
            name: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            membershipCardNumber: true,
          },
        },
        table: {
          select: {
            id: true,
            number: true,
          },
        },
        items: {
          include: {
            modifiers: true,
          },
        },
        payments: true,
      },
    });

    if (!transaction) {
      return sendError(res, 'Transaction not found', 'TRANSACTION_NOT_FOUND', 404);
    }

    // Convert Decimal to number
    const formattedTransaction = {
      ...transaction,
      subtotal: parseFloat(transaction.subtotal.toString()),
      tax: parseFloat(transaction.tax.toString()),
      serviceCharge: parseFloat(transaction.serviceCharge.toString()),
      discountTotal: parseFloat(transaction.discountTotal.toString()),
      tip: parseFloat(transaction.tip.toString()),
      totalAmount: parseFloat(transaction.totalAmount.toString()),
      loyaltyPointsDiscount: transaction.loyaltyPointsDiscount ? parseFloat(transaction.loyaltyPointsDiscount.toString()) : null,
      items: transaction.items.map(item => ({
        ...item,
        price: parseFloat(item.price.toString()),
        discount: parseFloat(item.discount.toString()),
        modifiers: item.modifiers.map(modifier => ({
          ...modifier,
          price: parseFloat(modifier.price.toString()),
        })),
      })),
      payments: transaction.payments.map(payment => ({
        ...payment,
        amount: parseFloat(payment.amount.toString()),
      })),
    };

    sendSuccess(res, formattedTransaction);
  } catch (error) {
    next(error);
  }
};

// Helper to get or create the singleton SystemCounter row
const getOrInitSystemCounter = async () => {
  let counter = await prisma.systemCounter.findUnique({ where: { id: 1 } });
  if (!counter) {
    counter = await prisma.systemCounter.create({
      data: {
        id: 1,
        grandTotal: new Prisma.Decimal(0),
        lastInvoiceNumber: 0,
      },
    });
  }
  return counter;
};

// Create transaction
export const createTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      employeeId,
      customerId,
      serverId,
      tableId,
      orderType,
      status,
      items,
      subtotal,
      tax,
      serviceCharge,
      discountTotal,
      discountType,
      discountCardNumber,
      discountVerifiedBy,
      tip,
      loyaltyPointsRedeemed,
      loyaltyPointsDiscount,
      notes,
      kitchenNotes,
      deliveryAddress,
      deliveryCustomerName,
      deliveryCustomerPhone,
      priority,
      estimatedPrepTime,
      payments,
    } = req.body;

    const authReq = req as any;
    const currentEmployeeId = authReq.user.id;

    // Use provided employeeId or current user's ID
    const finalEmployeeId = employeeId || currentEmployeeId;

    // Calculate total amount
    const subtotalDecimal = new Prisma.Decimal(subtotal || 0);
    const taxDecimal = new Prisma.Decimal(tax || 0);
    const serviceChargeDecimal = new Prisma.Decimal(serviceCharge || 0);
    const discountTotalDecimal = new Prisma.Decimal(discountTotal || 0);
    const tipDecimal = new Prisma.Decimal(tip || 0);
    const loyaltyPointsDiscountDecimal = loyaltyPointsDiscount ? new Prisma.Decimal(loyaltyPointsDiscount) : new Prisma.Decimal(0);
    
    const totalAmount = subtotalDecimal
      .plus(taxDecimal)
      .plus(serviceChargeDecimal)
      .minus(discountTotalDecimal)
      .minus(loyaltyPointsDiscountDecimal)
      .plus(tipDecimal);

    // Wrap financial counter updates + transaction creation in a single transaction
    const { transaction, counterAfter } = await prisma.$transaction(async (tx) => {
      // Ensure we have a counter row and compute next invoice number
      let counter = await tx.systemCounter.findUnique({ where: { id: 1 } });
      if (!counter) {
        counter = await tx.systemCounter.create({
          data: {
            id: 1,
            grandTotal: new Prisma.Decimal(0),
            lastInvoiceNumber: 0,
          },
        });
      }

      const nextInvoiceNumber = counter.lastInvoiceNumber + 1;
      const newGrandTotal = counter.grandTotal.plus(totalAmount);

      const updatedCounter = await tx.systemCounter.update({
        where: { id: 1 },
        data: {
          lastInvoiceNumber: nextInvoiceNumber,
          grandTotal: newGrandTotal,
        },
      });

      // Create transaction with items and payments
      const createdTransaction = await tx.transaction.create({
        data: {
          employeeId: finalEmployeeId,
          customerId: customerId || null,
          serverId: serverId || null,
          tableId: tableId || null,
          orderType: orderType || 'DINE_IN',
          status: status || 'PENDING',
          subtotal: subtotalDecimal,
          tax: taxDecimal,
          serviceCharge: serviceChargeDecimal,
          discountTotal: discountTotalDecimal,
          discountType: discountType || 'NONE',
          discountCardNumber: discountCardNumber || null,
          discountVerifiedBy: discountVerifiedBy || null,
          discountVerifiedAt: discountVerifiedBy ? new Date() : null,
          tip: tipDecimal,
          loyaltyPointsRedeemed: loyaltyPointsRedeemed || 0,
          loyaltyPointsDiscount: loyaltyPointsDiscount ? loyaltyPointsDiscountDecimal : null,
          totalAmount: totalAmount,
          officialInvoiceNumber: nextInvoiceNumber, // BIR-required sequential invoice number
          notes: notes || null,
          kitchenNotes: kitchenNotes || null,
          deliveryAddress: deliveryAddress || null,
          deliveryCustomerName: req.body.deliveryCustomerName || null,
          deliveryCustomerPhone: req.body.deliveryCustomerPhone || null,
          priority: priority || 'NORMAL',
          estimatedPrepTime: estimatedPrepTime || null,
          timestamp: new Date(),
          items: {
            create: items.map((item: any) => ({
              productId: item.productId || null,
              variantId: item.variantId || null,
              name: item.name,
              price: new Prisma.Decimal(item.price),
              quantity: item.quantity,
              discount: new Prisma.Decimal(item.discount || 0),
              specialInstructions: item.specialInstructions || null,
              modifiers: {
                create: (item.modifiers || []).map((modifier: any) => ({
                  modifierId: modifier.modifierId || null,
                  modifierName: modifier.modifierName || modifier.name,
                  price: new Prisma.Decimal(modifier.price || 0),
                })),
              },
            })),
          },
          payments: {
            create: payments.map((payment: any) => ({
              method: payment.method,
              amount: new Prisma.Decimal(payment.amount),
            })),
          },
          // Store the current invoice number as a reference for official receipt mapping
          // Note: you will still need to map this to printed OR numbers per BIR guidance
        },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
          server: {
            select: {
              id: true,
              name: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              membershipCardNumber: true,
            },
          },
          table: {
            select: {
              id: true,
              number: true,
            },
          },
          items: {
            include: {
              modifiers: true,
            },
          },
          payments: true,
        },
      });

      // Basic audit trail entry for transaction creation
      await tx.auditLog.create({
        data: {
          employeeId: finalEmployeeId,
          action: 'CREATE_TRANSACTION',
          entityType: 'TRANSACTION',
          entityId: createdTransaction.id,
          details: {
            totalAmount: totalAmount.toString(),
            subtotal: subtotalDecimal.toString(),
            tax: taxDecimal.toString(),
            serviceCharge: serviceChargeDecimal.toString(),
            discountTotal: discountTotalDecimal.toString(),
            loyaltyPointsDiscount: loyaltyPointsDiscountDecimal.toString(),
            payments: payments,
            orderType,
            status,
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || null,
        },
      });

      // Queue JSON payload for E-Invoicing (to be transmitted to BIR EIS)
      await tx.eInvoicePayload.create({
        data: {
          transactionId: createdTransaction.id,
          payloadJson: {
            // Minimal JSON structure; refine to exact BIR EIS spec before production
            id: createdTransaction.id,
            businessDate: createdTransaction.timestamp,
            totalAmount: totalAmount.toString(),
            vatAmount: taxDecimal.toString(),
            serviceCharge: serviceChargeDecimal.toString(),
            discountTotal: discountTotalDecimal.toString(),
            orderType,
            payments,
          },
        },
      });

      return { transaction: createdTransaction, counterAfter: updatedCounter };
    });

    // Update customer loyalty points if applicable
    if (customerId && loyaltyPointsRedeemed) {
      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (customer) {
        const amountPaid = parseFloat(subtotal) + parseFloat(tax) + parseFloat(serviceCharge) - parseFloat(discountTotal || 0) - parseFloat(loyaltyPointsDiscount || 0);
        const pointsEarned = Math.floor(amountPaid / 10);
        const newPoints = Math.max(0, customer.loyaltyPoints + pointsEarned - (loyaltyPointsRedeemed || 0));
        
        await prisma.customer.update({
          where: { id: customerId },
          data: { loyaltyPoints: newPoints },
        });
      }
    }

    // Update product stock
    for (const item of items) {
      if (item.productId) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        if (product) {
          const newStock = Math.max(0, product.totalStock - item.quantity);
          await prisma.product.update({
            where: { id: item.productId },
            data: { totalStock: newStock },
          });
        }
      }
      if (item.variantId) {
        const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } });
        if (variant) {
          const newStock = Math.max(0, variant.stock - item.quantity);
          await prisma.productVariant.update({
            where: { id: item.variantId },
            data: { stock: newStock },
          });
        }
      }
    }

    // Update employee total sales
    await prisma.employee.update({
      where: { id: finalEmployeeId },
      data: {
        totalSales: {
          increment: parseFloat(subtotal) + parseFloat(tax) + parseFloat(serviceCharge) - parseFloat(discountTotal || 0),
        },
      },
    });

    // Update server tips if applicable
    if (serverId && tip > 0) {
      await prisma.employee.update({
        where: { id: serverId },
        data: {
          totalTips: {
            increment: parseFloat(tip),
          },
        },
      });
    }

    // Update table status if dine-in
    if (tableId && orderType === 'DINE_IN') {
      await prisma.table.update({
        where: { id: tableId },
        data: {
          status: 'OCCUPIED',
          currentOrderId: transaction.id,
        },
      });
    }

    // Convert Decimal to number
    const formattedTransaction = {
      ...transaction,
      subtotal: parseFloat(transaction.subtotal.toString()),
      tax: parseFloat(transaction.tax.toString()),
      serviceCharge: parseFloat(transaction.serviceCharge.toString()),
      discountTotal: parseFloat(transaction.discountTotal.toString()),
      tip: parseFloat(transaction.tip.toString()),
      totalAmount: parseFloat(transaction.totalAmount.toString()),
      loyaltyPointsDiscount: transaction.loyaltyPointsDiscount ? parseFloat(transaction.loyaltyPointsDiscount.toString()) : null,
      items: transaction.items.map(item => ({
        ...item,
        price: parseFloat(item.price.toString()),
        discount: parseFloat(item.discount.toString()),
        modifiers: item.modifiers.map(modifier => ({
          ...modifier,
          price: parseFloat(modifier.price.toString()),
        })),
      })),
      payments: transaction.payments.map(payment => ({
        ...payment,
        amount: parseFloat(payment.amount.toString()),
      })),
    };

    sendSuccess(res, formattedTransaction, 'Transaction created successfully', 201);
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    next(error);
  }
};

// Update transaction
export const updateTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updateData: any = {};

    // Map all possible fields
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;
    if (req.body.kitchenNotes !== undefined) updateData.kitchenNotes = req.body.kitchenNotes;
    if (req.body.priority !== undefined) updateData.priority = req.body.priority;
    if (req.body.estimatedPrepTime !== undefined) updateData.estimatedPrepTime = req.body.estimatedPrepTime;

    const transaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        server: {
          select: {
            id: true,
            name: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            membershipCardNumber: true,
          },
        },
        table: {
          select: {
            id: true,
            number: true,
          },
        },
        items: {
          include: {
            modifiers: true,
          },
        },
        payments: true,
      },
    });

    // Convert Decimal to number
    const formattedTransaction = {
      ...transaction,
      subtotal: parseFloat(transaction.subtotal.toString()),
      tax: parseFloat(transaction.tax.toString()),
      serviceCharge: parseFloat(transaction.serviceCharge.toString()),
      discountTotal: parseFloat(transaction.discountTotal.toString()),
      tip: parseFloat(transaction.tip.toString()),
      totalAmount: parseFloat(transaction.totalAmount.toString()),
      loyaltyPointsDiscount: transaction.loyaltyPointsDiscount ? parseFloat(transaction.loyaltyPointsDiscount.toString()) : null,
      items: transaction.items.map(item => ({
        ...item,
        price: parseFloat(item.price.toString()),
        discount: parseFloat(item.discount.toString()),
        modifiers: item.modifiers.map(modifier => ({
          ...modifier,
          price: parseFloat(modifier.price.toString()),
        })),
      })),
      payments: transaction.payments.map(payment => ({
        ...payment,
        amount: parseFloat(payment.amount.toString()),
      })),
    };

    sendSuccess(res, formattedTransaction, 'Transaction updated successfully');
  } catch (error: any) {
    if (error.code === 'P2025') {
      return sendError(res, 'Transaction not found', 'TRANSACTION_NOT_FOUND', 404);
    }
    next(error);
  }
};

// Void transaction
export const voidTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!transaction) {
      return sendError(res, 'Transaction not found', 'TRANSACTION_NOT_FOUND', 404);
    }

    if (transaction.status === 'VOIDED') {
      return sendError(res, 'Transaction is already voided', 'ALREADY_VOIDED', 400);
    }

    // Only restore stock if transaction was PENDING (not yet prepared)
    const wasPending = transaction.status === 'PENDING';

    // Update transaction status
    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        status: 'VOIDED',
        notes: note || transaction.notes,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        server: {
          select: {
            id: true,
            name: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            membershipCardNumber: true,
          },
        },
        table: {
          select: {
            id: true,
            number: true,
          },
        },
        items: {
          include: {
            modifiers: true,
          },
        },
        payments: true,
      },
    });

    // Restore stock if pending
    if (wasPending) {
      for (const item of transaction.items) {
        if (item.productId) {
          const product = await prisma.product.findUnique({ where: { id: item.productId } });
          if (product) {
            await prisma.product.update({
              where: { id: item.productId },
              data: { totalStock: product.totalStock + item.quantity },
            });
          }
        }
        if (item.variantId) {
          const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } });
          if (variant) {
            await prisma.productVariant.update({
              where: { id: item.variantId },
              data: { stock: variant.stock + item.quantity },
            });
          }
        }
      }
    }

    // Free up table if applicable
    if (transaction.tableId) {
      await prisma.table.update({
        where: { id: transaction.tableId },
        data: {
          status: 'NEEDS_CLEANING',
          currentOrderId: null,
        },
      });
    }

    // Log void action
    const authReq = req as any;
    await prisma.auditLog.create({
      data: {
        employeeId: authReq.user.id,
        action: 'VOID_TRANSACTION',
        entityType: 'TRANSACTION',
        entityId: id,
        details: {
          originalTotal: transaction.totalAmount.toString(),
          note: note || null,
          wasPending,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    // Convert Decimal to number
    const formattedTransaction = {
      ...updatedTransaction,
      subtotal: parseFloat(updatedTransaction.subtotal.toString()),
      tax: parseFloat(updatedTransaction.tax.toString()),
      serviceCharge: parseFloat(updatedTransaction.serviceCharge.toString()),
      discountTotal: parseFloat(updatedTransaction.discountTotal.toString()),
      tip: parseFloat(updatedTransaction.tip.toString()),
      totalAmount: parseFloat(updatedTransaction.totalAmount.toString()),
      loyaltyPointsDiscount: updatedTransaction.loyaltyPointsDiscount ? parseFloat(updatedTransaction.loyaltyPointsDiscount.toString()) : null,
      items: updatedTransaction.items.map(item => ({
        ...item,
        price: parseFloat(item.price.toString()),
        discount: parseFloat(item.discount.toString()),
        modifiers: item.modifiers.map(modifier => ({
          ...modifier,
          price: parseFloat(modifier.price.toString()),
        })),
      })),
      payments: updatedTransaction.payments.map(payment => ({
        ...payment,
        amount: parseFloat(payment.amount.toString()),
      })),
    };

    sendSuccess(res, formattedTransaction, 'Transaction voided successfully');
  } catch (error: any) {
    if (error.code === 'P2025') {
      return sendError(res, 'Transaction not found', 'TRANSACTION_NOT_FOUND', 404);
    }
    next(error);
  }
};

// Refund transaction
export const refundTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { reason, items, amount, method } = req.body;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!transaction) {
      return sendError(res, 'Transaction not found', 'TRANSACTION_NOT_FOUND', 404);
    }

    // Create refund record (you might want to create a separate Refund model)
    // For now, we'll just update the transaction with refund info
    const authReq = req as any;
    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        notes: transaction.notes ? `${transaction.notes}\n[REFUND]: ${reason}` : `[REFUND]: ${reason}`,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        server: {
          select: {
            id: true,
            name: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            membershipCardNumber: true,
          },
        },
        table: {
          select: {
            id: true,
            number: true,
          },
        },
        items: {
          include: {
            modifiers: true,
          },
        },
        payments: true,
      },
    });

    // Convert Decimal to number
    const formattedTransaction = {
      ...updatedTransaction,
      subtotal: parseFloat(updatedTransaction.subtotal.toString()),
      tax: parseFloat(updatedTransaction.tax.toString()),
      serviceCharge: parseFloat(updatedTransaction.serviceCharge.toString()),
      discountTotal: parseFloat(updatedTransaction.discountTotal.toString()),
      tip: parseFloat(updatedTransaction.tip.toString()),
      totalAmount: parseFloat(updatedTransaction.totalAmount.toString()),
      loyaltyPointsDiscount: updatedTransaction.loyaltyPointsDiscount ? parseFloat(updatedTransaction.loyaltyPointsDiscount.toString()) : null,
      items: updatedTransaction.items.map(item => ({
        ...item,
        price: parseFloat(item.price.toString()),
        discount: parseFloat(item.discount.toString()),
        modifiers: item.modifiers.map(modifier => ({
          ...modifier,
          price: parseFloat(modifier.price.toString()),
        })),
      })),
      payments: updatedTransaction.payments.map(payment => ({
        ...payment,
        amount: parseFloat(payment.amount.toString()),
      })),
    };

    // Log refund action
    await prisma.auditLog.create({
      data: {
        employeeId: authReq.user.id,
        action: 'REFUND_TRANSACTION',
        entityType: 'TRANSACTION',
        entityId: id,
        details: {
          refundAmount: amount?.toString() || '0',
          refundMethod: method || 'CASH',
          reason,
          itemsRefunded: items || [],
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    sendSuccess(res, formattedTransaction, 'Refund processed successfully');
  } catch (error: any) {
    if (error.code === 'P2025') {
      return sendError(res, 'Transaction not found', 'TRANSACTION_NOT_FOUND', 404);
    }
    next(error);
  }
};

