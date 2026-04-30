'use client';
import React, { useState } from 'react';
import { Menu, Globe, Moon, Sun, Wifi, X } from 'lucide-react';

export default function PremiumNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  const navLinks = [
    'المصحف', 'المواضيع', 'المفضلة', 'الإحصائيات', 'التفسير', 'الحفظ',
    'القراءات', 'التقويم', 'بحث صوتي', 'الأطفال', 'سهولة الوصول', 'خطة الختمة', 'تأملات', 'مسار'
  ];

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#1a0f00]/90 border-b border-[#c9a84c]/30 transition-all duration-300 font-sans">
      <div className="max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Mobile menu button */}
          <div className="flex items-center xl:hidden">
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="text-[#c9a84c] hover:text-[#fff8e7] focus:outline-none transition-colors"
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>

          {/* Settings / Toggles */}
          <div className="hidden xl:flex items-center space-x-4 space-x-reverse">
            <button className="text-[#c9a84c] hover:text-[#fff8e7] transition-colors p-2 rounded-full hover:bg-[#c9a84c]/10" title="تغيير اللغة">
              <Globe size={20} />
            </button>
            <button onClick={() => setIsDark(!isDark)} className="text-[#c9a84c] hover:text-[#fff8e7] transition-colors p-2 rounded-full hover:bg-[#c9a84c]/10" title="الوضع الليلي/النهاري">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="flex items-center space-x-2 space-x-reverse" title="حالة الاتصال">
              <Wifi size={20} className="text-green-500" />
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden xl:flex flex-1 justify-center items-center space-x-3 space-x-reverse px-2">
            {navLinks.map((link) => (
              <a 
                key={link} 
                href="#" 
                className="text-[#fff8e7] hover:text-[#c9a84c] px-2 py-2 rounded-md text-sm font-medium transition-colors hover:bg-[#c9a84c]/10 whitespace-nowrap"
              >
                {link}
              </a>
            ))}
          </div>

          {/* Logo */}
          <div className="flex items-center justify-end min-w-[200px]">
            <h1 className="text-2xl md:text-3xl font-bold text-[#c9a84c] font-['Amiri',serif] tracking-wider drop-shadow-md cursor-pointer hover:scale-105 transition-transform duration-300">
              المصحف المفهرس
            </h1>
          </div>
          
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`xl:hidden transition-all duration-300 overflow-hidden ${isOpen ? 'max-h-[500px] border-b border-[#c9a84c]/30' : 'max-h-0'}`}>
        <div className="px-4 pt-2 pb-6 space-y-1 bg-[#1a0f00]">
          <div className="grid grid-cols-2 gap-2">
            {navLinks.map((link) => (
              <a 
                key={link} 
                href="#" 
                className="text-[#fff8e7] hover:text-[#c9a84c] block px-3 py-2 rounded-md text-base font-medium hover:bg-[#c9a84c]/10 text-right border border-transparent hover:border-[#c9a84c]/20 transition-all"
              >
                {link}
              </a>
            ))}
          </div>
          <div className="flex justify-end items-center space-x-6 space-x-reverse px-3 mt-6 pt-4 border-t border-[#c9a84c]/20">
            <button className="text-[#c9a84c] hover:text-[#fff8e7] transition-colors"><Globe size={24} /></button>
            <button className="text-[#c9a84c] hover:text-[#fff8e7] transition-colors" onClick={() => setIsDark(!isDark)}>
              {isDark ? <Sun size={24} /> : <Moon size={24} />}
            </button>
            <div><Wifi size={24} className="text-green-500" /></div>
          </div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full h-[2px] bg-[#1a0f00]">
        <div className="h-full bg-[#c9a84c] w-1/3 transition-all duration-500 shadow-[0_0_8px_#c9a84c]"></div>
      </div>
    </nav>
  );
}