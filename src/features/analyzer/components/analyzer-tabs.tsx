import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  FileTextIcon,
  Link2Icon,
  SparklesIcon,
  Upload,
  UploadIcon,
} from "lucide-react";

const AnalyzerTabs = () => {
  return (
    <Card className="w-full p-6">
      <CardHeader className="p-0">
        <div className="flex gap-2 items-center">
          <FileTextIcon className="size-6 text-primary" />
          <span className="text-lg font-semibold ">Job Description Input</span>
        </div>
        <div className="mt-2 text-muted-foreground">
          Paste the job description you want to analyze, or upload a file
        </div>
      </CardHeader>

      <Tabs defaultValue="paste-text" className="flex flex-col gap-6">
        <TabsList>
          <TabsTrigger value="paste-text" className="gap-2">
            <FileTextIcon />
            Paste Text
          </TabsTrigger>
          <TabsTrigger value="upload-file" className="gap-2">
            <UploadIcon />
            Upload File
          </TabsTrigger>
          <TabsTrigger value="from-url" className="gap-2">
            <Link2Icon />
            From URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="paste-text">
          <Textarea
            placeholder="Paste the job description here..."
            className="min-h-75 resize-none bg-secondary/30 border-border/50 focus:border-primary/50"
          />
        </TabsContent>
        <TabsContent value="upload-file">
          <Card className="p-0">
            <div
              className={`relative flex flex-col items-center justify-center rounded-xl  p-15 transition-colors bg-input/5`}
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-sm font-medium">
                Drag and drop your job description here
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                or click to browse (PDF, DOCX)
              </p>
              <input
                type="file"
                accept=".pdf,.docx"
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="from-url">
          <div className="space-y-2">
            <Input
              type="url"
              placeholder="https://careers.company.com/job/..."
              className="w-full rounded-md border border-border/50 bg-secondary/30 p-5 placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-muted-foreground">
              Paste a link to a job posting from LinkedIn, Indeed, Glassdoor, or
              company career pages
            </p>
          </div>
        </TabsContent>
      </Tabs>
      <Select>
        <SelectTrigger className="w-full mt-4 ">
          <SelectValue placeholder="Select your job position " />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="software-engineering">
            Software Engineering
          </SelectItem>
          <SelectItem value="data-science">Data Science</SelectItem>
          <SelectItem value="product-management">Product Management</SelectItem>
          <SelectItem value="design">Design</SelectItem>
          <SelectItem value="marketing">Marketing</SelectItem>
        </SelectContent>
      </Select>

      <Button className="mt-4 p-5 w-full font-bold ">
        <SparklesIcon className="size-4 mr-2" />
        Analyze Job Description
      </Button>
    </Card>
  );
};

export default AnalyzerTabs;
