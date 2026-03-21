import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Grid3X3,
  List,
  SearchIcon,
  SlidersHorizontal,
  Upload,
} from "lucide-react";

const ResumeManager = () => {
  return (
    <section className="w-full">
      <h1 className="text-3xl font-bold mb-6">Resume Manager</h1>

      <div className="flex items-center w-full justify-between mb-6">
        <div className="flex w-full">
          <Field orientation="horizontal" className="max-w-md">
            <InputGroup>
              <InputGroupInput
                id="inline-start-input"
                placeholder="Search..."
              />
              <InputGroupAddon align="inline-start">
                <SearchIcon className="text-muted-foreground" />
              </InputGroupAddon>
            </InputGroup>
          </Field>

          <Select>
            <SelectTrigger className="w-35">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 ">
          <div className="flex items-center rounded-lg border border-border p-1">
            {/* Add a viewMode property to show a different outputs options*/}
            <Button
              variant={"ghost"}
              // variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              //onClick={() => setViewMode("list")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={"ghost"}
              // variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              //onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Dialog>
            <DialogTrigger
              className="hover:bg-primary/80 cursor-pointer"
              asChild
            >
              <Button>Upload Resume</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">
                  Upload Resume
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Upload your resume to get AI-powered analysis and optimization
                  suggestions
                </DialogDescription>
              </DialogHeader>

              <div
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${"border-primary bg-primary/5"}`}
                //onDragEnter={handleDrag}
                //onDragLeave={handleDrag}
                //onDragOver={handleDrag}
                //onDrop={handleDrop}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Upload className="h-7 w-7 text-primary" />
                </div>
                <p className="mt-4 text-sm font-medium">
                  Drag and drop your resume here
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  or click to browse (PDF, DOCX)
                </p>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  //onChange={handleFileSelect}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" className="cursor-pointer">
                    Cancel
                  </Button>
                </DialogClose>
                <Button className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Resume
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </section>
  );
};

export default ResumeManager;
