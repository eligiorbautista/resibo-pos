import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { sendError, sendSuccess } from '../utils/response.utils';
import { config } from '../config/env';
import { paymongoAttachPaymentIntent, paymongoCreatePaymentIntent, paymongoCreatePaymentMethod, paymongoGetPaymentIntent } from '../utils/paymongo.utils';

const mapPaymongoStatusToIntentStatus = (status?: string) => {
  switch ((status || '').toLowerCase()) {
    case 'succeeded':
      return 'PAID' as const;
    case 'failed':
      return 'FAILED' as const;
    case 'cancelled':
      return 'CANCELLED' as const;
    case 'processing':
    case 'awaiting_payment_method':
    default:
      return 'PENDING' as const;
  }
};

export const createPaymongoRedirectIntent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, method, description } = req.body as {
      amount: number; // pesos
      method: 'GCASH' | 'PAYMAYA';
      description?: string;
    };

    if (!config.paymongoSecretKey) {
      return sendError(res, 'PayMongo is not configured on the backend', 'PAYMONGO_NOT_CONFIGURED', 400);
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return sendError(res, 'Amount must be a positive number', 'INVALID_AMOUNT', 400);
    }
    if (!method || !['GCASH', 'PAYMAYA'].includes(method)) {
      return sendError(res, 'Invalid payment method for PayMongo', 'INVALID_PAYMENT_METHOD', 400);
    }

    const externalId = `pi_${crypto.randomUUID()}`;
    const intent = await prisma.paymentIntent.create({
      data: {
        provider: 'PAYMONGO',
        method,
        status: 'CREATED',
        amount: new Prisma.Decimal(amount),
        currency: 'PHP',
        externalId,
      },
    });

    const frontendBase = (config.frontendBaseUrl || config.corsOrigin || '').replace(/\/+$/, '');
    if (!frontendBase) {
      return sendError(res, 'FRONTEND_BASE_URL (or CORS_ORIGIN) must be set for PayMongo redirects', 'MISSING_FRONTEND_BASE_URL', 400);
    }
    const returnUrl = `${frontendBase}/pos?paymongoReturn=1&intentId=${encodeURIComponent(intent.id)}`;

    const amountCentavos = Math.round(amount * 100);
    const paymongoMethod = method === 'GCASH' ? 'gcash' : 'paymaya';

    const pmIntent = await paymongoCreatePaymentIntent({
      amount: amountCentavos,
      currency: 'PHP',
      payment_method_allowed: [paymongoMethod],
      description: description || `POS Payment (${method})`,
    });
    const pmMethod = await paymongoCreatePaymentMethod({ type: paymongoMethod });
    const attachResp = await paymongoAttachPaymentIntent(pmIntent.id, {
      payment_method: pmMethod.id,
      return_url: returnUrl,
    });

    const redirectUrl =
      (attachResp as any)?.data?.attributes?.next_action?.redirect?.url ||
      (attachResp as any)?.data?.attributes?.next_action?.redirect?.href ||
      (attachResp as any)?.included?.find((i: any) => i?.attributes?.next_action?.redirect?.url)?.attributes?.next_action?.redirect?.url ||
      null;

    const updated = await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: {
        status: mapPaymongoStatusToIntentStatus(pmIntent.attributes.status),
        paymongoPaymentIntentId: pmIntent.id,
        paymongoPaymentMethodId: pmMethod.id,
        paymongoRedirectUrl: redirectUrl,
        providerRaw: { paymongoPaymentIntent: pmIntent as any, paymongoPaymentMethod: pmMethod as any, attachResp: attachResp as any } as any,
      },
    });

    sendSuccess(res, {
      intentId: updated.id,
      provider: updated.provider,
      method: updated.method,
      status: updated.status,
      amount,
      currency: updated.currency,
      redirectUrl: updated.paymongoRedirectUrl,
      paymongoPaymentIntentId: updated.paymongoPaymentIntentId,
    }, 'PayMongo payment created', 201);
  } catch (error) {
    next(error);
  }
};

export const getPaymongoIntentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { intentId } = req.params;

    const intent = await prisma.paymentIntent.findUnique({ where: { id: intentId } });
    if (!intent || intent.provider !== 'PAYMONGO') {
      return sendError(res, 'Payment intent not found', 'PAYMENT_INTENT_NOT_FOUND', 404);
    }
    if (!config.paymongoSecretKey) {
      return sendError(res, 'PayMongo is not configured on the backend', 'PAYMONGO_NOT_CONFIGURED', 400);
    }
    if (!intent.paymongoPaymentIntentId) {
      return sendError(res, 'PayMongo payment intent not created', 'PAYMONGO_INTENT_NOT_CREATED', 400);
    }

    const pmIntent = await paymongoGetPaymentIntent(intent.paymongoPaymentIntentId);
    const status = mapPaymongoStatusToIntentStatus(pmIntent.attributes.status);

    const updated = await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: {
        status,
        providerRaw: pmIntent as any,
      },
    });

    sendSuccess(res, {
      intentId: updated.id,
      provider: updated.provider,
      method: updated.method,
      status: updated.status,
      amount: parseFloat(updated.amount.toString()),
      currency: updated.currency,
      redirectUrl: updated.paymongoRedirectUrl,
      paymongoPaymentIntentId: updated.paymongoPaymentIntentId,
    });
  } catch (error) {
    next(error);
  }
};


