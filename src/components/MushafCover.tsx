'use client';
import React from 'react';
import { motion } from 'framer-motion';
import styles from './MushafCover.module.css';

interface Props {
  onEnter?: () => void;
}

export const MushafCover: React.FC<Props> = ({ onEnter }) => {
  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8 } }}
    >
      <div className={styles.mushafWrapper}>
        <svg viewBox="0 0 600 900" className={styles.frameSvg} preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="bg-pattern" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M40 0 L80 40 L40 80 L0 40 Z" fill="none" stroke="#c9a84c" strokeWidth="0.5" opacity="0.3"/>
              <circle cx="40" cy="40" r="28" fill="none" stroke="#c9a84c" strokeWidth="0.5" opacity="0.3"/>
              <path d="M0 40 Q 20 20 40 0 Q 60 20 80 40 Q 60 60 40 80 Q 20 60 0 40" fill="none" stroke="#c9a84c" strokeWidth="0.5" opacity="0.3"/>
              <rect x="20" y="20" width="40" height="40" fill="none" stroke="#c9a84c" strokeWidth="0.5" opacity="0.2" transform="rotate(45 40 40)"/>
              <circle cx="40" cy="40" r="2" fill="#c9a84c" opacity="0.4"/>
              
              <line x1="0" y1="40" x2="12" y2="40" stroke="#c9a84c" strokeWidth="0.5" opacity="0.3" />
              <line x1="68" y1="40" x2="80" y2="40" stroke="#c9a84c" strokeWidth="0.5" opacity="0.3" />
              <line x1="40" y1="0" x2="40" y2="12" stroke="#c9a84c" strokeWidth="0.5" opacity="0.3" />
              <line x1="40" y1="68" x2="40" y2="80" stroke="#c9a84c" strokeWidth="0.5" opacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#bg-pattern)" />
          
          {/* Main Borders */}
          <rect x="20" y="20" width="560" height="860" fill="none" stroke="#c9a84c" strokeWidth="10" />
          <rect x="35" y="35" width="530" height="830" fill="none" stroke="#c9a84c" strokeWidth="2" />
          <rect x="42" y="42" width="516" height="816" fill="none" stroke="#c9a84c" strokeWidth="1" />

          {/* Elaborate Corners */}
          {[ [0,0], [1,0], [0,1], [1,1] ].map(([sx, sy], i) => (
             <g key={i} transform={`translate(${sx ? 580 : 20}, ${sy ? 880 : 20}) scale(${sx ? -1 : 1}, ${sy ? -1 : 1})`}>
                <path d="M0 0 L 120 0 L 120 15 L 15 120 L 0 120 Z" fill="none" stroke="#c9a84c" strokeWidth="1"/>
                <path d="M 15 15 Q 110 20 110 110 Q 20 110 15 15" fill="none" stroke="#c9a84c" strokeWidth="1.5"/>
                <path d="M 15 15 L 80 80" stroke="#c9a84c" strokeWidth="1" strokeDasharray="3 3"/>
                <circle cx="80" cy="80" r="10" fill="none" stroke="#c9a84c" strokeWidth="1.5"/>
                <circle cx="80" cy="80" r="3" fill="#c9a84c"/>
                <circle cx="60" cy="85" r="3" fill="#c9a84c"/>
                <circle cx="85" cy="60" r="3" fill="#c9a84c"/>
             </g>
          ))}

          {/* Top and Bottom Pointers with 'X' */}
          <g transform="translate(300, 100)">
             <path d="M -15 0 L 0 -50 L 15 0 L 0 40 Z" fill="#c9a84c" opacity="0.8"/>
             <circle cx="0" cy="-10" r="8" fill="#000" stroke="#c9a84c" strokeWidth="1"/>
             <path d="M -4 -14 L 4 -6 M -4 -6 L 4 -14" stroke="#c9a84c" strokeWidth="1.5"/>
             <line x1="0" y1="40" x2="0" y2="120" stroke="#c9a84c" strokeWidth="2"/>
             <path d="M -10 90 L 0 120 L 10 90 Z" fill="#c9a84c"/>
          </g>
          
          <g transform="translate(300, 800) scale(1, -1)">
             <path d="M -15 0 L 0 -50 L 15 0 L 0 40 Z" fill="#c9a84c" opacity="0.8"/>
             <circle cx="0" cy="-10" r="8" fill="#000" stroke="#c9a84c" strokeWidth="1"/>
             <path d="M -4 -14 L 4 -6 M -4 -6 L 4 -14" stroke="#c9a84c" strokeWidth="1.5"/>
             <line x1="0" y1="40" x2="0" y2="120" stroke="#c9a84c" strokeWidth="2"/>
             <path d="M -10 90 L 0 120 L 10 90 Z" fill="#c9a84c"/>
          </g>

          {/* Central Complex Mandala/Rosette */}
          <g transform="translate(300, 450)">
             <circle cx="0" cy="0" r="220" fill="#000" opacity="0.75"/>
             <circle cx="0" cy="0" r="210" fill="none" stroke="#c9a84c" strokeWidth="2"/>
             <circle cx="0" cy="0" r="200" fill="none" stroke="#c9a84c" strokeWidth="0.5"/>
             <circle cx="0" cy="0" r="140" fill="none" stroke="#c9a84c" strokeWidth="1"/>
             
             {[...Array(12)].map((_, i) => {
               const angle = (i * 30 * Math.PI) / 180;
               return (
                 <g key={i} transform={`rotate(${i * 30})`}>
                   <path d="M 0 -140 Q 40 -175 0 -210 Q -40 -175 0 -140" fill="none" stroke="#c9a84c" strokeWidth="1.5"/>
                   <path d="M 0 -140 L 15 -190 L 0 -210 L -15 -190 Z" fill="none" stroke="#c9a84c" strokeWidth="0.5" opacity="0.5"/>
                   
                   <line x1="0" y1="-210" x2="0" y2="-240" stroke="#c9a84c" strokeWidth="1.5"/>
                   <circle cx="0" cy="-240" r="3" fill="#c9a84c"/>
                   <circle cx="0" cy="-175" r="2" fill="#c9a84c"/>
                   
                   <path d="M 0 -140 A 110 110 0 0 1 121.2 -70" fill="none" stroke="#c9a84c" strokeWidth="1"/>
                 </g>
               )
             })}
          </g>
        </svg>

        <div className={styles.contentOverlay}>
          <div className={styles.titleWrapper}>
            <h1 className={styles.title}>
              <span className={styles.quranWord}>الْقُرْآن</span>
              <span className={styles.kareemWord}>الْكَرِيم</span>
            </h1>
          </div>
          
          {onEnter && (
             <div className={styles.enterWrapper}>
               <button className={styles.enterButton} onClick={onEnter}>
                 <span className={styles.enterText}>دُخُول</span>
                 <svg className={styles.enterBorder} preserveAspectRatio="none">
                   <rect x="2" y="2" width="calc(100% - 4px)" height="calc(100% - 4px)" rx="2" stroke="#c9a84c" strokeWidth="2" fill="none" />
                   <rect x="8" y="8" width="calc(100% - 16px)" height="calc(100% - 16px)" rx="1" stroke="#c9a84c" strokeWidth="1" strokeDasharray="6 4" fill="none" />
                 </svg>
               </button>
             </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
