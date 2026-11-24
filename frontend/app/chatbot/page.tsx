"use client";

import { Suspense } from "react";
import { AIChatbot } from "@/components/AIChatbot";
import { Spinner } from "@/components/ui/spinner";

export default function ChatbotPage() {
  return (
    <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden">
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center">
            <Spinner className="text-primary size-8" />
          </div>
        }
      >
        <AIChatbot />
      </Suspense>
    </div>
  );
}
