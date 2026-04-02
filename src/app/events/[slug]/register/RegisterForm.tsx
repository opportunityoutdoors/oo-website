"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface EventInfo {
  title: string;
  slug: string;
  event_type: string;
  date_start: string | null;
  date_end: string | null;
  location: string | null;
  cost: string | null;
}

interface ContactInfo {
  first_name: string | null;
  last_name: string | null;
  email: string;
  tshirt_size: string | null;
}

interface RegistrationData {
  id: string;
  status: string;
  role: string | null;
  contacts: ContactInfo;
  events: EventInfo;
}

const WAIVER_TEXT = `Opportunity Outdoors
Acknowledgment of Risks, Release of Liability,
and Indemnification Agreement

In consideration of being permitted to participate in the above-referenced event (the "Event") organized by Opportunity Outdoors, a North Carolina 501(c)(3) nonprofit corporation (the "Organization"), I, the undersigned participant ("Participant"), freely and voluntarily agree to the following:

1. Acknowledgment of Risks
I recognize and acknowledge that participation in the Event involves inherent and significant risks, hazards, and dangers that may result in serious bodily injury, permanent disability, or death, as well as property damage or loss. These risks include, but are not limited to:

• Accidental discharge of firearms (shotguns, rifles) or release of arrows from archery equipment
• Injury from ammunition, shot, or broadheads, whether self-inflicted or caused by other participants
• Falls, slips, or injuries resulting from steep, uneven, rocky, or slippery mountain terrain
• Exposure to extreme or rapidly changing weather conditions, including cold temperatures, rain, wind, lightning, fog, and hypothermia or heat-related illness
• Encounters with wildlife, including but not limited to bears, venomous snakes, ticks, spiders, and stinging insects
• Injuries related to primitive camping, including but not limited to campfire burns, cooking injuries, falling trees or limbs, and equipment failure
• Becoming lost or disoriented in remote wilderness areas with limited or no cellular service
• Delayed access to emergency medical services due to the remote location of the Event
• Risks associated with travel to and from the Event site
• Acts or omissions of other participants, mentors, volunteers, or third parties

I understand that the above list is not exhaustive and that other unknown or unanticipated risks may exist.

2. Voluntary Assumption of Risk
I voluntarily assume all risks associated with my participation in the Event, whether known or unknown, foreseeable or unforeseeable.

3. Release and Waiver of Liability
I, on behalf of myself, my heirs, personal representatives, executors, administrators, and assigns, hereby release, waive, discharge, and covenant not to sue Opportunity Outdoors and its officers, directors, board members, volunteers, mentors, staff, facilitating partners, site hosts, agents, contractors, successors, and assigns (collectively, the "Released Parties") from and against any and all claims, demands, actions, causes of action, suits, damages, losses, costs, expenses, and liabilities of every kind and nature whatsoever.

4. Indemnification
I agree to indemnify, defend, and hold harmless the Released Parties from and against any and all claims, demands, actions, suits, damages, losses, costs, and expenses brought by or on behalf of any third party arising out of or related to my acts, omissions, or conduct during the Event.

5. Physical Fitness and Personal Responsibility
I certify that I am in good physical health and have no medical condition, disability, or other impediment that would endanger myself or others during the Event.

6. Firearms and Equipment Safety
I agree to handle all firearms, archery equipment, and other hunting implements in a safe and responsible manner at all times, in accordance with all applicable North Carolina laws and regulations.

7. Emergency Medical Authorization
I authorize the Organization and its representatives to obtain or provide emergency medical treatment for me in the event of injury or illness during the Event.

8. Photo and Media Release
I grant the Organization permission to photograph, video record, or otherwise capture my likeness, image, and voice during the Event for promotional, educational, marketing, social media, and nonprofit fundraising purposes.

9. Minor Participants
If the Participant is under the age of 18, the undersigned parent or legal guardian acknowledges that they have read and understood this Agreement in its entirety, and agrees to all of its terms on behalf of the minor Participant.

10. Governing Law and Jurisdiction
This Agreement shall be governed by and construed in accordance with the laws of the State of North Carolina.

11. Severability
If any provision of this Agreement is found to be invalid, illegal, or unenforceable, such finding shall not affect the validity or enforceability of the remaining provisions.

12. Entire Agreement and Acknowledgment
This Agreement constitutes the entire agreement between the Participant and the Organization with respect to the subject matter hereof. I have carefully read this Agreement, fully understand its contents, and am aware that it contains a release of liability, an assumption of risk, and an indemnification obligation. I sign this Agreement voluntarily and of my own free will, as a condition of my participation in the Event.`;

