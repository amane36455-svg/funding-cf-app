export function getCurrentAndPreviousMonthRange(now = new Date()): {
  from: string;
  to: string;
} {
  const year = now.getFullYear();
  const month = now.getMonth();
  const from = new Date(year, month - 1, 1);

  return {
    from: formatDate(from),
    to: formatDate(now),
  };
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
