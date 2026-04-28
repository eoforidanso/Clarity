import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function PageTransition({ children }) {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(false);
    const timer = requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsVisible(true));
    });
    return () => cancelAnimationFrame(timer);
  }, [location.pathname]);

  return (
    <div className={`page-transition ${isVisible ? 'page-enter-active' : 'page-enter'}`}>
      {children}
    </div>
  );
}
