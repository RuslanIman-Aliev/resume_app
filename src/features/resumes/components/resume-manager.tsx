"use client";

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
import { UploadDialog } from "@/features/resumes/components/upload-dialog";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { SearchIcon, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const ResumeManager = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || "",
  );
  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  // URL is the source of truth: push the debounced input into it, but never
  // mirror the URL back into local state (that bidirectional loop is the bug).
  useEffect(() => {
    const currentUrlSearch = searchParams.get("search") || "";
    if (currentUrlSearch === debouncedSearch) return;

    const params = new URLSearchParams(searchParams);
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    } else {
      params.delete("search");
    }
    params.delete("page");

    replace(`${pathname}?${params.toString()}`);
  }, [debouncedSearch, pathname, replace, searchParams]);

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams);

    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }

    params.delete("page");
    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <section className="w-full px-4 sm:px-6 md:px-10">
      <h1 className="text-3xl font-bold mb-6">Resume Manager</h1>

      <div className="flex flex-col gap-3 w-full mb-6 md:flex-row md:items-center md:justify-between md:gap-0">
        <div className="flex flex-col gap-3 w-full sm:flex-row sm:gap-0">
          <Field orientation="horizontal" className="max-w-md">
            <InputGroup className="h-12 sm:h-8">
              <InputGroupInput
                className="h-full sm:h-8"
                id="inline-start-input"
                placeholder="Search resumes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <InputGroupAddon align="inline-start">
                <SearchIcon className="text-muted-foreground" />
              </InputGroupAddon>
            </InputGroup>
          </Field>

          <Select
            value={searchParams.get("status") || "all"}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-full min-h-11 sm:w-35 sm:ml-4 sm:min-h-0">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ANALYZED">Analyzed</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-full items-center gap-2 md:w-auto">
          <UploadDialog />
        </div>
      </div>
    </section>
  );
};

export default ResumeManager;
