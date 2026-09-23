'use client';

import { useState, useEffect, useRef } from 'react';

export function useScrollDirection() {
  const [showBars, setShowBars] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    let ticking = false;
    let animationFrameId: number | null = null;

    const handleScroll = () => {
      if (!ticking) {
        animationFrameId = window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          if (currentScrollY > 50) {
            if (currentScrollY > lastScrollY.current) {
              // Scrolling down
              setShowBars(false);
            } else if (currentScrollY < lastScrollY.current) {
              // Scrolling up
              setShowBars(true);
            }
          } else {
            setShowBars(true);
          }
          lastScrollY.current = currentScrollY;
          ticking = false;
          animationFrameId = null;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return showBars;
}
