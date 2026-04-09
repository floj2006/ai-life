import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserRowExists } from "@/lib/supabase/ensure-user-row";

export const runtime = "nodejs";

type VkidCompletePayload = {
  accessToken?: string;
  contactEmail?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
};

type VkidUserInfoResponse = {
  user?: {
    user_id?: number | string;
    first_name?: string;
    last_name?: string;
    avatar?: string;
    email?: string;
    phone?: string;
  };
  error?: string;
  error_description?: string;
};

const isValidEmail = (value: string | null | undefined) => {
  if (!value) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const normalizeText = (value: string | null | undefined, maxLength = 120) => {
  const text = (value ?? "").trim();
  if (!text) {
    return null;
  }
  return text.slice(0, maxLength);
};

const getAppUrl = (request: Request) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl && /^https?:\/\//.test(appUrl)) {
    return appUrl.replace(/\/+$/, "");
  }

  return new URL(request.url).origin.replace(/\/+$/, "");
};

const fetchVkidUserInfo = async (accessToken: string) => {
  const clientId = process.env.NEXT_PUBLIC_VKID_APP_ID?.trim();
  if (!clientId) {
    throw new Error("VK ID не настроен: добавьте NEXT_PUBLIC_VKID_APP_ID.");
  }

  const endpoint = `https://id.vk.ru/oauth2/user_info?client_id=${encodeURIComponent(clientId)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      access_token: accessToken,
    }).toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`VK ID user_info вернул ошибку ${response.status}.`);
  }

  const payload = (await response.json()) as VkidUserInfoResponse;
  if (payload.error) {
    throw new Error(payload.error_description || payload.error);
  }

  const userIdRaw = payload.user?.user_id;
  const userId = String(userIdRaw ?? "").trim();
  if (!userId) {
    throw new Error("VK ID не вернул user_id.");
  }

  return {
    userId,
    firstName: normalizeText(payload.user?.first_name, 80),
    lastName: normalizeText(payload.user?.last_name, 80),
    email: isValidEmail(payload.user?.email ?? null) ? payload.user?.email ?? null : null,
    avatar: normalizeText(payload.user?.avatar, 1000),
    phone: normalizeText(payload.user?.phone, 40),
  };
};

const findUserByEmail = async (admin: ReturnType<typeof createAdminClient>, email: string) => {
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const list = await admin.auth.admin.listUsers({ page, perPage });
    if (list.error) {
      throw new Error(list.error.message);
    }

    const users = list.data?.users ?? [];
    const found = users.find((user) => (user.email ?? "").toLowerCase() === email.toLowerCase());
    if (found) {
      return found;
    }

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return null;
};

export async function POST(request: Request) {
  let payload: VkidCompletePayload;
  try {
    payload = (await request.json()) as VkidCompletePayload;
  } catch {
    return NextResponse.json({ error: "Некорректный формат запроса." }, { status: 400 });
  }

  const accessToken = (payload.accessToken ?? "").trim();
  if (!accessToken) {
    return NextResponse.json({ error: "Не передан access token VK ID." }, { status: 400 });
  }

  const rateLimitResponse = enforceRateLimit({
    bucket: "vkid-complete",
    limit: 40,
    windowMs: 10 * 60 * 1000,
    request,
    userId: accessToken.slice(0, 16),
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const admin = createAdminClient();
    const vk = await fetchVkidUserInfo(accessToken);
    const fallbackEmail = `vkid-${vk.userId}@vkid.ai-easy-life.local`;
    const authEmail = vk.email ?? fallbackEmail;

    const fullNameFromVkid = [vk.firstName, vk.lastName].filter(Boolean).join(" ").trim();
    const fullName =
      normalizeText(payload.displayName, 120) ??
      normalizeText(fullNameFromVkid, 120) ??
      normalizeText(payload.firstName, 80) ??
      "Пользователь VK ID";

    let authUser = await findUserByEmail(admin, authEmail);

    if (!authUser) {
      const createResult = await admin.auth.admin.createUser({
        email: authEmail,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          subscription_tier: "newbie",
          is_pro: false,
          vk_user_id: vk.userId,
          vk_provider: "vkid",
          contact_email: isValidEmail(payload.contactEmail ?? null)
            ? payload.contactEmail
            : vk.email ?? null,
          avatar_url: vk.avatar ?? null,
          phone: vk.phone ?? null,
        },
        app_metadata: {
          provider: "vkid",
          providers: ["vkid"],
        },
      });

      if (createResult.error || !createResult.data.user) {
        const message = createResult.error?.message ?? "Не удалось создать пользователя VK ID.";
        throw new Error(message);
      }

      authUser = createResult.data.user;
    } else {
      const updateResult = await admin.auth.admin.updateUserById(authUser.id, {
        email_confirm: true,
        user_metadata: {
          ...(authUser.user_metadata ?? {}),
          full_name: fullName,
          subscription_tier:
            typeof authUser.user_metadata?.subscription_tier === "string"
              ? authUser.user_metadata.subscription_tier
              : "newbie",
          is_pro: authUser.user_metadata?.is_pro === true,
          vk_user_id: vk.userId,
          vk_provider: "vkid",
          contact_email: isValidEmail(payload.contactEmail ?? null)
            ? payload.contactEmail
            : vk.email ?? null,
          avatar_url: vk.avatar ?? authUser.user_metadata?.avatar_url ?? null,
          phone: vk.phone ?? authUser.user_metadata?.phone ?? null,
        },
        app_metadata: {
          ...(authUser.app_metadata ?? {}),
          provider: "vkid",
          providers: ["vkid"],
        },
      });

      if (updateResult.error || !updateResult.data.user) {
        throw new Error(updateResult.error?.message ?? "Не удалось обновить профиль VK ID.");
      }

      authUser = updateResult.data.user;
    }

    const usersSyncError = await ensureUserRowExists(admin, {
      id: authUser.id,
      email: authUser.email ?? null,
      user_metadata: authUser.user_metadata ?? null,
      app_metadata: authUser.app_metadata ?? null,
    });

    if (usersSyncError) {
      console.error("[vkid] users sync warning:", usersSyncError);
    }

    const appUrl = getAppUrl(request);
    const magicLink = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: authEmail,
      options: {
        redirectTo: `${appUrl}/auth/callback?next=/dashboard`,
      },
    });

    if (magicLink.error) {
      throw new Error(magicLink.error.message);
    }

    const actionLink = magicLink.data.properties?.action_link;
    if (!actionLink) {
      throw new Error("Supabase не вернул ссылку входа.");
    }

    return NextResponse.json({
      loginUrl: actionLink,
      created: !authUser.last_sign_in_at,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось завершить вход через VK ID.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
