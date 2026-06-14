'use client'

import { useState, useMemo } from 'react'
import { useApp } from '@/context/AppContext'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FileUpload } from '@/components/FileUpload'
import {
  FileText,
  Calendar,
  Trash2,
  Search,
  FolderOpen,
  ChevronRight,
  Briefcase,
  ExternalLink,
  ArrowUpDown,
  Upload,
  Database,
  Clock
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function EvidencePage() {
  const {
    cases,
    clearSelectedFiles,
    selectedFileIds,
    toggleFileSelection,
    deleteFileFromCase,
    selectedCaseId,
    setSelectedCaseId
  } = useApp()

  // State
  const [activeCaseId, setActiveCaseId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'name_asc' | 'name_desc'>('date_desc')
  const [showUpload, setShowUpload] = useState(false)

  // Sync activeCaseId if it is set globally but we are initialized to all
  useMemo(() => {
    if (selectedCaseId && activeCaseId === 'all') {
      setActiveCaseId(selectedCaseId)
    }
  }, [selectedCaseId])

  // Count all files across all cases
  const allFilesCount = useMemo(() => {
    return cases.reduce((acc, c) => acc + (c.files?.length || 0), 0)
  }, [cases])

  // Files to display
  const displayedFiles = useMemo(() => {
    let list: any[] = []
    if (activeCaseId === 'all') {
      list = cases.flatMap(c =>
        c.files.map(f => ({ ...f, caseId: c.id, caseName: c.name }))
      )
    } else {
      const activeCase = cases.find(c => c.id === activeCaseId)
      if (activeCase) {
        list = activeCase.files.map(f => ({ ...f, caseId: activeCase.id, caseName: activeCase.name }))
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      list = list.filter(f => f.name.toLowerCase().includes(query))
    }

    // Sort files
    list.sort((a, b) => {
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name)
      } else if (sortBy === 'name_desc') {
        return b.name.localeCompare(a.name)
      } else if (sortBy === 'date_asc') {
        return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
      } else { // date_desc
        return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      }
    })

    return list
  }, [cases, activeCaseId, searchQuery, sortBy])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const activeCaseDetails = useMemo(() => {
    if (activeCaseId === 'all') return null
    return cases.find(c => c.id === activeCaseId) || null
  }, [cases, activeCaseId])

  console.log(displayedFiles)

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Database className="w-8 h-8 text-primary" />
            Evidence Vault
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Access, view, and organize evidence files for all legal proceedings.
          </p>
        </div>
        <Button
          onClick={() => setShowUpload(!showUpload)}
          className="gap-2 self-stretch sm:self-auto"
        >
          <Upload className="w-4 h-4" />
          {showUpload ? 'Hide Upload Panel' : 'Upload Evidence'}
        </Button>
      </div>

      {/* Expandable Upload Panel */}
      {showUpload && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <FileUpload />
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column: Case list */}
        <div className="w-full lg:w-80 shrink-0 space-y-3">
          <div className="px-1">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Cases
            </h2>
          </div>

          <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible pb-3 lg:pb-0 scrollbar-none">
            {/* All Cases Entry */}
            <Card
              onClick={() => {
                setActiveCaseId('all')
                setSelectedCaseId(null)
              }}
              className={`p-4 cursor-pointer transition-all flex items-center gap-3 shrink-0 min-w-[200px] lg:min-w-0 ${activeCaseId === 'all'
                ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/25'
                : 'hover:border-primary/30 hover:bg-muted/30'
                }`}
            >
              <div className={`p-2 rounded-lg ${activeCaseId === 'all' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <FolderOpen className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm sm:text-base">All Cases</h3>
                <p className="text-xs text-muted-foreground truncate">{allFilesCount} file{allFilesCount !== 1 ? 's' : ''}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50 hidden lg:block" />
            </Card>

            {/* Individual Cases */}
            {cases.map((c) => {
              const isSelected = activeCaseId === c.id
              return (
                <Card
                  key={c.id}
                  onClick={() => {
                    setActiveCaseId(c.id)
                    setSelectedCaseId(c.id)
                  }}
                  className={`p-4 cursor-pointer transition-all flex items-center gap-3 shrink-0 min-w-[240px] lg:min-w-0 ${isSelected
                    ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/25'
                    : 'hover:border-primary/30 hover:bg-muted/30'
                    }`}
                >
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{c.name}</h3>
                      <Badge variant="secondary" className="text-[10px] py-0 px-1 text-xs font-normal">
                        {c.files?.length || 0}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{c.description || 'No description'}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 hidden lg:block" />
                </Card>
              )
            })}
          </div>
        </div>

        {/* Right column: Files grid/list */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Active Case Details Header (when viewing a specific case) */}
          {activeCaseDetails && (
            <Card className="p-4 sm:p-6 bg-muted/10 border-border/80 shadow-xs">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-foreground">{activeCaseDetails.name}</h2>
                    {/* <Badge variant="outline" className="text-xs font-normal">
                      {activeCaseDetails.caseNumber}
                    </Badge> */}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5">{activeCaseDetails.description}</p>
                  <p className="text-xs text-muted-foreground/85 mt-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
                    <span>Created on {formatDate(activeCaseDetails.createdAt)}</span>
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Filters and Actions Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search */}
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full bg-background"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 w-full sm:w-auto self-stretch">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground shrink-0 hidden sm:block" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-background border border-input rounded-md px-3 py-1.5 text-sm w-full sm:w-48 outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="date_desc">Newest Uploaded</option>
                <option value="date_asc">Oldest Uploaded</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
              </select>
            </div>
          </div>

          {/* Bulk Selection Notice */}
          {selectedFileIds.length > 0 && (
            <Card className="p-3 bg-primary/10 border-primary/20 flex items-center justify-between animate-in fade-in zoom-in-95 duration-200">
              <p className="text-sm font-medium text-primary-foreground dark:text-primary">
                {selectedFileIds.length} file{selectedFileIds.length !== 1 ? 's' : ''} selected
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelectedFiles}
                className="h-8 border-primary/20 hover:bg-primary/20 text-xs"
              >
                Clear Selection
              </Button>
            </Card>
          )}

          {/* Files List */}
          {displayedFiles.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/80" />
              <h3 className="text-lg font-semibold text-foreground">No files found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                {searchQuery.trim()
                  ? "We couldn't find any files matching your search query."
                  : activeCaseId === 'all'
                    ? "There are no files uploaded in the workspace yet. Use the upload panel to add some."
                    : "This case has no files attached to it. Click the upload button to add evidence."}
              </p>
              {!searchQuery.trim() && (
                <Button
                  onClick={() => setShowUpload(true)}
                  variant="outline"
                  className="mt-4 gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Add File
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid gap-3">
              {displayedFiles.map((file) => (
                <Card
                  key={`${file.caseId}-${file.id}`}
                  className="p-4 hover:border-primary/50 transition-all hover:shadow-xs border-border"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Checkbox selector */}
                    <Checkbox
                      checked={selectedFileIds.includes(file.id)}
                      onCheckedChange={() => toggleFileSelection(file.id)}
                      className="mt-1.5 flex-shrink-0"
                    />

                    {/* PDF Icon container */}
                    <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500 shrink-0">
                      <FileText className="w-5 h-5 sm:w-6 h-6" />
                    </div>

                    <div className="flex-1 min-w-0 w-full">
                      {/* Name and tags */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5 mb-2">
                        <div className="min-w-0">
                          <h4 className="text-sm sm:text-base font-semibold text-foreground truncate" title={file.name}>
                            {file.name}
                          </h4>
                          {activeCaseId === 'all' && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] sm:text-xs text-muted-foreground">Case:</span>
                              <span
                                className="text-[10px] sm:text-xs font-semibold text-primary hover:underline cursor-pointer"
                                onClick={() => setActiveCaseId(file.caseId)}
                              >
                                {file.caseName}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 self-start">
                          <Badge variant="outline" className="text-[10px] sm:text-xs py-0 px-2 font-normal text-muted-foreground">
                            {file.type?.toUpperCase() || 'PDF'}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] sm:text-xs py-0 px-2 font-normal">
                            {file.fileVersion || 'v1'}
                          </Badge>
                        </div>
                      </div>

                      {/* Footer statistics and actions */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-2.5 mt-2">
                        <div className="flex items-center gap-4 text-[10px] sm:text-xs text-muted-foreground">
                          <div>
                            Size: <span className="text-foreground font-medium">{formatFileSize(file.size)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
                            <span>Uploaded {formatDate(file.uploadedAt)}</span>
                          </div>
                        </div>

                        {/* File Action Controls */}
                        <div className="flex items-center gap-1.5 ml-auto">
                          {/* {file.content ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(file.content, '_blank')}
                              className="h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-medium gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              View
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              className="h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-medium gap-1 text-muted-foreground"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              No URL
                            </Button>
                          )} */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteFileFromCase(file.caseId, file.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
