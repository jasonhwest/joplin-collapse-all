import { expect, it, vi } from 'vitest';
const host=vi.hoisted(()=>({plugins:{register:vi.fn()},contentScripts:{register:vi.fn(),onMessage:vi.fn()},commands:{register:vi.fn(),execute:vi.fn(async()=>true)},views:{menuItems:{create:vi.fn()},dialogs:{showMessageBox:vi.fn()}}}));
vi.mock('api',()=>({default:host}));

import { commands, commandName, editorCommandName } from '../src/commands';
it('exposes four labeled shortcut commands and Tools menu entries',async()=>{
  await import('../src/index');
  await host.plugins.register.mock.calls[0][0].onStart();
  expect(host.contentScripts.register).toHaveBeenCalledWith('codeMirrorPlugin','joplinCollapseAll.editor','./contentScript.js');
  expect(host.commands.register).toHaveBeenCalledTimes(4);
  for(const {operation,label} of commands){
    const registered=host.commands.register.mock.calls.find(([c])=>c.name===commandName(operation))![0];
    expect(registered.label).toBe(label);expect(registered).not.toHaveProperty('accelerator');
    expect(host.views.menuItems.create).toHaveBeenCalledWith(`${commandName(operation)}.menu`,commandName(operation),'tools');
    await registered.execute();
    expect(host.commands.execute).toHaveBeenCalledWith('editor.execCommand',{name:editorCommandName(operation),args:[]});
  }
  host.commands.execute.mockResolvedValueOnce(undefined as never);
  await host.commands.register.mock.calls[0][0].execute();
  expect(host.views.dialogs.showMessageBox).toHaveBeenCalledTimes(1);
});
