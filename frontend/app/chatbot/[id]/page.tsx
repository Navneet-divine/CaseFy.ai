"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { AIChatbot } from "@/components/AIChatbot";
import { Spinner } from "@/components/ui/spinner";

export default function ChatbotConversationPage() {
  const params = useParams();
  const id = params?.id as string | undefined;

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden">
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center">
            <Spinner className="text-primary size-8" />
          </div>
        }
      >
        <AIChatbot conversationId={id} />
      </Suspense>
    </div>
  );
}
