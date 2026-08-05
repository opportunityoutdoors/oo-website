"use client";

import { useState } from "react";
import {
  MIN_CENTS,
  bankSavingCents,
  worthSuggestingBank,
  feeSurchargeCents,
  formatCents,
  type Frequency,
  type PayMethod,
} from "@/lib/stripe/giving";

// The giving form. Collects an amount and a frequency, then hands off to Stripe Checkout,
// which is where card details are entered. Nothing sensitive is typed on this page, which
// is the entire reason for using Checkout rather than a self-hosted card field.

type Tier = { name: string; cents: number; description: string; featured?: boolean };

// Amounts mirror ONE_TIME_PRESETS and MONTHLY_PRESETS in lib/stripe/giving.ts. The server
// re-validates whatever arrives, so these are a starting point for the donor rather than a
// constraint: the custom field can send anything within the min and max.
const ONE_TIME_TIERS: Tier[] = [
  {
    name: "Supporter",
    cents: 2500,
    description:
      "Covers camp supplies, range fees, or educational materials for one participant.",
  },
  {
    name: "Sponsor a Mentee",
    cents: 10000,
    description:
      "Fully funds one mentee's camp experience, including registration, meals, and gear lending.",
    featured: true,
  },
  {
    name: "Camp Sponsor",
    cents: 50000,
    description:
      "Underwrites an entire camp weekend: venue, meals, insurance, and supplies for all participants.",
  },
];

const MONTHLY_TIERS: Tier[] = [
  {
    name: "Supporter",
    cents: 1000,
    description:
      "Keeps the gear lending library stocked so cost is never the reason someone stays home.",
  },
  {
    name: "Sustainer",
    cents: 2500,
    description:
      "Funds a mentee's full camp experience every year, without us having to ask again.",
    featured: true,
  },
  {
    name: "Camp Sponsor",
    cents: 5000,
    description:
      "Underwrites a camp weekend annually and lets us plan a season ahead instead of a camp at a time.",
  },
];

