import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response.utils';

// Get modifier groups for a product
export const getModifierGroupsByProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { productId } = req.params;

    const modifierGroups = await prisma.modifierGroup.findMany({
      where: { productId },
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
    });

    // Convert Decimal to number
    const formattedGroups = modifierGroups.map(group => ({
      ...group,
      modifiers: group.modifiers.map(modifier => ({
        ...modifier,
        price: parseFloat(modifier.price.toString()),
      })),
    }));

    sendSuccess(res, formattedGroups);
  } catch (error) {
    next(error);
  }
};

// Create modifier group
export const createModifierGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { productId, name, required, maxSelections, modifiers } = req.body;

    if (!productId || !name) {
      return sendError(res, 'Product ID and name are required', 'MISSING_FIELDS', 400);
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return sendError(res, 'Product not found', 'PRODUCT_NOT_FOUND', 404);
    }

    const modifierGroup = await prisma.modifierGroup.create({
      data: {
        productId,
        name: name.trim(),
        required: required ?? false,
        maxSelections: maxSelections ? parseInt(maxSelections) : null,
        modifiers: modifiers && Array.isArray(modifiers) ? {
          create: modifiers.map((mod: any) => ({
            name: mod.name.trim(),
            price: parseFloat(mod.price) || 0,
            category: mod.category?.trim() || name.trim(),
          })),
        } : undefined,
      },
      include: {
        modifiers: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    // Convert Decimal to number
    const formattedGroup = {
      ...modifierGroup,
      modifiers: modifierGroup.modifiers.map(modifier => ({
        ...modifier,
        price: parseFloat(modifier.price.toString()),
      })),
    };

    sendSuccess(res, formattedGroup, 'Modifier group created successfully', 201);
  } catch (error: any) {
    next(error);
  }
};

// Update modifier group
export const updateModifierGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { name, required, maxSelections } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (required !== undefined) updateData.required = required;
    if (maxSelections !== undefined) updateData.maxSelections = maxSelections ? parseInt(maxSelections) : null;

    const modifierGroup = await prisma.modifierGroup.update({
      where: { id },
      data: updateData,
      include: {
        modifiers: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    // Convert Decimal to number
    const formattedGroup = {
      ...modifierGroup,
      modifiers: modifierGroup.modifiers.map(modifier => ({
        ...modifier,
        price: parseFloat(modifier.price.toString()),
      })),
    };

    sendSuccess(res, formattedGroup, 'Modifier group updated successfully');
  } catch (error: any) {
    if (error.code === 'P2025') {
      return sendError(res, 'Modifier group not found', 'MODIFIER_GROUP_NOT_FOUND', 404);
    }
    next(error);
  }
};

// Delete modifier group
export const deleteModifierGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    await prisma.modifierGroup.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Modifier group deleted successfully');
  } catch (error: any) {
    if (error.code === 'P2025') {
      return sendError(res, 'Modifier group not found', 'MODIFIER_GROUP_NOT_FOUND', 404);
    }
    next(error);
  }
};

// Create modifier
export const createModifier = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { modifierGroupId, name, price, category } = req.body;

    if (!modifierGroupId || !name || price === undefined) {
      return sendError(res, 'Modifier group ID, name, and price are required', 'MISSING_FIELDS', 400);
    }

    // Check if modifier group exists
    const modifierGroup = await prisma.modifierGroup.findUnique({
      where: { id: modifierGroupId },
    });

    if (!modifierGroup) {
      return sendError(res, 'Modifier group not found', 'MODIFIER_GROUP_NOT_FOUND', 404);
    }

    const modifier = await prisma.modifier.create({
      data: {
        modifierGroupId,
        name: name.trim(),
        price: parseFloat(price),
        category: category?.trim() || modifierGroup.name,
      },
    });

    // Convert Decimal to number
    const formattedModifier = {
      ...modifier,
      price: parseFloat(modifier.price.toString()),
    };

    sendSuccess(res, formattedModifier, 'Modifier created successfully', 201);
  } catch (error: any) {
    next(error);
  }
};

// Update modifier
export const updateModifier = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { name, price, category } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (price !== undefined) updateData.price = parseFloat(price);
    if (category !== undefined) updateData.category = category.trim();

    const modifier = await prisma.modifier.update({
      where: { id },
      data: updateData,
    });

    // Convert Decimal to number
    const formattedModifier = {
      ...modifier,
      price: parseFloat(modifier.price.toString()),
    };

    sendSuccess(res, formattedModifier, 'Modifier updated successfully');
  } catch (error: any) {
    if (error.code === 'P2025') {
      return sendError(res, 'Modifier not found', 'MODIFIER_NOT_FOUND', 404);
    }
    next(error);
  }
};

// Delete modifier
export const deleteModifier = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    await prisma.modifier.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Modifier deleted successfully');
  } catch (error: any) {
    if (error.code === 'P2025') {
      return sendError(res, 'Modifier not found', 'MODIFIER_NOT_FOUND', 404);
    }
    next(error);
  }
};

