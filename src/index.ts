// Export all hooks and components folders
export * from "./fetch";
export * from "./interval";
export * from "./notification";
export {
  useInitializeConfig,
  useCurrentConfig,
  setCurrentConfig,
  modifyCurrentConfig,
  getCurrentConfig,
} from "./config";

export * from "./module-guard";
export * from "./module-layout";

// Export shared types used across packages
export type { Config, ClientConfig, MagicMirrorModule } from "./types";
