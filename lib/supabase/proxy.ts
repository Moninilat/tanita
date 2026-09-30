import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeInternalRedirect } from "@/lib/auth/redirect";

const publicRoutes = new Set(["/sign-in", "/auth/callback"]);

function redirectWithCookies(url: URL, response: NextResponse): NextResponse {
  const redirectResponse = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
  return redirectResponse;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const isPublicRoute = publicRoutes.has(request.nextUrl.pathname);

  if (!user && !isPublicRoute) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/sign-in";
    signInUrl.search = "";
    signInUrl.searchParams.set(
      "next",
      safeInternalRedirect(`${request.nextUrl.pathname}${request.nextUrl.search}`),
    );
    return redirectWithCookies(signInUrl, response);
  }

  if (user && isPublicRoute) {
    const destination = safeInternalRedirect(request.nextUrl.searchParams.get("next"));
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = destination.split(/[?#]/, 1)[0] || "/";
    redirectUrl.search = destination.includes("?") ? `?${destination.split("?")[1].split("#")[0]}` : "";
    return redirectWithCookies(redirectUrl, response);
  }

  return response;
}