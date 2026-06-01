"use client";

import { useApp } from "@/context/AppContext";
import { CaseForm } from "@/components/CaseForm";
import { CaseList } from "@/components/CaseList";
import { FileList } from "@/components/FileList";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { BarChart3, FileText, Briefcase } from "lucide-react";
import axios from "axios";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface CaseData {
  title: string;
  description: string;
}

const NEXT_PUBLIC_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api";
export default function DashboardPage() {
  const { cases, selectedCaseId, chatHistory } = useApp();
  const selectedCase = cases.find((c) => c?.id === selectedCaseId);
  const [allCases, setAllCases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCaseDetails, setSelectedCaseDetails] = useState<any>(null);
  const [totalCases, setTotalCases] = useState(0);

  async function createCase(caseData: CaseData) {
    try {
      setIsLoading(true);
      setError(null);

      const res = await axios.post(
        `${NEXT_PUBLIC_API_BASE_URL}/cases/create-case`,
        {
          ...caseData,
          status: "open",
        },
        { withCredentials: true },
      );

      const createdCase = res.data.case ?? res.data.cases ?? res.data;
      setAllCases((prev) => [createdCase, ...prev].filter(Boolean).slice(0, 3));
      toast.success('Case created');
    } catch (error: any) {
      console.error("Error creating case:", error);
      setError(
        error?.response?.data?.error ||
          "Failed to create case. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchCaseDetails(id: string) {
    try {
      setIsLoading(true);
      const res = await axios.get(
        `${NEXT_PUBLIC_API_BASE_URL}/cases/get-case/${id}`,
        { withCredentials: true },
      );
      setSelectedCaseDetails(res.data);
    } catch (err: any) {
      console.error("Failed to fetch case details:", err);
      toast.error(err?.response?.data?.error || "Failed to load case details");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteCase(id: string) {
    try {
      setIsLoading(true);
      const res = await axios.delete(
        `${NEXT_PUBLIC_API_BASE_URL}/cases/delete-case/${id}`,
        { withCredentials: true },
      );
      // remove from local list
      setAllCases((prev) => prev.filter((c: any) => c.id !== id));
      // clear selected details if deleted
      if (selectedCaseDetails?.id === id) setSelectedCaseDetails(null);
      toast.success("Case deleted");
    } catch (err: any) {
      console.error("Failed to delete case:", err);
      toast.error(err?.response?.data?.error || "Failed to delete case");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    async function fetchCases() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await axios.get(
          `${NEXT_PUBLIC_API_BASE_URL}/cases/get-cases?limit=3`,
          {
            withCredentials: true,
          },
        );

        setAllCases(res.data.cases);
        setTotalCases(res.data.totalCases);
      } catch (error: any) {
        setError(
          error?.response?.data?.error ||
            "Failed to fetch cases. Please try again.",
        );
      } finally {
        setIsLoading(false);
      }
    }
    fetchCases();
  }, []);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const displayedCase =
    selectedCaseDetails ||
    selectedCase ||
    allCases.find((c: any) => c?.id === selectedCaseId);

  return (
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
              <p className="text-muted-foreground text-sm mb-1">Total Cases</p>
              <p className="text-3xl font-bold text-foreground">{totalCases}</p>
            </div>
            <Briefcase className="w-10 h-10 text-primary/20 flex-shrink-0" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm mb-1">Total Files</p>
              <p className="text-3xl font-bold text-foreground">
                {cases.reduce((sum, c) => sum + (c?.files?.length ?? 0), 0)}
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
        <div>
          <div className="mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">
              Cases
            </h2>
            <CaseForm
              onCreateCase={createCase}
              isLoading={isLoading}
              error={error}
            />
          </div>
          <div className="mt-6">
            <CaseList
              cases={allCases}
              onSelect={(id: string) => fetchCaseDetails(id)}
              onDelete={(id: string) => handleDeleteCase(id)}
            />
          </div>
        </div>

        {/* Selected Case Details */}
        <div>
          <div className="mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">
              {selectedCase ? `Files - ${selectedCase.name}` : "Files"}
            </h2>
            {displayedCase && (
              <Card className="p-4 mb-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Case Number</p>
                  <p className="font-semibold text-foreground text-sm sm:text-base">
                    {displayedCase.caseNumber}
                  </p>
                  <p className="text-sm text-muted-foreground mt-3">
                    Description
                  </p>
                  <p className="text-foreground text-sm sm:text-base">
                    {displayedCase.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Badge variant="outline" className="text-xs sm:text-sm">
                      {displayedCase.files?.length ?? 0} files
                    </Badge>
                    <Badge variant="outline" className="text-xs sm:text-sm">
                      Created {formatDate(displayedCase.createdAt)}
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
  );
}
