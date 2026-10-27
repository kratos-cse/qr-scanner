/** Pull the stored token out of a check-in URL. A raw token is returned unchanged. */
export function extractScanToken(raw: string): string {
  const value = raw.trim();
  if (!value.includes("token=")) return value;
  try {
    const query = value.includes("://") ? new URL(value).search : value.slice(value.indexOf("?"));
    const token = new URLSearchParams(query).get("token");
    return token?.trim() || value;
  } catch {
    return value;
  }
}
