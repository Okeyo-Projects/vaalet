"use client"

import * as React from "react"
import {
  IconBell,
  IconHeart,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconSettings,
} from "@tabler/icons-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
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
  user: {
    name: "Valet Ia",
    email: "valet@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
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
                <span className="text-xl font-bold text-gray-900 dark:text-white">Valet</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-3 space-y-2">
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter className="glass-card-subtle mx-3 mb-3 rounded-xl">
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
