/** Only invitation paths can be restored after email confirmation. */
export function confirmationDestination(
  recovery: string | null,
  next: string | null,
) {
  if (recovery === "true") return "/reset-password";
  return next && /^\/join\/[A-Za-z0-9-]{1,128}$/.test(next) ? next : "/";
}
