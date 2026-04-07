import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

type JsonRecord = Record<string, unknown>;

type BaseRequestMeta = {
  request?: Request | null;
  userId?: string | null;
  userEmail?: string | null;
  routePath?: string | null;
};

type AnalyticsEventInput = BaseRequestMeta & {
  eventName: string;
  metadata?: JsonRecord;
};

type ErrorEventInput = BaseRequestMeta & {
  source: "client" | "server" | "render";
  message: string;
  stack?: string | null;
  metadata?: JsonRecord;
};

type AdminAuditLogInput = {
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetUserId?: string | null;
  targetSubmissionId?: string | null;
  metadata?: JsonRecord;
};

const MAX_TEXT_LENGTH = 1500;
const MAX_STACK_LENGTH = 4000;
const MAX_METADATA_LENGTH = 6000;

const cleanText = (value: string | null | undefined, limit = MAX_TEXT_LENGTH) => {
  if (!value) {
    return null;
  }

  return value.trim().slice(0, limit) || null;
};

const sanitizeMetadata = (metadata: JsonRecord | undefined) => {
  if (!metadata) {
    return {};
  }

  try {
    const raw = JSON.stringify(metadata);
    if (raw.length <= MAX_METADATA_LENGTH) {
      return metadata;
    }

    return {
      truncated: true,
      preview: raw.slice(0, MAX_METADATA_LENGTH),
    };
  } catch {
    return {
      invalidMetadata: true,
    };
  }
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

const getReferrer = (request?: Request | null) => {
  return cleanText(request?.headers.get("referer"), 500);
};

const safeInsert = async (table: string, values: Record<string, unknown>) => {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from(table).insert(values);

    if (error) {
      console.error(`[telemetry] Failed to insert into ${table}.`, error.message);
    }
  } catch (error) {
    console.error(`[telemetry] Failed to access ${table}.`, error);
  }
};

export const trackAnalyticsEvent = async ({
  eventName,
  metadata,
  request,
  userId,
  userEmail,
  routePath,
}: AnalyticsEventInput) => {
  await safeInsert("analytics_events", {
    event_name: cleanText(eventName, 120),
    route_path: cleanText(routePath, 300),
    user_id: userId ?? null,
    user_email: cleanText(userEmail, 320),
    metadata: sanitizeMetadata(metadata),
    client_ip: getClientIp(request),
    user_agent: getUserAgent(request),
    referrer: getReferrer(request),
  });
};

export const trackErrorEvent = async ({
  source,
  message,
  stack,
  metadata,
  request,
  userId,
  userEmail,
  routePath,
}: ErrorEventInput) => {
  await safeInsert("app_error_events", {
    source,
    message: cleanText(message, MAX_TEXT_LENGTH),
    stack: cleanText(stack, MAX_STACK_LENGTH),
    route_path: cleanText(routePath, 300),
    user_id: userId ?? null,
    user_email: cleanText(userEmail, 320),
    metadata: sanitizeMetadata(metadata),
    client_ip: getClientIp(request),
    user_agent: getUserAgent(request),
  });
};

export const logAdminAuditEvent = async ({
  actorUserId,
  actorEmail,
  action,
  targetUserId,
  targetSubmissionId,
  metadata,
}: AdminAuditLogInput) => {
  await safeInsert("admin_audit_logs", {
    actor_user_id: actorUserId ?? null,
    actor_email: cleanText(actorEmail, 320),
    action: cleanText(action, 120),
    target_user_id: targetUserId ?? null,
    target_submission_id: targetSubmissionId ?? null,
    metadata: sanitizeMetadata(metadata),
  });
};
