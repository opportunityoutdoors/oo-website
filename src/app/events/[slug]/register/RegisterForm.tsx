"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import SurveyQuestions, { EMPTY_ANSWERS } from "@/components/forms/SurveyQuestions";
import ResumePaymentButton from "@/components/forms/ResumePaymentButton";
import { scaleQuestions, type SurveyAnswers } from "@/lib/surveys/questions";
import { evaluateEligibility } from "@/lib/background-check/eligibility";
import {
  SUGGESTED_MENTOR_DONATION_CENTS,
  computeCampCharge,
  formatFee,
} from "@/lib/stripe/camp-fees";

interface EventInfo {
  title: string;
  slug: string;
  event_type: string;
  date_start: string | null;
  date_end: string | null;
  location: string | null;
  /** Display copy only ("Free", "$75"). Never parse this for a price. */
  cost: string | null;
  /** Authoritative numeric fee per paying participant, in dollars. */
  registration_fee: number | null;
}

interface ContactInfo {
  /** Null for contacts created before the field existed. Prompted for when missing. */
  date_of_birth: string | null;
  /** Drives whether a background check line appears in the total. */
  background_check_status: string | null;
  background_check_expires_at: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  tshirt_size: string | null;
}

interface MinorInfo {
  id: string;
  role: string;
  contacts: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    tshirt_size: string | null;
    date_of_birth: string | null;
  };
}

