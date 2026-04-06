import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function TransitTimer({ assignedAt }: { assignedAt: string }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const update = () => {
      const totalSecs = Math.floor((Date.now() - new Date(assignedAt).getTime()) / 1000);
      setElapsed(totalSecs < 60 ? `${totalSecs}s` : `${Math.floor(totalSecs / 60)}m ${totalSecs % 60}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [assignedAt]);

  const totalMins = Math.floor((Date.now() - new Date(assignedAt).getTime()) / 60000);
  const color = totalMins >= 30 ? 'text-red-400' : totalMins >= 15 ? 'text-orange-400' : 'text-yellow-300';

  return (
    <span className={`font-mono font-medium ${color}`}>
      <Clock className="w-3 h-3 inline mr-1" />
      {elapsed}
    </span>
  );
}

