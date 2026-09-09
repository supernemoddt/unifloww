import { NextResponse } from "next/server";
import { serverClient } from "@/lib/server";
import { confirmationDestination } from "@/lib/auth-redirect";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const { error } = await (
      await serverClient()
    ).auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(
          confirmationDestination(
            url.searchParams.get("recovery"),
            url.searchParams.get("next"),
          ),
          url.origin,
        ),
      );
  }
  return NextResponse.redirect(
    new URL("/sign-in?error=confirmation", url.origin),
  );
}
