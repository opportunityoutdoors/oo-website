import Link from "next/link";

interface ButtonProps {
  href?: string;
  variant?: "primary" | "outline" | "outline-white";
  children: React.ReactNode;
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
}

export default function Button({
  href,
  variant = "primary",
  children,
  className = "",
  type = "button",
  onClick,
}: ButtonProps) {
  const base =
    "inline-block rounded px-9 py-4 text-[13px] font-bold uppercase tracking-[1.5px] transition-all text-center";

  const variants = {
    primary: "bg-white text-near-black hover:bg-cream",
    outline:
      "border-2 border-near-black/20 text-near-black hover:border-near-black/40",
    "outline-white":
      "border-2 border-white/50 text-white hover:border-white",
  };

  const classes = `${base} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} onClick={onClick}>
      {children}
    </button>
  );
}
