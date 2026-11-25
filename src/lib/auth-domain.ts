/** 許可するメールドメイン（既定: reiro.co.jp）。proxy / サーバー / クライアントで共通に使う。 */
export const ALLOWED_EMAIL_DOMAIN = (
  process.env.ALLOWED_EMAIL_DOMAIN ??
  process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN ??
  "reiro.co.jp"
).toLowerCase();

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  return email.slice(at + 1).toLowerCase() === ALLOWED_EMAIL_DOMAIN;
}
