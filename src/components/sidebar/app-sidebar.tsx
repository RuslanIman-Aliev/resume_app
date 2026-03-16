"use client"

import {
  Briefcase,
  CreditCard,
  FileText,
  LayoutDashboard,
  Sparkle
} from "lucide-react"
import * as React from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: LayoutDashboard,
      isActive: true, // This will now highlight beautifully!
    },
    {
      title: "Resume Manager",
      url: "#",
      icon: FileText,
    },
    {
      title: "Job Applications",
      url: "#",
      icon: Briefcase,
    },
    {
      title: "Billing",
      url: "#",
      icon: CreditCard,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent cursor-default">
              <div className="flex items-center gap-3">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-teal-400 text-white shadow-md">
                  <Sparkle className="size-5 fill-white" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold text-xl tracking-tight">AI-Tailor</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent className="px-2 mt-4">
        <NavMain items={data.navMain} />
      </SidebarContent>
      
      <SidebarFooter className="p-4">
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}