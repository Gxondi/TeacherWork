const { buildSeatLayout } = require('../../../utils/seatLayout');

module.exports = {
  toggleBatchSeats() {
    const seats = this.data.seats.map((seat) => ({ ...seat, selected: false }));
    this.setData({
      batchSelecting: !this.data.batchSelecting,
      selectedSeatIds: [],
      sourceSeatIds: [],
      batchPhase: 'source',
      batchButtonText: this.data.batchSelecting ? '批量滑选' : '选择来源中',
      seats
    });
  },

  onSeatTap(event) {
    const id = event.currentTarget.dataset.id;
    const seat = this.data.seats.find((item) => item.id === id);
    if (!seat || seat.deleted) return;

    if (this.data.batchSelecting) {
      this.toggleSeatSelection(id);
      return;
    }

    this.setData({
      seatModalVisible: true,
      editingId: id,
      seatForm: { ...seat }
    });
  },

  toggleSeatSelection(id) {
    const target = this.data.seats.find((seat) => seat.id === id);
    if (!target || target.deleted) return;

    const selectedSeatIds = this.data.selectedSeatIds.includes(id)
      ? this.data.selectedSeatIds.filter((seatId) => seatId !== id)
      : [...this.data.selectedSeatIds, id];

    const selected = new Set(selectedSeatIds);
    const seats = this.data.seats.map((seat) => ({ ...seat, selected: selected.has(seat.id) }));
    this.setData({ selectedSeatIds, seats });
  },

  onSeatGridTouchStart(event) {
    if (!this.data.batchSelecting) return;
    const seats = this.data.seats.map((seat) => ({
      ...seat,
      selected: this.data.batchPhase === 'target' && this.data.sourceSeatIds.includes(seat.id)
    }));
    this.setData({ selectedSeatIds: [], seats }, () => {
      this.markSeatByTouch(event);
    });
  },

  onSeatGridTouchMove(event) {
    if (!this.data.batchSelecting) return;
    this.markSeatByTouch(event);
  },

  onSeatGridTouchEnd() {
    if (!this.data.batchSelecting || !this.data.selectedSeatIds.length) return;

    if (this.data.batchPhase === 'source') {
      const sourceSeatIds = [...this.data.selectedSeatIds];
      const sourceSet = new Set(sourceSeatIds);
      const seats = this.data.seats.map((seat) => ({ ...seat, selected: sourceSet.has(seat.id) }));
      this.setData({
        sourceSeatIds,
        selectedSeatIds: [],
        batchPhase: 'target',
        batchButtonText: '选择目标中',
        seats
      });
      wx.showToast({ title: '请选择目标座位', icon: 'none' });
      return;
    }

    this.confirmBatchReplace(this.data.sourceSeatIds, [...this.data.selectedSeatIds]);
  },

  markSeatByTouch(event) {
    const touch = event.touches && event.touches[0];
    if (!touch) return;

    wx.createSelectorQuery()
      .in(this)
      .selectAll('.seat-card')
      .boundingClientRect((rects) => {
        const hit = rects.find((rect) => (
          touch.clientX >= rect.left &&
          touch.clientX <= rect.right &&
          touch.clientY >= rect.top &&
          touch.clientY <= rect.bottom
        ));

        if (!hit) return;
        const id = hit.dataset && hit.dataset.id ? hit.dataset.id : hit.id.replace('seat-card-', '');
        const hitSeat = this.data.seats.find((seat) => seat.id === id);
        if (id && hitSeat && !hitSeat.deleted && !this.data.selectedSeatIds.includes(id)) {
          const selectedSeatIds = [...this.data.selectedSeatIds, id];
          const selected = new Set([
            ...(this.data.batchPhase === 'target' ? this.data.sourceSeatIds : []),
            ...selectedSeatIds
          ]);
          const seats = this.data.seats.map((seat) => ({ ...seat, selected: selected.has(seat.id) }));
          this.setData({ selectedSeatIds, seats });
        }
      })
      .exec();
  },

  confirmBatchReplace(sourceSeatIds, targetSeatIds) {
    if (!sourceSeatIds.length || !targetSeatIds.length) {
      wx.showToast({ title: '请选择来源和目标', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认互换座位',
      content: `将 ${sourceSeatIds.length} 个来源座位与 ${targetSeatIds.length} 个目标座位按顺序互换？`,
      confirmText: '互换',
      success: (res) => {
        if (!res.confirm) {
          this.resetBatchSelection();
          return;
        }
        this.applyBatchReplace(sourceSeatIds, targetSeatIds);
      }
    });
  },

  applyBatchReplace(sourceSeatIds, targetSeatIds) {
    const sourceSeats = sourceSeatIds
      .map((id) => this.data.seats.find((seat) => seat.id === id))
      .filter((seat) => seat && !seat.deleted);
    const targetSeats = targetSeatIds
      .map((id) => this.data.seats.find((seat) => seat.id === id))
      .filter((seat) => seat && !seat.deleted);
    const pairCount = Math.min(sourceSeats.length, targetSeats.length);
    const swaps = {};

    for (let index = 0; index < pairCount; index += 1) {
      const source = sourceSeats[index];
      const target = targetSeats[index];
      swaps[source.id] = { studentName: target.studentName, note: target.note };
      swaps[target.id] = { studentName: source.studentName, note: source.note };
    }

    const seats = this.data.seats.map((seat) => (
      swaps[seat.id] ? { ...seat, ...swaps[seat.id], selected: false } : { ...seat, selected: false }
    ));

    this.setData({
      seats,
      selectedSeatIds: [],
      sourceSeatIds: [],
      batchPhase: 'source',
      batchButtonText: '批量滑选',
      batchSelecting: false
    }, () => this.saveWorkspace());
  },

  clearSeatLayout() {
    wx.showModal({
      title: '清空座位表',
      content: '确定要清空当前座位布局和所有座位信息吗？',
      confirmText: '清空',
      confirmColor: '#dc2626',
      success: (res) => {
        if (!res.confirm) return;
        this.setData({
          seats: [],
          selectedSeatIds: [],
          sourceSeatIds: [],
          batchPhase: 'source',
          batchButtonText: '批量滑选',
          batchSelecting: false
        }, () => this.saveWorkspace());
      }
    });
  },

  resetBatchSelection() {
    const seats = this.data.seats.map((seat) => ({ ...seat, selected: false }));
    this.setData({
      seats,
      selectedSeatIds: [],
      sourceSeatIds: [],
      batchPhase: 'source',
      batchButtonText: '批量滑选',
      batchSelecting: false
    });
  },

  addSeat() {
    this.setData({
      seatWizardVisible: true,
      seatWizardForm: {
        stage: 'setup',
        rows: '',
        columnCount: '',
        currentColumn: 1,
        seatsPerColumn: []
      }
    });
  },

  onSeatWizardInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`seatWizardForm.${field}`]: event.detail.value });
  },

  startSeatWizardColumns() {
    const rows = Number(this.data.seatWizardForm.rows);
    const columnCount = Number(this.data.seatWizardForm.columnCount);
    if (!Number.isInteger(rows) || rows <= 0 || !Number.isInteger(columnCount) || columnCount <= 0) {
      wx.showToast({ title: '请填写大于0的排数和列数', icon: 'none' });
      return;
    }

    this.setData({
      seatWizardForm: {
        stage: 'columns',
        rows,
        columnCount,
        currentColumn: 1,
        seatsPerColumn: []
      }
    });
  },

  chooseSeatColumnType(event) {
    const seatCount = Number(event.currentTarget.dataset.count);
    const form = this.data.seatWizardForm;
    const seatsPerColumn = [...form.seatsPerColumn, seatCount];

    if (seatsPerColumn.length >= form.columnCount) {
      const seats = buildSeatLayout(form.rows, seatsPerColumn);
      this.setData({
        seats,
        selectedSeatIds: [],
        batchSelecting: false,
        seatWizardVisible: false
      }, () => this.saveWorkspace());
      return;
    }

    this.setData({
      seatWizardForm: {
        ...form,
        stage: 'columns',
        currentColumn: seatsPerColumn.length + 1,
        seatsPerColumn
      }
    });
  },

  resetSeatWizard() {
    this.setData({
      seatWizardForm: {
        stage: 'setup',
        rows: '',
        columnCount: '',
        currentColumn: 1,
        seatsPerColumn: []
      }
    });
  },

  onSeatInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`seatForm.${field}`]: event.detail.value });
  },

  saveSeat() {
    const seats = this.data.seats.map((seat) => (
      seat.id === this.data.editingId ? { ...seat, ...this.data.seatForm, deleted: false } : seat
    ));
    this.setData({ seats, seatModalVisible: false }, () => this.saveWorkspace());
  },

  deleteSeat() {
    const seats = this.data.seats.map((seat) => (
      seat.id === this.data.editingId
        ? { ...seat, studentName: '', note: '', deleted: true, selected: false }
        : seat
    ));
    this.setData({ seats, seatModalVisible: false }, () => this.saveWorkspace());
  },

  clearSelectedSeats() {
    const selected = new Set(this.data.selectedSeatIds);
    const seats = this.data.seats.map((seat) => (
      selected.has(seat.id) && !seat.deleted
        ? { ...seat, studentName: '', note: '', selected: false }
        : { ...seat, selected: false }
    ));
    this.setData({
      seats,
      selectedSeatIds: [],
      sourceSeatIds: [],
      batchPhase: 'source',
      batchButtonText: this.data.batchSelecting ? '选择来源中' : '批量滑选'
    }, () => this.saveWorkspace());
  },

  swapSelectedSeats() {
    if (this.data.selectedSeatIds.length !== 2) {
      wx.showToast({ title: '请选择两个座位', icon: 'none' });
      return;
    }

    const [firstId, secondId] = this.data.selectedSeatIds;
    const first = this.data.seats.find((seat) => seat.id === firstId);
    const second = this.data.seats.find((seat) => seat.id === secondId);
    const seats = this.data.seats.map((seat) => {
      if (seat.id === firstId) {
        return { ...seat, studentName: second.studentName, note: second.note, selected: false };
      }
      if (seat.id === secondId) {
        return { ...seat, studentName: first.studentName, note: first.note, selected: false };
      }
      return { ...seat, selected: false };
    });

    this.setData({
      seats,
      selectedSeatIds: [],
      sourceSeatIds: [],
      batchPhase: 'source',
      batchButtonText: this.data.batchSelecting ? '选择来源中' : '批量滑选'
    }, () => this.saveWorkspace());
  }
};
