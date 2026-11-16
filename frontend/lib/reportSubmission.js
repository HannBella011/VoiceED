// Shared form rules; the server independently validates every submitted field.
export const REPORT_CATEGORIES = [
  ['academic', 'Academic Concern'],
  ['harassment', 'Harassment or Bullying'],
  ['safety', 'Facility/Safety Hazard'],
  ['discrimination', 'Discrimination'],
  ['mental_health', 'Mental Health Concern'],
  ['violence', 'Violence or Threat'],
  ['other', 'Other'],
];
export const REPORT_STEPS = [
  'User Information',
  'Report Details',
  'Confirmation',
  'Tracking ID',
];
export const emptyReporter = () => ({
  full_name: '',
  display_name: '',
  birthday: '',
  school_id: '',
  email: '',
});
export const reporterFromProfile = (user) =>
  user
    ? {
        full_name: user.full_name || '',
        display_name: user.username || '',
        birthday: user.birthday?.slice(0, 10) || '',
        school_id: user.school_id || '',
        email: user.email || '',
      }
    : emptyReporter();
export const localIncidentTime = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
const emailValid = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export function reporterError(reporter, anonymous, contactEmail = '') {
  if (anonymous)
    return contactEmail && !emailValid(contactEmail.trim())
      ? 'Enter a valid optional contact email.'
      : '';
  if (Object.values(reporter).some((value) => !String(value).trim()))
    return 'Complete all reporter information before continuing.';
  if (!emailValid(reporter.email.trim())) return 'Enter a valid email address.';
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(reporter.birthday) ||
    Number.isNaN(new Date(reporter.birthday).getTime()) ||
    new Date(reporter.birthday).toISOString().slice(0, 10) !== reporter.birthday ||
    reporter.birthday > localIncidentTime().slice(0, 10)
  )
    return 'Enter a valid birthday that is not in the future.';
  return '';
}
export function detailsError(details) {
  if (!details.title?.trim()) return 'Enter a complaint title.';
  if (details.title.trim().length > 200)
    return 'Title must be 200 characters or fewer.';
  if (!REPORT_CATEGORIES.some(([key]) => key === details.category))
    return 'Select an incident category.';
  if (!details.incident_date || Number.isNaN(new Date(details.incident_date).getTime()))
    return 'Enter a valid incident date and time.';
  if ((details.location || '').length > 255)
    return 'Location must be 255 characters or fewer.';
  if (!details.description.trim()) return 'Describe the incident before continuing.';
  if (details.description.length > 50000)
    return 'Description must be 50,000 characters or fewer.';
  return '';
}
export function evidenceError(file) {
  const expected = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    pdf: 'application/pdf',
  };
  const extension = file.name.split('.').pop().toLowerCase();
  if (!expected[extension] || file.type !== expected[extension])
    return `${file.name}: use PNG, JPG, JPEG or PDF files.`;
  if (!file.size || file.size > 25 * 1024 * 1024)
    return `${file.name}: choose a nonempty file up to 25 MB.`;
  return '';
}
export function reportPayload(reporter, details, anonymous, contactEmail) {
  const payload = {
    title: details.title.trim(),
    category: details.category,
    description: details.description.trim(),
    location: details.location.trim() || null,
    incident_date: new Date(details.incident_date).toISOString(),
  };
  if (anonymous) {
    if (contactEmail.trim()) payload.reporter_email = contactEmail.trim();
  } else
    payload.reporter_details = Object.fromEntries(
      Object.entries(reporter).map(([key, value]) => [key, value.trim()])
    );
  return payload;
}
let cachedAttempt = null;
export async function submissionKey(payload, files, mode) {
  const digest = async (value) =>
    Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', value)))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('');
  const attachments = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      type: file.type,
      hash: await digest(await file.arrayBuffer()),
    }))
  );
  const signature = await digest(
    new TextEncoder().encode(JSON.stringify({ mode, payload, attachments }))
  );
  if (cachedAttempt?.signature === signature) return cachedAttempt.key;
  let stored;
  try {
    stored = sessionStorage.getItem('voiceed:report-attempt');
  } catch {}
  let previous;
  try {
    previous = JSON.parse(stored || 'null');
  } catch {}
  if (previous?.signature === signature && /^[0-9a-f-]{36}$/i.test(previous.key))
    return previous.key;
  const key = crypto.randomUUID();
  cachedAttempt = { signature, key };
  try {
    sessionStorage.setItem('voiceed:report-attempt', JSON.stringify(cachedAttempt));
  } catch {}
  return key;
}
