export const formatDate = (dateString: string): string => {
    if (!dateString) return "N/A";

    const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    };

    return new Intl.DateTimeFormat("cs-CZ", options).format(new Date(dateString))
}