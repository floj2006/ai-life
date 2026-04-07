"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <button
      type="button"
      className="action-button secondary-button action-button-with-icon w-full sm:w-auto"
      disabled={isLoading}
      onClick={async () => {
        setIsLoading(true);
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      <Image
        src="/icons/icon-logout.png"
        alt=""
        width={24}
        height={24}
        className="action-button-icon"
        aria-hidden
      />
      <span>{isLoading ? "Выход..." : "Выйти"}</span>
    </button>
  );
}
