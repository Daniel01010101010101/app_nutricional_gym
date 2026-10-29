import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden className={cn('size-8', className)}>
      <defs>
        <linearGradient id="forja-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffa04d" />
          <stop offset="1" stopColor="#ff4d00" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="#0c0d0f" />
      <path fill="url(#forja-logo-g)" d="M150 112h222v64H218v52h102v58H218v114h-68z" />
      <rect x="380" y="88" width="30" height="112" rx="8" fill="url(#forja-logo-g)" />
      <rect x="416" y="110" width="18" height="68" rx="6" fill="url(#forja-logo-g)" />
      <rect x="368" y="132" width="16" height="24" rx="3" fill="url(#forja-logo-g)" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="font-display text-2xl leading-none font-bold tracking-wider">FORJA</span>
    </span>
  )
}
