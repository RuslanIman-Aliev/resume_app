// Test setup: provide minimal DOM APIs used by third-party libs (canvas, getComputedStyle)
import React, { type ReactNode } from "react";
import { vi } from "vitest";

// Mock Syncfusion React DocumentEditor to avoid heavy DOM/canvas usage in tests
vi.mock("@syncfusion/ej2-react-documenteditor", () => {
  const Dummy = (props: { children?: ReactNode }) =>
    React.createElement(
      "div",
      { "data-mock-doc-editor": true },
      props.children,
    );
  // Provide static Injectable API used in the component. Use a generic record
  // cast to avoid touching `any` while still attaching the API used by the
  // components under test.
  (Dummy as unknown as Record<string, unknown>).Inject = () => {};
  return {
    DocumentEditorContainerComponent: Dummy,
    Toolbar: {},
  };
});

if (typeof window !== "undefined") {
  // Mock getComputedStyle to support pseudo-elements used by some libs
  const originalGetComputedStyle = window.getComputedStyle.bind(window);
  const patchedGetComputedStyle = (
    elt: Element,
    pseudo?: string,
  ): CSSStyleDeclaration => {
    try {
      return originalGetComputedStyle(elt, pseudo);
    } catch {
      return { getPropertyValue: () => "" } as unknown as CSSStyleDeclaration;
    }
  };
  (
    window as unknown as { getComputedStyle: typeof patchedGetComputedStyle }
  ).getComputedStyle = patchedGetComputedStyle;

  // Provide a minimal 2D canvas context implementation to satisfy libraries
  // that call canvas.getContext('2d').save() / restore() etc.
  const maybeProto = (
    window as unknown as {
      HTMLCanvasElement?: { prototype?: unknown };
    }
  ).HTMLCanvasElement?.prototype as unknown as
    | Record<string, unknown>
    | undefined;

  if (maybeProto) {
    const protoRecord = maybeProto as Record<string, unknown>;
    if (!protoRecord.__patched) {
      protoRecord.getContext = function getContext() {
        return {
          save: () => {},
          restore: () => {},
          scale: () => {},
          translate: () => {},
          fillRect: () => {},
          clearRect: () => {},
          beginPath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          closePath: () => {},
          stroke: () => {},
          fillText: () => {},
          measureText: () => ({ width: 0 }),
          createLinearGradient: () => ({ addColorStop: () => {} }),
          drawImage: () => {},
        };
      };
      protoRecord.__patched = true;
    }
  }
}

// Optional: silence aria warnings from testing-library in tests
process.env.TESTING = "1";
