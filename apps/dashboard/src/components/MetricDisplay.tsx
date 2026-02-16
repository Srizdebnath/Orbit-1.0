'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function MetricDisplay({ projectId, type }: { projectId: string, type: 'cpu' | 'ram' }) {
    const [value, setValue] = useState<number>(0);

    useEffect(() => {

        const fetchLatest = async () => {
            const { data } = await supabase
                .from('metrics')
                .select('cpu_usage, ram_usage')
                .eq('project_id', projectId)
                .order('timestamp', { ascending: false })
                .limit(1)
                .single();

            if (data) {
                setValue(type === 'cpu' ? data.cpu_usage : data.ram_usage);
            }
        }
        fetchLatest();


        const channel = supabase
            .channel(`metrics-realtime-${projectId}-${type}`)
            .on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'metrics',
                    filter: `project_id=eq.${projectId}`
                },
                (payload) => {
                    setValue(type === 'cpu' ? payload.new.cpu_usage : payload.new.ram_usage);
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel) };
    }, [projectId, type]);

    return (
        <span className="font-mono font-bold text-sm">
            {value.toFixed(1)}{type === 'cpu' ? '%' : ' MB'}
        </span>
    );
}