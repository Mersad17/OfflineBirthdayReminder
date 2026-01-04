   
   
   
   
   export function formatDateEU(dateString?: string | null) {
    if (!dateString) return "";

    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return dateString;

    return d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
    }
