import React, { useEffect, useState } from 'react';
import animatedLogo from '../assets/animated-logo.svg';

export const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const revealTimer = window.setTimeout(() => setLeaving(true), 1550);
    const completeTimer = window.setTimeout(onComplete, 2200);
    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete, ready]);

  return (
    <div className={`splash-screen ${ready ? 'splash-screen-ready' : ''} ${leaving ? 'splash-screen-leaving' : ''}`} role="status" aria-label="Loading SmartFin">
      <div className="splash-content">
        <img src={animatedLogo} alt="SmartFin" className="splash-logo" onLoad={() => setReady(true)} onError={() => setReady(true)} />
      </div>
    </div>
  );
};

export default SplashScreen;