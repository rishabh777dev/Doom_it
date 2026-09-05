/**
 * Utility functions to format timestamps strictly in Indian Standard Time (IST - Asia/Kolkata).
 */

export function parseAsUTC(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;

  let str = String(dateInput).trim();
  if (!str) return null;

  // If string has no timezone offset ('Z', '+', or negative timezone offset after time component)
  // we assume it is UTC because the server stores datetime in UTC.
  // e.g. "2026-09-05T13:57:12.123456" -> "2026-09-05T13:57:12.123456Z"
  if (!str.endsWith('Z') && !str.includes('+') && !str.match(/[T\s]\d{2}:\d{2}(:\d{2})?(\.\d+)?[-+]/)) {
    str = str.replace(' ', 'T') + 'Z';
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format date and time in Indian Standard Time (IST).
 * Example: "05 Sep 2026, 07:27:12 PM IST"
 */
export function formatIST(dateInput, options = {}) {
  const d = parseAsUTC(dateInput);
  if (!d) return '';

  const defaultOptions = {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: options.showSeconds !== false ? '2-digit' : undefined,
    hour12: true,
    ...options,
  };

  const formatted = d.toLocaleString('en-IN', defaultOptions);
  return options.hideSuffix ? formatted : `${formatted} IST`;
}

/**
 * Format time only in Indian Standard Time (IST).
 * Example: "07:27:12 PM IST" or "07:27 PM"
 */
export function formatISTTime(dateInput, options = {}) {
  const d = parseAsUTC(dateInput);
  if (!d) return '';

  const defaultOptions = {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: options.showSeconds !== false ? '2-digit' : undefined,
    hour12: true,
    ...options,
  };

  const formatted = d.toLocaleTimeString('en-IN', defaultOptions);
  return options.hideSuffix ? formatted : `${formatted} IST`;
}

/**
 * Format date only in Indian Standard Time (IST).
 * Example: "05 Sep 2026"
 */
export function formatISTDate(dateInput, options = {}) {
  const d = parseAsUTC(dateInput);
  if (!d) return '';

  const defaultOptions = {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  };

  return d.toLocaleDateString('en-IN', defaultOptions);
}
