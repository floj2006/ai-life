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
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return normalized;
};

const getCredentials = () => {
  const shopId = required(process.env.YOOKASSA_SHOP_ID, "YOOKASSA_SHOP_ID");
  const secretKey = required(process.env.YOOKASSA_SECRET_KEY, "YOOKASSA_SECRET_KEY");

  if (!/^\d+$/.test(shopId)) {
    throw new Error("YOOKASSA_SHOP_ID должен содержать только цифры.");
  }

  if (secretKey.includes("*")) {
    throw new Error(
      "YOOKASSA_SECRET_KEY выглядит как маска со звездочками. Вставьте полный ключ без скрытых символов.",
    );
  }

  return { shopId, secretKey };
};

const getAuthHeader = () => {
  const { shopId, secretKey } = getCredentials();
  const token = Buffer.from(`${shopId}:${secretKey}`).toString("base64");
  return `Basic ${token}`;
};

export const isYooKassaConfigured = () => {
  return Boolean(
    process.env.YOOKASSA_SHOP_ID?.trim() && process.env.YOOKASSA_SECRET_KEY?.trim(),
  );
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
  let data: unknown = null;
  if (rawText) {
    try {
      data = JSON.parse(rawText) as unknown;
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        "ЮKassa вернула 401: проверьте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY (полный ключ без *, пробелов и кавычек).",
      );
    }

    const message =
      typeof data === "object" &&
      data !== null &&
      "description" in data &&
      typeof data.description === "string"
        ? data.description
        : `YooKassa request failed with status ${response.status}`;

    throw new Error(message);
  }

  if (!data || typeof data !== "object") {
    throw new Error("YooKassa вернула пустой или некорректный ответ.");
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
  promoCodeId?: string;
  promoCode?: string;
  discountRub?: string;
  baseAmountRub?: string;
  finalAmountRub?: string;
};

export const createYooKassaPayment = async (payload: CreatePaymentPayload) => {
  const metadata: Record<string, string> = {
    user_id: payload.userId,
    email: payload.email ?? "",
    plan_id: payload.planId ?? "",
    promo_code_id: payload.promoCodeId ?? "",
    promo_code: payload.promoCode ?? "",
    discount_rub: payload.discountRub ?? "0.00",
    base_amount_rub: payload.baseAmountRub ?? payload.amountValue,
    final_amount_rub: payload.finalAmountRub ?? payload.amountValue,
  };

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
    metadata,
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
