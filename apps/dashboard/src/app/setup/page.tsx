'use client'
import Navbar from '@/components/Navbar';
import { Terminal, Cpu, Cloud, Zap } from 'lucide-react';

export default function Setup() {
  const steps = [
    { cmd: "npm install -g @srizdebnath/orbit", desc: "Install the global command-line tool." },
    { cmd: "orbit login", desc: "Securely link your terminal to your dashboard account." },
    { cmd: "orbit deploy", desc: "Run this in any React, Next.js, or Vite project folder." }
  ];

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto pt-40 px-8 pb-32">
        <h1 className="text-7xl font-black italic uppercase tracking-tighter mb-12">Boot Sequence<span className="text-blue-600">.</span></h1>
        
        <div className="space-y-12 mb-20">
          {steps.map((step, i) => (
            <div key={i} className="group">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl font-black text-blue-600 italic">0{i+1}</span>
                <p className="font-bold uppercase tracking-widest text-sm">{step.desc}</p>
              </div>
              <div className="bg-black text-gray-300 p-6 font-mono text-sm border-2 border-black shadow-[8px_8px_0px_0px_rgba(37,99,235,1)] flex justify-between items-center">
                <span><span className="text-blue-500 mr-2">$</span> {step.cmd}</span>
                <Zap size={16} className="text-blue-500 group-hover:animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        <div className="border-4 border-black p-10 bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-3xl font-black uppercase italic mb-8 underline decoration-blue-500">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <Mechanism icon={<Terminal />} title="Local Capture" text="CLI zips your project and captures real-time build logs." />
            <Mechanism icon={<Cpu />} title="Telemetry" text="Hardware metrics (CPU/RAM) are streamed via secure WebSockets." />
            <Mechanism icon={<Cloud />} title="Edge Launch" text="Orbit triggers Vercel/Netlify APIs to host your app globally." />
          </div>
        </div>
      </div>
    </main>
  );
}

function Mechanism({ icon, title, text }: any) {
  return (
    <div className="space-y-3">
      <div className="text-blue-600">{icon}</div>
      <h3 className="font-black uppercase italic tracking-tighter text-xl">{title}</h3>
      <p className="text-sm text-gray-500 font-medium leading-relaxed">{text}</p>
    </div>
  );
}