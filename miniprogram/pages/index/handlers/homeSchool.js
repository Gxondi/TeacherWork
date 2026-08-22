module.exports = {
  callPhone(event) {
    const phoneNumber = String(event.currentTarget.dataset.phone || '').trim();
    if (!phoneNumber) {
      wx.showToast({ title: '未填写电话', icon: 'none' });
      return;
    }

    wx.makePhoneCall({ phoneNumber });
  },

  exportRosterPdf() {
    const exportText = this.buildRosterText();

    if (!this.data.cloudReady) {
      this.copyRosterFallback(exportText);
      return;
    }

    wx.showLoading({ title: '正在生成' });
    wx.cloud.callFunction({
      name: 'exportRosterPdf',
      data: {
        schoolYear: this.data.schoolYear,
        students: this.data.students
      }
    })
      .then((res) => {
        wx.hideLoading();
        const fileID = res.result && res.result.fileID;
        if (!fileID) {
          this.copyRosterFallback(exportText);
          return;
        }
        wx.setClipboardData({
          data: fileID,
          success: () => wx.showToast({ title: 'PDF 文件ID已复制', icon: 'success' })
        });
      })
      .catch(() => {
        wx.hideLoading();
        this.copyRosterFallback(exportText);
      });
  },

  buildRosterText() {
    const lines = [`${this.data.schoolYear} 花名册`, '学号\t学生\t性别\t学生电话\t家庭住址\t家长\t关系\t家长电话'];
    this.data.students.forEach((student) => {
      lines.push([
        student.studentNo,
        student.name,
        student.gender,
        student.phone,
        student.address,
        student.guardianName,
        student.guardianRelation,
        student.guardianPhone
      ].join('\t'));
    });
    return lines.join('\n');
  },

  copyRosterFallback(text) {
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '已复制导出数据', icon: 'success' })
    });
  },

  copyFamilySchedule() {
    const lines = [`${this.data.schoolYear} 课程表`];
    this.data.visibleTimetable.forEach((day) => {
      const subjects = day.cells.map((cell) => `${cell.period}.${cell.subject || '未安排'}`).join(' ');
      lines.push(`${day.day}: ${subjects}`);
    });
    wx.setClipboardData({
      data: lines.join('\n'),
      success: () => wx.showToast({ title: '课程表已复制', icon: 'success' })
    });
  },

  openTodoModal(event) {
    const id = event.currentTarget.dataset.id || '';
    const form = id
      ? { ...this.data.todos.find((item) => item.id === id) }
      : { id: `todo-${Date.now()}`, title: '', dueDate: '', dueTime: '17:00', done: false, reminded: false };
    this.setData({
      todoModalVisible: true,
      editingId: id,
      todoForm: form
    });
  },

  onTodoInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`todoForm.${field}`]: event.detail.value });
  },

  onTodoDateChange(event) {
    this.setData({ 'todoForm.dueDate': event.detail.value });
  },

  onTodoTimeChange(event) {
    this.setData({ 'todoForm.dueTime': event.detail.value });
  },

  saveTodo() {
    const item = this.data.todoForm;
    if (!item.title) {
      wx.showToast({ title: '请填写待办内容', icon: 'none' });
      return;
    }

    const todos = this.data.editingId
      ? this.data.todos.map((todo) => (todo.id === this.data.editingId ? item : todo))
      : [...this.data.todos, item];

    this.setData({ todos, todoModalVisible: false }, () => {
      this.refreshSummary();
      this.saveWorkspace();
    });
  },

  toggleTodo(event) {
    const id = event.currentTarget.dataset.id;
    const todos = this.data.todos.map((todo) => (
      todo.id === id ? { ...todo, done: !todo.done } : todo
    ));
    this.setData({ todos }, () => {
      this.refreshSummary();
      this.saveWorkspace({ silent: true });
    });
  },

  deleteTodo(event) {
    const id = event.currentTarget.dataset.id;
    const todo = this.data.todos.find((item) => item.id === id);
    wx.showModal({
      title: '删除待办',
      content: `确定删除${todo && todo.title ? `「${todo.title}」` : '这条待办'}吗？`,
      confirmText: '删除',
      confirmColor: '#dc2626',
      success: (res) => {
        if (!res.confirm) return;
        const todos = this.data.todos.filter((item) => item.id !== id);
        this.setData({ todos }, () => {
          this.refreshSummary();
          this.saveWorkspace();
        });
      }
    });
  },

  startReminderTimer() {
    this.stopReminderTimer();
    this.reminderTimer = setInterval(() => this.checkTodoReminders(), 60000);
    this.checkTodoReminders();
  },

  stopReminderTimer() {
    if (this.reminderTimer) {
      clearInterval(this.reminderTimer);
      this.reminderTimer = null;
    }
  },

  checkTodoReminders() {
    const now = new Date();
    let changed = false;
    const todos = this.data.todos.map((todo) => {
      if (todo.done || todo.reminded || !todo.dueTime) return todo;

      const date = todo.dueDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const due = new Date(`${date}T${todo.dueTime}:00`);
      if (due <= now) {
        wx.showToast({ title: `待办：${todo.title}`, icon: 'none', duration: 2500 });
        changed = true;
        return { ...todo, reminded: true };
      }
      return todo;
    });

    if (changed) {
      this.setData({ todos }, () => this.saveWorkspace({ silent: true }));
    }
  }
};
