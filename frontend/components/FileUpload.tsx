"use client";

import { useState, useRef, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload as UploadIcon, FileUp, Plus } from "lucide-react";
import { Input } from "./ui/input";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

export function FileUpload() {
  const { cases, addFileToCase } = useApp();
  const { setSelectedCaseId } = useApp();
  const [selectedCase, setSelectedCase] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFiles = (fileList: FileList) => {
    const incoming = Array.from(fileList);
    const validFiles = incoming.filter((f) =>
      f.name.toLowerCase().endsWith(".pdf"),
    );
    const invalidCount = incoming.length - validFiles.length;

    if (invalidCount > 0) {
      toast.error("Some selected files were not PDFs and were ignored.");
    }

    if (validFiles.length === 0) return;

    setFiles((prev) => [...prev, ...validFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedCase) {
      toast.error("Please select a case first");
      return;
    }

    if (!fileName.trim() || fileName.trim().length < 3) {
      toast.error(
        "Please enter a valid file name (at least 3 characters long)"
      );
      return;
    }

    const uploadFiles = files.length
      ? files
      : Array.from(fileInputRef.current?.files || []);

    if (uploadFiles.length === 0) {
      toast.error("Please select at least one file to upload");
      fileInputRef.current?.click();
      return;
    }

    // Validate all files first
    for (const file of uploadFiles) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        toast.error(
          `${file.name} is not a PDF file. Only PDF files are supported.`
        );
        return;
      }
    }

    const formData = new FormData();

    uploadFiles.forEach((file) => {
      formData.append("file", file);
    });

    formData.append("fileName", fileName);
    formData.append("caseId", selectedCase);

    try {
      const res = await fetch(`${API_URL}/files/upload-file`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "File upload failed");
      }

      if (data.files && Array.isArray(data.files)) {
        data.files.forEach((f: any) => {
          addFileToCase(selectedCase, {
            id: f.id || f._id || Math.random().toString(36).substr(2, 9),
            name: f.fileName || f.name || 'file',
            size: f.size || 0,
            uploadedAt: f.createdAt || new Date().toISOString(),
            type: 'pdf',
            content: f.url || '',
            fileVersion: f.fileVersion || 'v1',
          });
        });
      }

      toast.success(
        data.message ||
        `${uploadFiles.length} file(s) uploaded successfully`
      );

      // Reset form
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setFiles([]);
      setFileName("");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to upload file. Please try again."
      );
    }
  };
  return (
    <Card className="p-4 sm:p-6">
      <h3 className="font-semibold text-base sm:text-lg mb-4">
        Upload Case Files
      </h3>

      <div className="space-y-4">
        <div>
          <Label htmlFor="file-name" className="text-sm sm:text-base">
            File name
          </Label>
          <Input
            id="file-name"
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="Enter file name"
          />
        </div>
        <div>
          <Label htmlFor="case-select" className="text-sm sm:text-base">
            Select Case *
          </Label>
          <Select
            value={selectedCase}
            onValueChange={(val: string) => {
              setSelectedCase(val);
              setSelectedCaseId(val);
            }}
          >
            <SelectTrigger className="mt-2 text-sm sm:text-base w-full text-left">
              <SelectValue placeholder="Choose a case..." />
            </SelectTrigger>
            <SelectContent>
              {cases.map((caseItem) => (
                <SelectItem key={caseItem.id} value={caseItem.id}>
                  {caseItem.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center cursor-pointer transition-colors ${isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/30 hover:border-primary/50"
            }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf"
            onChange={handleFileInput}
            className="hidden"
          />

          <FileUp className="w-10 sm:w-12 h-10 sm:h-12 mx-auto mb-4 text-muted-foreground" />
          {files.length > 0 ? (
            <div>
              {files.map((f, index) => (
                <p key={index} className="text-sm sm:text-base">
                  {f.name}
                </p>
              ))}
            </div>
          ) : (
            <>
              <p className="text-foreground font-medium text-sm sm:text-base mb-1">
                Drag and drop your PDF files here
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                or click to browse your computer
              </p>
              <Button
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <UploadIcon className="w-4 h-4 mr-2" />
                Select Files
              </Button>
            </>
          )}
        </div>

        <div className="mt-2 text-center">
          <Button onClick={handleFileUpload} className="w-full gap-2">
            <Plus className="w-4 h-4" />
            Add File
          </Button>
        </div>

        <div className="bg-muted/30 p-3 rounded-lg text-xs sm:text-sm">
          <div className="text-muted-foreground space-y-1">
            <div>✓ Supported formats: PDF only</div>
            <div>✓ Maximum file size: Unlimited</div>
            <div>✓ You can upload multiple files at once</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
