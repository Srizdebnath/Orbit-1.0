'use client'
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function MetricChart({ projectId }: { projectId: string }) {
  const [data, setData] = useState<{ time: string, cpu: number }[]>([]);

  useEffect(() => {
    // 1. Load last 10 points
    const fetchInitial = async () => {
      const { data: initial } = await supabase
        .from('metrics')
        .select('cpu_usage, timestamp')
        .eq('project_id', projectId)
        .order('timestamp', { ascending: false })
        .limit(10);
      
      if (initial) {
        setData(initial.reverse().map(m => ({ 
          time: new Date(m.timestamp).toLocaleTimeString(), 
          cpu: m.cpu_usage 
        })));
      }
    };
    fetchInitial();

    // 2. Listen for new data
    const channel = supabase
      .channel(`metrics-${projectId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'metrics', 
        filter: `project_id=eq.${projectId}` 
      }, (payload) => {
        setData(prev => [...prev.slice(-9), { 
          time: new Date().toLocaleTimeString(), 
          cpu: payload.new.cpu_usage 
        }]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel) };
  }, [projectId]);

  return (
    <div className="h-24 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="cpu" stroke="#2563eb" strokeWidth={3} dot={false} isAnimationActive={false} />
          <YAxis hide domain={[0, 100]} />
          <Tooltip contentStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}