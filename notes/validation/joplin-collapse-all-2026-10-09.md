# Validation: Joplin Collapse All 1.0.0

Date: 2026-10-09. Target: Joplin Desktop 3.7.21 on macOS with Extra Markdown editor settings 1.11.0. Scope is local installation and synthetic fixtures; public distribution and other platforms are untested.

## Environment and isolation

- Installed app version independently read from /Applications/Joplin.app/Contents/Info.plist and packaged package.json: 3.7.21.
- Installed Extra Markdown editor settings archive manifest: 1.11.0.
- Hardware: Mac16,13, Apple M4, 16 GB RAM, ten cores; macOS 27.0.1 arm64.
- Build/test tools: Node 22.19.0, npm 10.9.3. Actual dependency versions are locked in package-lock.json.
- Actual Joplin walkthrough used /private/tmp/joplin-collapse-all-validation, a separate temporary profile with synthetic notes and no configured synchronization. Both .jpl packages were copied into its plugins directory. The user authorized local-plugin testing and quit their personal instance to permit safe UI targeting.
- Normal profile was not used for test note edits, plugin installation, settings changes, or folding commands. Read-only inspection identified app/plugin versions.
- The temporary instance was quit after validation; normal Joplin was reopened. The test profile remains under /private/tmp for reproducible inspection.
- The loaded temporary-profile index.js, contentScript.js, and manifest.json were byte-identical to the final build.

## Automated test gate

PASS: npm run typecheck, npm test (21 tests across three files), npm run dist, npm run validate-package. No baseline source or test suite existed. Git main has no commits, so history-based comparisons were unavailable. No staging or committing was done.

The tests use real CodeMirror Markdown parsing, EditorState, EditorView, and folding state/services in jsdom. Joplin main-script API calls are mocked only for registration/bridge tests. These tests do not replace the target application walkthrough.

| Acceptance area | Automated evidence | Target Joplin walkthrough |
| --- | --- | --- |
| Four command labels, Tools entries, shortcut configuration | Main registration test; compiled package registration | All four labels visible in Tools and Keyboard Shortcuts; all four invoked from Tools and assigned shortcuts |
| Active editor and unsaved content | Live EditorView and edit-history tests; per-editor isolation | Pasted synthetic note operated on live editor; focused secondary window operated independently |
| Every nested fold level | Existing parent fold plus full range comparison; parent reopened with child still folded | Collapse All; opened Parent, Child remained folded; opened Child, Grandchild remained folded |
| Uncollapse All clears hidden folds | Entire fold-set assertion | All content restored, including code block; repeated invocation stable |
| Heading-only preservation | ATX/Setext and code-range exact preservation tests | Heading unfolding opened headings and Setext, preserved folded code; heading collapse preserved it; when code was open, heading collapse/unfold kept it open |
| Fenced apparent headings excluded | Five genuine heading sections plus code fold expected | Fenced # fake and ## also fake remained code content |
| Idempotence | All four operations repeated with exact fold-set assertions | Repeated heading collapse and all unfolding remained stable; repeated target commands did not toggle |
| Text, selection, undo history | Exact text/selection and undo/redo depth assertions for each operation | Saved fixture bodies byte-identical; an added space after folding was undone normally; cursor was not deliberately moved by commands |
| Empty/no eligible regions | Empty and prose fixtures for all four commands | Empty-note commands returned quietly |
| Unsupported/missing support | Folding absent/removed and unsupported wrapper tests | Missing-folding guidance observed before enabling support; all four Tools commands disabled in Rich Text |
| No separate engine/persistence/telemetry | Source inspection and package host-import assertions | Host Extra editor settings supplied folding; no added persistence behavior exercised |
| Edit/switch/close/supersession cancellation | Controlled editing, same-text noteIdFacet update, destroyed-view and superseding-command tests | Note/window isolation checked. A rapid-edit attempt did not reliably overlap preparation, so it is not claimed as a target-host cancellation stress pass |
| Incomplete preparation and ambiguous folds | Deterministic timeout/absent parse and edited former heading tests | Error/ambiguity paths established in automated tests, not forced in target UI |
| Immediate invocation / parsing | Initial yield, real parser, full-coverage requirement, timeout tests | Commands used after opening/creating notes; exact cold-parser race is not separately instrumented |
| Large-note latency | 10,000-line fixture, 4,000 fold ranges, under two seconds | 10,000-line note collapsed and unfolded within two seconds including input/observation |
| Focused window | Separate editor wrappers operate independently | Secondary window collapsed acceptance note while main window retained open folds; main then showed a different note while secondary unfolded acceptance note |

## Performance

Target chosen before implementation: representative 10,000-line note completes within two seconds. Preparation parsing receives ten-millisecond slice budgets; discovery targets eight-millisecond slices with yields. These are cooperative targets, not hard preemption of an individual host fold service or final dispatch.

Fixture: 1,000 sections, each with parent/child/grandchild headings and a fenced code block. 10,000 lines, 75,669 characters, 4,000 eligible ranges in automated checks.

- Real CodeMirror/jsdom warm-parser collapse measurement: 47.310 ms (command preparation and dispatch; fixture creation/parsing excluded).
- Actual Joplin Collapse All: 702 ms from shortcut input through accessibility observation of folded content.
- Actual Joplin Uncollapse All: 394 ms through observation of restored content.

The Joplin timings include automation/observation overhead and are upper bounds for this walkthrough, not isolated internal CPU timings. Visible fold placeholders reflect the editor viewport, not the total stored fold count. Automated fold-state assertions establish complete counts.

## Text integrity

Read-only queries of the temporary profile's SQLite database compared saved note bodies to the exact strings pasted into the editor. Both matched after operations and after undoing the intentional test edit.

- Nested-heading fixture: 136 characters; SHA-256 6285ee6e1b03e7ebcb3abe3af22ace88067e47ad9221d7f96952d01d6cdfa37c.
- Large fixture: 75,669 characters; SHA-256 2d355f5b04ba2c58e7b869c518470bb3af10b277bd9aa58884f34a55031268f2.

## Design and independent review

Comprehension passed. The design critic required explicit note-identity cancellation, then conservative handling of all unmatched existing folds. Both were addressed. Final design and readiness gates signed off before code edits.

Two independent implementation-review rounds. Round 1 found the official scaffold swallowed packaging failures; webpack.config.js now sets a nonzero exit status. A fault check with tar.create throwing confirmed error propagation without altering the artifact. Round 2 returned no findings. No rebuttals. No pre-existing lint/typecheck/test failures were excluded. No lint tier was configured; type checking, tests, package checks, source review, and actual Joplin UI walkthrough were the required checks.

## Package

publish/io.github.jasonwest.joplin-collapse-all.jpl, 11,776 bytes.

SHA-256: d127a6b0bd147315d254db0a60e642c0997be3fdea320593ab35faff76c35183.

Archive contains manifest.json, index.js, and contentScript.js. The package validator loads both compiled entry points, verifies four labels/Tools registrations, and verifies imports of host @codemirror/view, @codemirror/state, and @codemirror/language. No duplicate CodeMirror engine is bundled. Manifest minimum: 3.7.21. Local tar packaging is the official scaffold format.

## Remaining evidence limits and operator checks

Automated tests cover deliberate pending-work races and failure paths. Those specific races were not deterministically reproduced through native UI automation. Broader compatibility, legacy editors, mobile, other OSes, public-directory publication, and extra persistence remain outside scope.

For installation in a personal profile, follow README.md. Confirm your selected shortcuts have no conflicts and Code folding is enabled. The first release is validated for the specified host plus the synthetic fixtures above; it does not claim testing with every other installed editor plugin.
