import { setupBackgroundBridge } from '@b-mcp/transports';

export default defineBackground({
  persistent: true,
  type: 'module',
  main() {
    setupBackgroundBridge();
    chrome.runtime.onMessage.addListener((message) => {
      // open a global side panel
      chrome.windows.getCurrent((window) =>
        chrome.sidePanel.open({ windowId: window.id ?? -1 })
      );
    });

    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => {
        console.error('[Background] Failed to set side panel behavior:', error);
      });
  },
});
