"use client";

import AuthGuard from "@/components/AuthGuard";
import { LayoutWrapper } from "@/components/LayoutWrapper";

export default function ChatbotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard protectedRoute>
      <LayoutWrapper>{children}</LayoutWrapper>
    </AuthGuard>
  );
}
