import React from "react";

const GOOGLE_AUTH_URL = "http://localhost:8080/oauth2/authorization/google";

export const GoogleLoginButton: React.FC = () => (
  <button
    type="button"
    onClick={() => { window.location.href = GOOGLE_AUTH_URL; }}
    className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#d8e1df] bg-white px-4 py-3 text-sm font-bold text-[#263238] shadow-sm transition hover:border-[#b9c9c5] hover:bg-[#fbfdfc]"
  >
    <span className="flex h-5 w-5 items-center justify-center text-[18px] font-extrabold leading-none" aria-hidden="true">
      <span className="text-[#4285F4]">G</span>
    </span>
    Continue with Google
  </button>
);

export default GoogleLoginButton;