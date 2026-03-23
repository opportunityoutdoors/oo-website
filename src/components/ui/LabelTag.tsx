interface LabelTagProps {
  children: React.ReactNode;
  variant?: "gold" | "white";
}

export default function LabelTag({
  children,
  variant = "gold",
}: LabelTagProps) {
  const colorClasses =
    variant === "white"
      ? "text-white border-white"
      : "text-[#8B6914] border-[#8B6914]";

  return (
    <span
      className={`inline-block border-2 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[3px] ${colorClasses}`}
    >
      {children}
    </span>
  );
}
