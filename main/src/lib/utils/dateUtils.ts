import { format } from "date-fns";


// Utility for formatting date to yyyy-MM-dd
export const formatInputDate = (date: string | Date | undefined | null) =>
    date ? format(new Date(date), "yyyy-MM-dd") : "";