export const formatDate = (dateString: string): string => {
    if (!dateString) return "N/A";

    const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "numeric",
        day: "numeric",
    };

    return new Intl.DateTimeFormat("en-UK", options).format(new Date(dateString))
}