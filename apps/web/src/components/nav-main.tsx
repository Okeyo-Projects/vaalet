"use client"

import { IconCirclePlusFilled, type Icon } from "@tabler/icons-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: Icon
  }[]
}) {
  const pathname = usePathname()
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-3">
        {/* Modern Search Button */}
        <div className="glass-card-subtle rounded-xl p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Nouvelle recherche"
                className="btn-gradient hover:shadow-modern text-white font-semibold h-12 rounded-xl group transition-all duration-300"
              >
                <Link href="/" className="flex items-center gap-3">
                  <div className="p-1 rounded-lg bg-white/20 group-hover:scale-110 transition-transform duration-300">
                    <IconCirclePlusFilled className="size-5" />
                  </div>
                  <span>Nouvelle recherche</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
        
        {/* Navigation Items */}
        <div className="glass-card-subtle rounded-xl p-2">
          <SidebarMenu className="space-y-1">
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={pathname === item.url || pathname?.startsWith(`${item.url}/`)}
                  className="animate-lift hover:bg-white/20 dark:hover:bg-gray-700/30 rounded-lg transition-all duration-300 data-[active=true]:bg-gradient-primary data-[active=true]:text-white data-[active=true]:shadow-modern"
                >
                  <Link href={item.url} className="flex items-center gap-3">
                    {item.icon && (
                      <div className="p-1 rounded-md">
                        <item.icon className="size-4 text-gray-600 dark:text-gray-300 group-data-[active=true]:text-white" />
                      </div>
                    )}
                    <span className="font-medium text-gray-700 dark:text-gray-200 group-data-[active=true]:text-white">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
