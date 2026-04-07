const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const isValidDate = (value) => value instanceof Date && !Number.isNaN(value.getTime());

export function parseChatTimestamp(value) {
    if (!value) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    return isValidDate(date) ? date : null;
}

export function formatChatClock(value) {
    const date = parseChatTimestamp(value);

    if (!date) {
        return '';
    }

    return date.toLocaleTimeString('en-PH', {
        hour: 'numeric',
        minute: '2-digit',
    });
}

export function formatChatRelative(value, now = Date.now(), { compact = false } = {}) {
    const date = parseChatTimestamp(value);

    if (!date) {
        return '';
    }

    const diff = now - date.getTime();

    if (diff < MINUTE_MS) {
        return compact ? 'now' : 'just now';
    }

    if (diff < HOUR_MS) {
        const minutes = Math.max(1, Math.floor(diff / MINUTE_MS));
        return compact ? `${minutes}m` : `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    }

    if (diff < DAY_MS) {
        const hours = Math.max(1, Math.floor(diff / HOUR_MS));
        return compact ? `${hours}h` : `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }

    const days = Math.max(1, Math.floor(diff / DAY_MS));

    if (days === 1) {
        return compact ? '1d' : 'yesterday';
    }

    if (days < 7) {
        return compact ? `${days}d` : `${days} days ago`;
    }

    return date.toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        ...(date.getFullYear() !== new Date(now).getFullYear() ? { year: 'numeric' } : {}),
    });
}

export function formatChatDateLabel(value, now = Date.now()) {
    const date = parseChatTimestamp(value);

    if (!date) {
        return 'Today';
    }

    const current = new Date(now);
    const startOfToday = new Date(current.getFullYear(), current.getMonth(), current.getDate());
    const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / DAY_MS);

    if (diffDays === 0) {
        return 'Today';
    }

    if (diffDays === 1) {
        return 'Yesterday';
    }

    if (diffDays > 1 && diffDays < 7) {
        return date.toLocaleDateString('en-PH', { weekday: 'long' });
    }

    return date.toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}
