import {
    NextRequest,
    NextResponse,
  } from "next/server";
  
  const supportedLocales = new Set([
    "en",
    "fr",
    "es",
    "ar",
  ]);
  
  export function GET(
    request: NextRequest,
  ) {
    const locale =
      request.nextUrl.searchParams.get(
        "locale",
      );
  
    const redirect =
      request.nextUrl.searchParams.get(
        "redirect",
      ) ?? "/";
  
    if (
      !locale ||
      !supportedLocales.has(locale)
    ) {
      return NextResponse.redirect(
        new URL("/", request.url),
      );
    }
  
    const safeRedirect =
      redirect.startsWith("/") &&
      !redirect.startsWith("//")
        ? redirect
        : "/";
  
    const response =
      NextResponse.redirect(
        new URL(
          safeRedirect,
          request.url,
        ),
      );
  
    response.cookies.set(
      "ENORSIS_LOCALE",
      locale,
      {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
      },
    );
  
    return response;
  }