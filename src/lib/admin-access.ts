import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
let cachedRawEmails: string | null = null;
let cachedAdminEmails: string[] = [];

const parseAdminEmails = () => {
  const raw = process.env.APP_ADMIN_EMAILS ?? "";
  if (raw === cachedRawEmails) {
    return cachedAdminEmails;
  }

  const matches = raw.match(EMAIL_RE) ?? [];
  cachedRawEmails = raw;
  cachedAdminEmails = [
    ...new Set(matches.map((item) => item.trim().toLowerCase()).filter(Boolean)),
  ];

  return cachedAdminEmails;
};

export const getAdminEmails = () => {
  return parseAdminEmails();
};

export const isAdminEmail = (email: string | null | undefined) => {
  if (!email) {
    return false;
  }

  const admins = parseAdminEmails();
  return admins.includes(email.trim().toLowerCase());
};

export const requireAdminUser = async () => {
  const { supabase, user } = await requireUser();

  if (!isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  return { supabase, user };
};
