"use client";

import { type LucideIcon } from "lucide-react";

import { Collapsible } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  return (
    <SidebarGroup>
      <SidebarMenu className="gap-2">
        {items.map((item) => (
          <Collapsible key={item.title} asChild defaultOpen={item.isActive}>
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild 
                tooltip={item.title}
                isActive={item.isActive}
                className={`py-5 transition-all duration-200 ${
                  item.isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Link href={item.url} className="flex items-center gap-3 w-full">
                  <item.icon className={`!w-5 !h-5 shrink-0 ${item.isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-base">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}