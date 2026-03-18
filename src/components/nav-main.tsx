"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BrainCircuit,
  FileText,
  FolderOpen,
  LayoutDashboard,
  ListChecks,
  Menu,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface HeaderProps {
  activePage?:
    | "dashboard"
    | "analyzer"
    | "resumes"
    | "tracker"
    | "coach"
    | "settings";
}

export function Header({ activePage = "analyzer" }: HeaderProps) {
  const navItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
    },
    { id: "analyzer", label: "Analyzer", icon: FileText, href: "/" },
    { id: "resumes", label: "Resumes", icon: FolderOpen, href: "/resumes" },
    { id: "tracker", label: "Tracker", icon: ListChecks, href: "/tracker" },
    { id: "coach", label: "AI Coach", icon: BrainCircuit, href: "/ai-coach" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between ">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">AI-Tailor</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link key={item.id} href={item.href}>
              <Button
                variant={"ghost"}
                size="sm"
                className={
                  activePage === item.id
                    ? "text-foreground bg-secondary/50"
                    : "text-muted-foreground  hover:bg-primary!"
                }
              >
                <item.icon className="h-4 w-4 mr-2" />
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>

        {/* Mobile Nav */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {navItems.map((item) => (
                <DropdownMenuItem key={item.id} asChild>
                  <Link href={item.href} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="hidden sm:flex">
            Sign In
          </Button>
          <Button size="sm">Get Started</Button>
        </div>
      </div>
    </header>
  );
}
