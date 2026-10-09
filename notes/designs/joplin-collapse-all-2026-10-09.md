# Design: Joplin Collapse All

Approved PRD: ../prds/joplin-collapse-all-2026-10-09.md. Implementation target: Joplin Desktop 3.7.21 on macOS, Extra Markdown editor settings 1.11.0, CodeMirror 6.

## Why and scope

Expose Collapse All, Uncollapse All, Collapse Headings Only, and Uncollapse Headings Only in Tools and Keyboard Shortcuts. Fold every nested level in the live unsaved document. No text edits, deliberate selection movement, network, telemetry, automatic folding, or added persistence.

## Surfaces and interfaces

- src/commands.ts: operation names, public/editor names, fixed status messages.
- src/index.ts: Joplin commands, Tools entries, supported-context conditions, editor.execCommand bridge, fixed message dialogs.
- src/contentScript.ts: wrapper command registration, per-view lifecycle cancellation. Uses wrapper.editor and joplinExtensions.noteIdFacet. An explicit probe distinguishes a loaded supported editor from an unknown command that silently returns undefined.
- src/folding.ts: runFolding(EditorView, Operation, Guard, Partial<Timing>) returns complete, cancelled, unsupported, or incomplete. The wrapper catches errors and reports error. Timing injection supports deterministic deadline/cancellation tests.
- Official generator-joplin 3.7.2 API declarations and webpack scaffold. CodeMirror modules remain external in the content-script bundle. Manifest minimum 3.7.21 is conservative; broader compatibility is unclaimed.
- tests/: real CodeMirror DOM tests and mocked Joplin registration. scripts/validate-package.cjs inspects and executes the packaged bundles with a minimal host stub.

## UX

Tools > one of the four commands. Users may assign each command a distinct shortcut through Joplin settings. No default shortcuts. No regions is a quiet no-op. Missing folding support explains how to enable Code folding in Extra Markdown editor settings. Incomplete preparation or ambiguous folds produce a fixed explanation. Cancellation is quiet.

## Folding and classification

Require the host's existing foldState; never add codeFolding or a parser. Require full syntax coverage for discovery. Query foldable(state, line.from, line.to) for every line, including lines hidden by parents. Deduplicate exact ranges. Classify lines covered by parsed ATXHeading1..6 and SetextHeading1..2 nodes, using host fold services for boundaries. Setext folding starts on the title line in the tested service, so classification covers all lines of the parsed heading node.

Collapse dispatches every missing eligible range in one transaction, preserving existing folds. All unfolding enumerates all existing folds including hidden nested ranges, without parsing. Heading unfolding removes exact heading range matches and preserves exact non-heading matches. Any unmatched existing fold is preserved and causes an incomplete result, including former headings edited into prose.

## Lifecycle and work limits

A lightweight ViewPlugin observes docChanged, note identity changes, and destruction. A newer operation supersedes pending work. Snapshot doc, noteIdFacet, and generation; validate immediately before dispatch without an intervening await. The installed Joplin useSyncEditorValue.ts updates note identity even on same-content switches, avoiding document-equality ambiguity. Missing note facet is unsupported.

Initial yield permits queued switching/editing. forceParsing receives a 10 ms slice budget; yield between slices and require syntaxTreeAvailable through document end. Traverse syntax nodes and query lines incrementally with an 8 ms slice target. Shared preparation deadline is two seconds. Timeout applies no partial result. Preserve text and selection, annotate effects addToHistory false, restore scroll coordinates where the new layout permits. Existing folds are collected at the end to avoid overriding user fold changes during discovery.

## Verification

Real CodeMirror tests cover nested parent reopening, ATX and Setext, fenced apparent headings, non-heading preservation, hidden children, idempotence, unsaved text, selection and undo history, unsupported folding, no-op notes, ambiguous edited folds, parse/discovery timeouts, removal of folding support, editing cancellation, same-text note changes, supersession, destroyed views, and per-editor isolation. Mock tests cover Tools/shortcut registration. Package validation checks tar entries, manifest, bundle exports, host-module imports, labels, Tools locations, and SHA-256.

Representative performance target: 10,000 lines under two seconds for command preparation plus dispatch, with hardware, fixture size, fold counts, and timing recorded. Parsing/discovery slice budgets are targets, not hard preemption of host functions. Separate actual Joplin menu/shortcut/editor and focused-window checks from automated results.

## Design checks

Pass A: comprehension passed. First critic found missing note-identity cancellation; revised to host noteIdFacet identity plus view lifecycle. Next critic found edited former headings could evade ambiguity detection; revised to classify against all current ranges and preserve/report every unmatched fold. Final critic: design ready. Final readiness: implementation ready. No rebuttals. Both gates closed before code edits.

## Follow-ups outside scope

Public distribution, other operating systems, mobile, legacy editors, toolbar buttons, depth controls, automatic folding, and persistence.
