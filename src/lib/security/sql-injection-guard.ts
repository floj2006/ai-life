import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptOptional } from "@/lib/security/encryption";

type GuardLogInput = {
  request?: Request | null;
  location: string;
  sample: string;
};

const cleanText = (value: string | null | undefined, limit: number) => {
  if (!value) {
    return null;
  }
  return value.trim().slice(0, limit) || null;
};

const getClientIp = (request?: Request | null) => {
  if (!request) {
    return null;
  }

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return cleanText(forwarded.split(",")[0], 120);
  }

  return cleanText(request.headers.get("x-real-ip"), 120);
};

const getUserAgent = (request?: Request | null) => {
  return cleanText(request?.headers.get("user-agent"), 500);
};

export const logSqlInjectionAttempt = async ({ request, location, sample }: GuardLogInput) => {
  try {
    const admin = createAdminClient();
    await admin.from("admin_audit_logs").insert({
      action: "sql_injection_blocked",
      metadata: {
        location,
        sample: encryptOptional(cleanText(sample, 500)),
        client_ip: encryptOptional(getClientIp(request)),
        user_agent: encryptOptional(getUserAgent(request)),
      },
    });
  } catch (error) {
    console.error("[security] Failed to log SQL injection attempt.", error);
  }
};
