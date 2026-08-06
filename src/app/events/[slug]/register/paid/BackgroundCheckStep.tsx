/**
 * The outstanding background check, shown on the page immediately after payment.
 *
 * Deliberately prominent rather than a footnote. This is the one step left between a paid
 * registration and actually attending, and the moment someone has just paid is the most
 * likely they will ever be to finish it. The provider also emails a link, but treating that
 * email as the primary route is how a paid registrant quietly fails to attend: invites land
 * in spam, get archived, or are simply never opened.
 *
 * Links out rather than embedding because the provider's apply page sends
 * x-frame-options: SAMEORIGIN and cannot be iframed. Opens in a new tab so this page, with
 * its confirmation and its link, survives the detour.
 */
export default function BackgroundCheckStep({ url }: { url: string | null }) {
  return (
    <div className="mt-8 rounded-lg border-2 border-gold bg-gold/5 p-6 text-left">
      <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-near-black/50">
        One more step
      </p>
      <h2 className="mt-1 font-heading text-xl font-[900] uppercase tracking-tight text-near-black">
        Complete Your Background Check
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed text-near-black/70">
        We run a background check on every adult who attends a camp, because
        most of our participants are kids. It takes about three minutes, and the
        cost is already covered by what you just paid.
      </p>
      <p className="mt-3 text-[15px] leading-relaxed text-near-black/70">
        Your information goes directly to our screening provider, not to us. We
        only ever see a pass or fail.
      </p>

      {url ? (
        <>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-block rounded bg-dark-green px-8 py-3.5 text-[13px] font-bold uppercase tracking-[1px] text-white transition-colors hover:bg-dark-green/90"
          >
            Start Background Check
          </a>
          <p className="mt-4 text-sm leading-relaxed text-near-black/50">
            We have also emailed you this link, so you can finish later if now is
            not a good time. Your spot is held either way.
          </p>
        </>
      ) : (
        // No link yet. The invite is created after payment, so a fast redirect can land here
        // first. Saying so beats an inert button or an empty space.
        <p className="mt-5 rounded border border-near-black/10 bg-white px-5 py-4 text-sm leading-relaxed text-near-black/70">
          We are setting up your background check now. The link will arrive by
          email within a few minutes. If it has not appeared within the hour,
          email{" "}
          <a
            href="mailto:info@opportunityoutdoors.org"
            className="font-semibold text-dark-green hover:underline"
          >
            info@opportunityoutdoors.org
          </a>{" "}
          and we will resend it.
        </p>
      )}
    </div>
  );
}
