import { FileText, ArrowRight, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button"; 

export default function Home() {
  return (
  
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">

      <div className="absolute top-1 left-1/4 w-100 h-100 bg-teal-500/20 rounded-full blur-[100px]" />
      <div className="absolute top-1 right-1/4 w-100 h-100   bg-purple-500/30 rounded-full blur-[100px]" />
      
      {/* --- NAVBAR --- */}
      <header className="z-10 flex w-full items-center justify-between p-6 md:px-12">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Sparkles className="h-5 w-5 text-purple-500" />
          AI-Tailor
        </div>
        <Button variant="outline" className="rounded-full px-6" asChild>
          <Link href="/signup">Try for Free</Link>
        </Button>
      </header>

      {/* --- MAIN HERO CONTENT --- */}
      <main className="z-10 flex flex-1 flex-col items-center justify-center px-4 text-center">
        
        {/* TYPOGRAPHY */}
        <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight md:text-7xl">
          Your AI-Powered <br /> Career Assistant.
        </h1>
        <p className="mt-6 text-xl text-muted-foreground md:text-2xl">
          Analyze. Tailor. Land the Interview.
        </p>

        {/* --- THE CENTRAL GRAPHIC --- */}
        <div className="mt-16 flex items-center justify-center gap-4 md:gap-8">
          
          {/* Left Document (Standard Gray) */}
          <div className="flex h-36 w-28 flex-col items-center justify-center rounded-xl border-2 border-muted bg-card shadow-lg md:h-48 md:w-36">
            <User className="h-10 w-10 text-muted-foreground mb-2" />
            <div className="w-16 h-1 bg-muted rounded-full mb-2" />
            <div className="w-16 h-1 bg-muted rounded-full mb-2" />
            <div className="w-12 h-1 bg-muted rounded-full" />
          </div>

          {/* Center Arrow */}
          <ArrowRight className="h-8 w-8 text-teal-500 md:h-12 md:w-12" />

          <div className="flex h-36 w-28 p-0.5 rounded-xl bg-linear-to-br from-teal-400 to-purple-600 shadow-[0_0_30px_rgba(45,212,191,0.2)] md:h-48 md:w-36">
            {/* The inner div masks the middle, leaving only a glowing gradient border! */}
            <div className="flex h-full w-full flex-col items-center justify-center rounded-lg bg-card">
              <FileText className="h-10 w-10 text-teal-400 mb-2" />
              <div className="w-16 h-1 bg-teal-400 rounded-full mb-2" />
              <div className="w-16 h-1 bg-purple-400 rounded-full mb-2" />
              <div className="w-12 h-1 bg-purple-500 rounded-full" />
            </div>
          </div>
          
        </div>

        {/* --- BOTTOM CALL TO ACTION --- */}
        <div className="mt-16">
          <Button size="lg" className="rounded-full px-8 py-6 text-lg font-bold shadow-lg" asChild>
            <Link href="/signup">Try for Free</Link>
          </Button>
        </div>

      </main>
      
      <div className="absolute top-1/2 left-1/4 w-100 h-100 bg-purple-500/30 rounded-full blur-[100px]" />
      <div className="absolute top-1/2 right-1/4 w-100 h-100 bg-teal-500/20 rounded-full blur-[100px]" />

    </div>
  );
}