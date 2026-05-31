"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

interface CaseFormProps {
  onCreateCase?: (caseData: {
    title: string;
    description: string;
  }) => Promise<any>;
  isLoading?: boolean;
  error?: string | null;
  onSuccess?: () => void;
}

const NEXT_PUBLIC_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

export function CaseForm({
  onCreateCase,
  isLoading,
  error,
  onSuccess,
}: CaseFormProps) {
  const { addCase } = useApp();
  const { createCase } = useApp();
  const loading = isLoading ?? false;
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    caseNumber: "",
    description: "",
  });
  const [errors, setErrors] = useState<{ name?: string; description?: string }>(
    {},
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { name?: string; description?: string } = {};
    const nameTrim = formData.name.trim();
    const descTrim = formData.description.trim();

    if (!nameTrim) newErrors.name = "Case name is required";
    else if (nameTrim.length < 3)
      newErrors.name = "Case name must be at least 3 characters";

    if (!descTrim) newErrors.description = "Description is required";
    else if (descTrim.length < 10)
      newErrors.description = "Description must be at least 10 characters";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    if (onCreateCase) {
      await onCreateCase({
        title: formData.name,
        description: formData.description,
      });
    } else {
      // use context API to create case when available
      try {
        await createCase({ title: formData.name, description: formData.description });
      } catch (err: any) {
        toast.error(err?.response?.data?.error || 'Failed to create case');
        return;
      }
    }
    setIsOpen(false);
    onSuccess?.();
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="w-full gap-2">
        <Plus className="w-4 h-4" />
        New Case
      </Button>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-lg mb-4">Create New Case</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Case Name *</Label>
          <Input
            id="name"
            placeholder="e.g., Smith vs. Johnson"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              if (errors.name)
                setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            className="mt-2"
          />
          {errors.name && (
            <p className="text-sm text-red-600 mt-1">{errors.name}</p>
          )}
        </div>

        {/* <div>
          <Label htmlFor="caseNumber">Ca *</Label>
          <Input
            id="caseNumber"
            placeholder="e.g., CASE-2024-001"
            value={formData.caseNumber}
            onChange={(e) =>
              setFormData({ ...formData, caseNumber: e.target.value })
            }
            className="mt-2"
          />
        </div> */}

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Brief description of the case"
            value={formData.description}
            onChange={(e) => {
              setFormData({ ...formData, description: e.target.value });
              if (errors.description)
                setErrors((prev) => ({ ...prev, description: undefined }));
            }}
            className="mt-2"
          />
          {errors.description && (
            <p className="text-sm text-red-600 mt-1">{errors.description}</p>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button disabled={loading} type="submit" className="flex-1">
            {loading ? "Creating..." : "Create Case"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
