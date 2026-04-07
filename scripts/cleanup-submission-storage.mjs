import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SUBMISSION_MEDIA_BUCKET = "submission-results";
const PAGE_SIZE = 1000;
const DEFAULT_GRACE_HOURS = 24;

const projectRoot = process.cwd();
const envFilePath = path.join(projectRoot, ".env.local");

const parseEnvFile = (raw) => {
  const result = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
};

if (fs.existsSync(envFilePath)) {
  const parsed = parseEnvFile(fs.readFileSync(envFilePath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check .env.local before running cleanup.",
  );
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const apply = process.argv.includes("--apply");
const graceHoursArg = process.argv.find((item) => item.startsWith("--grace-hours="));
const graceHours = Number(graceHoursArg?.split("=")[1] ?? DEFAULT_GRACE_HOURS);
const graceMs = Number.isFinite(graceHours) && graceHours >= 0
  ? graceHours * 60 * 60 * 1000
  : DEFAULT_GRACE_HOURS * 60 * 60 * 1000;

const parseStorageLink = (value) => {
  if (!value || !value.startsWith("storage://")) {
    return null;
  }

  const raw = value.slice("storage://".length);
  const slashIndex = raw.indexOf("/");
  if (slashIndex <= 0) {
    return null;
  }

  const bucket = raw.slice(0, slashIndex);
  const objectPath = raw.slice(slashIndex + 1);

  if (!objectPath) {
    return null;
  }

  return {
    bucket,
    objectPath,
  };
};

const fetchReferencedPaths = async () => {
  const referenced = new Set();
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await admin
      .from("lesson_submissions")
      .select("result_link")
      .range(from, to);

    if (error) {
      throw new Error(`Failed to load lesson_submissions: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const row of data) {
      const parsed = parseStorageLink(row.result_link);
      if (parsed && parsed.bucket === SUBMISSION_MEDIA_BUCKET) {
        referenced.add(parsed.objectPath);
      }
    }

    if (data.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return referenced;
};

const fetchStoredObjects = async () => {
  const objects = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await admin
      .schema("storage")
      .from("objects")
      .select("name, created_at")
      .eq("bucket_id", SUBMISSION_MEDIA_BUCKET)
      .range(from, to);

    if (error) {
      throw new Error(`Failed to load storage.objects: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    objects.push(...data);

    if (data.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return objects;
};

const chunk = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const now = Date.now();

try {
  const [referencedPaths, storedObjects] = await Promise.all([
    fetchReferencedPaths(),
    fetchStoredObjects(),
  ]);

  const orphanPaths = storedObjects
    .filter((item) => {
      if (!item?.name || referencedPaths.has(item.name)) {
        return false;
      }

      const createdAt = item.created_at ? new Date(item.created_at).getTime() : 0;
      if (!createdAt) {
        return true;
      }

      return now - createdAt >= graceMs;
    })
    .map((item) => item.name);

  console.log(`Referenced submission files: ${referencedPaths.size}`);
  console.log(`Stored submission files: ${storedObjects.length}`);
  console.log(`Orphan files older than ${Math.round(graceMs / 3600000)}h: ${orphanPaths.length}`);

  if (orphanPaths.length === 0) {
    process.exit(0);
  }

  console.log("Sample orphan paths:");
  orphanPaths.slice(0, 10).forEach((item) => console.log(`- ${item}`));

  if (!apply) {
    console.log("");
    console.log("Dry run only. Re-run with --apply to delete these files.");
    process.exit(0);
  }

  let removedCount = 0;

  for (const paths of chunk(orphanPaths, 100)) {
    const { error } = await admin.storage.from(SUBMISSION_MEDIA_BUCKET).remove(paths);
    if (error) {
      throw new Error(`Failed to remove objects: ${error.message}`);
    }
    removedCount += paths.length;
  }

  console.log(`Removed orphan files: ${removedCount}`);
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Storage cleanup failed unexpectedly.",
  );
  process.exit(1);
}
