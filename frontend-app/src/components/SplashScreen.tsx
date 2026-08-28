import React, { useEffect, useState } from 'react';
import animatedLogo from '../assets/animated-logo.svg';

export const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const revealTimer = window.setTimeout(() => setLeaving(true), 1100);
    const completeTimer = window.setTimeout(onComplete, 1450);
    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className={`splash-screen ${leaving ? 'splash-screen-leaving' : ''}`} role="status" aria-label="Loading SmartFin">
      <div className="splash-content">
        <img src={animatedLogo} alt="SmartFin" className="splash-logo" />
        <div className="splash-wordmark">SmartFin</div>
        <div className="splash-loader" aria-hidden="true"><span /></div>
      </div>
    </div>
  );
};

export default SplashScreen;