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
