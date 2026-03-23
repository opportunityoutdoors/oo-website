interface SectionContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function SectionContainer({
  children,
  className = "",
}: SectionContainerProps) {
  return (
    <div className={`mx-auto max-w-[1200px] px-6 md:px-10 ${className}`}>
      {children}
    </div>
  );
}
