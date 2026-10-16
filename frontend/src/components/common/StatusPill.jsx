import { cn } from '@/lib/utils';

const variants = {
  default: 'border-[#e2e7eb] bg-[#f7f9fb] text-[#6e7d88]',
  pending: 'border-[#f0ddb8] bg-[#fff9ed] text-[#946d23]',
  info: 'border-[#d7e8ec] bg-[#eef7f9] text-[#236278]',
  success: 'border-[#c6e4d2] bg-[#e8f5ee] text-[#2e7d58]',
  error: 'border-[#f0c6c2] bg-[#fdedeb] text-[#c0392b]',
};

export default function StatusPill({ children, variant = 'default', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full text-[11px] font-bold px-[10px] py-[5px] border',
        variants[variant] || variants.default,
        className
      )}
    >
      {children}
    </span>
  );
}
