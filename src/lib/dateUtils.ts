/**
 * Centralized date/time formatting for LensFlow.
 * Always uses Asia/Almaty (UTC+5) timezone regardless of user's computer settings.
 */

const TIMEZONE = 'Asia/Almaty';

/** Format date as "02.04.2026" */
export function formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('ru-RU', { timeZone: TIMEZONE });
}

/** Format date as "02.04.2026, 14:30" */
export function formatDateTime(date: string | Date): string {
    return new Date(date).toLocaleString('ru-RU', {
        timeZone: TIMEZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/** Format time only as "14:30" */
export function formatTime(date: string | Date): string {
    return new Date(date).toLocaleTimeString('ru-RU', {
        timeZone: TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
    });
}

/** Format short date as "02.04" */
export function formatShortDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('ru-RU', {
        timeZone: TIMEZONE,
        day: '2-digit',
        month: '2-digit',
    });
}

/** Format date with month name as "2 апреля 2026" */
export function formatDateLong(date: string | Date): string {
    return new Date(date).toLocaleDateString('ru-RU', {
        timeZone: TIMEZONE,
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

/** Get current date/time in Almaty timezone */
export function nowAlmaty(): Date {
    // Create a date string in Almaty timezone, then parse it back
    const str = new Date().toLocaleString('en-US', { timeZone: TIMEZONE });
    return new Date(str);
}

/** Format relative date: "Сегодня, 14:30" / "Вчера, 09:15" / "02.04.2026" */
export function formatRelativeDate(date: string | Date): string {
    const d = new Date(date);
    const now = nowAlmaty();
    const target = new Date(d.toLocaleString('en-US', { timeZone: TIMEZONE }));

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const diffDays = Math.floor((today.getTime() - targetDay.getTime()) / 86400000);

    const time = formatTime(date);

    if (diffDays === 0) return `Сегодня, ${time}`;
    if (diffDays === 1) return `Вчера, ${time}`;
    return formatDateTime(date);
}

export { TIMEZONE };
