import { NextRequest, NextResponse } from "next/server";
import { validateEmailDomain, createSessionToken, COOKIE_NAME } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/callback/google`;
  const loginUrl = new URL("/login", origin);

  if (error || !code) {
    loginUrl.searchParams.set("error", "google_cancel");
    return NextResponse.redirect(loginUrl);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    loginUrl.searchParams.set("error", "missing_config");
    return NextResponse.redirect(loginUrl);
  }

  try {
    // 1. Exchange OAuth code for Google access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Google Token Exchange Error:", tokenData);
      loginUrl.searchParams.set("error", "token_exchange_failed");
      return NextResponse.redirect(loginUrl);
    }

    // 2. Fetch authenticated Google User Profile
    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userRes.json();
    const email = userData.email;

    if (!userRes.ok || !email) {
      loginUrl.searchParams.set("error", "user_info_failed");
      return NextResponse.redirect(loginUrl);
    }

    // 3. Validate Email Domain (@gurucompany.co.kr or @avatye.com)
    const { isValid, domain, allowedDomains } = validateEmailDomain(email);

    if (!isValid) {
      console.warn(`Unauthorized domain login attempt: ${email} (Domain: ${domain})`);
      loginUrl.searchParams.set("error", "domain_not_allowed");
      loginUrl.searchParams.set("unauthorized_email", email);
      return NextResponse.redirect(loginUrl);
    }

    // 4. Create Authenticated User Session
    const userPayload = {
      email: email.trim().toLowerCase(),
      domain,
      loginTime: Date.now(),
    };

    const sessionToken = await createSessionToken(userPayload);

    // 5. Set HttpOnly Cookie & Redirect to Dashboard Main
    const dashboardMainUrl = new URL("/", origin);
    const response = NextResponse.redirect(dashboardMainUrl);

    response.cookies.set({
      name: COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 Days session
    });

    return response;
  } catch (err: any) {
    console.error("Google OAuth Callback Error:", err);
    loginUrl.searchParams.set("error", "server_error");
    return NextResponse.redirect(loginUrl);
  }
}
