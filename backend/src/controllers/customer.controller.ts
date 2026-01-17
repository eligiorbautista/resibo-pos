import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response.utils';

// Get all customers
export const getAllCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search } = req.query;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } },
        { membershipCardNumber: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: {
        name: 'asc',
      },
    });

    // Convert tags from JSON to array if needed
    const formattedCustomers = customers.map(customer => ({
      ...customer,
      tags: customer.tags ? (Array.isArray(customer.tags) ? customer.tags : JSON.parse(customer.tags as any)) : [],
      loyaltyPoints: customer.loyaltyPoints || 0,
    }));

    sendSuccess(res, formattedCustomers);
  } catch (error) {
    next(error);
  }
};

// Get customer by ID
export const getCustomerById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 10, // Last 10 transactions
        },
        customerNotes: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10, // Last 10 notes
          include: {
            employee: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!customer) {
      return sendError(res, 'Customer not found', 'CUSTOMER_NOT_FOUND', 404);
    }

    // Convert tags from JSON to array if needed
    const formattedCustomer = {
      ...customer,
      tags: customer.tags ? (Array.isArray(customer.tags) ? customer.tags : JSON.parse(customer.tags as any)) : [],
      loyaltyPoints: customer.loyaltyPoints || 0,
      notes: customer.customerNotes || [],
    };

    sendSuccess(res, formattedCustomer);
  } catch (error) {
    next(error);
  }
};

// Create customer
export const createCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      name,
      email,
      phone,
      membershipCardNumber,
      birthday,
      tags,
      loyaltyPoints,
    } = req.body;

    // Validate required fields
    if (!name || !email || !phone) {
      return sendError(res, 'Name, email, and phone are required', 'MISSING_FIELDS', 400);
    }

    // Generate membership card number if not provided
    let finalCardNumber = membershipCardNumber;
    if (!finalCardNumber) {
      const prefix = 'TUB';
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      finalCardNumber = `${prefix}-${timestamp}-${random}`;
    }

    // Check if membership card number already exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { membershipCardNumber: finalCardNumber },
    });

    if (existingCustomer) {
      return sendError(res, 'Membership card number already exists', 'DUPLICATE_CARD_NUMBER', 409);
    }

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        membershipCardNumber: finalCardNumber,
        birthday: birthday ? new Date(birthday) : null,
        tags: tags ? (Array.isArray(tags) ? tags : tags) : null,
        loyaltyPoints: loyaltyPoints || 0,
        joinedDate: new Date(),
      },
    });

    // Convert tags from JSON to array if needed
    const formattedCustomer = {
      ...customer,
      tags: customer.tags ? (Array.isArray(customer.tags) ? customer.tags : JSON.parse(customer.tags as any)) : [],
      loyaltyPoints: customer.loyaltyPoints || 0,
    };

    sendSuccess(res, formattedCustomer, 'Customer created successfully', 201);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return sendError(res, 'Customer with this email or membership card number already exists', 'DUPLICATE_CUSTOMER', 409);
    }
    next(error);
  }
};

// Update customer
export const updateCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      membershipCardNumber,
      birthday,
      tags,
      loyaltyPoints,
    } = req.body;

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existingCustomer) {
      return sendError(res, 'Customer not found', 'CUSTOMER_NOT_FOUND', 404);
    }

    const updateData: any = {};

    if (name !== undefined) updateData.name = typeof name === 'string' ? name.trim() : name;
    if (email !== undefined) updateData.email = typeof email === 'string' ? email.trim() : email;
    if (phone !== undefined) updateData.phone = typeof phone === 'string' ? phone.trim() : phone;
    if (membershipCardNumber !== undefined) {
      // Check if new card number already exists (and is different)
      if (membershipCardNumber !== existingCustomer.membershipCardNumber) {
        const cardExists = await prisma.customer.findUnique({
          where: { membershipCardNumber },
        });
        if (cardExists) {
          return sendError(res, 'Membership card number already exists', 'DUPLICATE_CARD_NUMBER', 409);
        }
      }
      updateData.membershipCardNumber = typeof membershipCardNumber === 'string' ? membershipCardNumber.trim() : membershipCardNumber;
    }
    if (birthday !== undefined) updateData.birthday = birthday ? new Date(birthday) : null;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : tags;
    if (loyaltyPoints !== undefined) updateData.loyaltyPoints = parseInt(loyaltyPoints) || 0;

    const customer = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    // Convert tags from JSON to array if needed
    const formattedCustomer = {
      ...customer,
      tags: customer.tags ? (Array.isArray(customer.tags) ? customer.tags : JSON.parse(customer.tags as any)) : [],
      loyaltyPoints: customer.loyaltyPoints || 0,
    };

    sendSuccess(res, formattedCustomer, 'Customer updated successfully');
  } catch (error: any) {
    if (error.code === 'P2025') {
      return sendError(res, 'Customer not found', 'CUSTOMER_NOT_FOUND', 404);
    }
    if (error.code === 'P2002') {
      return sendError(res, 'Customer with this email or membership card number already exists', 'DUPLICATE_CUSTOMER', 409);
    }
    next(error);
  }
};

// Delete customer
export const deleteCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return sendError(res, 'Customer not found', 'CUSTOMER_NOT_FOUND', 404);
    }

    await prisma.customer.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Customer deleted successfully');
  } catch (error: any) {
    if (error.code === 'P2025') {
      return sendError(res, 'Customer not found', 'CUSTOMER_NOT_FOUND', 404);
    }
    next(error);
  }
};

