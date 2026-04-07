type YooKassaAmount = {
  value: string;
  currency: "RUB";
};

type YooKassaPayment = {
  id: string;
  status: string;
  paid: boolean;
  amount: YooKassaAmount;
  metadata?: Record<string, string>;
  confirmation?: {
    type: string;
    confirmation_url?: string;
  };
};

const YOOKASSA_API_URL = "https://api.yookassa.ru/v3";

const required = (value: string | undefined, key: string) => {
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

const getCredentials = () => {
  const shopId = required(process.env.YOOKASSA_SHOP_ID, "YOOKASSA_SHOP_ID");
  const secretKey = required(
    process.env.YOOKASSA_SECRET_KEY,
    "YOOKASSA_SECRET_KEY",
  );

  return { shopId, secretKey };
};

const getAuthHeader = () => {
  const { shopId, secretKey } = getCredentials();
  const token = Buffer.from(`${shopId}:${secretKey}`).toString("base64");
  return `Basic ${token}`;
};

const request = async <T>(path: string, init: RequestInit): Promise<T> => {
  const response = await fetch(`${YOOKASSA_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });

  const rawText = await response.text();
  const data = rawText ? (JSON.parse(rawText) as unknown) : null;

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "description" in data &&
      typeof data.description === "string"
        ? data.description
        : `YooKassa request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
};

type CreatePaymentPayload = {
  amountValue: string;
  returnUrl: string;
  description: string;
  userId: string;
  email?: string;
  planId?: string;
};

export const createYooKassaPayment = async (payload: CreatePaymentPayload) => {
  const body = {
    amount: {
      value: payload.amountValue,
      currency: "RUB",
    },
    capture: true,
    confirmation: {
      type: "redirect",
      return_url: payload.returnUrl,
    },
    description: payload.description,
    metadata: {
      user_id: payload.userId,
      email: payload.email ?? "",
      plan_id: payload.planId ?? "",
    },
  };

  return request<YooKassaPayment>("/payments", {
    method: "POST",
    headers: {
      "Idempotence-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  });
};

export const getYooKassaPayment = async (paymentId: string) => {
  return request<YooKassaPayment>(`/payments/${paymentId}`, {
    method: "GET",
  });
};
