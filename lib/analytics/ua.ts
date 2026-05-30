import { UAParser } from "ua-parser-js";

export type ParsedUserAgent = {
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  deviceType: "desktop" | "mobile" | "tablet";
};

export function parseUserAgent(userAgent: string | null): ParsedUserAgent {
  if (!userAgent) {
    return {
      browser: null,
      browserVersion: null,
      os: null,
      deviceType: "desktop",
    };
  }

  const parser = new UAParser(userAgent);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();

  let deviceType: ParsedUserAgent["deviceType"] = "desktop";
  if (device.type === "mobile") deviceType = "mobile";
  else if (device.type === "tablet") deviceType = "tablet";

  return {
    browser: browser.name ?? null,
    browserVersion: browser.version ?? null,
    os: os.name ?? null,
    deviceType,
  };
}
