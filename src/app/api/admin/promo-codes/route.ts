import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin-access";
import {
  isPromoCodeFormatValid,
  normalizePromoCode,
  type PromoDiscountType,
  type PromoPlanScope,
} from "@/lib/promo-codes";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type CreatePromoCodePayload = {
  code?: string;
  title?: string;
  discountType?: PromoDiscountType;
  discountValue?: number;
  planScope?: PromoPlanScope;
  maxUses?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  isActive?: boolean;
};

const isMissingPromoCodesTableError = (message: string | undefined) => {
  const normalized = (message ?? "").toLowerCase();
  return normalized.includes("could not find the table") && normalized.includes("public.promo_codes");
};

const isDuplicatePromoCodeError = (message: string | undefined) => {
  const normalized = (message ?? "").toLowerCase();
  return (
    normalized.includes("duplicate key") ||
    normalized.includes("unique constraint") ||
    normalized.includes("promo_codes_code_key")
  );
};

const isPromoDiscountType = (value: unknown): value is PromoDiscountType => {
  return value === "percent" || value === "fixed_rub";
};

const isPromoPlanScope = (value: unknown): value is PromoPlanScope => {
  return value === "all" || value === "start" || value === "max";
};

const parseOptionalDate = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

const parsePayload = (raw: CreatePromoCodePayload) => {
  const code = normalizePromoCode(raw.code);
  if (!isPromoCodeFormatValid(code)) {
    return { ok: false as const, error: "Код промокода должен быть 3-32 символа: A-Z, 0-9, _, -." };
  }

  if (!isPromoDiscountType(raw.discountType)) {
    return { ok: false as const, error: "Выберите корректный тип скидки." };
  }

  const discountValue = Number(raw.discountValue);
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return { ok: false as const, error: "Значение скидки должно быть больше нуля." };
  }

  if (raw.discountType === "percent" && discountValue > 100) {
    return { ok: false as const, error: "Скидка в процентах не может быть больше 100%." };
  }

  const planScope: PromoPlanScope = isPromoPlanScope(raw.planScope) ? raw.planScope : "all";

  const maxUses =
    raw.maxUses === null || raw.maxUses === undefined || raw.maxUses === 0
      ? null
      : Number(raw.maxUses);
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses <= 0)) {
    return { ok: false as const, error: "Лимит использований должен быть целым числом больше нуля." };
  }

  const startsAt = parseOptionalDate(raw.startsAt);
  const expiresAt = parseOptionalDate(raw.expiresAt);
  if (raw.startsAt && !startsAt) {
    return { ok: false as const, error: "Некорректная дата начала действия." };
  }
  if (raw.expiresAt && !expiresAt) {
    return { ok: false as const, error: "Некорректная дата окончания действия." };
  }
  if (startsAt && expiresAt && new Date(expiresAt) <= new Date(startsAt)) {
    return { ok: false as const, error: "Дата окончания должна быть позже даты начала." };
  }

  const title = (raw.title ?? "").trim();

  return {
    ok: true as const,
    data: {
      code,
      title: title.length > 0 ? title.slice(0, 120) : null,
      discountType: raw.discountType,
      discountValue: Number(discountValue.toFixed(2)),
      planScope,
      maxUses,
      startsAt,
      expiresAt,
      isActive: raw.isActive !== false,
    },
  };
};

const requireAdmin = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Нужна авторизация." }, { status: 401 }) };
  }

  if (!isAdminEmail(user.email)) {
    return { error: NextResponse.json({ error: "Недостаточно прав." }, { status: 403 }) };
  }

  return { user };
};

export async function GET() {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) {
    return adminCheck.error;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("promo_codes")
    .select(
      "id, code, title, discount_type, discount_value, plan_scope, is_active, max_uses, used_count, starts_at, expires_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    if (isMissingPromoCodesTableError(error.message)) {
      return NextResponse.json(
        { error: "Таблица promo_codes не найдена. Примените SQL-схему." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request) {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) {
    return adminCheck.error;
  }

  const rateLimitResponse = enforceRateLimit({
    bucket: "admin-promo-code-create",
    limit: 60,
    windowMs: 10 * 60 * 1000,
    request,
    userId: adminCheck.user.id,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let payload: CreatePromoCodePayload;
  try {
    payload = (await request.json()) as CreatePromoCodePayload;
  } catch {
    return NextResponse.json({ error: "Некорректный формат запроса." }, { status: 400 });
  }

  const parsed = parsePayload(payload);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("promo_codes")
    .insert({
      code: parsed.data.code,
      title: parsed.data.title,
      discount_type: parsed.data.discountType,
      discount_value: parsed.data.discountValue,
      plan_scope: parsed.data.planScope,
      is_active: parsed.data.isActive,
      max_uses: parsed.data.maxUses,
      starts_at: parsed.data.startsAt,
      expires_at: parsed.data.expiresAt,
      created_by: adminCheck.user.id,
    })
    .select(
      "id, code, title, discount_type, discount_value, plan_scope, is_active, max_uses, used_count, starts_at, expires_at, created_at",
    )
    .single();

  if (error) {
    if (isMissingPromoCodesTableError(error.message)) {
      return NextResponse.json(
        { error: "Таблица promo_codes не найдена. Примените SQL-схему." },
        { status: 503 },
      );
    }

    if (isDuplicatePromoCodeError(error.message)) {
      return NextResponse.json({ error: "Такой промокод уже существует." }, { status: 409 });
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ item: data });
}

