import { CheckCircle2 } from "lucide-react";

interface VerifiedBadgeProps {
  className?: string;
  showText?: boolean;
}

export const VerifiedBadge = ({ className = "", showText = false }: VerifiedBadgeProps) => {
  return (
    <div className={`inline-flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full text-xs font-semibold border border-blue-100 ${className}`}>
      <CheckCircle2 size={14} className="fill-blue-600 text-white" />
      {showText && <span>Verified</span>}
    </div>
  );
};
