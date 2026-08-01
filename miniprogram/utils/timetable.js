const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const WORKDAY_COUNT = 5;
const WORKDAYS = DAYS.slice(0, WORKDAY_COUNT);

const DEFAULT_PERIOD_TIMES = [
  { period: 1, startTime: '08:00', endTime: '09:00' },
  { period: 2, startTime: '09:10', endTime: '10:10' },
  { period: 3, startTime: '10:20', endTime: '11:20' },
  { period: 4, startTime: '11:30', endTime: '12:10' },
  { period: 5, startTime: '13:30', endTime: '14:30' },
  { period: 6, startTime: '14:40', endTime: '15:40' },
  { period: 7, startTime: '15:50', endTime: '16:50' },
  { period: 8, startTime: '17:00', endTime: '18:00' },
  { period: 9, startTime: '19:00', endTime: '20:00' }
];

const COLORS = [
  { name: '蓝', value: '#bfdbfe' },
  { name: '绿', value: '#bbf7d0' },
  { name: '黄', value: '#fde68a' },
  { name: '粉', value: '#ffd6e4' },
  { name: '紫', value: '#ddd6fe' },
  { name: '灰', value: '#e5e7eb' }
];

function normalizeCell(cell) {
  const subject = String(cell.subject || '').trim();
  const startTime = cell.startTime || '';
  const endTime = cell.endTime || '';
  const timeText = startTime && endTime ? `${startTime}-${endTime}` : startTime || endTime;
  const color = subject ? (cell.color || '#ffd6e4') : '#fff8fa';

  return {
    ...cell,
    subject,
    startTime,
    endTime,
    color,
    subjectText: subject || '',
    timeText,
    filledClass: subject ? 'filled' : 'empty'
  };
}

function makeTimetable() {
  const samples = [
    ['语文', '数学', '英语', '科学', '体育'],
    ['数学', '语文', '美术', '英语', '道法'],
    ['英语', '科学', '语文', '音乐', '劳动'],
    ['数学', '英语', '体育', '美术', '阅读'],
    ['语文', '综合', '科学', '班会', '自习']
  ];
  const sampleColors = ['#ffdce8', '#dbeafe', '#dcfce7', '#fef3c7', '#ede9fe'];

  return DAYS.map((day, dayIndex) => ({
    day,
    cells: PERIODS.map((period) => {
      const subject = dayIndex < WORKDAY_COUNT && period <= 5 ? samples[dayIndex][period - 1] : '';
      return normalizeCell({
        id: `${dayIndex}-${period}`,
        dayIndex,
        period,
        subject,
        startTime: '',
        endTime: '',
        color: subject ? sampleColors[(dayIndex + period) % sampleColors.length] : '#fff8fa'
      });
    })
  }));
}

function normalizePeriodTimes(periodTimes) {
  return (periodTimes || DEFAULT_PERIOD_TIMES).map((item, index) => ({
    period: item.period || index + 1,
    startTime: item.startTime || '',
    endTime: item.endTime || '',
    label: `第${item.period || index + 1}节`,
    timeText: item.startTime && item.endTime ? `${item.startTime}-${item.endTime}` : ''
  }));
}

function getVisibleTimetable(timetable) {
  return timetable.slice(0, WORKDAY_COUNT);
}

module.exports = {
  COLORS,
  DAYS,
  DEFAULT_PERIOD_TIMES,
  PERIODS,
  WORKDAYS,
  getVisibleTimetable,
  makeTimetable,
  normalizeCell,
  normalizePeriodTimes
};
