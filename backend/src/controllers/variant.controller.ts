import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response.utils';

// Get variants by product ID
export const getVariantsByProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { productId } = req.params;

    const variants = await prisma.productVariant.findMany({
      where: { productId },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Convert Decimal to number
    const formattedVariants = variants.map(variant => ({
      ...variant,
      price: parseFloat(variant.price.toString()),
    }));

    sendSuccess(res, formattedVariants);
  } catch (error) {
    next(error);
  }
};

// Create variant
export const createVariant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { productId, name, price, stock, sku } = req.body;

    if (!productId || !name || price === undefined) {
      return sendError(res, 'Product ID, name, and price are required', 'MISSING_FIELDS', 400);
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return sendError(res, 'Product not found', 'PRODUCT_NOT_FOUND', 404);
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        name: name.trim(),
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        sku: sku?.trim() || `SKU-${Date.now()}`,
      },
    });

    // Convert Decimal to number
    const formattedVariant = {
      ...variant,
      price: parseFloat(variant.price.toString()),
    };

    sendSuccess(res, formattedVariant, 'Variant created successfully', 201);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return sendError(res, 'Variant with this SKU already exists for this product', 'DUPLICATE_VARIANT', 409);
    }
    next(error);
  }
};

// Update variant
export const updateVariant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { name, price, stock, sku } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (price !== undefined) updateData.price = parseFloat(price);
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (sku !== undefined) updateData.sku = sku.trim();

    const variant = await prisma.productVariant.update({
      where: { id },
      data: updateData,
    });

    // Convert Decimal to number
    const formattedVariant = {
      ...variant,
      price: parseFloat(variant.price.toString()),
    };

    sendSuccess(res, formattedVariant, 'Variant updated successfully');
  } catch (error: any) {
    if (error.code === 'P2025') {
      return sendError(res, 'Variant not found', 'VARIANT_NOT_FOUND', 404);
    }
    if (error.code === 'P2002') {
      return sendError(res, 'Variant with this SKU already exists for this product', 'DUPLICATE_VARIANT', 409);
    }
    next(error);
  }
};

// Delete variant
export const deleteVariant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    await prisma.productVariant.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Variant deleted successfully');
  } catch (error: any) {
    if (error.code === 'P2025') {
      return sendError(res, 'Variant not found', 'VARIANT_NOT_FOUND', 404);
    }
    next(error);
  }
};

