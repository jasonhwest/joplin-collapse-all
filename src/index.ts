import joplin from 'api';
import { ContentScriptType, MenuItemLocation } from 'api/types';
import { commands, commandName, editorCommandName, messages, Status } from './commands';

joplin.plugins.register({
  onStart: async () => {
    const scriptId = 'joplinCollapseAll.editor';
    await joplin.contentScripts.onMessage(scriptId, async (message: unknown) => {
      if (!message || typeof message !== 'object') return;
      const value = message as { type?: string; status?: Status };
      if (value.type === 'status' && value.status && messages[value.status]) {
        await joplin.views.dialogs.showMessageBox(messages[value.status]!);
      }
    });
    await joplin.contentScripts.register(ContentScriptType.CodeMirrorPlugin, scriptId, './contentScript.js');
    for (const { operation, label } of commands) {
      const name = commandName(operation);
      await joplin.commands.register({
        name, label,
        enabledCondition: 'oneNoteSelected && markdownEditorPaneVisible && !noteIsReadOnly',
        execute: async () => {
          try {
            // Probe the focused editor first. Unknown commands can silently return
            // undefined in Joplin, so use an explicit supported probe.
            const result = await joplin.commands.execute('editor.execCommand', {
              name: 'joplinCollapseAll.editor.probe', args: [],
            });
            if (result !== true) {
              await joplin.views.dialogs.showMessageBox(messages.unsupported!);
              return;
            }
            await joplin.commands.execute('editor.execCommand', { name: editorCommandName(operation), args: [] });
          } catch {
            await joplin.views.dialogs.showMessageBox(messages.error!);
          }
        },
      });
      await joplin.views.menuItems.create(`${name}.menu`, name, MenuItemLocation.Tools);
    }
  },
});
