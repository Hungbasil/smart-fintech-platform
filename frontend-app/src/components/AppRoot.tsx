import { useCallback, useState } from 'react';
import App from '../App';
import { AnimatedLogoPreloader } from './index';
import { Toaster } from 'sonner';

export function AppRoot() {
  const [showSplash, setShowSplash] = useState(true);
  const finishLoading = useCallback(() => setShowSplash(false), []);

  return <>
    <App />
    <Toaster position="top-right" closeButton duration={3200} toastOptions={{ className: 'app-toast' }} />
    {showSplash && <AnimatedLogoPreloader onComplete={finishLoading} />}
  </>;
}

export default AppRoot;