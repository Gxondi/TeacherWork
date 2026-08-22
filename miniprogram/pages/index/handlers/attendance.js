function makeRecord(date, student, status = 'pending') {
  return {
    id: `attendance-${date}-${student.id}`,
    date,
    studentId: student.id,
    studentName: student.name || '',
    status,
    note: ''
  };
}

function upsertRecord(records, record) {
  const exists = records.some((item) => item.date === record.date && item.studentId === record.studentId);
  return exists
    ? records.map((item) => (
      item.date === record.date && item.studentId === record.studentId
        ? { ...item, ...record, note: item.note || record.note || '' }
        : item
    ))
    : [...records, record];
}

module.exports = {
  onAttendanceDateChange(event) {
    const attendanceDate = event.detail.value;
    this.setData({
      attendanceDate,
      ...this.buildAttendanceView(this.data.students, this.data.attendanceRecords, attendanceDate)
    }, () => this.saveWorkspace({ silent: true }));
  },

  syncAttendanceRoster() {
    if (!this.data.students.length) {
      wx.showToast({ title: '请先维护花名册', icon: 'none' });
      return;
    }

    const date = this.data.attendanceDate;
    let records = this.data.attendanceRecords;
    this.data.students.forEach((student) => {
      records = upsertRecord(records, makeRecord(date, student));
    });

    this.setData({
      attendanceRecords: records,
      ...this.buildAttendanceView(this.data.students, records, date)
    }, () => {
      this.saveWorkspace({ silent: true });
      wx.showToast({ title: '已同步花名册', icon: 'success' });
    });
  },

  markAllPresent() {
    if (!this.data.students.length) {
      wx.showToast({ title: '请先维护花名册', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '全员到齐',
      content: `确定将 ${this.data.students.length} 名学生在 ${this.data.attendanceDate} 的考勤全部标记为已到吗？`,
      confirmText: '标记',
      success: (res) => {
        if (res.confirm) this.applyAllPresent();
      }
    });
  },

  applyAllPresent() {
    const date = this.data.attendanceDate;
    let records = this.data.attendanceRecords;
    this.data.students.forEach((student) => {
      records = upsertRecord(records, makeRecord(date, student, 'present'));
    });

    this.setData({
      attendanceRecords: records,
      ...this.buildAttendanceView(this.data.students, records, date)
    }, () => {
      this.saveWorkspace({ silent: true });
      wx.showToast({ title: '已标记到齐', icon: 'success' });
    });
  },

  onAttendanceStatusTap(event) {
    const studentId = event.currentTarget.dataset.studentId;
    const status = event.currentTarget.dataset.status;
    const student = this.data.students.find((item) => item.id === studentId);
    if (!student || !status) return;

    const date = this.data.attendanceDate;
    const records = upsertRecord(this.data.attendanceRecords, makeRecord(date, student, status));

    this.setData({
      attendanceRecords: records,
      ...this.buildAttendanceView(this.data.students, records, date)
    }, () => this.saveWorkspace({ silent: true }));
  }
};
