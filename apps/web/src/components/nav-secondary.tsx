"use client"

import * as React from "react"
import { type Icon } from "@tabler/icons-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string
    url: string
    icon: Icon
  }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const pathname = usePathname()
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <div className="glass-card-subtle rounded-xl p-2">
          <SidebarMenu className="space-y-1">
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === item.url || pathname?.startsWith(`${item.url}/`)}
                  className="animate-lift hover:bg-white/20 dark:hover:bg-gray-700/30 rounded-lg transition-all duration-300 data-[active=true]:bg-gradient-primary data-[active=true]:text-white data-[active=true]:shadow-modern"
                >
                  <Link href={item.url} className="flex items-center gap-3">
                    <div className="p-1 rounded-md">
                      <item.icon className="size-4 text-gray-600 dark:text-gray-300 group-data-[active=true]:text-white" />
                    </div>
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
