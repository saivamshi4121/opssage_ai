export function formatDate(dateIso: string): string {
  return new Date(dateIso).toLocaleString();
}
