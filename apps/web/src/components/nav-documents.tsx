"use client"

import {
  IconDots,
  IconFolder,
  IconShare3,
  IconTrash,
  type Icon,
} from "@tabler/icons-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavDocuments({
  items,
  isLoading = false,
}: {
  items: {
    id: string
    name: string
    url: string
    icon: Icon
    summary?: string
  }[]
  isLoading?: boolean
}) {
  const { isMobile } = useSidebar()

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Historiques</SidebarGroupLabel>
      <SidebarMenu>
        {isLoading ? (
          <SidebarMenuItem>
            <div className="flex h-10 w-full items-center gap-2 rounded-lg bg-muted/50 px-3 text-sm text-muted-foreground animate-pulse">
              Chargement des recherches…
            </div>
          </SidebarMenuItem>
        ) : items.length === 0 ? (
          <SidebarMenuItem>
            <div className="flex h-10 w-full items-center rounded-lg border border-dashed border-muted px-3 text-sm text-muted-foreground">
              Aucune recherche récente
            </div>
          </SidebarMenuItem>
        ) : (
          items.map((item) => (
            <SidebarMenuItem key={item.id} className="h-[60px]">
              <SidebarMenuButton asChild  className="h-[60px]">
                <a href={item.url} className="flex items-start gap-2" title={item.name}>
                  <item.icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium leading-tight truncate">{item.name}</div>
                    {item.summary ? (
                      <div className="text-xs text-muted-foreground leading-snug line-clamp-2">
                        {item.summary}
                      </div>
                    ) : null}
                  </div>
                </a>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction
                    showOnHover
                    className="data-[state=open]:bg-accent rounded-sm"
                  >
                    <IconDots />
                    <span className="sr-only">More</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-28 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  align={isMobile ? "end" : "start"}
                >
                  <DropdownMenuItem asChild>
                    <a href={item.url} className="flex items-center gap-2">
                      <IconFolder />
                      <span>Ouvrir</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <IconShare3 />
                    <span>Partager</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" disabled>
                    <IconTrash />
                    <span>Supprimer</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          ))
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
