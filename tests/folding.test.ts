import { afterEach, describe, expect, it } from 'vitest';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { codeFolding, foldable, foldedRanges, foldEffect, unfoldEffect, forceParsing } from '@codemirror/language';
import { history, undo, undoDepth, redoDepth } from '@codemirror/commands';
import { runFolding } from '../src/folding';
import { Operation } from '../src/commands';
const views: EditorView[] = [];
const fixture = '# Parent\nintro\n## Child\nchild body\n### Grandchild\ngrand body\n\n```md\n# fake\n## also fake\n```\n\nSetext\n------\nsetext body\n\n# Next\nlast body';
function editor(doc = fixture, folding = true) {
  const view = new EditorView({ parent: document.body, state: EditorState.create({ doc, extensions: [markdown(), history(), ...(folding ? [codeFolding()] : [])] }) });
  views.push(view);
  forceParsing(view, view.state.doc.length, 1000);
  return view;
}
function folds(view: EditorView) {
  const result: { from: number; to: number }[] = [];
  foldedRanges(view.state).between(0, view.state.doc.length, (from, to) => { result.push({ from, to }); });
  return result.sort((a,b) => a.from-b.from);
}
function eligible(view: EditorView) {
  const result: { from: number; to: number }[] = [];
  for (let n = 1; n <= view.state.doc.lines; n++) {
    const line = view.state.doc.line(n), range = foldable(view.state, line.from, line.to);
    if (range) result.push(range);
  }
  return result.sort((a,b) => a.from-b.from);
}
const run = (view: EditorView, op: Operation) => runFolding(view, op, { valid: () => true });
afterEach(() => { for (const view of views.splice(0)) view.destroy(); });

describe('real CodeMirror folding', () => {
  it('folds hidden nested children, and opening parent keeps children folded', async () => {
    const view = editor(), all = eligible(view), parent = all[0];
    view.dispatch({ effects: foldEffect.of(parent) });
    expect(await run(view, 'collapseAll')).toBe('complete');
    expect(folds(view)).toEqual(all.sort((a,b) => a.from-b.from));
    view.dispatch({ effects: unfoldEffect.of(parent) });
    expect(folds(view)).toContainEqual(all[1]);
    expect(await run(view, 'uncollapseAll')).toBe('complete');
    expect(folds(view)).toEqual([]);
  });
  it('selects ATX and Setext parsed headings and preserves code folds', async () => {
    const view = editor(), codeLine = view.state.doc.line(8), code = foldable(view.state, codeLine.from, codeLine.to)!;
    view.dispatch({ effects: foldEffect.of(code) });
    expect(await run(view, 'collapseHeadings')).toBe('complete');
    expect(folds(view)).toHaveLength(6); // five genuine headings plus code
    expect(folds(view)).toContainEqual(code);
    expect(await run(view, 'uncollapseHeadings')).toBe('complete');
    expect(folds(view)).toEqual([code]);
  });
  it('heading-only collapse leaves non-heading blocks open and works inside folded parents', async () => {
    const view = editor();
    view.dispatch({ effects: foldEffect.of(eligible(view)[0]) });
    await run(view, 'collapseHeadings');
    const child = foldable(view.state, view.state.doc.line(3).from, view.state.doc.line(3).to)!;
    expect(folds(view)).toHaveLength(5);
    expect(folds(view)).toContainEqual(child);
    await run(view, 'uncollapseHeadings');
    expect(folds(view)).toEqual([]);
  });
  it.each(['collapseAll','uncollapseAll','collapseHeadings','uncollapseHeadings'] as Operation[])('%s is stable and preserves text, selection and edit history', async op => {
    const view = editor();
    view.dispatch({ changes: { from: view.state.doc.length, insert: '\nunsaved' }, selection: { anchor: 10 } });
    const before = view.state.doc.toString(), selection = view.state.selection.toJSON(), depths = [undoDepth(view.state), redoDepth(view.state)];
    await run(view, 'collapseAll');
    await run(view, op);
    const first = folds(view);
    await run(view, op);
    expect(folds(view)).toEqual(first);
    expect(view.state.doc.toString()).toBe(before);
    expect(view.state.selection.toJSON()).toEqual(selection);
    expect([undoDepth(view.state), redoDepth(view.state)]).toEqual(depths);
    expect(undo(view)).toBe(true);
    expect(view.state.doc.toString()).toBe(fixture);
  });
  it('empty and no eligible regions are quiet no-ops', async () => {
    for (const text of ['', 'ordinary text']) {
      const view = editor(text);
      for (const op of ['collapseAll','uncollapseAll','collapseHeadings','uncollapseHeadings'] as Operation[]) expect(await run(view,op)).toBe('complete');
      expect(folds(view)).toEqual([]);
    }
  });
  it('does not enable absent folding support', async () => {
    const view = editor(fixture, false);
    expect(await run(view,'collapseAll')).toBe('unsupported');
    expect(folds(view)).toEqual([]);
  });
  it('preserves unclassifiable former heading folds and reports incomplete', async () => {
    const view = editor();
    await run(view,'collapseHeadings');
    view.dispatch({ changes: { from: 0, to: 2, insert: '  ' } });
    const before = folds(view)[0];
    expect(await run(view,'uncollapseHeadings')).toBe('incomplete');
    expect(folds(view)).toContainEqual(before);
    expect(await run(view,'uncollapseAll')).toBe('complete');
    expect(folds(view)).toEqual([]);
  });
  it('cancels after editing during preparation without folding new text', async () => {
    const view = editor();
    const status = await runFolding(view,'collapseAll',{valid:()=>true},{yield:async()=>{view.dispatch({changes:{from:0,insert:'new'}})}});
    expect(status).toBe('cancelled');
    expect(folds(view)).toEqual([]);
  });
  it('applies no partial effects on discovery timeout', async () => {
    const view = editor();let tick=0;
    expect(await runFolding(view,'collapseAll',{valid:()=>true},{now:()=>tick++,deadlineMs:3})).toBe('incomplete');
    expect(folds(view)).toEqual([]);
  });
  it('reports incomplete when parsing cannot finish', async () => {
    const view = new EditorView({ parent: document.body, state: EditorState.create({doc:fixture,extensions:[codeFolding()]}) }); views.push(view);
    let tick=0;
    expect(await runFolding(view,'collapseHeadings',{valid:()=>true},{now:()=>tick++,parse:()=>false,deadlineMs:4})).toBe('incomplete');
    expect(folds(view)).toEqual([]);
  });
  it('returns unsupported if folding is removed during preparation', async () => {
    const compartment=new Compartment();
    const view=new EditorView({parent:document.body,state:EditorState.create({doc:fixture,extensions:[markdown(),compartment.of(codeFolding())]})});views.push(view);
    expect(await runFolding(view,'collapseAll',{valid:()=>true},{yield:async()=>view.dispatch({effects:compartment.reconfigure([])})})).toBe('unsupported');
  });
  it('meets the 10,000-line preparation target', async () => {
    const doc=Array.from({length:1000},(_,i)=>`# Section ${i}\nbody\n## Child ${i}\nchild\n### Grandchild ${i}\ntext\n\n\`\`\`\ncode\n\`\`\``).join('\n');
    const view=editor(doc);const start=performance.now();
    expect(await run(view,'collapseAll')).toBe('complete');
    const elapsed=performance.now()-start;
    console.info(JSON.stringify({test:'large-note',lines:view.state.doc.lines,characters:doc.length,folds:folds(view).length,elapsedMs:elapsed}));
    expect(elapsed).toBeLessThan(2000);
    expect(folds(view)).toHaveLength(4000);
  });
});
