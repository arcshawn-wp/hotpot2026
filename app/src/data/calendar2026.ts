export interface CalendarDay {
  date: string;
  month: number;
  day: number;
  weekday: number;
  isToday?: boolean;
  holidays?: string[];
  solarTerm?: string;
  hotspots: string[];
  heatScore: number;
}

export interface CalendarMonth {
  year: number;
  month: number;
  label: string;
  days: CalendarDay[];
}

export const CALENDAR_MONTHS: CalendarMonth[] = [];

export const HOLIDAYS_2026: Record<string, string[]> = {
  '2026-01-01': ['元旦'],
  '2026-01-20': ['小年'],
  '2026-01-22': ['大寒'],
  '2026-01-28': ['除夕'],
  '2026-01-29': ['春节'],
  '2026-01-30': ['春节'],
  '2026-01-31': ['春节'],
  '2026-02-01': ['春节'],
  '2026-02-02': ['春节'],
  '2026-02-03': ['立春'],
  '2026-02-14': ['情人节'],
  '2026-02-18': ['雨水'],
  '2026-03-05': ['惊蛰'],
  '2026-03-08': ['妇女节'],
  '2026-03-20': ['春分'],
  '2026-04-04': ['清明'],
  '2026-04-20': ['谷雨'],
  '2026-05-01': ['劳动节'],
  '2026-05-05': ['立夏'],
  '2026-05-10': ['母亲节'],
  '2026-05-21': ['小满'],
  '2026-06-01': ['儿童节'],
  '2026-06-05': ['芒种'],
  '2026-06-21': ['夏至/父亲节'],
  '2026-07-07': ['小暑'],
  '2026-07-22': ['大暑'],
  '2026-08-07': ['立秋'],
  '2026-08-23': ['处暑'],
  '2026-09-07': ['白露'],
  '2026-09-10': ['教师节'],
  '2026-09-23': ['秋分'],
  '2026-10-01': ['国庆节'],
  '2026-10-08': ['寒露'],
  '2026-10-23': ['霜降'],
  '2026-11-07': ['立冬'],
  '2026-11-22': ['小雪'],
  '2026-12-07': ['大雪'],
  '2026-12-21': ['冬至'],
  '2026-12-24': ['平安夜'],
  '2026-12-25': ['圣诞节'],
};

export const SOLAR_TERMS_2026: Record<string, string> = {
  '2026-01-05': '小寒',
  '2026-01-22': '大寒',
  '2026-02-03': '立春',
  '2026-02-18': '雨水',
  '2026-03-05': '惊蛰',
  '2026-03-20': '春分',
  '2026-04-04': '清明',
  '2026-04-20': '谷雨',
  '2026-05-05': '立夏',
  '2026-05-21': '小满',
  '2026-06-05': '芒种',
  '2026-06-21': '夏至',
  '2026-07-07': '小暑',
  '2026-07-22': '大暑',
  '2026-08-07': '立秋',
  '2026-08-23': '处暑',
  '2026-09-07': '白露',
  '2026-09-23': '秋分',
  '2026-10-08': '寒露',
  '2026-10-23': '霜降',
  '2026-11-07': '立冬',
  '2026-11-22': '小雪',
  '2026-12-07': '大雪',
  '2026-12-21': '冬至',
};

const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

function generateCalendar2026(): CalendarMonth[] {
  const months: CalendarMonth[] = [];
  
  for (let month = 1; month <= 12; month++) {
    const firstDay = new Date(2026, month - 1, 1);
    const lastDay = new Date(2026, month, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay();
    
    const days: CalendarDay[] = [];
    
    // Padding days from previous month
    for (let i = 0; i < startWeekday; i++) {
      const prevMonthDay = new Date(2026, month - 1, -i).getDate();
      days.push({
        date: `2026-${String(month - 1).padStart(2, '0')}-${String(prevMonthDay).padStart(2, '0')}`,
        month: month - 1,
        day: prevMonthDay,
        weekday: i,
        hotspots: [],
        heatScore: 0,
      });
    }
    
    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === '2026-04-22';
      const heatScore = Math.floor(Math.random() * 60) + 20;
      
      days.push({
        date: dateStr,
        month,
        day,
        weekday: (startWeekday + day - 1) % 7,
        isToday,
        holidays: HOLIDAYS_2026[dateStr],
        solarTerm: SOLAR_TERMS_2026[dateStr],
        hotspots: [],
        heatScore,
      });
    }
    
    // Padding days from next month
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        date: `2026-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
        month: month + 1,
        day: i,
        weekday: (startWeekday + daysInMonth + i - 1) % 7,
        hotspots: [],
        heatScore: 0,
      });
    }
    
    months.push({
      year: 2026,
      month,
      label: MONTH_NAMES[month - 1],
      days,
    });
  }
  
  return months;
}

export const CALENDAR_2026 = generateCalendar2026();

export const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
