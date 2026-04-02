import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { KanbanColumn } from "@/features/tracker/components/kanban-column";
import {
  ArrowUpDown,
  Filter,
  LayoutGrid,
  List,
  Plus,
  Search,
} from "lucide-react";

const mockApplications = [
  {
    id: "1",
    company: "Stripe",
    position: "Senior Frontend Engineer",
    location: "San Francisco, CA (Remote)",
    salary: "$180k - $220k",
    status: "interview",
    appliedDate: "2024-03-01",
    lastUpdated: "2024-03-10",
    matchScore: 92,
    nextStep: "Technical Interview",
    nextStepDate: "2024-03-18",
    url: "https://stripe.com/jobs",
  },
  {
    id: "2",
    company: "Vercel",
    position: "Full Stack Developer",
    location: "Remote",
    salary: "$150k - $190k",
    status: "screening",
    appliedDate: "2024-03-05",
    lastUpdated: "2024-03-08",
    matchScore: 88,
    nextStep: "HR Call",
    nextStepDate: "2024-03-15",
  },
  {
    id: "3",
    company: "Figma",
    position: "Product Designer",
    location: "New York, NY",
    salary: "$140k - $180k",
    status: "applied",
    appliedDate: "2024-03-08",
    lastUpdated: "2024-03-08",
    matchScore: 85,
  },
  {
    id: "4",
    company: "Linear",
    position: "Software Engineer",
    location: "Remote",
    salary: "$160k - $200k",
    status: "saved",
    lastUpdated: "2024-03-12",
    matchScore: 90,
  },
  {
    id: "5",
    company: "Notion",
    position: "Frontend Engineer",
    location: "San Francisco, CA",
    salary: "$170k - $210k",
    status: "offer",
    appliedDate: "2024-02-15",
    lastUpdated: "2024-03-05",
    matchScore: 95,
  },
  {
    id: "6",
    company: "Airbnb",
    position: "Senior Software Engineer",
    location: "San Francisco, CA",
    salary: "$190k - $240k",
    status: "rejected",
    appliedDate: "2024-02-20",
    lastUpdated: "2024-03-01",
    matchScore: 78,
  },
  {
    id: "7",
    company: "Spotify",
    position: "Backend Engineer",
    location: "Stockholm (Remote)",
    salary: "$130k - $170k",
    status: "applied",
    appliedDate: "2024-03-10",
    lastUpdated: "2024-03-10",
    matchScore: 82,
  },
  {
    id: "8",
    company: "Discord",
    position: "React Developer",
    location: "San Francisco, CA",
    salary: "$155k - $195k",
    status: "saved",
    lastUpdated: "2024-03-11",
    matchScore: 87,
  },
];

const TrackerPage = () => {
  const stats = {
    total: mockApplications.length,
    saved: mockApplications.filter((a) => a.status === "saved").length,
    applied: mockApplications.filter((a) => a.status === "applied").length,
    screening: mockApplications.filter((a) => a.status === "screening").length,
    interview: mockApplications.filter((a) => a.status === "interview").length,
    offer: mockApplications.filter((a) => a.status === "offer").length,
    rejected: mockApplications.filter((a) => a.status === "rejected").length,
  };

  return (
    <div>
      <main className="container mx-auto max-w-7xl px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Application Tracker
          </h1>
          <p className="text-muted-foreground">
            Track and manage all your job applications in one place.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          <div className="rounded-lg border border-border/50 bg-card/50 p-3 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-card/50 p-3 text-center">
            <p className="text-2xl font-bold text-muted-foreground">
              {stats.saved}
            </p>
            <p className="text-xs text-muted-foreground">Saved</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-card/50 p-3 text-center">
            <p className="text-2xl font-bold text-blue-400">{stats.applied}</p>
            <p className="text-xs text-muted-foreground">Applied</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-card/50 p-3 text-center">
            <p className="text-2xl font-bold text-yellow-400">
              {stats.screening}
            </p>
            <p className="text-xs text-muted-foreground">Screening</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-card/50 p-3 text-center">
            <p className="text-2xl font-bold text-purple-400">
              {stats.interview}
            </p>
            <p className="text-xs text-muted-foreground">Interview</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-card/50 p-3 text-center">
            <p className="text-2xl font-bold text-primary">{stats.offer}</p>
            <p className="text-xs text-muted-foreground">Offer</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-card/50 p-3 text-center">
            <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search applications..."
                className="pl-10 bg-secondary/30 border-border/50"
                //value={searchQuery}
                //onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" className="shrink-0">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="shrink-0">
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center border border-border/50 rounded-lg p-1">
              <Button
                variant={"ghost"}
                //variant={viewMode === "kanban" ? "secondary" : "ghost"}
                size="sm"
                //onClick={() => setViewMode("kanban")}
                className="h-8 "
              >
                <LayoutGrid className="h-4 w-4 mr-1.5" />
                Board
              </Button>
              <Button
                variant={"secondary"}
                //variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                // onClick={() => setViewMode("list")}
                className="h-8"
              >
                <List className="h-4 w-4 mr-1.5" />
                List
              </Button>
            </div>

            {
              <Dialog>
                <DialogTrigger asChild className="cursor-pointer">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Application
                  </Button>
                </DialogTrigger>
                {/* <AddApplicationDialog 
                onSubmit={handleAddApplication}
                onClose={() => setIsAddDialogOpen(false)}
              /> */}
              </Dialog>
            }
          </div>
        </div>
        <div className="flex flex-nowrap overflow-x-auto gap-6 pb-8">
          <KanbanColumn
            title="Saved"
            status="saved"
            color="text-muted-foreground"
            allJobs={mockApplications}
          />
          <KanbanColumn
            title="Applied"
            status="applied"
            color="text-blue-400"
            allJobs={mockApplications}
          />
          <KanbanColumn
            title="Screening"
            status="screening"
            color="text-yellow-400"
            allJobs={mockApplications}
          />
          <KanbanColumn
            title="Interview"
            status="interview"
            color="text-purple-400"
            allJobs={mockApplications}
          />
          <KanbanColumn
            title="Offer"
            status="offer"
            color="text-green-400"
            allJobs={mockApplications}
          />
          <KanbanColumn
            title="Rejected"
            status="rejected"
            color="text-red-400"
            allJobs={mockApplications}
          />
        </div>
      </main>
    </div>
  );
};

export default TrackerPage;
