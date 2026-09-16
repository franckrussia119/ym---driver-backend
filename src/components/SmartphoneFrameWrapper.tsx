import React, { useState } from 'react';
import { Smartphone, Monitor, Signal, Wifi, Battery } from 'lucide-react';

interface SmartphoneFrameWrapperProps {
  children: React.ReactNode;
  isSmartphoneView: boolean;
  setIsSmartphoneView: (val: boolean) => void;
  appName?: string;
  driverName?: string;
}

export const SmartphoneFrameWrapper: React.FC<SmartphoneFrameWrapperProps> = ({
  children,
  isSmartphoneView,
  setIsSmartphoneView,
  appName = 'YM-TRANSIT Mobile',
}) => {
  const [currentTime] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  if (!isSmartphoneView) {
    return <div className="w-full">{children}</div>;
  }

  return (
    <>
      {/* On actual mobile viewports (<768px), render children directly without simulated device frame */}
      <div className="block md:hidden w-full">
        {children}
      </div>

      {/* On desktop viewports (>=768px), render simulated smartphone frame mockup */}
      <div className="hidden md:flex min-h-screen bg-slate-950 py-6 px-2 flex-col items-center justify-start overflow-x-hidden">
        {/* Top Banner Control to exit smartphone simulation */}
        <div className="w-full max-w-sm mb-3 flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium text-slate-300">Simulateur Application Mobile</span>
          <button
            onClick={() => setIsSmartphoneView(false)}
            className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 text-[11px] font-bold cursor-pointer"
          >
            <Monitor className="w-3.5 h-3.5 text-blue-400" />
            <span>Quitter Mode Phone</span>
          </button>
        </div>

        {/* Smartphone Body Mockup */}
        <div className="w-full max-w-[375px] sm:max-w-[390px] bg-slate-900 border-[8px] sm:border-[10px] border-slate-800 rounded-[42px] sm:rounded-[48px] shadow-2xl overflow-hidden flex flex-col relative ring-1 ring-slate-700/50 min-h-[720px] max-h-[840px]">
          
          {/* Dynamic Island / Notch */}
          <div className="bg-slate-900 text-slate-300 px-6 py-2 flex items-center justify-between text-xs font-medium relative z-30 select-none">
            {/* Time */}
            <span className="font-bold text-slate-100 text-[11px]">{currentTime}</span>
            
            {/* Notch Pill */}
            <div className="absolute left-1/2 -translate-x-1/2 top-1.5 w-24 h-4 bg-slate-950 rounded-full flex items-center justify-center gap-2 border border-slate-800">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-blue-900/80"></div>
            </div>

            {/* Status Icons */}
            <div className="flex items-center space-x-1.5 text-slate-300">
              <Signal className="w-3 h-3 text-emerald-400" />
              <Wifi className="w-3 h-3 text-blue-400" />
              <div className="flex items-center text-[10px] font-bold text-emerald-400">
                <Battery className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Smartphone Header Bar */}
          <div className="bg-slate-900 border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between z-20">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-xs">
                YM
              </div>
              <div>
                <div className="text-xs font-bold text-white leading-tight">{appName}</div>
                <div className="text-[10px] text-emerald-400 font-mono">En ligne · Chauffeur PWA</div>
              </div>
            </div>
          </div>

          {/* Scrollable Smartphone Screen Area */}
          <div className="flex-1 overflow-y-auto bg-slate-100 pb-20 scrollbar-thin scrollbar-thumb-slate-300">
            {children}
          </div>

          {/* Home Indicator Bar at Bottom */}
          <div className="bg-slate-900 py-1.5 flex justify-center z-30 border-t border-slate-800">
            <div className="w-32 h-1 bg-slate-600 rounded-full"></div>
          </div>
        </div>
      </div>
    </>
  );
};
