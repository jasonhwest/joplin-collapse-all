# Joplin Collapse All

Four Tools commands for the active CodeMirror 6 Markdown editor:

| Command | Behavior |
| --- | --- |
| Collapse All | Fold every editor-recognized region, including hidden nested children. |
| Uncollapse All | Remove all folds, including hidden nested folds. |
| Collapse Headings Only | Fold parsed ATX and Setext heading sections while preserving other fold states. |
| Uncollapse Headings Only | Remove current heading folds while preserving other folds. |

Target: Joplin Desktop **3.7.21 on macOS**, with **Extra Markdown editor settings 1.11.0** and Code folding enabled. The minimum manifest version is 3.7.21. The four Tools actions and assigned shortcuts were exercised in an isolated installation of this target. Other versions and platforms have not been validated.

## Install

1. In Joplin settings, open Plugins and its advanced options, then select **Install from file**.
2. Select `publish/io.github.jasonwest.joplin-collapse-all.jpl` from this project.
3. Restart Joplin fully.
4. Enable **Code folding** in Extra Markdown editor settings. This companion plugin never enables folding itself.
5. Open a note in the Markdown editor. The four commands appear under Tools.
6. In settings > Keyboard Shortcuts, search each command label and assign a shortcut. There are no defaults.

Opening a collapsed parent leaves its collapsed children folded. Heading-only unfolding may still leave text hidden by a preserved code-block or other non-heading fold.

Commands operate on the live editor, including unsaved text. They do not write note text, add persistence, send network requests, or collect telemetry. They use Joplin's existing CodeMirror modules and fold services. A preparation timeout applies no partial result. A note change, edit, closed editor, or superseding command cancels pending work.

If an old fold no longer matches any current fold-service range, heading-only unfolding preserves it and explains that coverage is incomplete. Use Uncollapse All if you want to clear all old folds. Unsupported editors or missing folding support produce setup guidance.

## Build and verify

Node.js 22.19.0 and npm 10.9.3 were used locally. Dependencies are locked in package-lock.json.

```sh
npm ci
npm run typecheck
npm test
npm run dist
npm run validate-package
```

The official generator-joplin 3.7.2 scaffold supplies API declarations and the build configuration. Its build dependencies have been updated to patched releases. The package validator checks both compiled entry points, host CodeMirror imports, the manifest, menu commands, archive entries, and the published hash.

See [design](notes/designs/joplin-collapse-all-2026-10-09.md) and [validation](notes/validation/joplin-collapse-all-2026-10-09.md) for evidence and remaining limitations. Automated tests are distinct from actual Joplin UI validation.
