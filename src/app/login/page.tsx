"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LoginContent() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const unauthorizedEmail = searchParams.get("unauthorized_email");

  const allowedDomains = ["gurucompany.co.kr", "avatye.com"];

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google/login";
  };

  return (
    <div className="w-full max-w-[380px]">
      {/* Brand Header */}
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold tracking-tight text-[#191f28] font-sans">
          하루스토리 대시보드
        </h1>
        <p className="text-xs text-[#8b95a1] mt-1 font-medium">
          사내 구글 계정 보안 로그인
        </p>
      </div>

      {/* Main Card Container */}
      <div className="bg-white rounded-2xl p-6 border border-[#e5e8eb] shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        {/* Access Restriction Badge */}
        <div className="mb-5 text-center">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#f0f6ff] text-[#1b64da] text-xs font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#3182f6] animate-pulse"></span>
            <span>사전 승인 이메일 전용 로그인</span>
          </div>
        </div>

        {/* Error Alert Box */}
        {errorParam === "domain_not_allowed" && (
          <div className="mb-5 p-3.5 rounded-xl bg-[#fff5f5] border border-[#fee2e2] text-[#f04452] text-xs font-semibold leading-relaxed animate-fade-in">
            ⚠️ 접근 권한이 없는 이메일 계정입니다.
            {unauthorizedEmail && (
              <div className="text-[11px] font-normal text-[#e11d48] mt-0.5 truncate">
                ({unauthorizedEmail})
              </div>
            )}
            <div className="text-[11px] font-normal text-[#6b7684] mt-1">
              대시보드 허용 목록에 등록된 지정 이메일 계정으로 로그인해 주세요.
            </div>
          </div>
        )}

        {errorParam && errorParam !== "domain_not_allowed" && (
          <div className="mb-5 p-3 rounded-xl bg-[#fff5f5] border border-[#fee2e2] text-[#f04452] text-xs font-semibold">
            구글 인증 중 오류가 발생했습니다. 다시 시도해 주세요.
          </div>
        )}

        {/* Official Google Login Button */}
        <button
          onClick={handleGoogleLogin}
          type="button"
          className="w-full py-3 px-4 bg-white hover:bg-[#f8f9fa] border border-[#dadce0] hover:border-[#d2d4d7] rounded-xl text-xs font-bold text-[#3c4043] transition-all cursor-pointer flex items-center justify-center gap-3 shadow-2xs hover:shadow-xs active:scale-[0.99]"
        >
          {/* Official Google Multi-Color SVG Logo Icon */}
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Google 계정으로 로그인</span>
        </button>
      </div>

      <div className="mt-4 text-center text-[11px] text-[#8b95a1]">
        GURU COMPANY Enterprise SSO
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#f2f4f6] flex items-center justify-center p-4 font-sans text-[#191f28]">
      <Suspense fallback={<div className="text-xs text-[#8b95a1]">로딩 중...</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
