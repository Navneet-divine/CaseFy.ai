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

export function FileUpload() {
  const { cases, addFileToCase } = useApp();
  const { setSelectedCaseId } = useApp();
  const [selectedCase, setSelectedCase] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFiles = (files: FileList) => {
    if (!selectedCase) {
      alert("Please select a case first");
      return;
    }

    Array.from(files).forEach((file) => {
      // Only accept PDF files
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        alert(`${file.name} is not a PDF file. Only PDF files are supported.`);
        return;
      }

      const newFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: fileName ? fileName : file.name,
        size: file.size,
        uploadedAt: new Date().toISOString().split("T")[0],
        type: "pdf",
        content: `PDF document: ${file.name}`,
      };

      addFileToCase(selectedCase, newFile);
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setFileName("");
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

  // Do not auto-select the first case so the placeholder remains visible

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
          className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center cursor-pointer transition-colors ${
            isDragging
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
          <p className="text-foreground font-medium text-sm sm:text-base mb-1">
            Drag and drop your PDF files here
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">
            or click to browse your computer
          </p>
          <Button variant="outline" size="sm" className="text-xs sm:text-sm">
            <UploadIcon className="w-4 h-4 mr-2" />
            Select Files
          </Button>
        </div>

        <div className="mt-2 text-center">
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="w-full gap-2"
          >
            <Plus className="w-4 h-4" />
            Add File
          </Button>
          {/* <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs sm:text-sm w-full"
          >
            Add file
          </Button> */}
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
