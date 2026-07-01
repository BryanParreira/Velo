import type { EditorView } from "~/store/zustand/tabs/schema";

export function computeCurrentNoteTab(
  tabView: EditorView | null,
  isLiveSessionActive: boolean,
  firstEnhancedNoteId: string | undefined,
  canShowTranscript = false,
): EditorView {
  const enhancedFallback: EditorView = firstEnhancedNoteId
    ? { type: "enhanced", id: firstEnhancedNoteId }
    : canShowTranscript
      ? { type: "transcript" }
      : { type: "enhanced", id: "" };

  if (isLiveSessionActive) {
    if (tabView?.type === "enhanced" && firstEnhancedNoteId) {
      return tabView;
    }
    if (tabView?.type === "transcript" && canShowTranscript) {
      return tabView;
    }
    return enhancedFallback;
  }

  if (tabView) {
    if (tabView.type === "enhanced" && firstEnhancedNoteId) {
      return tabView;
    }
    if (tabView.type === "transcript" && canShowTranscript) {
      return tabView;
    }
    return enhancedFallback;
  }

  return enhancedFallback;
}
