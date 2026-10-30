/**
 * Timezones a user can pick in Settings. The single source for both the
 * dropdown (ui/settings.js renders it) and the server-side validation in
 * api.js's handlePutSettings, so the API accepts exactly what the UI offers.
 */

export const TIMEZONE_GROUPS = [
  [
    "Americas",
    [
      ["America/St_Johns", "Newfoundland (UTC-3:30)"],
      ["America/Halifax", "Atlantic Time (UTC-4)"],
      ["America/New_York", "Eastern Time (UTC-5)"],
      ["America/Chicago", "Central Time (UTC-6)"],
      ["America/Denver", "Mountain Time (UTC-7)"],
      ["America/Phoenix", "Arizona (UTC-7)"],
      ["America/Los_Angeles", "Pacific Time (UTC-8)"],
      ["America/Anchorage", "Alaska (UTC-9)"],
      ["Pacific/Honolulu", "Hawaii (UTC-10)"],
      ["America/Mexico_City", "Mexico City (UTC-6)"],
      ["America/Bogota", "Bogotá (UTC-5)"],
      ["America/Lima", "Lima (UTC-5)"],
      ["America/Santiago", "Santiago (UTC-4)"],
      ["America/Sao_Paulo", "São Paulo (UTC-3)"],
      ["America/Argentina/Buenos_Aires", "Buenos Aires (UTC-3)"],
    ],
  ],
  [
    "Europe/Africa",
    [
      ["Europe/London", "London (UTC+0)"],
      ["Europe/Lisbon", "Lisbon (UTC+0)"],
      ["Africa/Casablanca", "Casablanca (UTC+0)"],
      ["Europe/Paris", "Paris (UTC+1)"],
      ["Europe/Berlin", "Berlin (UTC+1)"],
      ["Europe/Madrid", "Madrid (UTC+1)"],
      ["Africa/Lagos", "Lagos (UTC+1)"],
      ["Europe/Rome", "Rome (UTC+1)"],
      ["Europe/Athens", "Athens (UTC+2)"],
      ["Europe/Helsinki", "Helsinki (UTC+2)"],
      ["Africa/Cairo", "Cairo (UTC+2)"],
      ["Africa/Johannesburg", "Johannesburg (UTC+2)"],
      ["Europe/Moscow", "Moscow (UTC+3)"],
      ["Africa/Nairobi", "Nairobi (UTC+3)"],
    ],
  ],
  [
    "Asia/Pacific",
    [
      ["Asia/Dubai", "Dubai (UTC+4)"],
      ["Asia/Karachi", "Karachi (UTC+5)"],
      ["Asia/Kolkata", "Mumbai/Delhi (UTC+5:30)"],
      ["Asia/Dhaka", "Dhaka (UTC+6)"],
      ["Asia/Bangkok", "Bangkok (UTC+7)"],
      ["Asia/Jakarta", "Jakarta (UTC+7)"],
      ["Asia/Shanghai", "Beijing/Shanghai (UTC+8)"],
      ["Asia/Hong_Kong", "Hong Kong (UTC+8)"],
      ["Asia/Singapore", "Singapore (UTC+8)"],
      ["Asia/Tokyo", "Tokyo (UTC+9)"],
      ["Asia/Seoul", "Seoul (UTC+9)"],
      ["Australia/Adelaide", "Adelaide (UTC+9:30)"],
      ["Australia/Sydney", "Sydney (UTC+10)"],
      ["Australia/Brisbane", "Brisbane (UTC+10)"],
      ["Pacific/Auckland", "Auckland (UTC+12)"],
    ],
  ],
  [
    "UTC/Other",
    [["UTC", "UTC (UTC+0)"]],
  ],
];

export const TIMEZONE_VALUES = new Set(TIMEZONE_GROUPS.flatMap((group) => group[1].map((tz) => tz[0])));
