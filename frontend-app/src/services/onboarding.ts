export type OnboardingState = {
  version: number;
  completed: boolean;
  skipped: boolean;
};

const ONBOARDING_VERSION = 1;

const storageKey = (userId: string) => `smartfin:onboarding:${userId}`;

export function getOnboardingState(userId: string): OnboardingState | null {
  try {
    const value = localStorage.getItem(storageKey(userId));
    if (!value) return null;
    const state = JSON.parse(value) as Partial<OnboardingState>;
    if (state.version !== ONBOARDING_VERSION) return null;
    return {
      version: ONBOARDING_VERSION,
      completed: state.completed === true,
      skipped: state.skipped === true,
    };
  } catch {
    return null;
  }
}

export function saveOnboardingState(userId: string, state: Omit<OnboardingState, 'version'>) {
  localStorage.setItem(storageKey(userId), JSON.stringify({ version: ONBOARDING_VERSION, ...state }));
}
