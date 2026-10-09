import { ContentScriptContext, MarkdownEditorContentScriptModule } from 'api/types';
import { ViewPlugin, ViewUpdate } from '@codemirror/view';
import { commands, editorCommandName, Status } from './commands';
import { runFolding } from './folding';

export default (context: ContentScriptContext): MarkdownEditorContentScriptModule => ({
  plugin: wrapper => {
    if (!wrapper.cm6 || !wrapper.joplinExtensions?.noteIdFacet) return;
    const view = wrapper.editor;
    const noteFacet = wrapper.joplinExtensions.noteIdFacet;
    let generation = 0;
    let destroyed = false;
    wrapper.addExtension(ViewPlugin.fromClass(class {
      update(update: ViewUpdate) {
        if (update.docChanged || update.startState.facet(noteFacet) !== update.state.facet(noteFacet)) generation++;
      }
      destroy() { destroyed = true; generation++; }
    }));
    wrapper.registerCommand('joplinCollapseAll.editor.probe', () => true);
    for (const { operation } of commands) {
      wrapper.registerCommand(editorCommandName(operation), async () => {
        const token = ++generation;
        const note = view.state.facet(noteFacet);
        const guard = { valid: () => !destroyed && generation === token && view.state.facet(noteFacet) === note };
        let status: Status;
        try {
          status = await runFolding(view, operation, guard);
        } catch {
          status = guard.valid() ? 'error' : 'cancelled';
        }
        // Report through the bridge because editor.execCommand return propagation
        // varies by host; no note data is sent.
        if (guard.valid() && status !== 'complete' && status !== 'cancelled') {
          await context.postMessage({ type: 'status', status });
        }
        return status;
      });
    }
  },
});
