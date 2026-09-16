export function redactUrl(url: string): { host: string; path: string } {
  try {
    const u = new URL(url);
    return {
      host: u.host,
      path: u.pathname,
    };
  } catch {
    return { host: url, path: "/" };
  }
}
