import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyDataCard } from "./empty-data-card";

describe("EmptyDataCard", () => {
  it("renders the title and description", () => {
    render(<EmptyDataCard title="No resumes" description="Upload one first." />);

    expect(screen.getByText("No resumes")).toBeInTheDocument();
    expect(screen.getByText("Upload one first.")).toBeInTheDocument();
  });

  it("renders no call to action by default", () => {
    render(<EmptyDataCard title="No resumes" description="Nothing here." />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("links the call to action at the given destination", () => {
    render(
      <EmptyDataCard
        title="No resumes to compare"
        description="Upload one and it will show up here."
        action={{ label: "Upload a resume", href: "/resumes?upload=1" }}
      />,
    );

    const link = screen.getByRole("link", { name: "Upload a resume" });
    expect(link).toHaveAttribute("href", "/resumes?upload=1");
  });
});
