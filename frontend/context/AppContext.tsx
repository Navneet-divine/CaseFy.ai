'use client'

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'sonner'

export interface CaseFile {
  id: string
  name: string
  size: number
  uploadedAt: string
  type: string
  content?: string
  fileVersion?: string
}

export interface Case {
  id: string
  name: string
  caseNumber: string
  description: string
  createdAt: string
  files: CaseFile[]
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

interface AppContextType {
  // Auth state
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean

  // Case data
  cases: Case[]
  selectedCaseId: string | null
  selectedFileIds: string[]
  chatHistory: Message[]

  // Auth operations
  signup: (email: string, password: string, name: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => void

  // Case operations
  addCase: (caseData: Omit<Case, 'id' | 'files'>) => void
  createCase: (caseData: { title: string; description: string }) => Promise<any>
  deleteCase: (caseId: string) => void
  fetchCases: () => Promise<any>
  setSelectedCaseId: (caseId: string | null) => void

  // File operations
  addFileToCase: (caseId: string, file: CaseFile) => void
  deleteFileFromCase: (caseId: string, fileId: string) => void
  toggleFileSelection: (fileId: string) => void
  clearSelectedFiles: () => void

  // Chat operations
  addMessage: (message: Message) => void
  clearChatHistory: () => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

// Mock data for initial load
const mockCases: Case[] = [
  {
    id: '1',
    name: 'Smith vs. Johnson',
    caseNumber: 'CASE-2024-001',
    description: 'Civil litigation dispute',
    createdAt: '2024-01-15',
    files: [
      {
        id: 'f1',
        name: 'complaint.pdf',
        size: 245000,
        uploadedAt: '2024-01-15',
        type: 'pdf',
        content: 'This is the original complaint filed against the defendant...'
      },
      {
        id: 'f2',
        name: 'discovery_documents.pdf',
        size: 1240000,
        uploadedAt: '2024-01-20',
        type: 'pdf',
        content: 'Discovery documents containing correspondence and emails...'
      }
    ]
  },
  {
    id: '2',
    name: 'People vs. Anderson',
    caseNumber: 'CASE-2024-002',
    description: 'Criminal case proceedings',
    createdAt: '2024-02-01',
    files: [
      {
        id: 'f3',
        name: 'indictment.pdf',
        size: 180000,
        uploadedAt: '2024-02-01',
        type: 'pdf',
        content: 'Official indictment document with charges and counts...'
      }
    ]
  }
]

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [cases, setCases] = useState<Case[]>(mockCases)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
  const [chatHistory, setChatHistory] = useState<Message[]>([])

  const signup = async (email: string, password: string, name: string) => {
    setIsLoading(true)
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800))

      // Mock validation
      if (!email || !password || !name) {
        throw new Error('All fields are required')
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }

      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        email,
        name,
        createdAt: new Date().toISOString()
      }

      setUser(newUser)
    } finally {
      setIsLoading(false)
    }
  }

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'http://localhost:5001/api'

  function normalizeCase(raw: any) {
    if (!raw) return null
    return {
      id: raw.id || raw._id || raw._id?.toString?.() || String(Math.random()),
      name: raw.title || raw.name || 'Untitled Case',
      caseNumber: raw.caseNumber || raw.case_number || '',
      description: raw.description || '',
      createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
      files: Array.isArray(raw.files)
        ? raw.files.map((f: any) => ({
          id: f.id || f._id || Math.random().toString(36).substr(2, 9),
          name: f.fileName || f.name || f.url?.split('/')?.pop?.() || 'file',
          size: f.size || 0,
          uploadedAt: f.createdAt || new Date().toISOString(),
          type: 'pdf',
          content: f.url || '',
          fileVersion: f.fileVersion || 'v1',
        }))
        : [],
    }
  }

  async function fetchCases() {
    try {
      const res = await axios.get(`${API_BASE_URL}/cases/get-cases`, {
        withCredentials: true,
      })
      const fetched = res.data.cases ?? res.data
      if (Array.isArray(fetched)) {
        const normalized = fetched
          .map((c: any) => normalizeCase(c))
          .filter((c): c is Case => c !== null)
        setCases(normalized)
        return normalized
      }
      return null
    } catch (err) {
      console.error('Failed to fetch cases', err)
      return null
    }
  }

  async function createCase(caseData: { title: string; description: string }) {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/cases/create-case`,
        { ...caseData, status: 'open' },
        { withCredentials: true },
      )
      const createdRaw = res.data.case ?? res.data.cases ?? res.data
      const created = normalizeCase(createdRaw)
      if (created) {
        setCases((prev) => [created, ...prev])
        toast.success('Case created')
      }
      return created
    } catch (err: any) {
      console.error('Failed to create case', err)
      toast.error(err?.response?.data?.error || 'Failed to create case')
      throw err
    }
  }

  useEffect(() => {
    // fetch cases on mount
    fetchCases()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800))

      // Mock validation
      if (!email || !password) {
        throw new Error('Email and password are required')
      }

      // Mock user for demo
      const mockUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        email,
        name: email.split('@')[0],
        createdAt: new Date().toISOString()
      }

      setUser(mockUser)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setCases(mockCases)
    setSelectedCaseId(null)
    setSelectedFileIds([])
    setChatHistory([])
  }

  const addCase = (caseData: Omit<Case, 'id' | 'files'>) => {
    const newCase: Case = {
      ...caseData,
      id: Math.random().toString(36).substr(2, 9),
      files: []
    }
    setCases([...cases, newCase])
  }

  const deleteCase = (caseId: string) => {
    setCases(cases.filter(c => c.id !== caseId))
    if (selectedCaseId === caseId) {
      setSelectedCaseId(null)
    }
  }

  const addFileToCase = (caseId: string, file: CaseFile) => {
    setCases(cases.map(c =>
      c.id === caseId
        ? { ...c, files: [...c.files, file] }
        : c
    ))
  }

  const deleteFileFromCase = async (caseId: string, fileId: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/files/delete-file/${fileId}`, {
        withCredentials: true,
      })
      setCases(cases.map(c =>
        c.id === caseId
          ? { ...c, files: c.files.filter(f => f.id !== fileId) }
          : c
      ))
      setSelectedFileIds(selectedFileIds.filter(id => id !== fileId))
      toast.success('File deleted successfully')
    } catch (err: any) {
      console.error('Failed to delete file', err)
      toast.error(err?.response?.data?.error || 'Failed to delete file')
    }
  }

  const toggleFileSelection = (fileId: string) => {
    setSelectedFileIds(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    )
  }

  const clearSelectedFiles = () => {
    setSelectedFileIds([])
  }

  const addMessage = (message: Message) => {
    setChatHistory([...chatHistory, message])
  }

  const clearChatHistory = () => {
    setChatHistory([])
  }

  return (
    <AppContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        cases,
        selectedCaseId,
        selectedFileIds,
        chatHistory,
        signup,
        login,
        logout,
        addCase,
        createCase,
        fetchCases,
        deleteCase,
        setSelectedCaseId,
        addFileToCase,
        deleteFileFromCase,
        toggleFileSelection,
        clearSelectedFiles,
        addMessage,
        clearChatHistory
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}
