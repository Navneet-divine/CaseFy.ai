"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import axios from "axios";
import {
  FileText,
  LayoutDashboard,
  Upload,
  Files,
  MessageSquare,
  Clock,
  LogOut,
  Bot,
  Settings,
  Globe,
  HelpCircle,
  MoreVertical,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

const NAV_ITEMS = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    matchSubpaths: true,
  },
  {
    name: "AI Chatbot",
    href: "/chatbot",
    icon: Bot,
    matchSubpaths: false,
  },
  {
    name: "Upload Case",
    href: "/upload",
    icon: Upload,
    matchSubpaths: true,
  },
  {
    name: "All Evidence",
    href: "/evidence",
    icon: Files,
    matchSubpaths: true,
  },
  {
    name: "Ask LLM",
    href: "/chat",
    icon: MessageSquare,
    matchSubpaths: false,
  },
];

export function AppSidebar(props: React.ComponentProps<typeof ShadcnSidebar>) {
  const pathname = usePathname();
  const { logout, conversations, fetchConversations, isHistoryOpen, setIsHistoryOpen } = useApp();
  const { user, logout: authLogout } = useAuth();
  const { isMobile } = useSidebar();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [currentChatId, setCurrentChatId] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchConversations();
    const handleChatUpdated = () => fetchConversations(true);
    window.addEventListener("chat-updated", handleChatUpdated);
    return () => window.removeEventListener("chat-updated", handleChatUpdated);
  }, [fetchConversations]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setCurrentChatId(params.get("id"));
    }
  }, [pathname]);

  const displayName = user?.fullName || "Navneet Kushwaha";

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await axios.post(
        `${API_URL}/users/logout`,
        {},
        { withCredentials: true }
      );
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      authLogout();
      logout();
      setIsLoggingOut(false);
      window.location.replace("/login");
    }
  };

  return (
    <ShadcnSidebar collapsible="icon" {...props}>
      {/* Header / Logo - aligned with h-14 top navbar */}
      <SidebarHeader className="h-14 shrink-0 border-b border-border flex flex-col justify-center px-3 py-0 gap-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-10 group-data-[collapsible=icon]:p-0 data-[state=open]:bg-sidebar-accent">
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                  <FileText className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-bold text-sidebar-foreground">Casefy.ai</span>
                  <span className="truncate text-xs text-muted-foreground">Legal AI Platform</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation Content */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground group-data-[collapsible=icon]:hidden">
            Platform
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const matchSub = item.matchSubpaths !== false;
                const isActive =
                  pathname === item.href ||
                  (matchSub && pathname.startsWith(item.href + "/"));
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.name}
                      className="transition-colors"
                    >
                      <Link href={item.href}>
                        <Icon className="size-4" />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Collapsible History Section matching reference */}
              <Collapsible
                open={isHistoryOpen}
                onOpenChange={setIsHistoryOpen}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip="History"
                      className="w-full justify-between group-data-[collapsible=icon]:justify-center hover:bg-sidebar-accent/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="size-4 text-muted-foreground" />
                        <span className="font-medium text-sm group-data-[collapsible=icon]:hidden">
                          History
                        </span>
                      </div>
                      <ChevronDown className="size-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180 group-data-[collapsible=icon]:hidden" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <SidebarMenuSub className="border-sidebar-border/60">
                      {conversations.length === 0 ? (
                        <SidebarMenuSubItem>
                          <span className="text-xs text-muted-foreground/60 px-2 py-1.5 block">
                            No previous chats
                          </span>
                        </SidebarMenuSubItem>
                      ) : (
                        conversations.map((conv) => {
                          const isConvActive =
                            pathname === `/chatbot/${conv.id}` ||
                            (pathname === "/chatbot" && currentChatId === conv.id);

                          return (
                            <SidebarMenuSubItem key={conv.id}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isConvActive}
                                className="text-xs font-normal hover:text-foreground transition-colors"
                              >
                                <Link
                                  href={`/chatbot/${conv.id}`}
                                  title={conv.title}
                                  className="truncate"
                                >
                                  <span className="truncate">
                                    {conv.title || "Untitled Chat"}
                                  </span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })
                      )}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with User Menu Popup */}
      <SidebarFooter className="border-t border-border p-2 ">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip={displayName}
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-sidebar-accent/70 transition-colors"
                >
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={displayName}
                      className="aspect-square size-8 rounded-full object-cover shadow-xs border border-border"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-400 to-lime-300 text-zinc-950 font-bold shadow-xs">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold text-sidebar-foreground">
                      {displayName}
                    </span>
                    <span className="truncate text-xs text-emerald-500 font-medium">
                      Free
                    </span>
                  </div>
                  <MoreVertical className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-56 rounded-xl border-border bg-card p-1.5 shadow-xl text-card-foreground"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={8}
              >
                <DropdownMenuGroup>
                  <DropdownMenuItem className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg cursor-pointer">
                    <Settings className="size-4 text-muted-foreground" />
                    <span>Settings</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem className="flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <Globe className="size-4 text-muted-foreground" />
                      <span>Language</span>
                    </div>
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                  </DropdownMenuItem>

                  <DropdownMenuItem className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg cursor-pointer">
                    <HelpCircle className="size-4 text-muted-foreground" />
                    <span>Get Help</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator className="my-1 border-border/60" />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg cursor-pointer text-red-500 hover:text-red-600 focus:text-red-600 focus:bg-red-500/10"
                >
                  <LogOut className="size-4 text-red-500" />
                  <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Collapsible Rail Handle */}
      <SidebarRail />
    </ShadcnSidebar>
  );
}

// Backward compatibility export
export const Sidebar = AppSidebar;
