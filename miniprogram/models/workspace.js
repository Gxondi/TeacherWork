const {
  DAYS,
  DEFAULT_PERIOD_TIMES,
  WORKDAYS,
  makeTimetable,
  normalizeCell,
  normalizePeriodTimes
} = require('../utils/timetable');
const { makeSeats, normalizeSeatLayout } = require('../utils/seatLayout');

function makeDuties() {
  return ['教室清扫', '走廊', '黑板', '倒垃圾'].map((task, index) => ({
    id: `duty-${index + 1}`,
    task,
    students: WORKDAYS.reduce((result, day) => ({
      ...result,
      [day]: ''
    }), {})
  }));
}

function todayDateValue(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function normalizeAttendanceRecords(records) {
  if (!Array.isArray(records)) return [];
  return records
    .filter((item) => item && item.date && item.studentId)
    .map((item) => ({
      id: item.id || `attendance-${item.date}-${item.studentId}`,
      date: item.date,
      studentId: item.studentId,
      studentName: item.studentName || '',
      status: item.status || 'pending',
      note: item.note || ''
    }));
}

function normalizeDutyStudents(students = {}) {
  return WORKDAYS.reduce((result, day) => ({
    ...result,
    [day]: students[day] || ''
  }), {});
}

function normalizeDuties(duties) {
  if (!Array.isArray(duties) || !duties.length) {
    return makeDuties();
  }

  if (duties[0].day) {
    const task = duties[0].tasks || '值日';
    const students = WORKDAYS.reduce((result, day) => {
      const oldDuty = duties.find((item) => item.day === day);
      return {
        ...result,
        [day]: oldDuty ? (oldDuty.group || '') : ''
      };
    }, {});
    return [{
      id: `duty-${Date.now()}`,
      task,
      students
    }];
  }

  return duties.map((duty, index) => ({
    id: duty.id || `duty-${index + 1}`,
    task: duty.task || '未命名任务',
    students: normalizeDutyStudents(duty.students)
  }));
}

function defaultWorkspace() {
  return {
    timetable: makeTimetable(),
    periodTimes: DEFAULT_PERIOD_TIMES.map((item) => ({ ...item })),
    seats: makeSeats(),
    duties: makeDuties(),
    attendanceDate: todayDateValue(),
    attendanceRecords: [],
    committee: [
      { id: 'role-1', role: '班长', studentName: '', responsibility: '班级日常协调' },
      { id: 'role-2', role: '学习委员', studentName: '', responsibility: '作业与学习反馈' }
    ],
    students: [
      {
        id: 'stu-1',
        name: '张同学',
        gender: '男',
        studentNo: '001',
        phone: '',
        address: '',
        guardianName: '张家长',
        guardianRelation: '父亲',
        guardianPhone: ''
      }
    ],
    todos: [
      { id: 'todo-1', title: '检查今日作业提交情况', dueDate: '', dueTime: '17:00', done: false, reminded: false }
    ]
  };
}

function normalizeWorkspace(workspace) {
  const base = defaultWorkspace();
  const normalized = {
    ...base,
    ...workspace
  };

  normalized.timetable = normalized.timetable.map((day, dayIndex) => ({
    day: day.day || DAYS[dayIndex],
    cells: day.cells.map((cell) => normalizeCell(cell))
  }));
  normalized.periodTimes = normalizePeriodTimes(normalized.periodTimes);
  normalized.seats = normalizeSeatLayout(normalized.seats);
  normalized.duties = normalizeDuties(normalized.duties);
  normalized.attendanceDate = normalized.attendanceDate || todayDateValue();
  normalized.attendanceRecords = normalizeAttendanceRecords(normalized.attendanceRecords);
  return normalized;
}

function buildWorkspacePayload(data) {
  return {
    timetable: data.timetable.map((day) => ({
      ...day,
      cells: day.cells.map((cell) => normalizeCell(cell))
    })),
    periodTimes: data.periodTimes,
    seats: data.seats.map((seat) => ({ ...seat, selected: false })),
    duties: data.duties,
    attendanceDate: data.attendanceDate,
    attendanceRecords: normalizeAttendanceRecords(data.attendanceRecords),
    committee: data.committee,
    students: data.students,
    todos: data.todos
  };
}

module.exports = {
  buildWorkspacePayload,
  defaultWorkspace,
  normalizeDuties,
  normalizeWorkspace
};
