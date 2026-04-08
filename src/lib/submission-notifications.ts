export const SUBMISSIONS_LAST_SEEN_AT_KEY = "submissions_last_seen_at_iso";

export const parseSeenAtIso = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString();
};

export const nowIso = () => new Date().toISOString();

