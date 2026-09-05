import React from 'react';
import { ArrowRight, ChevronDown, HelpCircle, Zap, Shield, Sparkles, Terminal } from 'lucide-react';
import HeroShaderBackground from './HeroShaderBackground';

export default function HeroSection({ onGetStarted, onOpenRules }) {
  return (
    <section className="relative -mt-20 min-h-[640px] lg:min-h-[720px] pt-28 pb-24 lg:pt-36 lg:pb-32 flex items-center overflow-hidden border-b border-slate-200/80">
      {/* Real-time WebGL/WebGPU Stripe & Fluted Glass Shader Background from Emily Project */}
      <HeroShaderBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          {/* Left Column: Typography & CTAs */}
          <div className="lg:col-span-6 space-y-6">
            
            <div className="space-y-3">
              <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-slate-900 tracking-tight leading-[1.12]">
                Here <span className="inline-block bg-brand-blue text-white px-3.5 py-0.5 rounded-2xl shadow-sm">hackers</span> break awesome AI models
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-xl pt-2">
                With Vakya-Bhed all prompt engineers and cybersecurity researchers can challenge big and small language models, leak classified tokens, and conquer 12 adversarial levels.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                onClick={onGetStarted}
                className="flex items-center gap-2.5 px-6 py-3.5 text-base font-bold text-white bg-brand-blue hover:bg-blue-700 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 active:scale-95 transition-all"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>

              <button
                onClick={onOpenRules}
                className="flex items-center gap-2 px-5 py-3.5 text-base font-bold text-slate-800 bg-white hover:bg-slate-50 border-2 border-slate-900 rounded-2xl shadow-[2px_2px_0px_#0F172A] hover:shadow-[3px_3px_0px_#0F172A] active:translate-x-[1px] active:translate-y-[1px] transition-all"
              >
                <span>Rules & Guide</span>
                <ChevronDown className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Help Question Link */}
            <div className="pt-1">
              <button 
                onClick={onOpenRules}
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-brand-blue transition-colors group"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 group-hover:scale-125 transition-transform" />
                <span>Have any questions about scoring & rules?</span>
              </button>
            </div>

          </div>

          {/* Right Column: Hero Artwork Card with Floating Badges */}
          <div className="lg:col-span-6 relative">
            
            {/* Main Visual Container matching image rounded 3-layer card */}
            <div className="relative mx-auto max-w-md lg:max-w-none">
              
              {/* Card Shell with crisp dark border */}
              <div className="relative rounded-[2.5rem] border-2 border-slate-900 bg-gradient-to-br from-blue-700 via-sky-600 to-blue-900 p-2 shadow-card overflow-hidden">
                
                {/* Embedded High-Impact Graphic Illustration */}
                <div className="relative w-full h-[440px] lg:h-[470px] rounded-[2.2rem] bg-gradient-to-b from-sky-400 via-blue-600 to-indigo-900 overflow-hidden flex items-center justify-center">
                  
                  {/* Dynamic Abstract Geometry Background */}
                  <div className="absolute inset-0 opacity-25">
                    <svg className="w-full h-full" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <polygon points="50,0 200,300 0,400" fill="#FFFFFF" />
                      <polygon points="250,50 400,200 150,400" fill="#00F0FF" />
                      <circle cx="320" cy="100" r="80" stroke="#FFFFFF" strokeWidth="6" />
                      <line x1="0" y1="100" x2="400" y2="300" stroke="#FFFFFF" strokeWidth="4" strokeDasharray="12 12" />
                    </svg>
                  </div>

                  {/* Character Silhouette Artwork (Dynamic Jumper / Hacker breaking through digital glass) */}
                  <div className="relative z-10 w-full h-full flex items-center justify-center p-6 select-none">
                    <svg viewBox="0 0 320 320" className="w-full h-full max-w-[340px] drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* Speed lines */}
                      <path d="M40 220L120 160M80 260L160 200M200 40L160 120M260 80L220 160" stroke="#00F0FF" strokeWidth="4" strokeLinecap="round" opacity="0.7"/>
                      {/* Kinetic Energy Shards */}
                      <polygon points="120,40 180,90 140,110" fill="#FFFFFF" opacity="0.9"/>
                      <polygon points="220,180 290,210 240,260" fill="#38BDF8" opacity="0.8"/>
                      <polygon points="30,130 90,170 50,190" fill="#BAE6FD" opacity="0.6"/>
                      
                      {/* Stylized Cyber Ninja / Hacker Figure in dynamic mid-air action pose */}
                      <g className="filter drop-shadow-lg">
                        {/* Shadow / Aura */}
                        <circle cx="160" cy="150" r="90" fill="#0369A1" opacity="0.4"/>
                        {/* Dynamic Hoodie Figure */}
                        <path d="M150 90 C130 80, 115 105, 125 125 C135 140, 160 145, 175 130 C185 120, 180 95, 150 90 Z" fill="#0F172A"/>
                        {/* Visor / Face Glow */}
                        <path d="M140 115 Q155 125 170 115" stroke="#00F0FF" strokeWidth="4" strokeLinecap="round"/>
                        {/* Torso & Jacket in flight */}
                        <path d="M130 130 L110 190 L170 210 L195 155 L165 135 Z" fill="#1E293B"/>
                        {/* Jacket Trim */}
                        <path d="M140 140 L125 185 M160 145 L175 180" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round"/>
                        {/* Left Arm extended */}
                        <path d="M130 135 L80 115 L60 130 L95 150 Z" fill="#0F172A"/>
                        {/* Right Arm raised with glowing data sphere */}
                        <path d="M175 135 L220 100 L245 110 L200 150 Z" fill="#0F172A"/>
                        <circle cx="240" cy="95" r="14" fill="#F59E0B" opacity="0.9"/>
                        <circle cx="240" cy="95" r="8" fill="#FEF08A"/>
                        {/* Legs kicked in mid-air break */}
                        <path d="M120 185 L90 230 L130 255 L150 205 Z" fill="#1E293B"/>
                        <path d="M165 200 L210 240 L245 235 L190 190 Z" fill="#0F172A"/>
                        {/* Cyber boots */}
                        <path d="M85 228 L60 235 L75 250 L120 250 Z" fill="#0284C7"/>
                        <path d="M210 240 L255 250 L260 235 L225 225 Z" fill="#0284C7"/>
                      </g>
                    </svg>
                  </div>

                  {/* Glass Shards Platform at bottom right */}
                  <div className="absolute bottom-4 right-4 w-32 h-10 bg-white/10 backdrop-blur-md rounded-xl border border-white/30 transform rotate-[-8deg] shadow-lg flex items-center justify-center text-white/80 font-mono text-[11px] font-bold">
                    SYSTEM BREACH
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
