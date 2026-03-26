"use client";

const corporateTiers = [
  {
    name: "Camp Sponsor",
    badge: null,
    benefits: [
      "Logo on event signage and materials",
      "Social media recognition (3 posts)",
      "Logo on website partners section",
      "Mention in event recap blog post",
    ],
  },
  {
    name: "Season Sponsor",
    badge: "Most Popular",
    benefits: [
      "Everything in Camp Sponsor",
      "Logo on all event materials for the season",
      "Dedicated social media feature",
      "Podcast ad read (1 episode)",
      "Logo placement on camp t-shirts",
    ],
  },
  {
    name: "Founding Partner",
    badge: null,
    benefits: [
      "Everything in Season Sponsor",
      "Custom content collaboration",
      "Full podcast episode sponsorship",
      "Speaking opportunity at events",
      "Premium logo placement across all channels",
      "Annual impact report feature",
    ],
  },
];

export default function SponsorshipTiers() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {corporateTiers.map((tier) => (
        <div
          key={tier.name}
          className={`relative rounded-lg border-2 p-8 ${
            tier.badge
              ? "border-gold bg-gold/5"
              : "border-near-black/10 bg-white"
          }`}
        >
          {tier.badge && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-near-black">
              {tier.badge}
            </span>
          )}
          <h3 className="text-xl font-extrabold text-near-black">
            {tier.name}
          </h3>
          <p className="mt-2 text-sm font-semibold uppercase tracking-wider text-dark-green">
            Inquire for Details
          </p>
          <ul className="mt-6 space-y-2.5">
            {tier.benefits.map((benefit) => (
              <li
                key={benefit}
                className="flex items-start gap-2 text-sm text-near-black/60"
              >
                <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                {benefit}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() =>
              document
                .getElementById("inquiry-form")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="mt-6 w-full rounded bg-dark-green px-6 py-3 text-[13px] font-bold uppercase tracking-[1px] text-white transition-colors hover:bg-dark-green/90"
          >
            Learn More
          </button>
        </div>
      ))}
    </div>
  );
}
