import { AlertCircle } from 'lucide-react';

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <AlertCircle size={32} className="text-red-400" />
      <p className="text-sm text-gray-600">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary text-sm">
          다시 시도
        </button>
      )}
    </div>
  );
}
