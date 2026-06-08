import type { CmAssistantApi } from '../../electron/preload';

declare global {
  interface Window {
    cmAssistant: CmAssistantApi;
  }
}

export {};
