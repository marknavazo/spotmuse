export function formatDate(value) {
  if (!value) return '-';
  try {
    const d = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
    return d.toLocaleDateString();
  } catch {
    return '-';
  }
}

export function formatYear(value) {
  if (!value) return '-';
  try {
    const d = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
    return d.getFullYear();
  } catch {
    return '-';
  }
}
