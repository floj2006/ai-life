import "server-only";
import { parseStorageResultLink } from "@/lib/submission-media";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LessonSubmission } from "@/lib/types";

export type SubmissionMediaPreview = {
  url: string;
  kind: "image" | "video";
};

export const buildSubmissionMediaPreviewMap = async (
  submissions: LessonSubmission[],
) => {
  const previewMap = new Map<string, SubmissionMediaPreview>();
  const storageEntries = submissions
    .map((submission) => ({
      submissionId: submission.id,
      storage: parseStorageResultLink(submission.result_link),
    }))
    .filter((item) => item.storage && item.storage.kind) as Array<{
    submissionId: string;
    storage: {
      bucket: string;
      path: string;
      kind: "image" | "video";
    };
  }>;

  if (storageEntries.length === 0) {
    return previewMap;
  }

  try {
    const admin = createAdminClient();
    const entriesByBucket = new Map<
      string,
      Array<{
        submissionId: string;
        path: string;
        kind: "image" | "video";
      }>
    >();

    for (const entry of storageEntries) {
      const bucketEntries = entriesByBucket.get(entry.storage.bucket) ?? [];
      bucketEntries.push({
        submissionId: entry.submissionId,
        path: entry.storage.path,
        kind: entry.storage.kind,
      });
      entriesByBucket.set(entry.storage.bucket, bucketEntries);
    }

    await Promise.all(
      [...entriesByBucket.entries()].map(async ([bucket, bucketEntries]) => {
        const { data, error } = await admin.storage
          .from(bucket)
          .createSignedUrls(
            bucketEntries.map((entry) => entry.path),
            60 * 60,
          );

        if (error || !data) {
          return;
        }

        data.forEach((signedEntry, index) => {
          const sourceEntry = bucketEntries[index];

          if (!sourceEntry || !signedEntry?.signedUrl) {
            return;
          }

          previewMap.set(sourceEntry.submissionId, {
            url: signedEntry.signedUrl,
            kind: sourceEntry.kind,
          });
        });
      }),
    );
  } catch {
    return previewMap;
  }

  return previewMap;
};
