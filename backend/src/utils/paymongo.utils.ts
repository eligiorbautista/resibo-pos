import { config } from '../config/env';

const PAYMONGO_BASE_URL = 'https://api.paymongo.com/v1';

const getAuthHeader = () => {
  if (!config.paymongoSecretKey) {
    throw new Error('PAYMONGO_SECRET_KEY is not set');
  }
  const token = Buffer.from(`${config.paymongoSecretKey}:`).toString('base64');
  return `Basic ${token}`;
};

export type PaymongoPaymentIntentStatus =
  | 'awaiting_payment_method'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | string;

export interface PaymongoPaymentIntent {
  id: string;
  type: 'payment_intent';
  attributes: {
    amount: number;
    currency: 'PHP' | string;
    status: PaymongoPaymentIntentStatus;
    client_key?: string;
    payment_method_allowed?: string[];
  };
}

export interface PaymongoPaymentMethod {
  id: string;
  type: 'payment_method';
  attributes: {
    type: 'gcash' | 'paymaya' | string;
  };
}

export interface PaymongoAttachResponse {
  data: PaymongoPaymentIntent;
  included?: Array<{
    type: string;
    id: string;
    attributes?: any;
  }>;
}

async function paymongoRequest<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${PAYMONGO_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.errors ? JSON.stringify(data.errors) : JSON.stringify(data);
    throw new Error(msg);
  }
  return data as T;
}

export async function paymongoCreatePaymentIntent(payload: {
  amount: number; // in centavos
  currency: 'PHP';
  payment_method_allowed: Array<'gcash' | 'paymaya'>;
  description?: string;
}): Promise<PaymongoPaymentIntent> {
  const body = {
    data: {
      attributes: payload,
    },
  };
  const resp = await paymongoRequest<{ data: PaymongoPaymentIntent }>('/payment_intents', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return resp.data;
}

export async function paymongoCreatePaymentMethod(payload: {
  type: 'gcash' | 'paymaya';
}): Promise<PaymongoPaymentMethod> {
  const body = {
    data: {
      attributes: payload,
    },
  };
  const resp = await paymongoRequest<{ data: PaymongoPaymentMethod }>('/payment_methods', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return resp.data;
}

export async function paymongoAttachPaymentIntent(intentId: string, payload: {
  payment_method: string;
  return_url: string;
}): Promise<PaymongoAttachResponse> {
  const body = {
    data: {
      attributes: payload,
    },
  };
  return paymongoRequest<PaymongoAttachResponse>(`/payment_intents/${encodeURIComponent(intentId)}/attach`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function paymongoGetPaymentIntent(intentId: string): Promise<PaymongoPaymentIntent> {
  const resp = await paymongoRequest<{ data: PaymongoPaymentIntent }>(`/payment_intents/${encodeURIComponent(intentId)}`, {
    method: 'GET',
  });
  return resp.data;
}


