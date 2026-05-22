export default function RunnerLogo({ className = '' }) {
  return (
    <svg
      viewBox="0 0 44 48"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Head */}
      <circle cx="20" cy="6" r="4.5" />

      {/* Torso */}
      <path
        d="M20 10.5 L20 26"
        fill="none"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* Left arm — swinging forward */}
      <path
        d="M20 15 L12 22"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Right arm — carrying package at side */}
      <path
        d="M20 15 L29 22"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Package */}
      <rect x="27" y="20" width="11" height="9" rx="1.5" />

      {/* Left leg — forward stride */}
      <path
        d="M20 26 L13 37 L10 46"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right leg — back stride */}
      <path
        d="M20 26 L26 36 L29 46"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
