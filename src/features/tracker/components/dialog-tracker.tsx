"use client";

import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { applicationStatusValues, trackerFormSchema, TrackerFormValues } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, DollarSign, Link, Mail, MapPin, User } from "lucide-react";
import { Controller, useForm } from "react-hook-form";

type DialogTrackerProps = {
  onSubmit: (values: TrackerFormValues) => void | Promise<void>;
  onClose: () => void;
};

const DialogTracker = ({ onSubmit, onClose }: DialogTrackerProps) => {
  const form = useForm<TrackerFormValues>({
    resolver: zodResolver(trackerFormSchema),
    defaultValues: {
      company: "",
      position: "",
      location: "",
      salary: "",
      status: "saved",
      url: "",
      notes: "",
      contactName: "",
      contactEmail: "",
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values as TrackerFormValues);
    form.reset();
  });

  return (
    <DialogContent className="sm:max-w-125">
      <DialogHeader>
        <DialogTitle>Add New Application</DialogTitle>
        <DialogDescription>
          Track a new job opportunity. Fill in the details below.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit}>
        <FieldGroup className="space-y-4 py-4 px-2 max-h-[60vh] overflow-y-auto">
          
          <Controller
            name="company"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="tracker-company">Company Name</FieldLabel>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    {...field}
                    id="tracker-company"
                    aria-invalid={fieldState.invalid}
                    placeholder="e.g., Stripe"
                    className="pl-10"
                  />
                </div>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="position"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="tracker-position">Position</FieldLabel>
                <Input
                  {...field}
                  id="tracker-position"
                  aria-invalid={fieldState.invalid}
                  placeholder="e.g., Senior Frontend Engineer"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="location"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="tracker-location">Location</FieldLabel>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    {...field}
                    id="tracker-location"
                    aria-invalid={fieldState.invalid}
                    placeholder="e.g., San Francisco, CA (Remote)"
                    className="pl-10"
                  />
                </div>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="salary"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="tracker-salary">Salary Range</FieldLabel>
                <div className="relative">
                  <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    {...field}
                    id="tracker-salary"
                    aria-invalid={fieldState.invalid}
                    placeholder="e.g., $150k - $180k"
                    className="pl-10"
                  />
                </div>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="status"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="tracker-status">Status</FieldLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="tracker-status" aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    {applicationStatusValues.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="url"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="tracker-url">Job Posting URL</FieldLabel>
                <div className="relative">
                  <Link className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    {...field}
                    id="tracker-url"
                    value={field.value ?? ""}
                    type="url"
                    aria-invalid={fieldState.invalid}
                    placeholder="https://..."
                    className="pl-10"
                  />
                </div>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* Contact Information Divider */}
          <div className="mt-2 border-t border-border/50 pt-4">
            <p className="mb-1 text-sm font-medium">Contact Information</p>
          </div>

          <Controller
            name="contactName"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="tracker-contact-name">Recruiter / Contact Name</FieldLabel>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    {...field}
                    id="tracker-contact-name"
                    aria-invalid={fieldState.invalid}
                    placeholder="e.g., John Smith"
                    className="pl-10"
                  />
                </div>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="contactEmail"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="tracker-contact-email">Contact Email</FieldLabel>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    {...field}
                    id="tracker-contact-email"
                    value={field.value ?? ""}
                    type="email"
                    aria-invalid={fieldState.invalid}
                    placeholder="recruiter@company.com"
                    className="pl-10"
                  />
                </div>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="notes"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="tracker-notes">Notes</FieldLabel>
                <Textarea
                  {...field}
                  id="tracker-notes"
                  aria-invalid={fieldState.invalid}
                  placeholder="Add any notes about this application..."
                  className="min-h-20 resize-none"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

        </FieldGroup>

        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Add Application"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};

export default DialogTracker;