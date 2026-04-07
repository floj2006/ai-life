export type LessonCategory = "photo" | "video" | "text" | "business";

export type SubscriptionTier = "newbie" | "start" | "max";

export type LessonTool = {
  name: string;
  url: string;
};

export type Lesson = {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  video_url: string;
  instruction: string;
  ai_tool_url: string;
  duration_minutes: number;
  sort_order: number;
  is_premium: boolean;
  required_tier: SubscriptionTier;
  goal: string;
  steps: string[];
  prompt_template: string;
  expected_result: string;
  category: LessonCategory;
  tools: LessonTool[];
};

export type ProgressRow = {
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
};

export type LessonWithProgress = Lesson & {
  completed: boolean;
};

export type UserProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  is_pro: boolean;
  subscription_tier: SubscriptionTier;
};

export type QuickAction = {
  slug: "avatar" | "video" | "text";
  title: string;
  subtitle: string;
  promptTemplate: string;
  tools: LessonTool[];
  steps: string[];
};

export type SubmissionStatus =
  | "sent"
  | "in_review"
  | "needs_revision"
  | "approved";

export type SubmissionMessage = {
  id: string;
  submission_id: string;
  author_id: string;
  author_role: "student" | "admin";
  message: string;
  created_at: string;
};

export type LessonSubmission = {
  id: string;
  user_id: string;
  lesson_id: string;
  status: SubmissionStatus;
  result_link: string | null;
  student_comment: string;
  created_at: string;
  updated_at: string;
};


