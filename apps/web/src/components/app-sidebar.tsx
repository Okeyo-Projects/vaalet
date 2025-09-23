"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconAlertTriangle,
  IconBell,
  IconCircleCheck,
  IconClock,
  IconHeart,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconPlus,
  IconSettings,
} from "@tabler/icons-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { useAuth } from "@/contexts/auth-context"
import { useSearchHistory } from "@/contexts/search-history-context"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  navMain: [

    {
      title: "Intérêts",
      url: "/interests",
      icon: IconListDetails,
    },
    {
      title: "Alertes",
      url: "/alerts",
      icon: IconBell,
    },
    {
      title: "Favoris",
      url: "/favorites",
      icon: IconHeart,
    },
    
  ],
 
  navSecondary: [
    {
      title: "Paramètres",
      url: "/settings",
      icon: IconSettings,
    },
    {
      title: "Aide",
      url: "/help",
      icon: IconHelp,
    },
  ],
  documents: [],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuth()
  const { jobs: historyJobs, isLoading: isHistoryLoading } = useSearchHistory()

  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "Utilisateur"
  const email = user?.email ?? ""

  const historyItems = React.useMemo(
    () =>
      historyJobs.map((job) => {
        const status = job.status
        const icon = status === "completed" ? IconCircleCheck : status === "failed" ? IconAlertTriangle : IconClock
        const name = job.query?.trim().length ? job.query.trim() : "Nouvelle recherche"
        return {
          id: job.id,
          name,
          url: `/chat/${job.id}`,
          icon,
          summary: job.message,
        }
      }),
    [historyJobs]
  )

  return (
    <Sidebar collapsible="offcanvas" className="bg-gradient-modern border-r-0" {...props}>
      <SidebarHeader className="glass-card-subtle mx-3 mt-3 rounded-xl">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-4 hover:bg-white/20 dark:hover:bg-gray-700/30 transition-all duration-300"
            >
              <a href="#" className="group">
                <div className="p-2 rounded-lg bg-gradient-primary group-hover:scale-110 transition-transform duration-300">
                  <IconInnerShadowTop className="!size-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">Okeyo Ai</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-3 mt-2 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-700 dark:text-blue-200 hover:from-blue-500/30 hover:to-purple-500/30"
            >
     
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-3 space-y-2">
        <NavMain items={data.navMain} />
        <NavDocuments items={historyItems} isLoading={isHistoryLoading} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter className="glass-card-subtle mx-3 mb-3 rounded-xl">
        <NavUser
          user={{
            name: displayName,
            email,
            avatar: undefined,
          }}
          onLogout={logout}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
