"use strict";
const electron = require("electron");
const kovaAPI = {
  openFolder: () => electron.ipcRenderer.invoke("kova:open-folder"),
  sendMessage: (message, history, params) => electron.ipcRenderer.invoke("kova:send-message", message, history, params),
  detectModel: (url) => electron.ipcRenderer.invoke("kova:detect-model", url),
  pause: () => electron.ipcRenderer.invoke("kova:pause"),
  abort: () => electron.ipcRenderer.invoke("kova:abort"),
  forceApply: () => electron.ipcRenderer.invoke("kova:force-apply"),
  getState: () => electron.ipcRenderer.invoke("kova:get-state"),
  getSettings: () => electron.ipcRenderer.invoke("kova:get-settings"),
  saveSettings: (settings) => electron.ipcRenderer.invoke("kova:save-settings", settings),
  onStateUpdate: (cb) => {
    const h = (_, s) => cb(s);
    electron.ipcRenderer.on("kova:state-update", h);
    return () => electron.ipcRenderer.removeListener("kova:state-update", h);
  },
  onTaskStructured: (cb) => {
    const h = (_, t) => cb(t);
    electron.ipcRenderer.on("kova:task-structured", h);
    return () => electron.ipcRenderer.removeListener("kova:task-structured", h);
  },
  onError: (cb) => {
    const h = (_, m) => cb(m);
    electron.ipcRenderer.on("kova:error", h);
    return () => electron.ipcRenderer.removeListener("kova:error", h);
  },
  onModelDetected: (cb) => {
    const h = (_, m) => cb(m);
    electron.ipcRenderer.on("kova:model-detected", h);
    return () => electron.ipcRenderer.removeListener("kova:model-detected", h);
  },
  onChatResponse: (cb) => {
    const h = (_, m) => cb(m);
    electron.ipcRenderer.on("kova:chat-response", h);
    return () => electron.ipcRenderer.removeListener("kova:chat-response", h);
  },
  onExecutionEvent: (cb) => {
    const h = (_, event) => cb(event);
    electron.ipcRenderer.on("kova:execution-event", h);
    return () => electron.ipcRenderer.removeListener("kova:execution-event", h);
  },
  onFileTreeChanged: (cb) => {
    const h = () => cb();
    electron.ipcRenderer.on("kova:file-tree-changed", h);
    return () => electron.ipcRenderer.removeListener("kova:file-tree-changed", h);
  },
  listDir: (dir) => electron.ipcRenderer.invoke("kova:list-dir", dir),
  watchProject: (root) => electron.ipcRenderer.invoke("kova:watch-project", root),
  unwatchProject: () => electron.ipcRenderer.invoke("kova:unwatch-project"),
  readFile: (path) => electron.ipcRenderer.invoke("kova:read-file", path),
  writeFile: (path, content) => electron.ipcRenderer.invoke("kova:write-file", path, content),
  listSessions: (root) => electron.ipcRenderer.invoke("kova:list-sessions", root),
  saveSession: (root, session) => electron.ipcRenderer.invoke("kova:save-session", root, session),
  deleteSession: (root, id) => electron.ipcRenderer.invoke("kova:delete-session", root, id),
  windowMinimize: () => electron.ipcRenderer.send("kova:window-minimize"),
  windowMaximize: () => electron.ipcRenderer.send("kova:window-maximize"),
  windowClose: () => electron.ipcRenderer.send("kova:window-close"),
  platform: process.platform
};
electron.contextBridge.exposeInMainWorld("kova", kovaAPI);
