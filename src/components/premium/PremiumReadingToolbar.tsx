'use client';
import React from 'react';
import { BookOpen, Maximize, BookmarkPlus, ZoomIn, ZoomOut, Navigation } from 'lucide-react';

export default function PremiumReadingToolbar() {
  return (
    <div className="flex justify-center mt-6 px-4 font-sans">
      <div className="flex items-center space-x-2 space-x-reverse bg-[#1a0f00]/80 backdrop-blur-md border border-[#c9a84c]/40 rounded-full px-4 sm:px-6 py-2 sm:py-3 shadow-lg shadow-[#c9a84c]/10 overflow-x-auto">
        
        <button className="flex items-center justify-center p-2 text-[#fff8e7] hover:text-[#1a0f00] hover:bg-[#c9a84c] rounded-full transition-all duration-300 group relative" title="عرض صفحتين">
          <BookOpen size={20} className="sm:w-6 sm:h-6" />
        </button>

        <div className="w-px h-6 bg-[#c9a84c]/30 mx-1 sm:mx-2"></div>

        <button className="flex items-center justify-center p-2 text-[#fff8e7] hover:text-[#1a0f00] hover:bg-[#c9a84c] rounded-full transition-all duration-300" title="ملء الشاشة">
          <Maximize size={20} className="sm:w-6 sm:h-6" />
        </button>

        <div className="w-px h-6 bg-[#c9a84c]/30 mx-1 sm:mx-2"></div>

        <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse px-1 sm:px-2">
          <button className="text-[#fff8e7] hover:text-[#c9a84c] transition-colors"><ZoomOut size={20} className="sm:w-6 sm:h-6" /></button>
          <span className="text-[#c9a84c] font-medium min-w-[2.5rem] sm:min-w-[3rem] text-center text-xs sm:text-sm">100%</span>
          <button className="text-[#fff8e7] hover:text-[#c9a84c] transition-colors"><ZoomIn size={20} className="sm:w-6 sm:h-6" /></button>
        </div>

        <div className="w-px h-6 bg-[#c9a84c]/30 mx-1 sm:mx-2"></div>

        <button className="flex items-center justify-center p-2 text-[#fff8e7] hover:text-[#1a0f00] hover:bg-[#c9a84c] rounded-full transition-all duration-300" title="إضافة للمفضلة">
          <BookmarkPlus size={20} className="sm:w-6 sm:h-6" />
        </button>

        <div className="w-px h-6 bg-[#c9a84c]/30 mx-1 sm:mx-2"></div>

        <button className="flex items-center justify-center p-2 text-[#fff8e7] hover:text-[#1a0f00] hover:bg-[#c9a84c] rounded-full transition-all duration-300" title="انتقال سريع">
          <Navigation size={20} className="sm:w-6 sm:h-6" />
        </button>

      </div>
    </div>
  );
}