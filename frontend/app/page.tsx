"use client";

import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { LandingPage } from "@/components/LandingPage";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { CaseForm } from "@/components/CaseForm";
import { CaseList } from "@/components/CaseList";
import { FileList } from "@/components/FileList";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { BarChart3, FileText, Briefcase } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import { Spinner } from "@/components/ui/spinner";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex w-full h-screen items-center justify-center">
        <Spinner className="text-primary size-8" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return <Dashboard />;
}

function Dashboard() {
  const { cases, selectedCaseId, chatHistory } = useApp();
  const selectedCase = cases.find((c) => c.id === selectedCaseId);

  return (
    <AuthGuard>
      <LayoutWrapper>
        <div className="p-4 sm:p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
              Dashboard
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Manage your legal cases and documents
            </p>
          </div>

          {/* Stats - Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">
                    Total Cases
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {cases.length}
                  </p>
                </div>
                <Briefcase className="w-10 h-10 text-primary/20 flex-shrink-0" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">
                    Total Files
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {cases.reduce((sum, c) => sum + c.files.length, 0)}
                  </p>
                </div>
                <FileText className="w-10 h-10 text-primary/20 flex-shrink-0" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">
                    Chat Messages
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {chatHistory.length}
                  </p>
                </div>
                <BarChart3 className="w-10 h-10 text-primary/20 flex-shrink-0" />
              </div>
            </Card>
          </div>

          {/* Main Content - Responsive Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-12">
            {/* Cases Section */}
            <div className="order-1 lg:order-none">
              <div className="mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">
                  Cases
                </h2>
                <CaseForm />
              </div>
              <div className="mt-6">
                <CaseList />
              </div>
            </div>

            {/* Selected Case Details */}
            <div className="order-2 lg:order-none">
              <div className="mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">
                  {selectedCase ? `Files - ${selectedCase.name}` : "Files"}
                </h2>
                {selectedCase && (
                  <Card className="p-4 mb-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Case Number
                      </p>
                      <p className="font-semibold text-foreground text-sm sm:text-base">
                        {selectedCase.caseNumber}
                      </p>
                      <p className="text-sm text-muted-foreground mt-3">
                        Description
                      </p>
                      <p className="text-foreground text-sm sm:text-base">
                        {selectedCase.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <Badge variant="outline" className="text-xs sm:text-sm">
                          {selectedCase.files.length} files
                        </Badge>
                        <Badge variant="outline" className="text-xs sm:text-sm">
                          Created {formatDate(selectedCase.createdAt)}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
              <div>
                <FileList />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border pt-8 text-center text-xs sm:text-sm text-muted-foreground">
            <p>Casefy.ai - Legal Case Management & Analysis Platform</p>
            <p className="mt-2">Powered by AI-driven document analysis</p>
          </div>
        </div>
      </LayoutWrapper>
    </AuthGuard>
  );
}
