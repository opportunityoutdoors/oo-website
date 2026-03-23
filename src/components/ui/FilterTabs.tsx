"use client";

interface FilterTabsProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function FilterTabs({
  tabs,
  activeTab,
  onTabChange,
}: FilterTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onTabChange(tab)}
          className={`rounded px-5 py-2.5 text-[13px] font-bold uppercase tracking-[1px] transition-colors ${
            activeTab === tab
              ? "bg-dark-green text-white"
              : "bg-warm-gray text-near-black/60 hover:bg-near-black/10"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
