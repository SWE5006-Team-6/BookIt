const SINGAPORE_TIMEZONE_OFFSET_MINUTES = 8 * 60;
const TIMEZONE_SUFFIX_PATTERN = /(Z|[+-]\d{2}:\d{2})$/i;
const DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;

export function getSingaporeParts(date: Date) {
  const shifted = new Date(
    date.getTime() + SINGAPORE_TIMEZONE_OFFSET_MINUTES * 60 * 1000,
  );

  return {
    year: shifted.getUTCFullYear(),
    monthIndex: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    millisecond: shifted.getUTCMilliseconds(),
  };
}

export function createSingaporeDate(
  year: number,
  monthIndex: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
) {
  return new Date(
    Date.UTC(
      year,
      monthIndex,
      day,
      hour - SINGAPORE_TIMEZONE_OFFSET_MINUTES / 60,
      minute,
      second,
      millisecond,
    ),
  );
}

export function parseSingaporeDateTime(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return new Date(Number.NaN);
  }

  if (TIMEZONE_SUFFIX_PATTERN.test(trimmed)) {
    return new Date(trimmed);
  }

  const match = DATE_TIME_PATTERN.exec(trimmed);
  if (!match) {
    return new Date(Number.NaN);
  }

  const [
    ,
    yearRaw,
    monthRaw,
    dayRaw,
    hourRaw,
    minuteRaw,
    secondRaw = '0',
    millisecondRaw = '0',
  ] = match;

  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  const day = Number(dayRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const second = Number(secondRaw);
  const millisecond = Number(millisecondRaw.padEnd(3, '0'));

  return createSingaporeDate(
    year,
    monthIndex,
    day,
    hour,
    minute,
    second,
    millisecond,
  );
}

export function parseSingaporeDateAndTime(date: string, time: string) {
  return parseSingaporeDateTime(`${date}T${time}:00`);
}
