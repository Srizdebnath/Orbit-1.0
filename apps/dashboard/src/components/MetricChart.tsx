'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AreaChart, Area, ResponsiveContainer, YAxis, CartesianGrid } from 'recharts';

export default function MetricChart({ projectId }: { projectId: string }) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {

    const fetchHistory = async () => {
      const { data: history } = await supabase
        .from('metrics')
        .select('cpu_usage, timestamp')
        .eq('project_id', projectId)
        .order('timestamp', { ascending: false })
        .limit(20);

      if (history) {
        setData(history.reverse().map(m => ({ cpu: m.cpu_usage })));
      }
    };
    fetchHistory();


    const channel = supabase
      .channel(`live-metrics-${projectId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'metrics', filter: `project_id=eq.${projectId}` },
        (payload) => {
          setData(prev => [...prev.slice(-19), { cpu: payload.new.cpu_usage }]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel) };
  }, [projectId]);

  return (
    <div className="h-24 w-full bg-white dark:bg-transparent border-t-2 border-black/5 dark:border-white/5">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.1)" />
          <Area
            type="stepAfter"
            dataKey="cpu"
            stroke="#2563eb"
            fillOpacity={1}
            fill="url(#colorCpu)"
            strokeWidth={3}
            isAnimationActive={false}
          />
          <YAxis hide domain={[0, 100]} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}