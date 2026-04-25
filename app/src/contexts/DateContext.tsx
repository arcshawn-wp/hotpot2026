import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface DateContextType {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  dateStr: string;
  formattedDate: string;
  formattedMonthDay: string;
  weekdayName: string;
}

const DateContext = createContext<DateContextType | null>(null);

/** Parse date from hash-router URL: #/path?date=2026-04-22 */
function getDateFromHashUrl(): Date | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash; // e.g. "#/hotspot/hotspot-001?date=2026-05-01"
  const qIndex = hash.indexOf('?');
  if (qIndex === -1) return null;
  const params = new URLSearchParams(hash.slice(qIndex + 1));
  const dateParam = params.get('date');
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    const d = new Date(dateParam + 'T00:00:00');
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

/** Write date to hash-router URL without navigation */
function setDateInHashUrl(date: Date) {
  if (typeof window === 'undefined') return;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;

  const hash = window.location.hash;
  const qIndex = hash.indexOf('?');
  const path = qIndex === -1 ? hash : hash.slice(0, qIndex);

  const params = qIndex === -1 ? new URLSearchParams() : new URLSearchParams(hash.slice(qIndex + 1));
  params.set('date', dateStr);

  const newHash = `${path}?${params.toString()}`;
  window.history.replaceState(null, '', newHash);
}

export function DateProvider({ children }: { children: React.ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const fromUrl = getDateFromHashUrl();
    if (fromUrl) return fromUrl;
    return new Date();
  });

  const dateStr = useMemo(() => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [selectedDate]);

  const formattedDate = useMemo(() => {
    return `${selectedDate.getFullYear()}年${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日`;
  }, [selectedDate]);

  const formattedMonthDay = useMemo(() => {
    return `${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日`;
  }, [selectedDate]);

  const weekdayName = useMemo(() => {
    const names = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return names[selectedDate.getDay()];
  }, [selectedDate]);

  const handleSetDate = useCallback((date: Date) => {
    setSelectedDate(date);
    setDateInHashUrl(date);
  }, []);

  const value = useMemo(() => ({
    selectedDate,
    setSelectedDate: handleSetDate,
    dateStr,
    formattedDate,
    formattedMonthDay,
    weekdayName,
  }), [selectedDate, handleSetDate, dateStr, formattedDate, formattedMonthDay, weekdayName]);

  return (
    <DateContext.Provider value={value}>
      {children}
    </DateContext.Provider>
  );
}

export function useAppDate(): DateContextType {
  const ctx = useContext(DateContext);
  if (!ctx) throw new Error('useAppDate must be used within DateProvider');
  return ctx;
}
