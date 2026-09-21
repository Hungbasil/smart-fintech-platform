import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, CircleHelp, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import auth from '../services/auth';
import { getOnboardingState, saveOnboardingState } from '../services/onboarding';

type OnboardingTourProps = {
  forceStart: number;
  onForceStartHandled: () => void;
};

type TourStep = {
  selector: string;
  title: string;
  description: string;
  path?: string;
};

const steps: TourStep[] = [
  { selector: '[data-tour="navigation"]', title: 'Your finance workspace', description: 'Use the navigation to move between your overview, transactions, wallets and planning tools.' },
  { selector: '[data-tour="dashboard-summary"]', title: 'Start with your snapshot', description: 'The overview brings together your balances, monthly activity and recent financial movement.' },
  { selector: '[data-tour="dashboard-activity"]', title: 'See the bigger picture', description: 'The activity chart and recent transactions help you spot changes without digging through every record.' },
  { selector: '[data-tour="quick-add"]', title: 'Capture a transaction anywhere', description: 'Use Quick Add from the header or press Ctrl/Cmd + K to record a transaction without leaving your current page.', path: '/overview' },
  { selector: '[data-tour="transactions-link"]', title: 'Track every transaction', description: 'Add transactions manually, import CSV or Excel files, scan receipts and review your history.', path: '/transactions' },
  { selector: '[data-tour="wallets-link"]', title: 'Organize your money', description: 'Keep cash, bank and investment balances separated so your total picture stays accurate.', path: '/wallets' },
  { selector: '[data-tour="categories-link"]', title: 'Make spending searchable', description: 'Categories give every transaction context and make your reports easier to understand.', path: '/categories' },
  { selector: '[data-tour="budgets-link"]', title: 'Keep spending on track', description: 'Create budgets by category and use the alerts to catch overspending early.', path: '/budgets' },
  { selector: '[data-tour="analytics-link"]', title: 'Understand your patterns', description: 'Analytics turns your activity into trends, anomaly alerts and balance forecasts.', path: '/analytics/overview' },
  { selector: '[data-tour="saving-goals-link"]', title: 'Turn plans into progress', description: 'Set saving goals and watch your progress alongside your everyday spending.', path: '/saving-goals' },
  { selector: '[data-tour="debts-link"]', title: 'Stay ahead of obligations', description: 'Track debts, repayments and due dates from one dedicated workspace.', path: '/debts' },
  { selector: '[data-tour="ai-assistant"]', title: 'Ask your AI assistant', description: 'Open the assistant to ask about your spending, upload a receipt image or get a clearer view of your financial data.', path: '/overview' },
  { selector: '[data-tour="account-menu"]', title: 'Your account controls', description: 'Open this menu whenever you need to sign out or replay this tour from the beginning.', path: '/overview' },
];

