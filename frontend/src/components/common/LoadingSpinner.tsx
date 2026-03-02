import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ size = 24, text }: { size?: number; text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8">
      <Loader2 size={size} className="animate-spin text-primary-500" />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  );
}
