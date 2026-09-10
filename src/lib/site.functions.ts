import { createServerFn } from "@tanstack/react-start";

import { DEFAULT_SITE_CONFIG, type SiteConfig } from "./site-config";

export const getSiteConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteConfig> => {
    try {
      const { readSiteConfig } = await import("./site.server");
      return await readSiteConfig();
    } catch {
      return DEFAULT_SITE_CONFIG;
    }
  },
);
