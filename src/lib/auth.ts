import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const requireUser = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return { supabase, user };
};

