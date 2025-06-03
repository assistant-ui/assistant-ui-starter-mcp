import { mcpRelay } from '@b-mcp/transports';

export default defineContentScript({
  matches: ['<all_urls>'],
  async main(ctx) {
    console.log('Content script loaded');
    mcpRelay();

    await injectScript('/pageBridge.js', {
      keepInDom: true,
    });
  },
});
