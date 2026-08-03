// ─── Events ───
export const allEventsQuery = `*[_type == "event" && status != "draft" && status != "archived"] | order(date asc) {
  _id,
  title,
  slug,
  eventType,
  status,
  featured,
  date,
  endDate,
  location,
  description,
  image,
  cost,
  spotsTotal,
  registrationOpens,
  registrationCloses,
  waitlistOpens,
  waitlistCloses
}`;

// Genuinely upcoming events, for the monthly newsletter.
// Unlike allEventsQuery this filters on the date rather than trusting `status`, because
// a past event whose status was never moved to "completed" must not be promoted as if
// it were still coming up. Compares against endDate when there is one so a multi-day
// event stays "upcoming" until its last day. $today is a "YYYY-MM-DD" string.
export const upcomingEventsQuery = `*[_type == "event"
  && status != "draft" && status != "archived" && status != "completed"
  && coalesce(endDate, date) >= $today
] | order(date asc) [0...5] {
  _id,
  title,
  slug,
  eventType,
  status,
  date,
  endDate,
  location,
  cost,
  description
}`;

export const eventBySlugQuery = `*[_type == "event" && slug.current == $slug][0] {
  _id,
  title,
  slug,
  eventType,
  status,
  date,
  endDate,
  location,
  experienceLevel,
  cost,
  registrationFee,
  spotsTotal,
  description,
  image,
  registrationOpens,
  registrationCloses,
  waitlistOpens,
  waitlistCloses,
  meetingSlots,
  customFields,
  teachingFocusOptions,
  schedule,
  gearList,
  faq,
  body
}`;

export const featuredEventsQuery = `*[_type == "event" && featured == true && status != "draft" && status != "archived"] | order(date asc) [0..1] {
  _id,
  title,
  slug,
  eventType,
  date,
  endDate,
  location,
  description,
  image,
  cost
}`;

// ─── Admin: All Events (including drafts) ───
export const adminAllEventsQuery = `*[_type == "event"] | order(date desc) {
  _id,
  title,
  slug,
  eventType,
  status,
  date,
  endDate,
  location,
  cost,
  spotsTotal,
  registrationOpens,
  registrationCloses,
  waitlistOpens,
  waitlistCloses,
  meetingSlots,
  campLocations,
  mentorPerks,
  menteePerks
}`;

// ─── Team Members ───
export const allTeamMembersQuery = `*[_type == "teamMember"] | order(order asc) {
  _id,
  name,
  role,
  bio,
  image,
  order
}`;

// ─── Blog Posts ───
export const allBlogPostsQuery = `*[_type == "blogPost" && publishedAt <= now()] | order(publishedAt desc) {
  _id,
  title,
  slug,
  excerpt,
  publishedAt,
  category,
  image
}`;

export const blogPostBySlugQuery = `*[_type == "blogPost" && slug.current == $slug][0] {
  _id,
  title,
  slug,
  excerpt,
  publishedAt,
  category,
  image,
  gallery,
  body
}`;

// ─── Gallery ───
export const allGalleryImagesQuery = `*[_type == "galleryImage"] {
  _id,
  images
}`;
