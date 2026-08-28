import React, { useEffect, useState } from 'react';
import animatedLogo from '../assets/animated-logo.svg';

export const AnimatedLogoPreloader: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
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
    <div className={`logo-preloader ${ready ? 'logo-preloader-ready' : ''} ${leaving ? 'logo-preloader-leaving' : ''}`} role="status" aria-label="Loading SmartFin">
      <img
        src={animatedLogo}
        alt="SmartFin"
        className="logo-preloader-image"
        onLoad={() => setReady(true)}
        onError={() => setReady(true)}
      />
    </div>
  );
};

export default AnimatedLogoPreloader;