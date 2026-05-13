type IconProps = {
  className?: string;
};

export const VheyMarkIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
    <defs>
      <linearGradient id="vhey-mark-bg" x1="7" y1="6" x2="42" y2="43" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ff2f92" />
        <stop offset="0.48" stopColor="#ff89ca" />
        <stop offset="1" stopColor="#53f0ff" />
      </linearGradient>
      <linearGradient id="vhey-mark-v" x1="14" y1="13" x2="34" y2="36" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fff5fb" />
        <stop offset="0.62" stopColor="#14111d" />
        <stop offset="1" stopColor="#07090f" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="40" height="40" rx="11" fill="url(#vhey-mark-bg)" />
    <path
      d="M8 12.5C8 10 10 8 12.5 8H34L8 34V12.5Z"
      fill="#fff5fb"
      opacity="0.28"
    />
    <path
      d="M13.6 15.2h7.1l4.1 15.1 4.7-15.1h6.9L28.5 35h-7.4L13.6 15.2Z"
      fill="url(#vhey-mark-v)"
    />
    <path
      d="M22.1 15.2h5.7l-2.9 8.9-2.8-8.9Z"
      fill="#53f0ff"
      opacity="0.65"
    />
    <path
      d="M13.6 15.2h7.1l4.1 15.1 4.7-15.1h6.9"
      fill="none"
      stroke="#07090f"
      strokeOpacity="0.35"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

export const UploadIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 15V4m0 0 4 4m-4-4-4 4" />
    <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
  </svg>
);

export const SparkIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="m12 3 1.7 5.1L19 10l-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9L12 3Z" />
    <path d="m18 15 .8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15Z" />
  </svg>
);

export const ChainIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9.5 14.5 14.5 9.5" />
    <path d="M8.2 10.8 6.8 12.2a4 4 0 0 0 5.7 5.6l1.4-1.4" />
    <path d="m10.1 7.6 1.4-1.4a4 4 0 0 1 5.7 5.6l-1.4 1.4" />
  </svg>
);

export const WalletIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 17.5v-10Z" />
    <path d="M16 12h4v4h-4a2 2 0 0 1 0-4Z" />
    <path d="M6 5h10" />
  </svg>
);

export const BoxIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
    <path d="M4.5 7.8 12 12l7.5-4.2" />
    <path d="M12 12v8.5" />
  </svg>
);

export const CheckIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="m5 12 4 4L19 6" />
  </svg>
);
