import { Transaction, StateEffect } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { foldState, foldedRanges, foldable, foldEffect, unfoldEffect, forceParsing, syntaxTree, syntaxTreeAvailable } from '@codemirror/language';
import { Operation, Status } from './commands';

export interface Guard { valid(): boolean }
export interface Timing {
  now(): number;
  yield(): Promise<void>;
  deadlineMs: number;
  parse(view: EditorView): boolean;
}
const defaults: Timing = {
  now: () => performance.now(),
  yield: () => new Promise(resolve => setTimeout(resolve, 0)),
  deadlineMs: 2000,
  parse: view => forceParsing(view, view.state.doc.length, 10),
};
type Range = { from: number; to: number };
const key = (range: Range) => `${range.from}:${range.to}`;

/** Uses the host fold services, including for lines hidden by a parent fold. */
export async function runFolding(view: EditorView, operation: Operation, guard: Guard, overrides: Partial<Timing> = {}): Promise<Status> {
  const timing = { ...defaults, ...overrides };
  const doc = view.state.doc;
  const deadline = timing.now() + timing.deadlineMs;
  const valid = () => guard.valid() && view.state.doc === doc;
  const ready = () => valid() && view.state.field(foldState, false) !== undefined;
  if (!ready()) return valid() ? 'unsupported' : 'cancelled';
  await timing.yield();
  if (!ready()) return valid() ? 'unsupported' : 'cancelled';

  // Removing all folds needs no syntax parsing and also clears ambiguous old folds.
  if (operation !== 'uncollapseAll') {
    while (!syntaxTreeAvailable(view.state, doc.length)) {
      if (timing.now() >= deadline) return 'incomplete';
      timing.parse(view);
      if (!valid()) return 'cancelled';
      if (syntaxTreeAvailable(view.state, doc.length)) break;
      await timing.yield();
      if (!ready()) return valid() ? 'unsupported' : 'cancelled';
    }
  }
  const headingLines = new Set<number>();
  const ranges = new Map<string, Range>();
  const headings = new Map<string, Range>();
  let sliceStart = timing.now();
  if (operation !== 'uncollapseAll') {
    // Node names come from the parsed Markdown grammar, not note-text matching.
    // Iterate incrementally so the tree traversal itself is also bounded.
    const cursor = syntaxTree(view.state).cursor();
    do {
      if (/^(ATXHeading[1-6]|SetextHeading[12])$/.test(cursor.name)) {
        for (let number = doc.lineAt(cursor.from).number; number <= doc.lineAt(cursor.to).number; number++) {
          headingLines.add(number);
        }
      }
      if (timing.now() >= deadline) return 'incomplete';
      if (timing.now() - sliceStart >= 8) {
        await timing.yield();
        if (!ready()) return valid() ? 'unsupported' : 'cancelled';
        sliceStart = timing.now();
      }
    } while (cursor.next());
    for (let number = 1; number <= doc.lines; number++) {
      const line = doc.line(number);
      const range = foldable(view.state, line.from, line.to);
      if (range && range.from >= 0 && range.to <= doc.length && range.from < range.to) {
        ranges.set(key(range), range);
        if (headingLines.has(number)) headings.set(key(range), range);
      }
      if (timing.now() >= deadline) return 'incomplete';
      if (timing.now() - sliceStart >= 8) {
        await timing.yield();
        if (!ready()) return valid() ? 'unsupported' : 'cancelled';
        sliceStart = timing.now();
      }
    }
  }
  if (!ready()) return valid() ? 'unsupported' : 'cancelled';
  const existing = new Map<string, Range>();
  const foldSnapshot = foldedRanges(view.state);
  const iterator = foldSnapshot.iter();
  while (iterator.value) {
    const range = { from: iterator.from, to: iterator.to };
    existing.set(key(range), range);
    iterator.next();
    if (timing.now() >= deadline) return 'incomplete';
    if (timing.now() - sliceStart >= 8) {
      await timing.yield();
      if (!ready()) return valid() ? 'unsupported' : 'cancelled';
      // Fold-only changes during discovery invalidate the snapshot too.
      if (foldedRanges(view.state) !== foldSnapshot) return 'cancelled';
      sliceStart = timing.now();
    }
  }
  const effects: StateEffect<Range>[] = [];
  let incomplete = false;
  if (operation === 'collapseAll' || operation === 'collapseHeadings') {
    for (const [id, range] of (operation === 'collapseAll' ? ranges : headings)) {
      if (!existing.has(id)) effects.push(foldEffect.of(range));
    }
  } else {
    for (const [id, range] of existing) {
      if (operation === 'uncollapseAll' || headings.has(id)) effects.push(unfoldEffect.of(range));
      else if (!ranges.has(id)) incomplete = true;
    }
  }
  if (!ready()) return valid() ? 'unsupported' : 'cancelled';
  if (timing.now() >= deadline) return 'incomplete';
  if (effects.length) {
    const { scrollTop, scrollLeft } = view.scrollDOM;
    view.dispatch({ effects, annotations: Transaction.addToHistory.of(false) });
    view.scrollDOM.scrollTop = scrollTop;
    view.scrollDOM.scrollLeft = scrollLeft;
  }
  return incomplete ? 'incomplete' : 'complete';
}
