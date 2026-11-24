"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";

export default function HistoryRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/chatbot?history=true");
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Spinner className="text-primary size-8" />
    </div>
  );
}