const TSHIRT_SIZES = ["S", "M", "L", "XL", "2XL", "3XL"];

export default function RegisterForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [registration, setRegistration] = useState<RegistrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  const [tshirtSize, setTshirtSize] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [transportation, setTransportation] = useState("");
  const [dietaryMedical, setDietaryMedical] = useState("");
  const [waiverSigned, setWaiverSigned] = useState(false);
  const [waiverScrolled, setWaiverScrolled] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [mentorCommitment, setMentorCommitment] = useState(false);
  const [menteeCommitment, setMenteeCommitment] = useState(false);
  const [contactShareConsent, setContactShareConsent] = useState(false);
  const waiverRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function validate() {
      if (!token) {
        setError("Missing registration token");
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/register?token=${token}`);
      const data = await res.json();

      if (res.status === 400 && data.error === "already_registered") {
        setAlreadyRegistered(true);
        setRegistration(data.registration);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.error || "Invalid registration link");
        setLoading(false);
        return;
      }

      setRegistration(data);
      if (data.contacts?.tshirt_size) {
        setTshirtSize(data.contacts.tshirt_size);
      }
      setLoading(false);
    }

    validate();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!waiverSigned || !signatureName.trim()) return;

    setSubmitting(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        tshirt_size: tshirtSize,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
        transportation,
        dietary_medical: dietaryMedical,
        waiver_signed: waiverSigned,
      }),
    });

    if (res.ok) {
      setSuccess(true);
    } else {
      const data = await res.json();
      setError(data.error || "Something went wrong");
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-near-black/40">Validating your registration...</p>
      </div>
    );
  }

  if (error && !registration) {
    return (
      <div className="mx-auto max-w-lg px-6 pb-24 pt-36 text-center">
        <h1 className="mb-4 font-heading text-3xl font-[900] uppercase text-near-black">
          Registration Unavailable
        </h1>
        <p className="mb-8 text-near-black/60">{error}</p>
        <Link
          href="/events"
          className="inline-block rounded bg-dark-green px-8 py-3 text-[13px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:bg-dark-green/90"
        >
          View Events
        </Link>
      </div>
    );
  }

  if (alreadyRegistered && registration) {
    return (
      <div className="mx-auto max-w-lg px-6 pb-24 pt-36 text-center">
        <h1 className="mb-4 font-heading text-3xl font-[900] uppercase text-near-black">
          Already Registered
        </h1>
        <p className="mb-8 text-near-black/60">
          You&apos;ve already completed your registration for{" "}
          <strong>{registration.events.title}</strong>. We&apos;ll be in touch with more details as the event approaches.
        </p>
        <Link
          href="/events"
          className="inline-block rounded bg-dark-green px-8 py-3 text-[13px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:bg-dark-green/90"
        >
          View Events
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg px-6 pb-24 pt-36 text-center">
        <h1 className="mb-4 font-heading text-3xl font-[900] uppercase text-dark-green">
          You&apos;re Registered!
        </h1>
        <p className="mb-4 text-lg text-near-black/70">
          Your registration for <strong>{registration?.events.title}</strong> is confirmed.
        </p>
        <p className="mb-8 text-near-black/50">
          We&apos;ll send you a welcome packet with everything you need to know before the event. Keep an eye on your inbox.
        </p>
        <Link
          href="/"
          className="inline-block rounded bg-dark-green px-8 py-3 text-[13px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:bg-dark-green/90"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const event = registration!.events;
  const contact = registration!.contacts;

  function handleWaiverScroll() {
    const el = waiverRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
    if (atBottom) setWaiverScrolled(true);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 pb-20 pt-32">
      <h1 className="mb-2 font-heading text-[clamp(2rem,5vw,3rem)] font-[900] uppercase leading-tight tracking-tight text-near-black">
        Complete Your Registration
      </h1>
      <p className="mb-4 text-lg text-near-black/60">
        {event.title}
        {event.date_start && (
          <> · {new Date(event.date_start).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</>
        )}
        {event.location && <> · {event.location}</>}
      </p>

      <p className="mb-10 text-near-black/50">
        Registering as <strong className="text-near-black">{contact.first_name} {contact.last_name}</strong> ({contact.email})
      </p>

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Camp Details */}
        <section>
          <h2 className="mb-5 font-heading text-xl font-[900] uppercase tracking-tight text-near-black">
            Camp Details
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[1px] text-near-black/70">
                T-Shirt Size{registration!.role === "Mentor" ? " ($25, optional)" : ""} {registration!.role !== "Mentor" && <span className="text-red-500">*</span>}
              </label>
              <select
                required={registration!.role !== "Mentor"}
                value={tshirtSize}
                onChange={(e) => setTshirtSize(e.target.value)}
                className="w-full rounded border border-near-black/20 bg-white px-4 py-3 text-sm text-near-black focus:border-dark-green focus:outline-none focus:ring-1 focus:ring-dark-green"
              >
                <option value="">{registration!.role === "Mentor" ? "No thanks" : "Select size"}</option>
                {TSHIRT_SIZES.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[1px] text-near-black/70">
                Transportation
              </label>
              <select
                value={transportation}
                onChange={(e) => setTransportation(e.target.value)}
                className="w-full rounded border border-near-black/20 bg-white px-4 py-3 text-sm text-near-black focus:border-dark-green focus:outline-none focus:ring-1 focus:ring-dark-green"
              >
                <option value="">Select</option>
                <option value="driving-myself">Driving myself</option>
                <option value="need-ride">Need a ride</option>
                <option value="can-carpool">Can offer carpool seats</option>
              </select>
            </div>
          </div>
        </section>

        {/* Emergency Contact */}
        <section>
          <h2 className="mb-5 font-heading text-xl font-[900] uppercase tracking-tight text-near-black">
            Emergency Contact <span className="text-red-500">*</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[1px] text-near-black/70">
                Name
              </label>
              <input
                type="text"
                required
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                className="w-full rounded border border-near-black/20 bg-white px-4 py-3 text-sm text-near-black placeholder:text-near-black/40 focus:border-dark-green focus:outline-none focus:ring-1 focus:ring-dark-green"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[1px] text-near-black/70">
                Phone
              </label>
              <input
                type="tel"
                required
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className="w-full rounded border border-near-black/20 bg-white px-4 py-3 text-sm text-near-black placeholder:text-near-black/40 focus:border-dark-green focus:outline-none focus:ring-1 focus:ring-dark-green"
                placeholder="(555) 555-5555"
              />
            </div>
          </div>
        </section>

        {/* Dietary / Medical */}
        <section>
          <h2 className="mb-5 font-heading text-xl font-[900] uppercase tracking-tight text-near-black">
            Dietary &amp; Medical
          </h2>
          <textarea
            value={dietaryMedical}
            onChange={(e) => setDietaryMedical(e.target.value)}
            rows={3}
            className="w-full rounded border border-near-black/20 bg-white px-4 py-3 text-sm text-near-black placeholder:text-near-black/40 focus:border-dark-green focus:outline-none focus:ring-1 focus:ring-dark-green"
            placeholder='List any allergies, dietary needs, medications, or conditions we should know about. Write "None" if not applicable.'
          />
        </section>

        {/* Commitments & Consent */}
        <section>
          <h2 className="mb-5 font-heading text-xl font-[900] uppercase tracking-tight text-near-black">
            Commitments <span className="text-red-500">*</span>
          </h2>
          <div className="space-y-4">
            {registration!.role === "Mentor" ? (
              <label className="flex cursor-pointer items-start gap-3 rounded border border-near-black/10 bg-white p-4">
                <input
                  type="checkbox"
                  required
                  checked={mentorCommitment}
                  onChange={(e) => setMentorCommitment(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-near-black/30 accent-dark-green"
                />
                <span className="text-sm leading-relaxed text-near-black">
                  I understand that as a mentor, my role is to be a buddy to my assigned mentee(s). This means being available to offer advice and guidance, checking in with them before and after time in the field, and being a reliable presence throughout the camp. This is not a guided hunt. Hunting together is welcome but not required. I commit to prioritizing safety, ethical practices, and a positive experience for my mentee(s).
                </span>
              </label>
            ) : (
              <label className="flex cursor-pointer items-start gap-3 rounded border border-near-black/10 bg-white p-4">
                <input
                  type="checkbox"
                  required
                  checked={menteeCommitment}
                  onChange={(e) => setMenteeCommitment(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-near-black/30 accent-dark-green"
                />
                <span className="text-sm leading-relaxed text-near-black">
                  I understand that I will be assigned a mentor for this camp. My mentor is a volunteer who is there to support me, answer questions, and check in with me before and after time in the field. I commit to being respectful, communicative, and open to learning. This is not a guided hunt. Hunting together is welcome but not required.
                </span>
              </label>
            )}
            <label className="flex cursor-pointer items-start gap-3 rounded border border-near-black/10 bg-white p-4">
              <input
                type="checkbox"
                required
                checked={contactShareConsent}
                onChange={(e) => setContactShareConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-near-black/30 accent-dark-green"
              />
              <span className="text-sm leading-relaxed text-near-black">
                I agree to allow Opportunity Outdoors to share my name, email, and phone number with my assigned {registration!.role === "Mentor" ? "mentee(s)" : "mentor"} for the purpose of coordinating before and during the event. More details about your match will be included in the camp welcome packet.
              </span>
            </label>
          </div>
        </section>

        {/* Waiver */}
        <section>
          <h2 className="mb-5 font-heading text-xl font-[900] uppercase tracking-tight text-near-black">
            Waiver <span className="text-red-500">*</span>
          </h2>
          <div
            ref={waiverRef}
            onScroll={handleWaiverScroll}
            className="mb-2 h-72 overflow-y-scroll rounded border border-near-black/20 bg-white p-6 text-sm leading-relaxed text-near-black/70"
          >
            <pre className="whitespace-pre-wrap font-sans">{WAIVER_TEXT}</pre>
          </div>
          {!waiverScrolled && (
            <p className="mb-4 text-xs font-semibold text-gold">
              Please scroll to the bottom of the waiver to continue
            </p>
          )}

          <div className={`space-y-4 transition-opacity ${waiverScrolled ? "opacity-100" : "pointer-events-none opacity-30"}`}>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={waiverSigned}
                onChange={(e) => setWaiverSigned(e.target.checked)}
                disabled={!waiverScrolled}
                className="mt-0.5 h-4 w-4 rounded border-near-black/30 accent-dark-green"
              />
              <span className="text-sm text-near-black">
                I have read and agree to the Acknowledgment of Risks, Release of Liability, and Indemnification Agreement above. I understand that this is a legally binding document and I sign it voluntarily.
              </span>
            </label>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[1px] text-near-black/70">
                Electronic Signature <span className="text-red-500">*</span>
              </label>
              <p className="mb-2 text-xs text-near-black/40">
                Type your full legal name as your electronic signature
              </p>
              <input
                type="text"
                required
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                disabled={!waiverScrolled}
                placeholder="Your full legal name"
                className="w-full rounded border border-near-black/20 bg-white px-4 py-3 font-serif text-lg italic text-near-black placeholder:text-near-black/30 focus:border-dark-green focus:outline-none focus:ring-1 focus:ring-dark-green"
              />
              {signatureName.trim() && (() => {
                const expected = `${contact.first_name || ""} ${contact.last_name || ""}`.trim().toLowerCase();
                const entered = signatureName.trim().toLowerCase();
                if (expected && entered !== expected) {
                  return (
                    <p className="mt-2 text-xs text-gold">
                      The name you entered doesn&apos;t match the name on your registration ({contact.first_name} {contact.last_name}). Please enter your full legal name.
                    </p>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </section>

        {/* Payment — show for mentees always, mentors only if t-shirt selected */}
        {(registration!.role !== "Mentor" || tshirtSize) && (
          <section>
            <h2 className="mb-5 font-heading text-xl font-[900] uppercase tracking-tight text-near-black">
              Payment
            </h2>
            <div className="rounded border border-near-black/10 bg-white p-6">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-sm font-semibold text-near-black">
                  {registration!.role === "Mentor" ? "T-Shirt Fee" : "Registration Fee"}
                </p>
                <p className="text-2xl font-extrabold text-dark-green">
                  {registration!.role === "Mentor" ? "$25" : (event.cost || "Free")}
                </p>
              </div>
              {/* Stripe Elements will go here */}
              <div className="rounded border border-dashed border-near-black/15 bg-cream/50 px-5 py-8 text-center">
                <p className="text-sm font-medium text-near-black/50">Payment processing coming soon</p>
                <p className="mt-1 text-xs text-near-black/30">You can complete your registration now. Payment will be collected separately.</p>
              </div>
            </div>
          </section>
        )}

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !waiverSigned || !signatureName.trim() || !waiverScrolled || !contactShareConsent || (registration!.role === "Mentor" ? !mentorCommitment : !menteeCommitment)}
          className="w-full rounded bg-dark-green px-8 py-4 text-[13px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:bg-dark-green/90 disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Complete Registration"}
        </button>
      </form>
    </div>
  );
}
