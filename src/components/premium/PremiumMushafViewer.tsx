'use client';
import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Info, Share2, Bookmark, PlayCircle } from 'lucide-react';

export default function PremiumMushafViewer() {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 w-full max-w-[95%] xl:max-w-[85%] mx-auto font-sans">
      
      {/* Viewer Main Container */}
      <div className="relative flex w-full h-[70vh] md:h-[75vh]">
        
        {/* Side Index Bar */}
        <div className="hidden md:flex flex-col w-12 xl:w-16 items-center justify-center space-y-6 py-8 ml-4 border-l border-[#c9a84c]/30">
          <div className="group relative flex items-center justify-center w-full">
             <div className="w-2 h-16 bg-blue-500 rounded-full cursor-pointer hover:w-4 transition-all duration-300"></div>
             <span className="absolute right-full mr-2 bg-[#1a0f00] text-[#c9a84c] text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity border border-[#c9a84c]/50 whitespace-nowrap">قدرة الله</span>
          </div>
          <div className="group relative flex items-center justify-center w-full">
             <div className="w-2 h-24 bg-green-500 rounded-full cursor-pointer hover:w-4 transition-all duration-300"></div>
             <span className="absolute right-full mr-2 bg-[#1a0f00] text-[#c9a84c] text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity border border-[#c9a84c]/50 whitespace-nowrap">الأحكام</span>
          </div>
          <div className="group relative flex items-center justify-center w-full">
             <div className="w-2 h-12 bg-red-500 rounded-full cursor-pointer hover:w-4 transition-all duration-300"></div>
             <span className="absolute right-full mr-2 bg-[#1a0f00] text-[#c9a84c] text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity border border-[#c9a84c]/50 whitespace-nowrap">السيرة</span>
          </div>
          <div className="group relative flex items-center justify-center w-full">
             <div className="w-2 h-20 bg-purple-500 rounded-full cursor-pointer hover:w-4 transition-all duration-300"></div>
             <span className="absolute right-full mr-2 bg-[#1a0f00] text-[#c9a84c] text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity border border-[#c9a84c]/50 whitespace-nowrap">الجنة والنار</span>
          </div>
        </div>

        {/* Mushaf Card Container */}
        <div className="flex-1 relative bg-[#fff8e7] rounded-sm shadow-[0_0_30px_rgba(201,168,76,0.15)] flex items-center justify-center overflow-hidden border-8 border-[#1a0f00]">
          
          {/* Islamic Decorative Border overlay (Simulated via pure CSS) */}
          <div className="absolute inset-0 pointer-events-none border-[8px] md:border-[12px] border-double border-[#c9a84c]/40 m-2"></div>
          <div className="absolute inset-0 pointer-events-none border border-[#c9a84c]/60 m-4 md:m-6"></div>
          
          {/* Corner ornaments (Simulated) */}
          <div className="absolute top-2 right-2 w-6 h-6 md:w-8 md:h-8 border-t-4 border-r-4 border-[#c9a84c] rounded-tr-xl opacity-70"></div>
          <div className="absolute top-2 left-2 w-6 h-6 md:w-8 md:h-8 border-t-4 border-l-4 border-[#c9a84c] rounded-tl-xl opacity-70"></div>
          <div className="absolute bottom-2 right-2 w-6 h-6 md:w-8 md:h-8 border-b-4 border-r-4 border-[#c9a84c] rounded-br-xl opacity-70"></div>
          <div className="absolute bottom-2 left-2 w-6 h-6 md:w-8 md:h-8 border-b-4 border-l-4 border-[#c9a84c] rounded-bl-xl opacity-70"></div>

          {/* Page Content Placeholder */}
          <div className="relative w-full h-full p-6 md:p-12 flex flex-col items-center justify-between text-[#1a0f00]">
            
            {/* Header: Surah Name & Juz */}
            <div className="w-full flex justify-between items-center text-lg md:text-xl font-['Amiri',serif] font-bold border-b border-[#c9a84c]/30 pb-2">
              <span className="hidden sm:inline">الجزء الأول</span>
              <span className="px-4 md:px-6 py-1 bg-[#c9a84c]/10 rounded-full border border-[#c9a84c]/30">سُورَةُ الفَاتِحَة</span>
              <span className="hidden sm:inline">الحزب ١</span>
            </div>

            {/* Verses Area (Simulated) */}
            <div className="flex-1 flex items-center justify-center text-center p-4 md:p-8 relative w-full">
              <p 
                className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-['Amiri',serif] leading-[2.2] md:leading-[2.5] text-[#1a0f00] cursor-pointer hover:text-[#c9a84c] transition-colors max-w-4xl"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ (١) الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ (٢) الرَّحْمَنِ الرَّحِيمِ (٣) مَالِكِ يَوْمِ الدِّينِ (٤) إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ (٥) اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ (٦) صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ (٧)
              </p>

              {/* Tooltip */}
              <div className={`absolute top-[20%] bg-[#1a0f00] text-[#fff8e7] rounded-xl px-4 py-2 flex space-x-4 space-x-reverse shadow-xl z-20 border border-[#c9a84c]/50 transition-all duration-300 pointer-events-auto ${showTooltip ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <button className="hover:text-[#c9a84c] p-1 transition-colors group relative" title="تفسير">
                  <Info size={20} />
                </button>
                <button className="hover:text-[#c9a84c] p-1 transition-colors" title="تشغيل صوتي"><PlayCircle size={20} /></button>
                <button className="hover:text-[#c9a84c] p-1 transition-colors" title="إضافة للمفضلة"><Bookmark size={20} /></button>
                <button className="hover:text-[#c9a84c] p-1 transition-colors" title="مشاركة"><Share2 size={20} /></button>
              </div>
            </div>

            {/* Footer */}
            <div className="w-full flex justify-center items-center text-lg font-['Amiri',serif] border-t border-[#c9a84c]/30 pt-2">
              <span className="text-[#1a0f00] bg-[#c9a84c]/20 px-3 py-1 rounded-sm border border-[#c9a84c]/40 font-bold">1</span>
            </div>
          </div>
        </div>

      </div>

      {/* Navigation Buttons */}
      <div className="w-full max-w-3xl mt-8 flex justify-between items-center bg-[#1a0f00]/60 backdrop-blur-sm p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-[#c9a84c]/20">
        <button className="flex items-center px-3 sm:px-4 py-2 bg-[#1a0f00] text-[#c9a84c] border border-[#c9a84c]/50 rounded-lg hover:bg-[#c9a84c] hover:text-[#1a0f00] transition-all duration-300 group">
          <ChevronRight className="ml-1 sm:ml-2 group-hover:-translate-x-1 transition-transform" size={20} />
          <span className="font-['Amiri',serif] text-base sm:text-lg">الصفحة السابقة</span>
        </button>

        <div className="text-[#fff8e7] font-medium font-['Amiri',serif] text-base sm:text-lg">
          صفحة <span className="text-[#c9a84c] font-bold mx-1 text-lg sm:text-xl">1</span> من <span className="mx-1">604</span>
        </div>

        <button className="flex items-center px-3 sm:px-4 py-2 bg-[#1a0f00] text-[#c9a84c] border border-[#c9a84c]/50 rounded-lg hover:bg-[#c9a84c] hover:text-[#1a0f00] transition-all duration-300 group">
          <span className="font-['Amiri',serif] text-base sm:text-lg">الصفحة التالية</span>
          <ChevronLeft className="mr-1 sm:mr-2 group-hover:translate-x-1 transition-transform" size={20} />
        </button>
      </div>

    </div>
  );
}