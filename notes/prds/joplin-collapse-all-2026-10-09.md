# PRD: Joplin Collapse All

Status: Approved, including heading-only operations and Joplin 3.7.21 target
Date: 2026-10-09
Depth: Standard
Research scope: Web only
First release: Personal use on Joplin Desktop for macOS

## Executive Summary

Build a companion plugin for Joplin Desktop 3.7.21 on macOS that adds Collapse All and Uncollapse All, plus heading-only variants, to the Tools menu and Joplin's keyboard shortcut settings.

The plugin uses the live Markdown editor's folding behavior enabled by Extra Markdown editor settings v1.11.0. Collapse operations fold every eligible region at every nested level. Uncollapse operations open the relevant folded regions. No operation changes note text or adds fold persistence.

## Problem Statement

The user currently folds heading sections individually and wants accessible commands that apply across the active note, with a choice between all foldable regions and heading sections only.

Extra Markdown editor settings installs CodeMirror's folding shortcuts, but the built-in foldAll command folds only outermost ranges. The proposed plugin adds discoverable Joplin commands, independently collapsed nested regions, and heading-only operations.

Sources: [Existing plugin content script](https://github.com/personalizedrefrigerator/joplin-plugin-extra-editor-settings/blob/main/src/contentScript/contentScript.ts), [CodeMirror folding API](https://codemirror.net/docs/ref/#language.foldAll).

## Target Users

The initial user is the project owner, using Joplin Desktop on macOS. Public distribution may follow after local validation.

## Current State

- The project has no existing source files, tests, or plugin architecture.
- The user reports Joplin 3.7.21 and Extra Markdown editor settings v1.11.0, with heading folding enabled.
- These installed versions are user-reported. Runtime interoperability has not yet been tested.
- Research examined current upstream documentation and source, rather than the installed plugin artifact or a pinned Joplin build.
- The supplied AGENTS.md instructions require accurate, independent, evidence-driven reporting.

## Proposed Solution

Provide four separately configurable commands in the Tools menu:

| Command | Result |
| --- | --- |
| Collapse All | Collapse every editor-recognized foldable region, including nested regions. |
| Uncollapse All | Remove every fold in the active editor. |
| Collapse Headings Only | Collapse every editor-recognized heading section, including nested headings; preserve non-heading fold states. |
| Uncollapse Headings Only | Remove folds associated with heading sections, including nested headings; preserve non-heading fold states. |

Separate commands make the requested scope explicit at invocation and allow a distinct shortcut for each operation. No default shortcut is required; users assign shortcuts through Joplin's settings.

Use a CodeMirror 6 content script connected to the live editor and its existing fold state. Do not simulate clicks, scan the screen, or search the note text for the phrase "Fold line".

Source: [Joplin editor plugin tutorial](https://joplinapp.org/help/api/tutorials/cm6_plugin/).

## Scope

The first release includes Joplin Desktop 3.7.21 on macOS, the CodeMirror 6 Markdown editor, Extra Markdown editor settings v1.11.0 with folding enabled, Tools menu entries, configurable shortcuts, and a locally installable .jpl package with installation instructions.

All-region operations include every region recognized by the editor's folding services, including headings and any other supported foldable blocks. Heading-only operations select parsed Markdown heading sections, including ATX (#-prefixed) and Setext (underlined) headings where the editor supplies a valid fold range. Text resembling a heading inside a fenced code block is not a heading section.

Heading-only unfolding may leave some text hidden by a preserved non-heading fold. That is expected: it removes heading folds without opening unrelated blocks.

## User Stories / Jobs To Be Done

- Collapse a long note into a compact overview with one command.
- Open a parent section while its child sections remain collapsed.
- Restore the entire note with Uncollapse All.
- Fold or unfold heading sections without changing existing code-block or other non-heading folds.
- Assign shortcuts through Joplin's existing shortcut settings.
- Use commands without altering note contents or affecting another note.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| FR1 | Expose the four commands under their stated labels in the Tools menu and Joplin's shortcut settings. |
| FR2 | Operate on the active note in the focused Joplin window, including its current unsaved editor content. |
| FR3 | Collapse All folds every valid foldable range, including children hidden inside already folded parents. |
| FR4 | Uncollapse All removes every existing fold, including hidden nested folds. |
| FR5 | Collapse Headings Only folds every eligible parsed heading section at every level, preserving non-heading fold states. |
| FR6 | Uncollapse Headings Only removes all current heading-section folds, including hidden nested ones, preserving non-heading fold states. |
| FR7 | Use parsed heading classification and the editor's folding definitions. Do not infer headings solely with text matching or define different section boundaries. |
| FR8 | Repeated invocation is harmless and does not toggle already correct states. |
| FR9 | Preserve note text and document edit history. Avoid deliberate cursor movement; retain scroll position where the changed layout permits. |
| FR10 | No eligible regions means a quiet no-op. |
| FR11 | Disable commands in unsupported contexts where possible. If invoked anyway, return safely with a clear explanation. |
| FR12 | Do not install a separate folding engine or enable folding automatically. Explain how to enable required support when unavailable. |
| FR13 | Cancel pending work if the note, editor, or document changes. Never apply ranges calculated for an earlier document. |
| FR14 | Do not report complete success when parsing or range discovery is incomplete. |
| FR15 | Add no persistence behavior. Reopening follows the host editor's existing behavior. |

Sources: [Joplin command API](https://joplinapp.org/api/references/plugin_api/interfaces/command.html), [Menu API](https://joplinapp.org/api/references/plugin_api/classes/joplinviewsmenus.html), [CodeMirror Markdown source](https://github.com/codemirror/lang-markdown/blob/main/src/markdown.ts).

## Non-Functional Requirements

- No note-content writes, network requests, or telemetry.
- Diagnostics exclude note text, titles, and identifiers.
- Parsing and range discovery use bounded work to keep the editor responsive.
- Establish performance targets with representative notes during implementation and record hardware, note sizes, and measured timings.
- Use supported Joplin integration points and compatible host CodeMirror modules.
- Validate Joplin 3.7.21 on macOS with Extra Markdown editor settings v1.11.0. Declare a minimum Joplin version justified by implemented APIs and validation; do not imply broader tested compatibility.

## Success Metrics

Release acceptance requires all four menu commands and assigned shortcuts to work in the target installation. After either collapse command, opening a parent must leave eligible child sections collapsed. Uncollapse All must leave no folded ranges. Heading-only commands must preserve non-heading fold ranges. Note text must remain identical before and after every operation, and repeated commands must remain stable.

Note switching or editing during preparation must not apply stale ranges or affect another document. Representative large-note checks must meet the recorded performance target.

Validation covers nested headings; partially folded notes; ATX and Setext headings; code blocks containing apparent headings; mixed heading and non-heading folds; heading-only operations inside already collapsed parents; empty notes; unsupported editors; immediate invocation after opening a note; and large notes. Include a focused-window check if the target Joplin build supports multiple windows.

## Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| Built-in foldAll skips nested sections | Discover and apply all eligible ranges; verify by reopening parents. |
| Incomplete parsing misses sections | Check parsing coverage, bound preparation, and report inability to complete. |
| Heading-only operations alter unrelated folds | Classify headings using parsed Markdown and test preservation of existing non-heading ranges. |
| Existing folds cannot be confidently classified after document edits | Validate against the current document and fold services; preserve ambiguous folds in heading-only operations and report a limitation when complete coverage cannot be established. |
| Deferred work targets a changed document | Revalidate editor and document identity before applying effects. |
| Duplicate CodeMirror modules break integration | Follow Joplin's documented host-module build approach. |
| Upstream source differs from the installed build | Validate against the reported target installation. |

Sources: [CodeMirror folding API](https://codemirror.net/docs/ref/#language.foldAll), [Joplin editor tutorial](https://joplinapp.org/help/api/tutorials/cm6_plugin/), [Workspace API](https://joplinapp.org/api/references/plugin_api/classes/joplinworkspace.html).

## Implementation Hints

Use TypeScript and Joplin's plugin scaffold. Register uniquely named editor commands through a CodeMirror content script and invoke them through editor.execCommand.

For collapse operations, inspect the live document through the editor's folding services and apply fold effects for every eligible range. Stock foldAll alone does not satisfy the nested requirement. Heading-only operations require parsed heading classification and current fold-range inspection. Preserve unrelated folds without first unfolding everything.

Evaluate standard unfoldAll for the all-region operation. Use targeted unfold effects for heading-only unfolding. Share the host editor's folding state and packages. Check behavior when the cursor lies inside a range being folded; do not move the cursor merely to force a collapse.

These are implementation directions, subject to a prototype and integration checks, rather than claims of runtime verification.

Sources: [Folding services and effects](https://codemirror.net/docs/ref/#language.foldable), [CodeMirror folding source](https://github.com/codemirror/language/blob/main/src/fold.ts), [Joplin tutorial](https://joplinapp.org/help/api/tutorials/cm6_plugin/).

## Open Questions

All eight product gaps were addressed. Remaining implementation validation details are representative note sizes, acceptable measured latency, the final minimum supported Joplin version, and reliable classification of edited existing heading folds. The installed Joplin target is now specified as 3.7.21. No release deadline was specified.

## Sources & References

Research covered three lenses: existing capabilities and prior art; technical integration; and UX, reliability, and performance. Primary sources are linked alongside findings and requirements. Upstream main-branch links may change and do not establish compatibility with the installed artifact; implementation should record the versions actually tested.

## Out-of-Scope Follow-Ups

Public plugin-directory submission; Windows, Linux, and mobile support; legacy editors; toolbar buttons; heading-depth selection; automatic folding on note open; and additional fold persistence.

## Implementation Handoff

Use $eg-new-feature to build the Joplin Collapse All plugin described in notes/prds/joplin-collapse-all-2026-10-09.md. Target Joplin Desktop 3.7.21 on macOS with Extra Markdown editor settings v1.11.0. Provide Collapse All, Uncollapse All, Collapse Headings Only, and Uncollapse Headings Only in the Tools menu and configurable keyboard shortcuts. Collapse every eligible nested level, preserve non-heading folds during heading-only operations, use the live editor's existing fold state, leave note text unchanged, and add no persistence or telemetry. Deliver a locally installable .jpl and validate the PRD's acceptance criteria, keeping automated checks distinct from operator-confirmed target-installation results.
