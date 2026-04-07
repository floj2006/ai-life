const required = (value: string | undefined, key: string) => {
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

const isValidSupabaseUrl = (url: string) => {
  return url.startsWith("https://") || url.startsWith("http://");
};

const isPublicAnonKey = (key: string) => {
  return !key.startsWith("sb_secret_");
};

const getPublicSupabaseKey = () => {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

const getPublicSupabaseKeyName = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
    ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"
    : process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
      : "NEXT_PUBLIC_SUPABASE_ANON_KEY";
};

export const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = getPublicSupabaseKey();
  if (!url || !publicKey) {
    return false;
  }

  return isValidSupabaseUrl(url) && isPublicAnonKey(publicKey);
};

export const getSupabasePublicEnv = (): SupabasePublicEnv | null => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = getPublicSupabaseKey();

  if (
    !url ||
    !publicKey ||
    !isValidSupabaseUrl(url) ||
    !isPublicAnonKey(publicKey)
  ) {
    return null;
  }

  return { url, anonKey: publicKey };
};

export const requireSupabasePublicEnv = (): SupabasePublicEnv => {
  const url = required(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
  const publicKeyVarName = getPublicSupabaseKeyName();
  const anonKey = required(getPublicSupabaseKey(), publicKeyVarName);

  if (!isValidSupabaseUrl(url)) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must be a valid URL like https://<project>.supabase.co",
    );
  }

  if (!isPublicAnonKey(anonKey)) {
    throw new Error(
      `${publicKeyVarName} must be public publishable/anon key (not sb_secret_ key).`,
    );
  }

  return { url, anonKey };
};

export const getSupabaseServiceRoleKey = () => {
  return required(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    "SUPABASE_SERVICE_ROLE_KEY",
  );
};
