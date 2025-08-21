// Re-export main functionality for library usage
export { getDownloadLinkFromShareCode } from './sharecode-handler.js';
export type { DownloadResult } from './sharecode-handler.js';
export {
  InvalidShareCode,
  DecodeShareCodeError,
  NoMatchesFound,
  DownloadLinkExpired,
} from './sharecode-handler.js';