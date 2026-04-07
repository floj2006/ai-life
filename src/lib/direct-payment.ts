import type { PaidPlanId } from "@/lib/pricing";

const normalizeUrl = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return "";
  }

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return "";
  }

  return trimmed;
};

const normalizeText = (value: string | undefined) => {
  return (value ?? "").trim();
};

const normalizeMultilineText = (value: string | undefined) => {
  const normalized = normalizeText(value).replace(/\\n/g, "\n");
  return normalized;
};

const getDefaultRequisites = () => {
  return normalizeMultilineText(process.env.NEXT_PUBLIC_DIRECT_PAYMENT_REQUISITES);
};

const getStartRequisites = () => {
  return (
    normalizeMultilineText(process.env.NEXT_PUBLIC_DIRECT_PAYMENT_START_REQUISITES) ||
    getDefaultRequisites()
  );
};

const getMaxRequisites = () => {
  return (
    normalizeMultilineText(process.env.NEXT_PUBLIC_DIRECT_PAYMENT_MAX_REQUISITES) ||
    getDefaultRequisites()
  );
};

export const getDirectPaymentRequisites = (plan: PaidPlanId) => {
  return plan === "start" ? getStartRequisites() : getMaxRequisites();
};

export const getDirectPaymentContactUrl = () => {
  return normalizeUrl(process.env.NEXT_PUBLIC_DIRECT_PAYMENT_CONTACT_URL);
};

export const getDirectPaymentContactText = () => {
  return normalizeText(process.env.NEXT_PUBLIC_DIRECT_PAYMENT_CONTACT_TEXT);
};

export const isDirectPaymentConfigured = () => {
  return Boolean(getStartRequisites() || getMaxRequisites());
};
