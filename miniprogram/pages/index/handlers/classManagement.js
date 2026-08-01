const {
  IMPORT_FIELDS,
  buildStudentsFromRows,
  columnToIndex,
  defaultMapping,
  parseCsv
} = require('../../../utils/importRoster');

function buildImportFields(mapping = defaultMapping()) {
  return IMPORT_FIELDS.map((field) => ({
    ...field,
    value: mapping[field.key] || ''
  }));
}

module.exports = {
  openDutyModal(event) {
    const index = Number(event.currentTarget.dataset.index);
    this.setData({
      dutyModalVisible: true,
      editingId: String(index),
      dutyForm: { ...this.data.duties[index] }
    });
  },

  onDutyInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`dutyForm.${field}`]: event.detail.value });
  },

  saveDuty() {
    const index = Number(this.data.editingId);
    const duties = this.data.duties.map((duty, dutyIndex) => (
      dutyIndex === index ? { ...duty, ...this.data.dutyForm } : duty
    ));
    this.setData({ duties, dutyModalVisible: false }, () => this.saveWorkspace());
  },

  openCommitteeModal(event) {
    const id = event.currentTarget.dataset.id || '';
    const form = id
      ? { ...this.data.committee.find((item) => item.id === id) }
      : { id: `role-${Date.now()}`, role: '', studentName: '', responsibility: '' };
    this.setData({
      committeeModalVisible: true,
      editingId: id,
      committeeForm: form
    });
  },

  onCommitteeInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`committeeForm.${field}`]: event.detail.value });
  },

  saveCommittee() {
    const item = this.data.committeeForm;
    const committee = this.data.editingId
      ? this.data.committee.map((role) => (role.id === this.data.editingId ? item : role))
      : [...this.data.committee, item];

    this.setData({ committee, committeeModalVisible: false }, () => this.saveWorkspace());
  },

  deleteCommittee(event) {
    const id = event.currentTarget.dataset.id;
    const committee = this.data.committee.filter((item) => item.id !== id);
    this.setData({ committee }, () => this.saveWorkspace());
  },

  openStudentModal(event) {
    const id = event.currentTarget.dataset.id || '';
    const empty = {
      id: `stu-${Date.now()}`,
      name: '',
      gender: '',
      studentNo: '',
      phone: '',
      address: '',
      guardianName: '',
      guardianRelation: '',
      guardianPhone: ''
    };
    const form = id ? { ...this.data.students.find((item) => item.id === id) } : empty;
    this.setData({
      studentModalVisible: true,
      editingId: id,
      studentForm: form
    });
  },

  onStudentInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`studentForm.${field}`]: event.detail.value });
  },

  saveStudent() {
    const item = this.data.studentForm;
    if (!item.name) {
      wx.showToast({ title: '请填写学生姓名', icon: 'none' });
      return;
    }

    const students = this.data.editingId
      ? this.data.students.map((student) => (student.id === this.data.editingId ? item : student))
      : [...this.data.students, item];

    this.setData({ students, studentModalVisible: false }, () => {
      this.refreshSummary();
      this.saveWorkspace();
    });
  },

  deleteStudent(event) {
    const id = event.currentTarget.dataset.id;
    const students = this.data.students.filter((item) => item.id !== id);
    this.setData({ students }, () => {
      this.refreshSummary();
      this.saveWorkspace();
    });
  },

  openRosterImport() {
    const mapping = defaultMapping();
    this.setData({
      rosterImportVisible: true,
      rosterImportFields: buildImportFields(mapping),
      rosterImportForm: {
        fileName: '',
        filePath: '',
        fileType: '',
        startRow: 2,
        mapping,
        previewStudents: []
      }
    });
  },

  chooseRosterFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['csv', 'xlsx', 'xls'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file) return;
        const lowerName = String(file.name || '').toLowerCase();
        const fileType = lowerName.endsWith('.csv')
          ? 'csv'
          : lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')
            ? 'excel'
            : '';

        if (!fileType) {
          wx.showToast({ title: '请选择 CSV 或 Excel 文件', icon: 'none' });
          return;
        }

        this.setData({
          'rosterImportForm.fileName': file.name,
          'rosterImportForm.filePath': file.path,
          'rosterImportForm.fileType': fileType,
          'rosterImportForm.previewStudents': []
        });
      }
    });
  },

  onRosterImportInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`rosterImportForm.${field}`]: event.detail.value });
  },

  onRosterMappingInput(event) {
    const field = event.currentTarget.dataset.field;
    const value = event.detail.value;
    const rosterImportFields = this.data.rosterImportFields.map((item) => (
      item.key === field ? { ...item, value } : item
    ));
    this.setData({
      [`rosterImportForm.mapping.${field}`]: value,
      rosterImportFields
    });
  },

  buildRosterPreview() {
    const form = this.data.rosterImportForm;
    if (!form.filePath) {
      wx.showToast({ title: '请先选择文件', icon: 'none' });
      return;
    }

    if (!form.mapping.name) {
      wx.showToast({ title: '请填写学生姓名所在列', icon: 'none' });
      return;
    }

    if (columnToIndex(form.mapping.name) < 0) {
      wx.showToast({ title: '姓名列填写不正确', icon: 'none' });
      return;
    }

    if (form.fileType === 'csv') {
      this.buildCsvRosterPreview(form);
      return;
    }

    this.buildExcelRosterPreview(form);
  },

  buildCsvRosterPreview(form) {
    wx.getFileSystemManager().readFile({
      filePath: form.filePath,
      encoding: 'utf8',
      success: (res) => {
        const rows = parseCsv(res.data || '');
        const previewStudents = buildStudentsFromRows(rows, form.mapping, form.startRow);
        if (!previewStudents.length) {
          wx.showToast({ title: '没有识别到学生姓名', icon: 'none' });
          return;
        }
        this.setData({ 'rosterImportForm.previewStudents': previewStudents });
      },
      fail: () => {
        wx.showToast({ title: '读取文件失败', icon: 'none' });
      }
    });
  },

  buildExcelRosterPreview(form) {
    if (!this.data.cloudReady) {
      wx.showToast({ title: 'Excel 解析需先启用 CloudBase；可先导出 CSV 导入', icon: 'none', duration: 3000 });
      return;
    }

    wx.showLoading({ title: '解析中' });
    const cloudPath = `imports/roster-${Date.now()}-${form.fileName}`;
    wx.cloud.uploadFile({
      cloudPath,
      filePath: form.filePath
    })
      .then((upload) => wx.cloud.callFunction({
        name: 'importRosterExcel',
        data: {
          fileID: upload.fileID,
          mapping: form.mapping,
          startRow: form.startRow
        }
      }).then((res) => ({ res, fileID: upload.fileID })))
      .then(({ res, fileID }) => {
        wx.cloud.deleteFile({ fileList: [fileID] }).catch(() => {});
        wx.hideLoading();
        const previewStudents = res.result && res.result.students ? res.result.students : [];
        if (!previewStudents.length) {
          wx.showToast({ title: '没有识别到学生姓名', icon: 'none' });
          return;
        }
        this.setData({ 'rosterImportForm.previewStudents': previewStudents });
      })
      .catch(() => {
        wx.hideLoading();
        wx.showToast({ title: 'Excel 解析失败', icon: 'none' });
      });
  },

  confirmRosterImport() {
    const previewStudents = this.data.rosterImportForm.previewStudents || [];
    if (!previewStudents.length) {
      wx.showToast({ title: '请先生成预览', icon: 'none' });
      return;
    }

    const students = [...this.data.students, ...previewStudents];
    this.setData({
      students,
      rosterImportVisible: false
    }, () => {
      this.refreshSummary();
      this.saveWorkspace();
    });
  }
};
