const { getVisibleTimetable, normalizeCell } = require('../../../utils/timetable');

module.exports = {
  openCellModal(event) {
    const id = event.currentTarget.dataset.id;
    const cell = this.findCell(id);
    const normalizedCell = normalizeCell({
      ...cell,
      subject: cell.subject || cell.subjectText || ''
    });
    this.setData({
      cellModalVisible: true,
      editingId: id,
      cellForm: { ...normalizedCell }
    });
  },

  findCell(id) {
    for (const day of this.data.timetable) {
      const cell = day.cells.find((item) => item.id === id);
      if (cell) return cell;
    }
    return {};
  },

  onCellInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`cellForm.${field}`]: event.detail.value });
  },

  onSubjectInput(event) {
    this.setData({ 'cellForm.subject': event.detail.value });
  },

  onCellTimeChange(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`cellForm.${field}`]: event.detail.value });
  },

  onColorPick(event) {
    this.setData({ 'cellForm.color': event.currentTarget.dataset.color });
  },

  saveCell() {
    const timetable = this.data.timetable.map((day) => ({
      ...day,
      cells: day.cells.map((cell) => (
        cell.id === this.data.editingId
          ? normalizeCell({
            ...cell,
            subject: this.data.cellForm.subject,
            subjectText: this.data.cellForm.subject,
            color: this.data.cellForm.color
          })
          : cell
      ))
    }));
    this.setData({
      timetable,
      visibleTimetable: getVisibleTimetable(timetable),
      cellModalVisible: false
    }, () => this.saveWorkspace());
  },

  clearCell() {
    const clearForm = () => {
      this.setData({
        cellForm: {
          ...this.data.cellForm,
          subject: '',
          color: '#fff1f5'
        }
      });
    };

    if (!this.data.cellForm.subject) {
      clearForm();
      return;
    }

    wx.showModal({
      title: '清空课程',
      content: '确定清空当前课程格的科目和颜色吗？保存后会生效。',
      confirmText: '清空',
      confirmColor: '#dc2626',
      success: (res) => {
        if (res.confirm) clearForm();
      }
    });
  },

  openPeriodModal(event) {
    const period = Number(event.currentTarget.dataset.period);
    const periodForm = this.data.periodTimes.find((item) => item.period === period) || {
      period,
      startTime: '',
      endTime: ''
    };
    this.setData({
      periodModalVisible: true,
      periodForm: { ...periodForm }
    });
  },

  onPeriodTimeChange(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`periodForm.${field}`]: event.detail.value });
  },

  savePeriodTime() {
    const periodForm = {
      ...this.data.periodForm,
      label: `第${this.data.periodForm.period}节`,
      timeText: this.data.periodForm.startTime && this.data.periodForm.endTime
        ? `${this.data.periodForm.startTime}-${this.data.periodForm.endTime}`
        : ''
    };
    const periodTimes = this.data.periodTimes.map((item) => (
      item.period === periodForm.period ? periodForm : item
    ));
    this.setData({ periodTimes, periodModalVisible: false }, () => this.saveWorkspace());
  }
};
