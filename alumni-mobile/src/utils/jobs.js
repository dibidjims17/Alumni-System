// src/utils/jobs.js

export function formatSalary(min, max) {
  const peso = (v) => `₱${Number(v).toLocaleString()}`;
  if (min && max) return `${peso(min)} – ${peso(max)}`;
  if (min) return `${peso(min)}+`;
  if (max) return `Up to ${peso(max)}`;
  return null;
}

// Returns null when there is no deadline or it already passed.
export function deadlineInfo(deadline) {
  if (!deadline) return null;
  const days = Math.ceil((new Date(deadline) - Date.now()) / 86400000);
  if (days < 0) return null;
  if (days === 0) return { text: 'Closes today', urgent: true };
  if (days === 1) return { text: 'Closes tomorrow', urgent: true };
  if (days <= 7) return { text: `Closing in ${days}d`, urgent: true };
  return {
    text: `Apply by ${new Date(deadline).toLocaleDateString()}`,
    urgent: false,
  };
}
