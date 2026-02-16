'use client'
import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export default function TerminalView({ logs }: { logs: string }) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      theme: { background: '#0a0a0a' },
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 12,
      cursorBlink: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    return () => term.dispose();
  }, []);

  useEffect(() => {
    if (xtermRef.current && logs) {
      xtermRef.current.clear();
      const formatted = logs.replace(/\n/g, '\r\n');
      xtermRef.current.write(formatted);
    }
  }, [logs]);

  return (
    <div className="border-4 border-black dark:border-white/10 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(59,130,246,0.3)] bg-[#0a0a0a] p-2">
      <div ref={terminalRef} className="h-[400px]" />
    </div>
  );
}