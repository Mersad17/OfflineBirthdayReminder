export function formatDateEU(
    value?: string | Date | null
  ) {
    if (!value) return "";
  
    const d = value instanceof Date ? value : new Date(value);
  
    if (Number.isNaN(d.getTime())) return "";
  
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  