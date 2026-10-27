/** Ignore the same QR while it stays in frame. A new token, or an explicit reset, may submit again. */
export function shouldSubmitToken(token: string, lastToken: string | null, locked: boolean): boolean {
  const value = token.trim();
  if (!value || locked) return false;
  if (lastToken && value === lastToken) return false;
  return true;
}
