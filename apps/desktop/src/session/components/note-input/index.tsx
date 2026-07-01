import { Sparkles } from "lucide-react";
import type { EditorView } from "prosemirror-view";
import {
  forwardRef,
  type UIEventHandler,
  useCallback,
  useDeferredValue,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";

import type { NoteEditorRef } from "@hypr/editor/note";
import { cn } from "@hypr/utils";

import { Enhanced } from "./enhanced";
import { Header, useEditorTabs } from "./header";
import { Insights } from "./insights";
import { RawEditor } from "./raw";
import { SearchBar } from "./search/bar";
import { useSearch } from "./search/context";
import { Transcript } from "./transcript";

import { useCaretNearBottom } from "~/session/components/caret-position-context";
import { useCurrentNoteTab } from "~/session/components/shared";
import { useScrollPreservation } from "~/shared/hooks/useScrollPreservation";
import * as main from "~/store/tinybase/store/main";
import type { SessionMode } from "~/store/zustand/listener/general";
import { type Tab, useTabs } from "~/store/zustand/tabs";
import { type EditorView as TabEditorView } from "~/store/zustand/tabs/schema";
import { useListener } from "~/stt/contexts";

export interface NoteInputHandle {
  focus: () => void;
  focusAtStart: () => void;
  focusAtPixelWidth: (pixelWidth: number) => void;
  insertAtStartAndFocus: (content: string) => void;
  prepareForTabChange: () => void;
}

export function shouldShowTranscriptTabSpinner(sessionMode: SessionMode) {
  return sessionMode === "finalizing" || sessionMode === "running_batch";
}

export const NoteInput = forwardRef<
  NoteInputHandle,
  {
    tab: Extract<Tab, { type: "sessions" }>;
    onNavigateToTitle?: (pixelWidth?: number) => void;
    onScroll?: UIEventHandler<HTMLDivElement>;
    editorTabs?: TabEditorView[];
    currentTab?: TabEditorView;
    handleTabChange?: (view: TabEditorView) => void;
    hideHeader?: boolean;
  }
>(
  (
    {
      tab,
      onNavigateToTitle,
      onScroll,
      editorTabs: providedEditorTabs,
      currentTab: providedCurrentTab,
      handleTabChange: providedHandleTabChange,
      hideHeader = false,
    },
    ref,
  ) => {
    const fallbackEditorTabs = useEditorTabs({ sessionId: tab.id });
    const updateSessionTabState = useTabs(
      (state) => state.updateSessionTabState,
    );
    const internalEditorRef = useRef<NoteEditorRef>(null);
    const [container, setContainer] = useState<HTMLDivElement | null>(null);
    const [view, setView] = useState<EditorView | null>(null);

    const sessionId = tab.id;

    const tabRef = useRef(tab);
    tabRef.current = tab;

    const fallbackCurrentTab: TabEditorView = useCurrentNoteTab(tab);
    const editorTabs = providedEditorTabs ?? fallbackEditorTabs;
    const currentTab = providedCurrentTab ?? fallbackCurrentTab;
    const deferredCurrentTab = useDeferredValue(currentTab);
    const renderedCurrentTab = editorTabs.some((editorTab) =>
      isSameEditorView(editorTab, deferredCurrentTab),
    )
      ? deferredCurrentTab
      : currentTab;

    const sessionMode = useListener((state) => state.getSessionMode(sessionId));
    const isMeetingInProgress =
      sessionMode === "active" ||
      sessionMode === "finalizing" ||
      sessionMode === "running_batch";
    const shouldShowTranscriptSpinner =
      shouldShowTranscriptTabSpinner(sessionMode);

    const { scrollRef, onBeforeTabChange } = useScrollPreservation(
      renderedCurrentTab.type === "enhanced"
        ? `enhanced-${renderedCurrentTab.id}`
        : renderedCurrentTab.type,
    );

    useImperativeHandle(
      ref,
      () => ({
        focus: () => internalEditorRef.current?.commands.focus(),
        focusAtStart: () => internalEditorRef.current?.commands.focusAtStart(),
        focusAtPixelWidth: (px) =>
          internalEditorRef.current?.commands.focusAtPixelWidth(px),
        insertAtStartAndFocus: (content) =>
          internalEditorRef.current?.commands.insertAtStartAndFocus(content),
        prepareForTabChange: onBeforeTabChange,
      }),
      [currentTab, onBeforeTabChange],
    );

    const handleTabChange = useCallback(
      (tabView: TabEditorView) => {
        if (
          isSameEditorView(tabView, currentTab) ||
          isSameEditorView(tabView, renderedCurrentTab)
        ) {
          return;
        }

        onBeforeTabChange();
        if (providedHandleTabChange) {
          providedHandleTabChange(tabView);
        } else {
          updateSessionTabState(tabRef.current, {
            ...tabRef.current.state,
            view: tabView,
          });
        }
      },
      [
        currentTab,
        onBeforeTabChange,
        providedHandleTabChange,
        renderedCurrentTab,
        updateSessionTabState,
      ],
    );

    useTabShortcuts({
      editorTabs,
      currentTab,
      handleTabChange,
    });

    useEffect(() => {
      if (renderedCurrentTab.type === "raw" && isMeetingInProgress) {
        requestAnimationFrame(() => {
          internalEditorRef.current?.commands.focus();
        });
      }
    }, [renderedCurrentTab, isMeetingInProgress]);

    const handleViewReady = useCallback((editorView: EditorView) => {
      setView(editorView);
    }, []);

    const handleViewDisposed = useCallback((editorView: EditorView) => {
      setView((currentView) =>
        currentView === editorView ? null : currentView,
      );
    }, []);

    useCaretNearBottom({
      view,
      container,
      enabled: true,
    });

    const search = useSearch();
    const showSearchBar = search?.isVisible ?? false;
    const isEditableTab =
      renderedCurrentTab.type === "enhanced" ||
      renderedCurrentTab.type === "raw";

    useEffect(() => {
      search?.close();
    }, [currentTab]);

    const handleContainerClick = () => {
      if (!isEditableTab) {
        return;
      }

      internalEditorRef.current?.commands.focus();
    };

    return (
      <div className="-mx-2 flex h-full flex-col">
        {!hideHeader && (
          <div className="relative px-2">
            <Header
              sessionId={sessionId}
              editorTabs={editorTabs}
              currentTab={renderedCurrentTab}
              handleTabChange={handleTabChange}
              isTranscribing={shouldShowTranscriptSpinner}
            />
          </div>
        )}

        {showSearchBar && isEditableTab && (
          <div className="px-3 pt-1">
            <SearchBar editorRef={internalEditorRef} />
          </div>
        )}

        <div className="relative flex-1 overflow-hidden">
          <div
            ref={(node) => {
              scrollRef.current = node;
              setContainer(node);
            }}
            onClick={handleContainerClick}
            onScroll={onScroll}
            className={cn([
              "h-full px-3",
              "pt-2",
              renderedCurrentTab.type === "transcript" ||
              renderedCurrentTab.type === "insights"
                ? "overflow-hidden pb-0"
                : "scroll-fade-y overflow-auto pb-6",
            ])}
          >
            {renderedCurrentTab.type === "enhanced" && (
              <Enhanced
                ref={internalEditorRef}
                sessionId={sessionId}
                enhancedNoteId={renderedCurrentTab.id}
                onNavigateToTitle={onNavigateToTitle}
                onViewReady={handleViewReady}
                onViewDisposed={handleViewDisposed}
              />
            )}
            {renderedCurrentTab.type === "raw" && (
              <>
                <RawEditor
                  ref={internalEditorRef}
                  sessionId={sessionId}
                  onNavigateToTitle={onNavigateToTitle}
                  onViewReady={handleViewReady}
                  onViewDisposed={handleViewDisposed}
                />
                <SummaryReadyHint
                  sessionId={sessionId}
                  editorTabs={editorTabs}
                  onSwitchToSummary={handleTabChange}
                />
              </>
            )}
            {renderedCurrentTab.type === "transcript" && (
              <Transcript sessionId={sessionId} scrollRef={scrollRef} />
            )}
            {renderedCurrentTab.type === "insights" && (
              <Insights sessionId={sessionId} />
            )}
          </div>
        </div>
      </div>
    );
  },
);

function SummaryReadyHint({
  sessionId,
  editorTabs,
  onSwitchToSummary,
}: {
  sessionId: string;
  editorTabs: TabEditorView[];
  onSwitchToSummary: (tab: TabEditorView) => void;
}) {
  const rawMd = main.UI.useCell("sessions", sessionId, "raw_md", main.STORE_ID);
  const enhancedNoteIds = main.UI.useSliceRowIds(
    main.INDEXES.enhancedNotesBySession,
    sessionId,
    main.STORE_ID,
  );
  const firstEnhancedNoteId = enhancedNoteIds?.[0];
  const enhancedContent = main.UI.useCell(
    "enhanced_notes",
    firstEnhancedNoteId ?? "",
    "content",
    main.STORE_ID,
  );

  const summaryTab = editorTabs.find(
    (t): t is Extract<TabEditorView, { type: "enhanced" }> =>
      t.type === "enhanced",
  );

  const hasSummary =
    summaryTab &&
    typeof enhancedContent === "string" &&
    enhancedContent.trim().length > 0;

  const rawIsEmpty =
    !rawMd ||
    (typeof rawMd === "string" &&
      (() => {
        try {
          const parsed = JSON.parse(rawMd);
          const textNodes = parsed?.content?.filter(
            (n: { type: string }) => n.type !== "heading",
          );
          return !textNodes?.some((n: { content?: { text?: string }[] }) =>
            n.content?.some((c) => c.text?.trim()),
          );
        } catch {
          return rawMd.trim().length === 0;
        }
      })());

  if (!hasSummary || !rawIsEmpty) {
    return null;
  }

  return (
    <button
      onClick={() => onSwitchToSummary(summaryTab)}
      className="mt-4 flex w-full items-center gap-2 rounded-lg border border-dashed border-neutral-200 px-3 py-2.5 text-left transition-colors hover:border-neutral-300 hover:bg-neutral-50"
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
      <span className="text-xs text-neutral-400">
        AI summary is ready —{" "}
        <span className="font-medium text-neutral-500">view Summary</span>
      </span>
    </button>
  );
}

function isSameEditorView(left: TabEditorView, right: TabEditorView): boolean {
  if (left.type !== right.type) {
    return false;
  }

  if (left.type === "enhanced" && right.type === "enhanced") {
    return left.id === right.id;
  }

  return true;
}

function useTabShortcuts({
  editorTabs,
  currentTab,
  handleTabChange,
}: {
  editorTabs: TabEditorView[];
  currentTab: TabEditorView;
  handleTabChange: (view: TabEditorView) => void;
}) {
  useHotkeys(
    "alt+s",
    () => {
      const enhancedTabs = editorTabs.filter((t) => t.type === "enhanced");
      if (enhancedTabs.length === 0) return;

      if (currentTab.type === "enhanced") {
        const currentIndex = enhancedTabs.findIndex(
          (t) => t.type === "enhanced" && t.id === currentTab.id,
        );
        const nextIndex = (currentIndex + 1) % enhancedTabs.length;
        handleTabChange(enhancedTabs[nextIndex]);
      } else {
        handleTabChange(enhancedTabs[0]);
      }
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [currentTab, editorTabs, handleTabChange],
  );

  useHotkeys(
    "alt+m",
    () => {
      const rawTab = editorTabs.find((t) => t.type === "raw");
      if (rawTab && currentTab.type !== "raw") {
        handleTabChange(rawTab);
      }
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [currentTab, editorTabs, handleTabChange],
  );

  useHotkeys(
    "ctrl+alt+left",
    () => {
      const currentIndex = editorTabs.findIndex(
        (t) =>
          (t.type === "enhanced" &&
            currentTab.type === "enhanced" &&
            t.id === currentTab.id) ||
          (t.type === currentTab.type && t.type !== "enhanced"),
      );
      if (currentIndex > 0) {
        handleTabChange(editorTabs[currentIndex - 1]);
      }
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [currentTab, editorTabs, handleTabChange],
  );

  useHotkeys(
    "ctrl+alt+right",
    () => {
      const currentIndex = editorTabs.findIndex(
        (t) =>
          (t.type === "enhanced" &&
            currentTab.type === "enhanced" &&
            t.id === currentTab.id) ||
          (t.type === currentTab.type && t.type !== "enhanced"),
      );
      if (currentIndex >= 0 && currentIndex < editorTabs.length - 1) {
        handleTabChange(editorTabs[currentIndex + 1]);
      }
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [currentTab, editorTabs, handleTabChange],
  );
}
