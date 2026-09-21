import React from "react";
import { ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export const AuthShell: React.FC<AuthShellProps> = ({
  eyebrow,
  title,
  subtitle,
  children,
}) => (
  <main className="auth-page">
    <div className="auth-grid" aria-hidden="true" />
    <div className="auth-orbit auth-orbit-one" aria-hidden="true" />
    <div className="auth-orbit auth-orbit-two" aria-hidden="true" />
    <section className="auth-showcase">
      <a href="/" className="auth-brand">
        <img src="/Logo.png" alt="SmartFin" />
        <span>SmartFin</span>
      </a>
      <div className="auth-showcase-copy">
        <div className="auth-kicker">
          <Sparkles size={15} /> Personal finance, clarified
        </div>
        <h2>
          Make every
          <br />
          <em>money move</em> count.
        </h2>
        <p>
          One calm, intelligent workspace for the decisions behind your numbers.
        </p>
      </div>
      <div className="auth-signal">
        <div className="auth-signal-icon">
          <ShieldCheck size={19} />
        </div>
        <div>
          <strong>Private by design</strong>
          <span>Your financial data stays yours.</span>
        </div>
        <ArrowUpRight size={18} />
      </div>
    </section>
    <section className="auth-form-zone">
      <div className="auth-mobile-brand">
        <img src="/Logo_full.png" alt="SmartFin" />
      </div>
      <div className="auth-heading">
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="auth-card">{children}</div>
    </section>
  </main>
);
