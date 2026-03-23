// Form submission types
export type FormType =
  | "mentee-signup"
  | "mentor-signup"
  | "event-registration"
  | "camp-waitlist"
  | "camp-registration"
  | "contact"
  | "newsletter"
  | "sponsorship";

export interface FormSubmission {
  formType: FormType;
  data: Record<string, string | string[] | boolean>;
}

// Sanity content types
export interface SanityImage {
  _type: "image";
  asset: {
    _ref: string;
    _type: "reference";
  };
  alt?: string;
}

export interface Event {
  _id: string;
  title: string;
  slug: { current: string };
  eventType: "hunt-camp" | "fish-camp" | "community" | "workshop";
  status?: "draft" | "waitlist-open" | "waitlist-closed" | "registration-open" | "sold-out" | "completed" | "archived";
  featured?: boolean;
  date: string;
  endDate?: string;
  location: string;
  locationPrivate?: string;
  experienceLevel?: string;
  cost?: string;
  registrationFee?: number;
  spotsTotal?: number;
  spotsRemaining?: number;
  description: string;
  image?: SanityImage;
  registrationOpens?: string;
  registrationCloses?: string;
  waitlistOpens?: string;
  waitlistCloses?: string;
  meetingSlots?: {
    date: string;
    label: string;
    capacity?: number;
    meetingLink?: string;
  }[];
  customFields?: {
    label: string;
    fieldType: "text" | "dropdown" | "checkbox" | "textarea" | "radio";
    required: boolean;
    options?: string[];
    placeholder?: string;
  }[];
  teachingFocusOptions?: string[];
  schedule?: {
    day: string;
    items: { time: string; activity: string }[];
  }[];
  gearList?: {
    required?: string[];
    recommended?: string[];
    provided?: string[];
  };
  faq?: { question: string; answer: string }[];
  body?: unknown[];
}

export interface TeamMember {
  _id: string;
  name: string;
  role: string;
  bio: string;
  image?: SanityImage;
  order: number;
}

export interface BlogPost {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt: string;
  publishedAt: string;
  category: string;
  image?: SanityImage;
  body: unknown[];
}

export interface PodcastEpisode {
  _id: string;
  title: string;
  episodeNumber: number;
  description: string;
  publishedAt: string;
  audioUrl: string;
  duration: string;
}

export interface FaqItem {
  _id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
}

export interface Partner {
  _id: string;
  name: string;
  logo?: SanityImage;
  url?: string;
  order: number;
}
