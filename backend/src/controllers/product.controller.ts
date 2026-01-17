import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response.utils';

// Get all products
export const getAllProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        variants: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        modifierGroups: {
          include: {
            modifiers: {
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Convert Decimal to number for JSON response
    const formattedProducts = products.map(product => ({
      ...product,
      basePrice: parseFloat(product.basePrice.toString()),
      costPrice: parseFloat(product.costPrice.toString()),
      variants: product.variants.map(variant => ({
        ...variant,
        price: parseFloat(variant.price.toString()),
      })),
      modifierGroups: product.modifierGroups.map(group => ({
        ...group,
        modifiers: group.modifiers.map(modifier => ({
          ...modifier,
          price: parseFloat(modifier.price.toString()),
        })),
      })),
    }));

    sendSuccess(res, formattedProducts);
  } catch (error) {
    next(error);
  }
};

// Get product by ID
export const getProductById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        modifierGroups: {
          include: {
            modifiers: {
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!product) {
      return sendError(res, 'Product not found', 'PRODUCT_NOT_FOUND', 404);
    }

    // Convert Decimal to number
    const formattedProduct = {
      ...product,
      basePrice: parseFloat(product.basePrice.toString()),
      costPrice: parseFloat(product.costPrice.toString()),
      variants: product.variants.map(variant => ({
        ...variant,
        price: parseFloat(variant.price.toString()),
      })),
      modifierGroups: product.modifierGroups.map(group => ({
        ...group,
        modifiers: group.modifiers.map(modifier => ({
          ...modifier,
          price: parseFloat(modifier.price.toString()),
        })),
      })),
    };

    sendSuccess(res, formattedProduct);
  } catch (error) {
    next(error);
  }
};

// Create product
export const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      name,
      category,
      description,
      basePrice,
      costPrice,
      imageUrl,
      reorderPoint,
      totalStock,
    } = req.body;

    // Validate required fields
    if (!name || !category || basePrice === undefined || costPrice === undefined) {
      return sendError(res, 'Name, category, base price, and cost price are required', 'MISSING_FIELDS', 400);
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        category: category.trim(),
        description: description?.trim() || '',
        basePrice: parseFloat(basePrice),
        costPrice: parseFloat(costPrice),
        imageUrl: imageUrl?.trim() || null,
        reorderPoint: parseInt(reorderPoint) || 0,
        totalStock: parseInt(totalStock) || 0,
      },
      include: {
        variants: true,
        modifierGroups: {
          include: {
            modifiers: true,
          },
        },
      },
    });

    // Convert Decimal to number
    const formattedProduct = {
      ...product,
      basePrice: parseFloat(product.basePrice.toString()),
      costPrice: parseFloat(product.costPrice.toString()),
      variants: product.variants.map(variant => ({
        ...variant,
        price: parseFloat(variant.price.toString()),
      })),
      modifierGroups: product.modifierGroups.map(group => ({
        ...group,
        modifiers: group.modifiers.map(modifier => ({
          ...modifier,
          price: parseFloat(modifier.price.toString()),
        })),
      })),
    };

    sendSuccess(res, formattedProduct, 'Product created successfully', 201);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return sendError(res, 'Product with this name already exists', 'DUPLICATE_PRODUCT', 409);
    }
    next(error);
  }
};

// Update product
export const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      description,
      basePrice,
      costPrice,
      imageUrl,
      reorderPoint,
      totalStock,
    } = req.body;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return sendError(res, 'Product not found', 'PRODUCT_NOT_FOUND', 404);
    }

    const updateData: any = {};

    if (name !== undefined) updateData.name = name.trim();
    if (category !== undefined) updateData.category = category.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (basePrice !== undefined) updateData.basePrice = parseFloat(basePrice);
    if (costPrice !== undefined) updateData.costPrice = parseFloat(costPrice);
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl?.trim() || null;
    if (reorderPoint !== undefined) updateData.reorderPoint = parseInt(reorderPoint);
    if (totalStock !== undefined) updateData.totalStock = parseInt(totalStock);

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        variants: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        modifierGroups: {
          include: {
            modifiers: {
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    // Convert Decimal to number
    const formattedProduct = {
      ...product,
      basePrice: parseFloat(product.basePrice.toString()),
      costPrice: parseFloat(product.costPrice.toString()),
      variants: product.variants.map(variant => ({
        ...variant,
        price: parseFloat(variant.price.toString()),
      })),
      modifierGroups: product.modifierGroups.map(group => ({
        ...group,
        modifiers: group.modifiers.map(modifier => ({
          ...modifier,
          price: parseFloat(modifier.price.toString()),
        })),
      })),
    };

    sendSuccess(res, formattedProduct, 'Product updated successfully');
  } catch (error: any) {
    if (error.code === 'P2025') {
      return sendError(res, 'Product not found', 'PRODUCT_NOT_FOUND', 404);
    }
    if (error.code === 'P2002') {
      return sendError(res, 'Product with this name already exists', 'DUPLICATE_PRODUCT', 409);
    }
    next(error);
  }
};

// Delete product
export const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return sendError(res, 'Product not found', 'PRODUCT_NOT_FOUND', 404);
    }

    await prisma.product.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Product deleted successfully');
  } catch (error: any) {
    if (error.code === 'P2025') {
      return sendError(res, 'Product not found', 'PRODUCT_NOT_FOUND', 404);
    }
    next(error);
  }
};