const findVisibleTarget = (selector: string) => Array.from(document.querySelectorAll<HTMLElement>(selector)).find((element) => {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
});

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ forceStart, onForceStartHandled }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const userId = auth.getUser()?.id || auth.getUser()?.email;
  const [mode, setMode] = useState<'idle' | 'welcome' | 'confirm-skip' | 'tour'>('idle');
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const currentStep = steps[stepIndex];
  const progress = useMemo(() => `${stepIndex + 1} / ${steps.length}`, [stepIndex]);

  useEffect(() => {
    if (!userId) return;
    const savedState = getOnboardingState(userId);
    if (!savedState) setMode('welcome');
  }, [userId]);

  useEffect(() => {
    if (!forceStart || !userId) return;
    setStepIndex(0);
    setMode('tour');
    onForceStartHandled();
  }, [forceStart, onForceStartHandled, userId]);

  useEffect(() => {
    if (mode !== 'tour' || !currentStep) return;
    if (currentStep.path && location.pathname !== currentStep.path) {
      navigate(currentStep.path);
      return;
    }
    const updateTarget = () => {
      const target = findVisibleTarget(currentStep.selector);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        setTargetRect(target.getBoundingClientRect());
      }
    };
    const timer = window.setTimeout(updateTarget, 120);
    window.addEventListener('resize', updateTarget);
    window.addEventListener('scroll', updateTarget, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', updateTarget);
      window.removeEventListener('scroll', updateTarget, true);
    };
  }, [currentStep, location.pathname, mode, navigate]);

  if (!userId || mode === 'idle') return null;

  const finish = (skipped: boolean) => {
    saveOnboardingState(userId, { completed: !skipped, skipped });
    setMode('idle');
    setTargetRect(null);
  };

  const beginTour = () => {
    setStepIndex(0);
    setMode('tour');
    navigate('/overview');
  };

  const next = () => {
    if (stepIndex === steps.length - 1) {
      finish(false);
      return;
    }
    setStepIndex((index) => index + 1);
  };

  if (mode === 'welcome' || mode === 'confirm-skip') {
    const isConfirm = mode === 'confirm-skip';
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#17212b]/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <div className="w-full max-w-[460px] rounded-2xl border border-[#e3ebe8] bg-white p-7 shadow-2xl animate-scale-in">
          <div className="mb-6 flex items-start justify-between gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e4f4f0] text-[#087f74]"><CircleHelp size={21} /></span>
            <button type="button" aria-label="Close onboarding" onClick={() => setMode('confirm-skip')} className="rounded-lg p-2 text-[#9aa7af] hover:bg-[#f4f7f6] hover:text-[#17212b]"><X size={18} /></button>
          </div>
          <p className="eyebrow">SmartFin guide</p>
          <h2 id="onboarding-title" className="mt-2 text-2xl font-extrabold tracking-[-.04em] text-[#17212b]">{isConfirm ? 'Skip the guided tour?' : 'Welcome to SmartFin'}</h2>
          <p className="mt-3 text-sm leading-6 text-[#71808c]">{isConfirm ? 'The guide will not appear again after you confirm. You can only start it again from Take a tour again in your account menu.' : 'Take a quick tour of the tools that help you understand, plan and improve your personal finances.'}</p>
          {isConfirm ? (
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setMode('welcome')} className="rounded-xl border border-[#e3ebe8] px-4 py-2.5 text-sm font-bold text-[#71808c] hover:bg-[#f4f7f6]">Keep the guide</button>
              <button type="button" onClick={() => finish(true)} className="rounded-xl bg-[#d76756] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#bd5547]">Skip and don&apos;t show again</button>
            </div>
          ) : (
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={() => setMode('confirm-skip')} className="px-1 py-2.5 text-left text-sm font-bold text-[#9aa7af] hover:text-[#17212b]">Skip guide</button>
              <button type="button" onClick={beginTour} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#087f74] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#075c57]">Start the tour <ChevronRight size={16} /></button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-[#17212b]/35" aria-hidden="true" />
      {targetRect && <div className="animated-guide-border onboarding-spotlight pointer-events-none fixed z-[71]" style={{ top: targetRect.top - 7, left: targetRect.left - 7, width: targetRect.width + 14, height: targetRect.height + 14 }} />}
      <div key={currentStep.selector} className="onboarding-card fixed inset-x-4 bottom-5 z-[73] mx-auto max-w-[430px] rounded-2xl border border-[#e3ebe8] bg-white p-5 shadow-2xl sm:bottom-8" role="dialog" aria-modal="true" aria-labelledby="tour-step-title">
        <div className="mb-4 flex items-center justify-between gap-3"><span className="text-[11px] font-extrabold uppercase tracking-[.14em] text-[#087f74]">Step {progress}</span><button type="button" onClick={() => setMode('confirm-skip')} className="text-xs font-bold text-[#9aa7af] hover:text-[#17212b]">Skip guide</button></div>
        <h2 id="tour-step-title" className="text-lg font-extrabold text-[#17212b]">{currentStep.title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#71808c]">{currentStep.description}</p>
        <div className="mt-5 flex items-center justify-between gap-3"><button type="button" disabled={stepIndex === 0} onClick={() => setStepIndex((index) => index - 1)} className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-bold text-[#71808c] disabled:opacity-35"><ChevronLeft size={16} />Back</button><button type="button" onClick={next} className="inline-flex items-center gap-1 rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#075c57]">{stepIndex === steps.length - 1 ? <>Finish <Check size={16} /></> : <>Next <ChevronRight size={16} /></>}</button></div>
      </div>
    </>
  );
};

export default OnboardingTour;
