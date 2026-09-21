import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import auth from "../services/auth";
import { toast } from "../services/notifications";

export const OAuth2Redirect: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const refreshToken = searchParams.get("refreshToken");
    if (!token) {
      toast.error("Google sign-in could not be completed.");
      navigate("/login", { replace: true });
      return;
    }

    auth.completeOAuthLogin(token, refreshToken || undefined);
    toast.success("Signed in successfully");
    navigate("/overview", { replace: true });
  }, [navigate, searchParams]);

  return <div className="flex min-h-screen items-center justify-center text-sm font-semibold text-[#71808c]">Signing you in...</div>;
};

export default OAuth2Redirect;