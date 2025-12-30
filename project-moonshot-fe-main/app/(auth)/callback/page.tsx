"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");

    if (accessToken && refreshToken) {
      // 1. 토큰 저장
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);

      toast.success("소셜 로그인 성공!");
      
      // 2. 메인 페이지로 이동 (잠시 후)
      router.push("/");
    } else {
      const error = searchParams.get("error");
      if (error) {
        toast.error("로그인 실패");
        router.push("/login");
      }
    }
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p>로그인 완료 중입니다...</p>
    </div>
  );
}