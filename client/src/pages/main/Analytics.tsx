import {useLocation} from 'react-router-dom';
import { useEffect } from 'react';

declare global {
  interface Window {
    goatcounter: any;
  }
}

export const AnalyticsTracker = () => {
  const location = useLocation();

  useEffect(() => {
    if (window.goatcounter && window.goatcounter.count) {
      window.goatcounter.count({
        path: location.pathname + location.search + location.hash,
      });
    }
  }, [location]);

  return null;
};
