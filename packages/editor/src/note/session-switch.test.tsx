import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";

import { NoteEditor, type JSONContent } from "./index";

// jsdom doesn't implement layout, which ProseMirror's selection-scrolling
// code depends on. Stub it out so view.updateState() doesn't throw.
beforeAll(() => {
  const rect = () => ({
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON() {},
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Range.prototype as any).getClientRects = () => [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Range.prototype as any).getBoundingClientRect = rect;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Element.prototype as any).getClientRects = () => [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Element.prototype as any).getBoundingClientRect = rect;
});

function doc(text: string): JSONContent {
  return {
    type: "doc",
    content: [
      { type: "paragraph", content: text ? [{ type: "text", text }] : [] },
    ],
  };
}

function getEditorText(container: HTMLElement): string {
  const el = container.querySelector('[contenteditable="true"]');
  return el?.textContent ?? "";
}

describe("NoteEditor session switching", () => {
  it("does not leak focused content when initialContent changes to a different session, and syncs once blurred", async () => {
    const { container, rerender } = render(
      <NoteEditor initialContent={doc("note A content")} />,
    );

    await waitFor(() => {
      expect(getEditorText(container)).toBe("note A content");
    });

    const editable = container.querySelector(
      '[contenteditable="true"]',
    ) as HTMLElement;
    editable.focus();
    expect(document.activeElement).toBe(editable);

    // Simulate switching to a different session's content while the
    // editor still has DOM focus (e.g. session switch before blur fires).
    rerender(<NoteEditor initialContent={doc("note B content")} />);

    // Give any pending effects a chance to run; content must NOT have
    // been silently marked as synced without actually being applied.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getEditorText(container)).toBe("note A content");

    fireEvent.blur(editable);

    await waitFor(() => {
      expect(getEditorText(container)).toBe("note B content");
    });
  });

  it("syncs immediately when the view is not focused", async () => {
    const { container, rerender } = render(
      <NoteEditor initialContent={doc("note A content")} />,
    );

    await waitFor(() => {
      expect(getEditorText(container)).toBe("note A content");
    });

    rerender(<NoteEditor initialContent={doc("note C content")} />);

    await waitFor(() => {
      expect(getEditorText(container)).toBe("note C content");
    });
  });
});
