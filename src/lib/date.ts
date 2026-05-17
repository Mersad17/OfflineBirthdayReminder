export function formatDateEU(
    value?: string | Date | null
  ) {
    if (!value) return "";
  
    let d: Date;
  
    if (value instanceof Date) {
      d = value;
    } else {
      // ✅ normalize date-only strings
      const normalized =
        typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
          ? `${value}T00:00:00`
          : value;
  
      d = new Date(normalized);
    }
  
    if (Number.isNaN(d.getTime())) return "";
  
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  