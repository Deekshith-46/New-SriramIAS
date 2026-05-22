const slugify = require('slugify');

const PERIOD_SLUGS = ['daily', 'weekly', 'monthly'];

function baseSlugFromTitle(title) {
  if (!title || typeof title !== 'string') return null;
  const slug = slugify(title.trim(), { lower: true, strict: true });
  return slug || null;
}

/** Derive daily | weekly | monthly slug from a category title (LMS test categories). */
function slugFromCategoryTitle(title) {
  if (!title || typeof title !== 'string') return null;

  const normalized = title.trim().toLowerCase();
  if (PERIOD_SLUGS.includes(normalized)) return normalized;

  for (const slug of PERIOD_SLUGS) {
    if (normalized.includes(slug)) return slug;
  }

  return null;
}

async function uniqueSlugForModel(Model, title, excludeId = null) {
  const base = baseSlugFromTitle(title);
  if (!base) return null;

  let candidate = base;
  let suffix = 1;

  while (true) {
    const query = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await Model.exists(query);
    if (!exists) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

module.exports = {
  PERIOD_SLUGS,
  baseSlugFromTitle,
  slugFromCategoryTitle,
  uniqueSlugForModel
};
