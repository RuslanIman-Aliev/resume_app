import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react"

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex items-center gap-0.5", className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkBaseProps = {
  isActive?: boolean
} & Pick<React.ComponentProps<typeof Button>, "size">

type PaginationLinkAsAnchor = PaginationLinkBaseProps &
  React.ComponentProps<"a"> & { href: string }

type PaginationLinkAsButton = PaginationLinkBaseProps &
  Omit<React.ComponentProps<"button">, "type"> & { href?: undefined }

type PaginationLinkProps = PaginationLinkAsAnchor | PaginationLinkAsButton

function PaginationLink({
  className,
  isActive,
  size = "icon",
  href,
  children,
  ...props
}: PaginationLinkProps) {
  const sharedAttrs = {
    "aria-current": isActive ? ("page" as const) : undefined,
    "data-slot": "pagination-link" as const,
    "data-active": isActive,
  }
  const buttonVariantProps = {
    variant: (isActive ? "outline" : "ghost") as React.ComponentProps<typeof Button>["variant"],
    size,
    className: cn(className),
  }

  if (href !== undefined) {
    return (
      <Button asChild {...buttonVariantProps}>
        <a href={href} {...sharedAttrs} {...(props as React.ComponentProps<"a">)}>
          {children}
        </a>
      </Button>
    )
  }

  return (
    <Button
      type="button"
      {...buttonVariantProps}
      {...sharedAttrs}
      {...(props as Omit<React.ComponentProps<"button">, "type">)}
    >
      {children}
    </Button>
  )
}

function PaginationPrevious({
  className,
  text = "Previous",
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn("pl-1.5!", className)}
      {...props}
    >
      <ChevronLeftIcon data-icon="inline-start" />
      <span className="hidden sm:block">{text}</span>
    </PaginationLink>
  )
}

function PaginationNext({
  className,
  text = "Next",
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn("pr-1.5!", className)}
      {...props}
    >
      <span className="hidden sm:block">{text}</span>
      <ChevronRightIcon data-icon="inline-end" />
    </PaginationLink>
  )
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn(
        "flex size-8 items-center justify-center [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <MoreHorizontalIcon
      />
      <span className="sr-only">More pages</span>
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}
