export const commands = [
  { operation: 'collapseAll', label: 'Collapse All' },
  { operation: 'uncollapseAll', label: 'Uncollapse All' },
  { operation: 'collapseHeadings', label: 'Collapse Headings Only' },
  { operation: 'uncollapseHeadings', label: 'Uncollapse Headings Only' },
] as const;
export type Operation = typeof commands[number]['operation'];
export const commandName = (operation: Operation) => `joplinCollapseAll.${operation}`;
export const editorCommandName = (operation: Operation) => `joplinCollapseAll.editor.${operation}`;
export type Status = 'complete' | 'cancelled' | 'unsupported' | 'incomplete' | 'error';
export const messages: Partial<Record<Status, string>> = {
  unsupported: 'Collapse All requires the CodeMirror 6 Markdown editor and existing folding support. Enable Code folding in Extra Markdown editor settings, then try again.',
  incomplete: 'Collapse All could not establish complete folding coverage. Preparation may have reached its time limit, or existing folds may no longer match the current document. Unclassified folds were preserved. Try again after parsing finishes, or use Uncollapse All to clear old folds.',
  error: 'Collapse All could not complete this operation. Switch to the Markdown editor and try again. If it continues, restart Joplin and check that both plugins are enabled.',
};
