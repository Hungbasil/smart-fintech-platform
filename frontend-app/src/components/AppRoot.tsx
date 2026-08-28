import { useCallback, useState } from 'react';
import App from '../App';
import SplashScreen from './SplashScreen';
import { Toaster } from 'sonner';

export function AppRoot() {
  const [isLoading, setIsLoading] = useState(true);
  const finishLoading = useCallback(() => setIsLoading(false), []);

  if (isLoading) return <SplashScreen onComplete={finishLoading} />;

  return <>
    <App />
    <Toaster position="top-right" closeButton duration={3200} toastOptions={{ className: 'app-toast' }} />
  </>;
}

export default AppRoot;