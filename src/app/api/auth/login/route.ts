import { NextRequest, NextResponse } from "next/server";
import { validateEmailDomain, createSessionToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "이메일 주소를 입력해 주세요." },
        { status: 400 }
      );
    }

    // 1. Validate Email Domain
    const { isValid, domain, allowedDomains } = validateEmailDomain(email);

    if (!isValid) {
      const allowedStr = allowedDomains.map((d) => `@${d}`).join(", ");
      return NextResponse.json(
        {
          success: false,
          error: `허용되지 않은 이메일 도메인입니다. (${allowedStr} 계정만 로그인 가능합니다.)`,
          domain,
        },
        { status: 403 }
      );
    }

    // 2. Validate Password (Simple credentials check or any non-empty password)
    if (!password || String(password).trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "비밀번호를 입력해 주세요." },
        { status: 400 }
      );
    }

    // 3. Create Authenticated User Session Payload
    const userPayload = {
      email: email.trim().toLowerCase(),
      domain,
      loginTime: Date.now(),
    };

    const token = await createSessionToken(userPayload);

    // 4. Set HttpOnly Cookie
    const response = NextResponse.json({
      success: true,
      message: "로그인 성공",
      user: userPayload,
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 Days session duration
    });

    return response;
  } catch (err: any) {
    console.error("Login API Error:", err);
    return NextResponse.json(
      { success: false, error: "로그인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
