"use client"

import * as React from "react"
import {
  IconBell,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconHeart,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconMapPin,
  IconReport,
  IconSearch,
  IconSettings,
  IconShoppingCart,
  IconTag,
  IconWorld,
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
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Valet</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
