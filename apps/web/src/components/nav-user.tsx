"use client"

import {
  IconCreditCard,
  IconDotsVertical,
  IconLogout,
  IconNotification,
  IconUserCircle,
} from "@tabler/icons-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="animate-lift hover:bg-white/20 dark:hover:bg-gray-700/30 data-[state=open]:bg-white/30 data-[state=open]:shadow-modern transition-all duration-300 rounded-xl p-3"
            >
              <div className="relative">
                <Avatar className="h-10 w-10 rounded-xl ring-2 ring-white/20 shadow-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-xl bg-gradient-primary text-white font-semibold">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-gray-900 dark:text-white">{user.name}</span>
                <span className="truncate text-xs text-gray-600 dark:text-gray-300">
                  {user.email}
                </span>
              </div>
              <div className="p-1 rounded-md bg-white/10 dark:bg-gray-700/30">
                <IconDotsVertical className="size-4 text-gray-700 dark:text-gray-200" />
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="glass-card min-w-56 rounded-xl border-0 shadow-modern"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 px-3 py-3 text-left text-sm">
                <Avatar className="h-10 w-10 rounded-xl">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-xl bg-gradient-primary text-white font-semibold">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-gray-900 dark:text-white">{user.name}</span>
                  <span className="truncate text-xs text-gray-600 dark:text-gray-300">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/20 dark:bg-gray-700/30" />
            <DropdownMenuGroup>
              <DropdownMenuItem className="animate-lift hover:bg-white/20 dark:hover:bg-gray-700/30 rounded-lg mx-1 my-1 transition-all duration-300">
                <div className="p-1 rounded-md bg-blue-100 dark:bg-blue-900/30">
                  <IconUserCircle className="size-4 text-blue-600" />
                </div>
                <span className="font-medium">Account</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="animate-lift hover:bg-white/20 dark:hover:bg-gray-700/30 rounded-lg mx-1 my-1 transition-all duration-300">
                <div className="p-1 rounded-md bg-green-100 dark:bg-green-900/30">
                  <IconCreditCard className="size-4 text-green-600" />
                </div>
                <span className="font-medium">Billing</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="animate-lift hover:bg-white/20 dark:hover:bg-gray-700/30 rounded-lg mx-1 my-1 transition-all duration-300">
                <div className="p-1 rounded-md bg-purple-100 dark:bg-purple-900/30">
                  <IconNotification className="size-4 text-purple-600" />
                </div>
                <span className="font-medium">Notifications</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-white/20 dark:bg-gray-700/30" />
            <DropdownMenuItem className="animate-lift hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg mx-1 my-1 transition-all duration-300">
              <div className="p-1 rounded-md bg-red-100 dark:bg-red-900/30">
                <IconLogout className="size-4 text-red-600" />
              </div>
              <span className="font-medium text-red-700 dark:text-red-300">Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
