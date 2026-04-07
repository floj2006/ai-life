import "server-only";

type AuthLikeUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
};

type SupabaseAdminLike = {
  from: (table: string) => {
    upsert: (
      values: Record<string, unknown>,
      options: { onConflict: string; ignoreDuplicates: boolean },
    ) => PromiseLike<{ error: { message?: string } | null }>;
  };
};

const getUserFullName = (user: AuthLikeUser) => {
  const fromUserMeta =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null;
  const fromAppMeta =
    typeof user.app_metadata?.full_name === "string"
      ? user.app_metadata.full_name
      : null;

  return fromUserMeta ?? fromAppMeta ?? null;
};

const getSubscriptionTier = (user: AuthLikeUser) => {
  const fromUserMeta =
    typeof user.user_metadata?.subscription_tier === "string"
      ? user.user_metadata.subscription_tier
      : null;
  const fromAppMeta =
    typeof user.app_metadata?.subscription_tier === "string"
      ? user.app_metadata.subscription_tier
      : null;
  const rawTier = (fromUserMeta ?? fromAppMeta ?? "newbie").toLowerCase();

  if (rawTier === "max" || rawTier === "start" || rawTier === "newbie") {
    return rawTier;
  }

  return "newbie";
};

const isProByMetadata = (user: AuthLikeUser) => {
  return user.user_metadata?.is_pro === true || user.app_metadata?.is_pro === true;
};

const isMissingColumnError = (message: string | undefined, column: string) => {
  const normalized = message?.toLowerCase() ?? "";
  return normalized.includes("column") && normalized.includes(column.toLowerCase());
};

export const ensureUserRowExists = async (
  admin: SupabaseAdminLike,
  user: AuthLikeUser,
) => {
  const fullName = getUserFullName(user);
  const tier = getSubscriptionTier(user);
  const isPro = tier === "max" || isProByMetadata(user);

  const payloads: Array<Record<string, unknown>> = [
    {
      id: user.id,
      email: user.email ?? null,
      full_name: fullName,
      is_pro: isPro,
      subscription_tier: tier,
    },
    {
      id: user.id,
      email: user.email ?? null,
      full_name: fullName,
      is_pro: isPro,
    },
    {
      id: user.id,
      email: user.email ?? null,
      full_name: fullName,
    },
    {
      id: user.id,
    },
  ];

  let lastErrorMessage: string | null = null;

  for (const payload of payloads) {
    const { error } = await admin.from("users").upsert(payload, {
      onConflict: "id",
      ignoreDuplicates: false,
    });

    if (!error) {
      return null;
    }

    const message = error.message ?? "";
    lastErrorMessage = message || "Unknown users upsert error";

    // The schema can differ across environments.
    // Try progressively simpler payloads before failing hard.
    if (
      isMissingColumnError(message, "subscription_tier") ||
      isMissingColumnError(message, "is_pro") ||
      isMissingColumnError(message, "full_name") ||
      isMissingColumnError(message, "email")
    ) {
      continue;
    }
  }

  return (
    lastErrorMessage ??
    "Не удалось синхронизировать профиль пользователя в таблице users."
  );
};

