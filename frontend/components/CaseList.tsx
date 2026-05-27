"use client";

import { useApp } from "@/context/AppContext";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const NEXT_PUBLIC_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

export function CaseList({
  cases,
  onSelect,
  onDelete,
}: {
  cases?: any[];
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const app = useApp();
  const { setSelectedCaseId, deleteCase } = app;
  const displayedCases = cases ?? app.cases;
  // useEffect(() => {
  //   try {
  //     const fetchCases = async () => {
  //       setIsLoading(true);
  //       const res = await fetch(
  //         `${NEXT_PUBLIC_API_BASE_URL}/cases/get-cases?limit=3`,
  //         {
  //           credentials: "include",
  //         },
  //       );

  //       if (!res.ok) {
  //         toast.error("Failed to fetch cases");
  //         setIsLoading(false);
  //         return;
  //       }
  //       setIsLoading(false);

  //       const data = await res.json();
  //       setAllCases(data);
  //     };
  //     fetchCases();
  //   } catch (error) {
  //     console.error("Error fetching cases:", error);
  //     setIsLoading(false);
  //   }
  // }, []);

  if (!displayedCases || displayedCases.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed">
        <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">
          No cases yet. Create your first case to get started.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {displayedCases.length > 0 &&
        displayedCases.map((caseItem) => (
            <Card
              key={caseItem.id ?? caseItem.title}
              className={`p-4 cursor-pointer transition-all `}
              onClick={() => (onSelect ? onSelect(caseItem.id) : setSelectedCaseId(caseItem.id))}
            >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">
                  {caseItem?.title}
                </h3>
                {/* <p className="text-sm text-muted-foreground mt-1">
                {caseItem.caseNumber}
              </p> */}
                <p className="text-sm text-muted-foreground mt-2">
                  {caseItem?.description}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="secondary">
                    {caseItem?.files?.length ?? 0} files
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Created {formatDate(caseItem?.createdAt)}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onDelete) onDelete(caseItem.id);
                  else deleteCase(caseItem.id);
                }}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
    </div>
  );
}
