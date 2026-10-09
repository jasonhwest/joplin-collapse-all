import { afterEach, expect, it, vi } from 'vitest';
import { EditorState, Facet, StateEffect, StateField } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { codeFolding, foldedRanges } from '@codemirror/language';
import contentScript from '../src/contentScript';
import { commands, editorCommandName } from '../src/commands';
const noteEffect=StateEffect.define<string>();
const noteFacet=Facet.define<string,string>({combine:values=>values[0]??''});
const noteField=StateField.define({create:()=> 'a',update:(value,tr)=>tr.effects.reduce((v,e)=>e.is(noteEffect)?e.value:v,value),provide:f=>noteFacet.from(f)});
const views:EditorView[]=[];
function setup() {
  const view=new EditorView({parent:document.body,state:EditorState.create({doc:'# Parent\nbody\n## Child\nchild body',extensions:[markdown(),codeFolding(),noteField]})});views.push(view);
  const registered=new Map<string,(...args:unknown[])=>unknown>();const postMessage=vi.fn(async()=>undefined);
  contentScript({contentScriptId:'test',pluginId:'test',postMessage}).plugin({editor:view,cm6:view,joplinExtensions:{noteIdFacet:noteFacet},addExtension:(extension:unknown)=>view.dispatch({effects:StateEffect.appendConfig.of(extension as never)}),registerCommand:(name:string,fn:(...args:unknown[])=>unknown)=>registered.set(name,fn)} as never);
  return {view,registered,postMessage};
}
afterEach(()=>{views.splice(0).forEach(v=>v.destroy())});
it('registers all four commands separately for each editor',async()=>{
  const a=setup(),b=setup();
  for(const command of commands)expect(a.registered.has(editorCommandName(command.operation))).toBe(true);
  expect(a.registered.get('joplinCollapseAll.editor.probe')!()).toBe(true);
  await a.registered.get(editorCommandName('collapseAll'))!();
  expect(foldedRanges(a.view.state).size).toBe(2);
  expect(foldedRanges(b.view.state).size).toBe(0);
});
it('cancels on a same-text note switch',async()=>{
  const {view,registered,postMessage}=setup();
  const pending=registered.get(editorCommandName('collapseAll'))!();
  view.dispatch({effects:noteEffect.of('b')});
  expect(await pending).toBe('cancelled');
  expect(foldedRanges(view.state).size).toBe(0);
  expect(postMessage).not.toHaveBeenCalled();
});
it('cancels a superseded command',async()=>{
  const {view,registered}=setup();
  const first=registered.get(editorCommandName('collapseAll'))!();
  const second=registered.get(editorCommandName('uncollapseAll'))!();
  expect(await first).toBe('cancelled');expect(await second).toBe('complete');
  expect(foldedRanges(view.state).size).toBe(0);
});
it('cancels destroyed editors',async()=>{
  const {view,registered}=setup();
  const pending=registered.get(editorCommandName('collapseAll'))!();view.destroy();
  expect(await pending).toBe('cancelled');
});
it('leaves unsupported wrappers unchanged',()=>{
  const registerCommand=vi.fn(),addExtension=vi.fn();
  contentScript({postMessage:vi.fn()} as never).plugin({cm6:undefined,registerCommand,addExtension} as never);
  expect(registerCommand).not.toHaveBeenCalled();expect(addExtension).not.toHaveBeenCalled();
});
