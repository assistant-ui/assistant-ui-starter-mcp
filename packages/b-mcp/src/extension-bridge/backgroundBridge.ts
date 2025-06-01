import { type BridgeMessage, type BridgeResponse } from './uiConnector.js';

/**
 * In your background script:
 *   import { setupBackgroundBridge } from '@modelcontextprotocol/sdk/extension-bridge/backgroundBridge'
 *   // Dynamically inject pageBridge and contentScript into matching pages
 *   setupBackgroundBridge({
 *     matches: ['https://your-app.com/*'],
 *     pageBridgeRunAt: 'document_start',
 *     contentScriptRunAt: 'document_idle'
 *   });
 */
export async function setupBackgroundBridge(_?: {
  /** Host-match patterns for injection, defaults to ['<all_urls>'] */
  matches?: string[];
  /** When to inject the pageBridge (MAIN world) */
  pageBridgeRunAt?: 'document_start' | 'document_end' | 'document_idle';
  /** When to inject the content script (ISOLATED world) */
  contentScriptRunAt?: 'document_start' | 'document_end' | 'document_idle';
}): Promise<void> {
  // // Dynamically register content scripts if the scripting API is available (MV3+)
  // if (chrome.scripting?.registerContentScripts) {
  //   const matches = options?.matches ?? ['<all_urls>'];
  //   chrome.scripting.registerContentScripts([{
  //     id: 'mcp-page-bridge',
  //     js: ['extension-bridge/pageBridge.js'],
  //     matches,
  //     runAt: options?.pageBridgeRunAt ?? 'document_start',
  //     world: 'MAIN',
  //     persistAcrossSessions: true
  //   }, {
  //     id: 'mcp-content-script',
  //     js: ['extension-bridge/contentScript.js'],
  //     matches,
  //     runAt: options?.contentScriptRunAt ?? 'document_idle',
  //     world: 'ISOLATED',
  //     persistAcrossSessions: true
  //   }]);
  // }
  let uiPort: chrome.runtime.Port | null = null;
  const csPorts = new Map<number, chrome.runtime.Port>();

  chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'sidebar') {
      uiPort = port;
      port.onMessage.addListener((msg: BridgeMessage) => {
        for (const p of csPorts.values()) p.postMessage(msg);
      });
    } else if (port.name === 'cs') {
      const tabId = port.sender?.tab?.id;
      if (typeof tabId === 'number') {
        csPorts.set(tabId, port);
        port.onMessage.addListener((msg: BridgeResponse) =>
          uiPort?.postMessage(msg)
        );
        port.onDisconnect.addListener(() => csPorts.delete(tabId));
      }
    }
  });
}
