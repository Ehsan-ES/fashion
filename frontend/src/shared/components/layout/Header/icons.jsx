const base = {
  width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: "false",
};

export const SearchIcon = (p) => (<svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>);
export const HeartIcon = (p) => (<svg {...base} {...p}><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" /></svg>);
export const BagIcon = (p) => (<svg {...base} {...p}><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>);
export const UserIcon = (p) => (<svg {...base} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></svg>);
export const MenuIcon = (p) => (<svg {...base} {...p}><path d="M4 8h16M4 16h16" /></svg>);
export const CloseIcon = (p) => (<svg {...base} {...p}><path d="M5 5l14 14M19 5L5 19" /></svg>);
export const ChevronIcon = (p) => (<svg {...base} width={14} height={14} {...p}><path d="m6 9 6 6 6-6" /></svg>);
