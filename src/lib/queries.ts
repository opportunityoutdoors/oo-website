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
  spotsRemaining,
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
  spotsRemaining,
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
export const allBlogPostsQuery = `*[_type == "blogPost"] | order(publishedAt desc) {
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
  body
}`;

// ─── Podcast Episodes ───
export const allPodcastEpisodesQuery = `*[_type == "podcastEpisode"] | order(episodeNumber desc) {
  _id,
  title,
  episodeNumber,
  description,
  publishedAt,
  audioUrl,
  duration
}`;

// ─── FAQ Items ───
export const allFaqItemsQuery = `*[_type == "faqItem"] | order(order asc) {
  _id,
  question,
  answer,
  category,
  order
}`;

// ─── Partners ───
export const allPartnersQuery = `*[_type == "partner"] | order(order asc) {
  _id,
  name,
  logo,
  url,
  order
}`;