interface RegistrationData {
  id: string;
  status: string;
  role: string | null;
  /** 'none' | 'pending' | 'paid'. Independent of `status`: payment does not gate registration. */
  payment_status: string | null;
  contacts: ContactInfo;
  events: EventInfo;
  linked_minor: MinorInfo | null;
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

10. Background Screening and Duty to Disclose
I understand that Opportunity Outdoors requires a background check of every participant aged 18 or older, and I consent to one being conducted. I confirm that I have no pending criminal charges that I have not disclosed to the Organization. I further agree that if I am charged with any offense between now and the Event, I will notify the Organization immediately and voluntarily suspend my participation pending review. I understand that failing to disclose a pending charge is itself grounds for removal from the Event.

11. Governing Law and Jurisdiction
This Agreement shall be governed by and construed in accordance with the laws of the State of North Carolina.

12. Severability
If any provision of this Agreement is found to be invalid, illegal, or unenforceable, such finding shall not affect the validity or enforceability of the remaining provisions.

13. Code of Conduct
I agree to follow the Opportunity Outdoors Code of Conduct at all times during the Event:

• Firearm Safety. Firearms stay unloaded in camp and in vehicles. Load only at your spot. Control your muzzle at all times.
• Follow the Law. Hunt with a valid license. Follow game land rules and bag limits, and report every harvest.
• Minors. Anyone under 18 has a parent or guardian with them at all times, in camp and in the field.
• Hunt Ethically. Fair chase only. Take ethical shots and make every effort to recover your game.
• Respect Others. Zero tolerance for harassment, discrimination, or bullying. No politics or religion at camp.
• Leave No Trace. Pack out what you pack in. Respect the land and give other public-land hunters room.

I understand that if I break this code, I will be asked to leave the Event, and my registration fee will not be refunded.

14. Entire Agreement and Acknowledgment
This Agreement constitutes the entire agreement between the Participant and the Organization with respect to the subject matter hereof. I have carefully read this Agreement, fully understand its contents, and am aware that it contains a release of liability, an assumption of risk, an indemnification obligation, and a code of conduct. I sign this Agreement voluntarily and of my own free will, as a condition of my participation in the Event.`;

const TSHIRT_SIZES = ["S", "M", "L", "XL", "2XL", "3XL"];

export default function RegisterForm({
  /** Whether the server can actually create a Checkout Session. See page.tsx. */
  stripeReady = false,
}: {
  stripeReady?: boolean;
}) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [registration, setRegistration] = useState<RegistrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  const [tshirtSize, setTshirtSize] = useState("");
  // Only collected when absent. See the note by the field below.
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [minorDateOfBirth, setMinorDateOfBirth] = useState("");
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
  const [minorTshirtSize, setMinorTshirtSize] = useState("");
  const [minorDietaryMedical, setMinorDietaryMedical] = useState("");
  // Voluntary, and zero by default. A pre-filled suggestion would be a charge somebody has
  // to notice and remove, which is not the same thing as being asked.
  const [donation, setDonation] = useState(0);
  const [survey, setSurvey] = useState<SurveyAnswers>(EMPTY_ANSWERS);
  const [minorSurvey, setMinorSurvey] = useState<SurveyAnswers>(EMPTY_ANSWERS);
  const waiverRef = useRef<HTMLDivElement>(null);
  // Which step is on screen. The form used to be one long page: details, survey,
  // commitments, waiver and payment stacked together, which meant reading a liability
  // waiver in the same breath as picking a t-shirt size. Splitting it does not change what
  // is collected or when it is saved, only how much is asked at once.
  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);
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
        date_of_birth: dateOfBirth || null,
        minor_date_of_birth: minorDateOfBirth || null,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
        transportation,
        dietary_medical: dietaryMedical,
        waiver_signed: waiverSigned,
        waiver_text: WAIVER_TEXT,
        signature_name: signatureName,
        minor_tshirt_size: minorTshirtSize || null,
        minor_dietary_medical: minorDietaryMedical || null,
        donation_cents: donation,
        survey,
        minor_survey: registration?.linked_minor ? minorSurvey : null,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      // The registration is already saved at this point. If there is a balance, the server
      // hands back a Checkout URL and we send them straight there rather than showing a
      // success screen they would have to click past. If checkout could not be created,
      // checkoutUrl is null and they still land on the success screen: the registration
      // stands either way, and the balance is chaseable from the admin.
      if (data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
        return;
      }
      setSuccess(true);
    } else {
      const data = await res.json();
      setError(data.error || "Something went wrong");
    }
    setSubmitting(false);
  }


  /**
   * What each step needs before it will let you move on.
   *
   * Validated here rather than by the browser's `required`, because native validation on a
   * hidden step silently blocks submission with an error nobody can see: the field it is
   * complaining about is not on screen. This says which step and why.
   */
  function validateStep(n: number): string | null {
    const r = registration;
    if (!r) return "Registration is still loading.";

    if (n === 1) {
      if (!tshirtSize) return "Choose a t-shirt size.";
      if (!r.contacts.date_of_birth && !dateOfBirth) return "Enter your date of birth.";
      if (!emergencyName.trim() || !emergencyPhone.trim())
        return "Add an emergency contact name and phone number.";
      if (r.role !== "Mentor" && !transportation) return "Choose a transportation option.";
      if (r.linked_minor) {
        if (!minorTshirtSize) return `Choose a t-shirt size for ${r.linked_minor.contacts.first_name}.`;
        if (!r.linked_minor.contacts.date_of_birth && !minorDateOfBirth)
          return `Enter ${r.linked_minor.contacts.first_name}'s date of birth.`;
      }
      return null;
    }

    if (n === 2) {
      const keys = scaleQuestions(r.events.event_type).map((q) => q.key);
      const missing = keys.some((k) => !survey[k]);
      if (missing) return "Answer every question before continuing.";
      if (r.linked_minor && keys.some((k) => !minorSurvey[k]))
        return `Answer every question for ${r.linked_minor.contacts.first_name}.`;
      return null;
    }

    if (n === 3) {
      const commitment = r.role === "Mentor" ? mentorCommitment : menteeCommitment;
      if (!commitment) return "Confirm the commitment above.";
      if (!contactShareConsent) return "Confirm the contact sharing consent.";
      if (!waiverScrolled) return "Read to the bottom of the waiver.";
      if (!waiverSigned) return "Tick the box to accept the waiver.";
      if (!signatureName.trim()) return "Type your full name as your signature.";
      return null;
    }

    return null;
  }

  function goNext() {
    const problem = validateStep(step);
    if (problem) {
      setStepError(problem);
      return;
    }
    setStepError(null);
    setStep((n) => n + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setStepError(null);
    setStep((n) => Math.max(1, n - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    // Registration and payment are separate states, because payment deliberately does not
    // gate registration. Someone who abandoned checkout is fully registered AND still owes
    // money, and this screen used to tell them only the first half: "you're all set", no
    // mention of a balance, no way to pay, no route forward but email. Reachable in one
    // click from the confirmation email, so it has to carry the balance.
    const owesMoney = registration.payment_status === "pending";

    return (
      <div className="mx-auto max-w-lg px-6 pb-24 pt-36 text-center">
        <h1 className="mb-4 font-heading text-3xl font-[900] uppercase text-near-black">
          Already Registered
        </h1>
        <p className="mb-8 text-near-black/60">
          You&apos;ve already completed your registration for{" "}
          <strong>{registration.events.title}</strong>.{" "}
          {owesMoney
            ? "Your spot is held. There is still a balance outstanding."
            : "We'll be in touch with more details as the event approaches."}
        </p>

        {owesMoney ? (
          <>
            <ResumePaymentButton token={token} />
            <p className="mt-6 text-sm leading-relaxed text-near-black/50">
              Trouble paying, or need to arrange something different? Email{" "}
              <a
                href="mailto:info@opportunityoutdoors.org"
                className="font-semibold text-dark-green hover:underline"
              >
                info@opportunityoutdoors.org
              </a>{" "}
              and we will work it out. Cost should not be the reason someone
              stays home.
            </p>
          </>
        ) : (
          <Link
            href="/events"
            className="inline-block rounded bg-dark-green px-8 py-3 text-[13px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:bg-dark-green/90"
          >
            View Events
          </Link>
        )}
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
  const minor = registration!.linked_minor;

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
        {minor && (
          <> and <strong className="text-near-black">{minor.contacts.first_name} {minor.contacts.last_name}</strong> (minor)</>
        )}
      </p>

      <form onSubmit={handleSubmit} className="space-y-10">
        <StepRail step={step} />

        {/* Step 1: who you are and what we need to run the camp safely. */}
        {step === 1 && (
        <>
        {/* Camp Details */}
        <section>
          <h2 className="mb-5 font-heading text-xl font-[900] uppercase tracking-tight text-near-black">
            {minor ? "Your Details" : "Camp Details"}
          </h2>
          {/* Date of birth, shown ONLY when we do not already have it. Most contacts predate
              the field, so registration is the second chance to collect it rather than
              making people redo a waitlist form. Adult vs minor decides whether a
              background check is required, so this cannot be skipped for those missing it. */}
          {!registration!.contacts.date_of_birth && (
            <div className="mb-4">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[1px] text-near-black/70">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full rounded border border-near-black/15 px-3 py-2.5 text-[15px] text-near-black outline-none focus:border-dark-green"
              />
              <p className="mt-1 text-xs text-near-black/50">
                Required for camp safety and eligibility. We ask once and keep it on file.
              </p>
            </div>
          )}

          {minor && !minor.contacts.date_of_birth && (
            <div className="mb-4">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[1px] text-near-black/70">
                {minor.contacts.first_name}&apos;s Date of Birth{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={minorDateOfBirth}
                onChange={(e) => setMinorDateOfBirth(e.target.value)}
                className="w-full rounded border border-near-black/15 px-3 py-2.5 text-[15px] text-near-black outline-none focus:border-dark-green"
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[1px] text-near-black/70">
                T-Shirt Size <span className="text-red-500">*</span>
              </label>
              <select
                required
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
            {minor ? "Your Dietary & Medical" : "Dietary & Medical"}
          </h2>
          <textarea
            value={dietaryMedical}
            onChange={(e) => setDietaryMedical(e.target.value)}
            rows={3}
            className="w-full rounded border border-near-black/20 bg-white px-4 py-3 text-sm text-near-black placeholder:text-near-black/40 focus:border-dark-green focus:outline-none focus:ring-1 focus:ring-dark-green"
            placeholder='List any allergies, dietary needs, medications, or conditions we should know about. Write "None" if not applicable.'
          />
        </section>

        {/* Minor's Details */}
        {minor && (
          <section>
            <h2 className="mb-5 font-heading text-xl font-[900] uppercase tracking-tight text-near-black">
              {minor.contacts.first_name}&apos;s Details <span className="text-sm font-normal normal-case text-near-black/40">(Minor)</span>
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[1px] text-near-black/70">
                  T-Shirt Size <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={minorTshirtSize}
                  onChange={(e) => setMinorTshirtSize(e.target.value)}
                  className="w-full rounded border border-near-black/20 bg-white px-4 py-3 text-sm text-near-black focus:border-dark-green focus:outline-none focus:ring-1 focus:ring-dark-green"
                >
                  <option value="">Select size</option>
                  {TSHIRT_SIZES.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[1px] text-near-black/70">
                  Dietary Restrictions or Medical Conditions
                </label>
                <textarea
                  value={minorDietaryMedical}
                  onChange={(e) => setMinorDietaryMedical(e.target.value)}
                  rows={3}
                  className="w-full rounded border border-near-black/20 bg-white px-4 py-3 text-sm text-near-black placeholder:text-near-black/40 focus:border-dark-green focus:outline-none focus:ring-1 focus:ring-dark-green"
                  placeholder={`List any allergies, dietary needs, medications, or conditions for ${minor.contacts.first_name}. Write "None" if not applicable.`}
                />
              </div>
            </div>
          </section>
        )}

        </>
        )}

        {/* Step 2: the baseline survey. Its own step because it is the one part people
            answer thoughtfully, and burying it under logistics got it skimmed. */}
        {step === 2 && (
        <>
        {/* Baseline survey. Asked once per participant, so a guardian registering a minor
            answers twice: their own set and one on the minor's behalf. Keeping it
            per-participant is what makes the confidence delta meaningful per person
            rather than per household. */}
        <section>
          <h2 className="mb-2 font-heading text-xl font-[900] uppercase tracking-tight text-near-black">
            {minor ? "Before Camp: You" : "Before Camp"}
          </h2>
          <p className="mb-5 text-sm text-near-black/50">
            A few quick questions so we know where you are starting from. We
            ask the same ones after camp to see how it went.
          </p>
          <SurveyQuestions
            kind="pre"
            eventKind={registration!.events.event_type}
            namePrefix="survey-self"
            value={survey}
            onChange={setSurvey}
          />
        </section>

        {minor && (
          <section>
            <h2 className="mb-2 font-heading text-xl font-[900] uppercase tracking-tight text-near-black">
              Before Camp: {minor.contacts.first_name}
            </h2>
            <p className="mb-5 text-sm text-near-black/50">
              Answer these for {minor.contacts.first_name}, or have them answer
              with you.
            </p>
            <SurveyQuestions
              kind="pre"
              eventKind={registration!.events.event_type}
              namePrefix="survey-minor"
              value={minorSurvey}
              onChange={setMinorSurvey}
            />
          </section>
        )}

        </>
        )}

        {/* Step 3: what you are agreeing to. Alone on its own step, deliberately. Reading a
            liability waiver in the same breath as picking a t-shirt size is how people end
            up signing something they did not read. */}
        {step === 3 && (
        <>
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
                I have read and agree to the Acknowledgment of Risks, Release of Liability, and Indemnification Agreement above. I understand that this is a legally binding document and I sign it voluntarily.{minor && ` As the parent/legal guardian of ${minor.contacts.first_name} ${minor.contacts.last_name}, I also agree to these terms on their behalf per Section 9 of this agreement.`}
              </span>
            </label>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[1px] text-near-black/70">
                {minor ? "Parent/Guardian Electronic Signature" : "Electronic Signature"} <span className="text-red-500">*</span>
              </label>
              <p className="mb-2 text-xs text-near-black/40">
                Type your full legal name as your electronic signature{minor ? " (signing on behalf of yourself and your minor child)" : ""}
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

        </>
        )}

        {/* Step 4: what it costs and what happens next. */}
        {step === 4 && (
        <>
        {/* Payment */}
        {(registration!.role !== "Mentor" || tshirtSize || minor) && (
          <section>
            <h2 className="mb-5 font-heading text-xl font-[900] uppercase tracking-tight text-near-black">
              Payment
            </h2>
            <div className="rounded border border-near-black/10 bg-white p-6">
              {/* Same function the server uses to build the Stripe line items, so the total
                  shown here cannot drift from the total charged. It reads the numeric
                  registration_fee rather than parsing the `cost` display string. */}
              {(() => {
                // Same function the server runs, fed the same inputs, so the quoted total
                // cannot drift from the charged one. A date of birth typed into this form
                // but not yet saved is used immediately, otherwise someone filling in a
                // missing DOB would see the fee appear only after submitting.
                const eligibility = evaluateEligibility({
                  dateOfBirth:
                    registration!.contacts.date_of_birth || dateOfBirth || null,
                  status: (registration!.contacts.background_check_status ??
                    "none") as never,
                  expiresAt: registration!.contacts.background_check_expires_at,
                });

                const charge = computeCampCharge({
                  role: registration!.role,
                  registrationFee: event.registration_fee,
                  donationCents: donation,
                  minorName: minor?.contacts.first_name ?? null,
                  backgroundCheckCents: eligibility.feeCents,
                });

                return (
                  <>
                    <div className="mb-3 space-y-2">
                      {registration!.role === "Mentor" && (
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-near-black">
                            Your Registration (Mentor)
                          </p>
                          <p className="text-sm font-semibold text-near-black">Free</p>
                        </div>
                      )}
                      {charge.lines.map((line) => (
                        <div
                          key={line.label}
                          className="flex items-center justify-between"
                        >
                          <p className="text-sm text-near-black">{line.label}</p>
                          <p className="text-sm font-semibold text-near-black">
                            {formatFee(line.cents)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* MENTORS ONLY. A mentee has just been asked for a registration fee;
                        asking them for more in the same breath reads as being nickel-and-dimed.
                        A mentor is paying nothing and giving up a weekend, so an invitation to
                        chip in lands differently.

                        Above the total, so the number they end on is the number they pay. And
                        defaulted to nothing: a pre-filled amount is a charge somebody has to
                        notice and remove, which is not the same as being asked. Declining is a
                        button the same size as agreeing, not a link to hunt for.

                        The server still accepts a donation from anyone. Not asking a mentee is
                        a decision about what to put in front of them, not a reason to refuse
                        money somebody deliberately chose to give. */}
                    {registration!.role === "Mentor" && (
                    <div className="mb-3 rounded border border-near-black/10 bg-cream/40 p-4">
                      <p className="text-sm font-medium text-near-black">
                        Help cover the cost of camp
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-near-black/60">
                        Food, fuel, permits and gear come out of what we raise. Anything you
                        add here goes straight to running this camp. Entirely optional, and
                        nothing changes if you skip it. Every mentor gets a shirt either way.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[SUGGESTED_MENTOR_DONATION_CENTS, 5000, 10000].map((cents) => (
                          <button
                            key={cents}
                            type="button"
                            onClick={() => setDonation(donation === cents ? 0 : cents)}
                            className={`rounded border px-4 py-2 text-sm font-semibold transition-colors ${
                              donation === cents
                                ? "border-dark-green bg-dark-green text-white"
                                : "border-near-black/20 text-near-black/70 hover:border-near-black/40"
                            }`}
                          >
                            {formatFee(cents)}
                            {cents === SUGGESTED_MENTOR_DONATION_CENTS && (
                              <span className="ml-1 text-[10px] font-normal opacity-70">
                                suggested
                              </span>
                            )}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setDonation(0)}
                          className={`rounded border px-4 py-2 text-sm font-semibold transition-colors ${
                            donation === 0
                              ? "border-near-black/40 bg-near-black/5 text-near-black"
                              : "border-near-black/20 text-near-black/50 hover:border-near-black/40"
                          }`}
                        >
                          Not this time
                        </button>
                      </div>
                    </div>
                    )}

                    <div className="flex items-center justify-between border-t border-near-black/10 pt-3">
                      <p className="text-sm font-bold text-near-black">Total</p>
                      <p className="text-2xl font-extrabold text-dark-green">
                        {charge.totalCents > 0 ? formatFee(charge.totalCents) : "Free"}
                      </p>
                    </div>
                    <div className="mt-5 rounded border border-near-black/10 bg-cream/50 px-5 py-4 text-center">
                      {charge.totalCents === 0 ? (
                        <p className="text-sm font-medium text-near-black/70">
                          Nothing to pay. Submitting completes your registration.
                        </p>
                      ) : stripeReady ? (
                        <>
                          <p className="text-sm font-medium text-near-black/70">
                            You will be taken to Stripe to pay after you submit.
                          </p>
                          <p className="mt-1 text-xs text-near-black/50">
                            Your registration is saved either way. Card details are
                            entered on Stripe and never touch this site.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-near-black/70">
                            Submitting completes your registration. We will be in
                            touch about paying the balance.
                          </p>
                          <p className="mt-1 text-xs text-near-black/50">
                            Online payment is not switched on yet, so nothing is
                            collected here.
                          </p>
                        </>
                      )}
                    </div>

                    {/* Stated BEFORE payment, which is the only time it counts. If a
                        background check comes back adverse the registration fee is
                        refunded, but the processing fee and the check itself are already
                        spent and are not returned. Discovering that after being declined,
                        rather than before paying, is how a refund dispute starts.

                        DELIBERATELY SILENT on what happens if someone withdraws. This used
                        to promise "if your registration is cancelled or you are unable to
                        attend, the registration fee is refunded less those costs", which
                        was not the policy: OO commits camp costs in advance, so a
                        withdrawal is not refunded as a rule. Refunds happen in real
                        circumstances (a family emergency, a check we could not accept) and
                        those are conversations, not entitlements. Promising a refund on the
                        payment screen and then declining one is worse than saying nothing
                        and being generous when it is warranted. */}
                    {charge.totalCents > 0 && (
                      <p className="mt-3 text-center text-xs leading-relaxed text-near-black/50">
                        Processing fees and background check fees are
                        non-refundable.
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          </section>
        )}

        </>
        )}

        {stepError && (
          <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {stepError}
          </p>
        )}

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={goBack}
              disabled={submitting}
              className="rounded border border-near-black/20 px-6 py-4 text-[13px] font-bold uppercase tracking-[1.5px] text-near-black/60 transition-colors hover:bg-near-black/5 disabled:opacity-50"
            >
              Back
            </button>
          )}

          {step < 4 ? (
            // A plain button, never type="submit". An Enter keypress in a text field on step
            // one would otherwise submit the whole registration from the first screen.
            // The keys keep this and the submit button as separate DOM nodes. Without them
            // React turns this node into type="submit" while its click is still running, and
            // the browser then submits from step 3, skipping Review and pay.
            <button
              key="continue"
              type="button"
              onClick={goNext}
              className="flex-1 rounded bg-dark-green px-8 py-4 text-[13px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:bg-dark-green/90"
            >
              Continue
            </button>
          ) : (
            <button
              key="submit"
              type="submit"
              disabled={submitting || !waiverSigned || !signatureName.trim() || !waiverScrolled || !contactShareConsent || (registration!.role === "Mentor" ? !mentorCommitment : !menteeCommitment)}
              className="flex-1 rounded bg-dark-green px-8 py-4 text-[13px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:bg-dark-green/90 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Complete Registration"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

/**
 * Where you are, and what is still to come.
 *
 * FIVE stages for a four-step form, on purpose. The background check happens after payment,
 * and the first live run showed someone completing registration, paying, and then being
 * surprised by a screening step nobody had mentioned. Naming it here as the last stage
 * costs nothing and means it is never a surprise.
 */
function StepRail({ step }: { step: number }) {
  const stages = [
    "Your details",
    "Survey",
    "Agreements",
    "Review and pay",
    "Background check",
  ];

  return (
    <ol className="mb-10 flex flex-wrap gap-x-2 gap-y-2 border-b border-near-black/10 pb-5">
      {stages.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const current = n === step;
        // The fifth stage is not part of this form and must never look reachable from it.
        const afterPayment = n === 5;

        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                current
                  ? "bg-dark-green text-white"
                  : done
                    ? "bg-dark-green/15 text-dark-green"
                    : "bg-near-black/8 text-near-black/35"
              }`}
            >
              {done ? "\u2713" : n}
            </span>
            <span
              className={`text-xs ${
                current
                  ? "font-semibold text-near-black"
                  : afterPayment
                    ? "text-near-black/35"
                    : "text-near-black/50"
              }`}
            >
              {label}
              {afterPayment && (
                <span className="ml-1 text-near-black/30">(after payment)</span>
              )}
            </span>
            {n < stages.length && (
              <span className="ml-1 hidden text-near-black/20 sm:inline">/</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