export default function DonateForm({ canceled }: { canceled?: boolean }) {
  const [frequency, setFrequency] = useState<Frequency>("once");
  const [payMethod, setPayMethod] = useState<PayMethod>("card");
  const [selectedCents, setSelectedCents] = useState<number | null>(10000);
  const [customValue, setCustomValue] = useState("");
  const [coverFees, setCoverFees] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tiers = frequency === "once" ? ONE_TIME_TIERS : MONTHLY_TIERS;

  // A custom entry wins over any selected tier. Parsed as dollars and converted here so
  // the rest of the component only ever deals in cents.
  const customCents = (() => {
    const n = parseFloat(customValue);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(n * 100);
  })();

  const giftCents = customCents ?? selectedCents;

  // ACH is one-time only, so a monthly gift is always card regardless of the toggle state.
  const effectiveMethod: PayMethod = frequency === "monthly" ? "card" : payMethod;

  const surcharge = giftCents ? feeSurchargeCents(giftCents, effectiveMethod) : 0;
  const totalCents = giftCents ? (coverFees ? giftCents + surcharge : giftCents) : 0;

  // Bank is cheaper at every amount, so the nudge is gated on the saving being big enough
  // to justify a four-day wait rather than on which method wins.
  const suggestBank =
    frequency === "once" && giftCents !== null && worthSuggestingBank(giftCents);

  function selectTier(cents: number) {
    setSelectedCents(cents);
    // Clearing the custom field is what makes the tier click actually take effect, since
    // a custom value takes precedence.
    setCustomValue("");
    setError(null);
  }

  async function submit() {
    if (!giftCents || giftCents < MIN_CENTS) {
      setError(`Please choose an amount of at least ${formatCents(MIN_CENTS)}.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/donate/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents: giftCents,
          frequency,
          coverFees,
          payMethod: effectiveMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Could not start checkout. Please try again.");
        setSubmitting(false);
        return;
      }

      // Full navigation, not a router push: the destination is Stripe's domain.
      // assign() rather than setting location.href, which the immutability lint reads as
      // mutating an external value.
      window.location.assign(data.url);
    } catch {
      setError("Could not reach the server. Please check your connection.");
      setSubmitting(false);
    }
  }

  return (
    <div>
      {canceled && (
        <div className="mb-8 rounded-lg border border-near-black/10 bg-white px-6 py-4 text-center">
          <p className="text-sm text-near-black/70">
            No payment was taken. Pick up where you left off whenever you are
            ready.
          </p>
        </div>
      )}

      {/* Frequency */}
      <div className="mb-10 flex justify-center">
        <div
          role="radiogroup"
          aria-label="Donation frequency"
          className="inline-flex rounded-lg border border-near-black/15 bg-white p-1"
        >
          {(
            [
              ["once", "One-Time"],
              ["monthly", "Monthly"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={frequency === value}
              onClick={() => {
                setFrequency(value);
                // Presets differ between the two, so carrying a selection across would
                // leave a highlighted card that no longer matches the chosen amount.
                setSelectedCents(value === "once" ? 10000 : 2500);
                setCustomValue("");
                setError(null);
              }}
              className={`rounded px-7 py-2.5 text-[13px] font-bold uppercase tracking-[1px] transition-colors ${
                frequency === value
                  ? "bg-dark-green text-white"
                  : "text-near-black/60 hover:text-near-black"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Amounts */}
      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => {
          const active = !customCents && selectedCents === tier.cents;
          return (
            <button
              key={tier.name}
              type="button"
              onClick={() => selectTier(tier.cents)}
              aria-pressed={active}
              className={`relative rounded-lg border-2 p-8 text-center transition-colors ${
                active
                  ? "border-dark-green bg-dark-green/5"
                  : tier.featured
                    ? "border-gold bg-gold/5 hover:border-dark-green/40"
                    : "border-near-black/10 bg-white hover:border-dark-green/40"
              }`}
            >
              {tier.featured && !active && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-near-black">
                  Most Popular
                </span>
              )}
              {active && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded bg-dark-green px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  Selected
                </span>
              )}
              <h3 className="text-2xl font-extrabold text-near-black">{tier.name}</h3>
              <p className="mt-2 text-[48px] font-black leading-none text-dark-green">
                {formatCents(tier.cents)}
                {frequency === "monthly" && (
                  <span className="text-[18px] font-bold">/mo</span>
                )}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-near-black/60">
                {tier.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Custom amount, fee opt-in, submit */}
      <div className="mx-auto mt-10 max-w-xl rounded-lg border border-near-black/10 bg-white p-8">
        <label
          htmlFor="custom-amount"
          className="block text-[12px] font-bold uppercase tracking-[1px] text-near-black"
        >
          Or enter your own amount
        </label>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-2xl font-bold text-near-black/40">$</span>
          <input
            id="custom-amount"
            type="number"
            inputMode="decimal"
            min="5"
            step="1"
            placeholder="0"
            value={customValue}
            onChange={(e) => {
              setCustomValue(e.target.value);
              setError(null);
            }}
            className="w-full rounded border border-near-black/15 px-3 py-2.5 text-lg text-near-black outline-none focus:border-dark-green"
          />
          {frequency === "monthly" && (
            <span className="text-sm font-semibold text-near-black/50">/mo</span>
          )}
        </div>

        {/* Payment method. Chosen here rather than on Stripe's page because the fee-cover
            surcharge below depends on it, and the two rates differ enough that quoting the
            wrong one would overcharge a bank donor by up to $50 on a large gift. */}
        {frequency === "once" && (
          <div className="mt-6">
            <span className="block text-[12px] font-bold uppercase tracking-[1px] text-near-black">
              How would you like to pay?
            </span>
            <div
              role="radiogroup"
              aria-label="Payment method"
              className="mt-2 grid gap-2 sm:grid-cols-2"
            >
              {(
                [
                  ["card", "Card", "Instant"],
                  ["bank", "Bank transfer", "About 4 business days"],
                ] as const
              ).map(([value, label, note]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={payMethod === value}
                  onClick={() => setPayMethod(value)}
                  className={`rounded border-2 px-4 py-3 text-left transition-colors ${
                    payMethod === value
                      ? "border-dark-green bg-dark-green/5"
                      : "border-near-black/10 bg-white hover:border-dark-green/40"
                  }`}
                >
                  <span className="block text-sm font-bold text-near-black">
                    {label}
                  </span>
                  <span className="block text-xs text-near-black/50">{note}</span>
                </button>
              ))}
            </div>
            {suggestBank && payMethod === "card" && (
              <p className="mt-2 text-xs leading-relaxed text-near-black/60">
                Bank transfer costs us{" "}
                {formatCents(bankSavingCents(giftCents!))}{" "}
                less in fees on a gift this size, if you do not mind it taking a
                few days.
              </p>
            )}
          </div>
        )}

        {giftCents ? (
          <label className="mt-6 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={coverFees}
              onChange={(e) => setCoverFees(e.target.checked)}
              className="mt-1 h-4 w-4 accent-[#2D5016]"
            />
            <span className="text-sm leading-relaxed text-near-black/70">
              Add {formatCents(surcharge)} to cover processing fees, so the full{" "}
              {formatCents(giftCents)} reaches the programs.
            </span>
          </label>
        ) : null}

        {effectiveMethod === "bank" && (
          <p className="mt-4 rounded border border-near-black/10 bg-cream/50 px-4 py-3 text-xs leading-relaxed text-near-black/60">
            Bank transfers take about four business days to clear. Your receipt
            arrives once the funds land, not straight away, because it has to
            state money we have actually received.
          </p>
        )}

        {error && (
          <p className="mt-5 rounded border border-[#b00]/20 bg-[#b00]/5 px-4 py-3 text-sm text-[#b00]">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={submitting || !giftCents}
          className="mt-6 w-full rounded bg-dark-green px-6 py-4 text-[13px] font-bold uppercase tracking-[1px] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting
            ? "Redirecting to checkout..."
            : giftCents
              ? `Donate ${formatCents(totalCents)}${frequency === "monthly" ? " Monthly" : ""}`
              : "Choose an amount"}
        </button>

        <p className="mt-4 text-center text-xs leading-relaxed text-near-black/50">
          Payments are processed securely by Stripe. Card details are entered on
          Stripe and never touch this site. You will get a tax-deductible receipt
          by email.
        </p>
      </div>
    </div>
  );
}
