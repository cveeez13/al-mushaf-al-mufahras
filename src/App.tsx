import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MushafCover } from '@/components/MushafCover';

export default function App() {
  const [showCover, setShowCover] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShowCover(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      <AnimatePresence>
        {showCover && <MushafCover key="mushaf-cover" />}
      </AnimatePresence>
    </div>
  );
}
