const app = getApp();

const { schoolYears, todayText } = require('../../utils/date');
const {
  COLORS,
  PERIODS,
  WORKDAYS,
  getVisibleTimetable
} = require('../../utils/timetable');
const {
  buildWorkspacePayload,
  defaultWorkspace,
  normalizeWorkspace
} = require('../../models/workspace');
const workspaceStore = require('../../services/workspaceStore');
const auth = require('../../services/auth');

const timetableHandlers = require('./handlers/timetable');
const seatHandlers = require('./handlers/seats');
const attendanceHandlers = require('./handlers/attendance');
const classManagementHandlers = require('./handlers/classManagement');
const homeSchoolHandlers = require('./handlers/homeSchool');
const { IMPORT_FIELDS, defaultMapping } = require('../../utils/importRoster');

const ATTENDANCE_STATUSES = [
  { key: 'present', label: '已到', text: '已到' },
  { key: 'late', label: '迟到', text: '迟到' },
  { key: 'leave', label: '请假', text: '请假' },
  { key: 'absent', label: '缺勤', text: '缺勤' }
];

function buildImportFields() {
  const mapping = defaultMapping();
  return IMPORT_FIELDS.map((field) => ({
    ...field,
    value: mapping[field.key] || ''
  }));
}

function syncStateText(cloudReady, ownerOpenid) {
  if (!cloudReady) return '本地体验';
  return ownerOpenid ? 'CloudBase 已启用' : '未登录，本地保存';
}

function buildDutyRows(duties, dutyDays) {
  return duties.map((duty) => ({
    ...duty,
    cells: dutyDays.map((day) => ({
      day,
      studentNames: duty.students && duty.students[day] ? duty.students[day] : ''
    }))
  }));
}

function buildSeatGridColumns(seats) {
  if (!seats.length) return '';
  const occupiedColumns = new Set(seats.map((seat) => Number(seat.gridCol)).filter(Boolean));
  const maxColumn = Math.max(...occupiedColumns);
  return Array.from({ length: maxColumn }, (_, index) => (
    occupiedColumns.has(index + 1) ? '90rpx' : '30rpx'
  )).join(' ');
}

function todayDateValue(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function findAttendanceRecord(records, date, studentId) {
  return records.find((record) => record.date === date && record.studentId === studentId);
}

function attendanceStatusText(status) {
  const item = ATTENDANCE_STATUSES.find((statusItem) => statusItem.key === status);
  return item ? item.text : '未确认';
}

function buildAttendanceRows(students, records, date) {
  return students.map((student) => {
    const record = findAttendanceRecord(records, date, student.id);
    const status = record ? record.status : 'pending';
    return {
      id: `${date}-${student.id}`,
      date,
      studentId: student.id,
      studentNo: student.studentNo || '',
      studentName: student.name || '未命名学生',
      gender: student.gender || '',
      guardianName: student.guardianName || '',
      guardianPhone: student.guardianPhone || '',
      status,
      statusText: attendanceStatusText(status),
      note: record ? record.note : '',
      presentActive: status === 'present',
      lateActive: status === 'late',
      leaveActive: status === 'leave',
      absentActive: status === 'absent'
    };
  });
}

function buildAttendanceSummary(rows) {
  const total = rows.length;
  const count = (status) => rows.filter((row) => row.status === status).length;
  return [
    { label: '应到', value: `${total}`, className: 'total' },
    { label: '已到', value: `${count('present')}`, className: 'present' },
    { label: '迟到', value: `${count('late')}`, className: 'late' },
    { label: '请假', value: `${count('leave')}`, className: 'leave' },
    { label: '缺勤', value: `${count('absent')}`, className: 'absent' },
    { label: '未确认', value: `${count('pending')}`, className: 'pending' }
  ];
}

function normalizeSearchText(value) {
  return String(value || '').trim().toLowerCase();
}

function buildStudentSearchIndex(students) {
  return students.flatMap((student) => {
    const items = [];
    const studentName = normalizeSearchText(student.name);
    const guardianName = normalizeSearchText(student.guardianName);

    if (studentName) {
      items.push({
        id: `${student.id}-student`,
        studentId: student.id,
        type: '学生',
        keyword: studentName,
        displayName: student.name,
        studentName: student.name,
        relationText: student.gender || '学生',
        phone: student.phone || ''
      });
    }

    if (guardianName) {
      items.push({
        id: `${student.id}-guardian`,
        studentId: student.id,
        type: '家长',
        keyword: guardianName,
        displayName: student.guardianName,
        studentName: student.name,
        relationText: student.guardianRelation || '家长',
        phone: student.guardianPhone || ''
      });
    }

    return items;
  });
}

function searchStudentIndex(index, query, limit = 8) {
  const keyword = normalizeSearchText(query);
  if (!keyword) return [];
  return index
    .filter((item) => item.keyword.startsWith(keyword))
    .slice(0, limit);
}

function mergeClasses(localClasses, cloudClasses) {
  const map = {};
  localClasses.forEach((item) => {
    if (item && item.id) {
      map[item.id] = item;
    }
  });
  cloudClasses.forEach((item) => {
    if (item && item.id) {
      map[item.id] = item;
    }
  });
  return Object.keys(map).map((id) => map[id]);
}

function workspaceUpdatedAt(workspace) {
  return workspace && workspace._updatedAt ? Number(workspace._updatedAt) : 0;
}

function cloudWorkspaceUpdatedAt(doc) {
  return doc && doc.clientUpdatedAt
    ? Number(doc.clientUpdatedAt)
    : workspaceUpdatedAt(doc && doc.payload);
}

const navGroups = [
  {
    title: '班级管理',
    items: [
      { key: 'dashboard', label: '首页', icon: '🏠' },
      { key: 'seats', label: '座位表', icon: '💺' },
      { key: 'attendance', label: '考勤', icon: '📝' },
      { key: 'duties', label: '值日表', icon: '🧹' },
      { key: 'committee', label: '班委名单', icon: '👑' },
      { key: 'roster', label: '花名册', icon: '📋' }
    ]
  },
  {
    title: '家校',
    items: [
      { key: 'contacts', label: '家长联系', icon: '☎️' },
      { key: 'familySchedule', label: '课程表', icon: '🗓️' },
      { key: 'todos', label: '今日待办', icon: '✅' }
    ]
  }
];

function initialData() {
  const years = schoolYears();
  return {
    today: todayText(),
    years,
    schoolYear: years[0],
    classes: [],
    activeClassId: '',
    activeClassName: '',
    ownerOpenid: '',
    isLoggedIn: false,
    loginState: '未登录',
    cloudReady: false,
    syncState: '本地体验',
    teacherProfile: {
      nickName: '',
      avatarUrl: ''
    },
    summaryCards: [],
    studentSearchQuery: '',
    studentSearchResults: [],
    navGroups,
    activeKey: 'dashboard',
    activeTitle: '首页',
    colors: COLORS,
    periodLabels: PERIODS,
    attendanceStatuses: ATTENDANCE_STATUSES,
    dutyDays: WORKDAYS,
    selectedSeatIds: [],
    sourceSeatIds: [],
    seatStageWidth: 0,
    seatGridColumns: '',
    batchPhase: 'source',
    batchButtonText: '批量滑选',
    batchSelecting: false,
    cellModalVisible: false,
    periodModalVisible: false,
    seatWizardVisible: false,
    seatModalVisible: false,
    dutyModalVisible: false,
    committeeModalVisible: false,
    studentModalVisible: false,
    todoModalVisible: false,
    rosterImportVisible: false,
    teacherProfileModalVisible: false,
    classModalVisible: false,
    editingId: '',
    classForm: {},
    cellForm: {},
    periodForm: {},
    seatWizardForm: {
      stage: 'setup',
      rows: '',
      columnCount: '',
      currentColumn: 1,
      seatsPerColumn: []
    },
    seatForm: {},
    dutyForm: {},
    dutyModalMode: '',
    committeeForm: {},
    studentForm: {},
    todoForm: {},
    teacherProfileForm: {
      nickName: '',
      avatarUrl: ''
    },
    rosterImportFields: buildImportFields(),
    rosterImportForm: {
      fileName: '',
      filePath: '',
      fileType: '',
      startRow: 2,
      mapping: defaultMapping(),
      previewStudents: []
    },
    timetable: [],
    visibleTimetable: [],
    periodTimes: [],
    seats: [],
    attendanceDate: todayDateValue(),
    attendanceRecords: [],
    attendanceSummary: [],
    visibleAttendance: [],
    duties: [],
    visibleDuties: [],
    committee: [],
    students: [],
    todos: []
  };
}

const pageCore = {
  data: initialData(),

  onLoad() {
    const session = auth.loadSession();
    const ownerOpenid = session && session.openid ? session.openid : '';
    this.loadSchoolYear(this.data.schoolYear, {
      ownerOpenid,
      isLoggedIn: !!ownerOpenid,
      loginState: ownerOpenid ? '已登录' : '未登录',
      cloudReady: !!app.globalData.cloudReady,
      syncState: syncStateText(!!app.globalData.cloudReady, ownerOpenid)
    });
    this.loadTeacherProfile();
  },

  onShow() {
    this.startReminderTimer();
  },

  onHide() {
    this.flushCloudSync();
    this.stopReminderTimer();
  },

  onUnload() {
    this.flushCloudSync();
    this.clearStudentSearchTimer();
    this.stopReminderTimer();
  },

  loadSchoolYear(schoolYear, extraData = {}) {
    const ownerOpenid = Object.prototype.hasOwnProperty.call(extraData, 'ownerOpenid')
      ? extraData.ownerOpenid
      : this.data.ownerOpenid;
    const classes = workspaceStore.loadClasses(ownerOpenid, schoolYear);
    const activeClassId = workspaceStore.loadActiveClassId(ownerOpenid, schoolYear, classes);
    const activeClass = classes.find((item) => item.id === activeClassId) || classes[0];

    this.setData({
      ...extraData,
      schoolYear,
      classes,
      activeClassId,
      activeClassName: activeClass ? activeClass.name : workspaceStore.DEFAULT_CLASS_NAME,
      studentSearchQuery: '',
      studentSearchResults: []
    }, () => this.loadWorkspace());
  },

  loadWorkspace(options = {}) {
    const cached = workspaceStore.loadWorkspace(
      this.data.ownerOpenid,
      this.data.schoolYear,
      this.data.activeClassId
    );
    const workspace = normalizeWorkspace(cached || defaultWorkspace());
    this.setData({
      ...workspace,
      visibleTimetable: getVisibleTimetable(workspace.timetable),
      visibleDuties: this.buildDutyRows(workspace.duties),
      seatGridColumns: this.buildSeatGridColumns(workspace.seats),
      ...this.buildAttendanceView(workspace.students, workspace.attendanceRecords, workspace.attendanceDate)
    }, () => {
      this.refreshStudentSearchIndex(workspace.students);
      this.runStudentSearch(this.data.studentSearchQuery, { immediate: true });
      this.refreshSummary();
      if (this._syncAfterLogin) {
        if (options.skipCloudPull) {
          this._syncAfterLogin = false;
          this.saveWorkspace({ silent: true });
        }
      }

      if (!options.skipCloudPull) {
        this.pullCloudWorkspaces();
      }
    });
  },

  pullCloudWorkspaces() {
    if (!this.data.cloudReady || !this.data.ownerOpenid || this._cloudPulling) {
      return;
    }

    const ownerOpenid = this.data.ownerOpenid;
    const schoolYear = this.data.schoolYear;
    this._cloudPulling = true;
    this.setData({ syncState: '正在读取 CloudBase' });

    workspaceStore.loadCloudWorkspaces(ownerOpenid, schoolYear)
      .then((docs) => {
        this._cloudPulling = false;
        if (ownerOpenid !== this.data.ownerOpenid || schoolYear !== this.data.schoolYear) {
          return;
        }

        if (!docs.length) {
          this.setData({ syncState: syncStateText(this.data.cloudReady, this.data.ownerOpenid) });
          if (this._syncAfterLogin) {
            this._syncAfterLogin = false;
            this.saveWorkspace({ silent: true });
          }
          return;
        }

        const cloudClasses = docs
          .filter((doc) => doc && doc.classId && doc.payload)
          .map((doc) => ({
            id: doc.classId,
            name: String(doc.className || '').trim() || workspaceStore.DEFAULT_CLASS_NAME
          }));

        docs.forEach((doc) => {
          if (doc && doc.classId && doc.payload) {
            const localWorkspace = workspaceStore.loadWorkspace(ownerOpenid, schoolYear, doc.classId);
            if (cloudWorkspaceUpdatedAt(doc) >= workspaceUpdatedAt(localWorkspace)) {
              workspaceStore.saveWorkspace(ownerOpenid, schoolYear, doc.classId, doc.payload);
            }
          }
        });

        const classes = mergeClasses(this.data.classes, cloudClasses);
        const activeClass = cloudClasses.find((item) => item.id === this.data.activeClassId) ||
          cloudClasses[0] ||
          classes.find((item) => item.id === this.data.activeClassId) ||
          classes[0];

        workspaceStore.saveClasses(ownerOpenid, schoolYear, classes);
        if (activeClass) {
          workspaceStore.saveActiveClassId(ownerOpenid, schoolYear, activeClass.id);
        }

        this._syncAfterLogin = false;
        this.setData({
          classes,
          activeClassId: activeClass ? activeClass.id : this.data.activeClassId,
          activeClassName: activeClass ? activeClass.name : this.data.activeClassName,
          syncState: '已从 CloudBase 同步'
        }, () => this.loadWorkspace({ skipCloudPull: true }));
      })
      .catch((error) => {
        this._cloudPulling = false;
        console.error('CloudBase loadCloudWorkspaces failed:', error);
        if (ownerOpenid === this.data.ownerOpenid && schoolYear === this.data.schoolYear) {
          this.setData({ syncState: 'CloudBase 读取失败，使用本地数据' });
          if (this._syncAfterLogin) {
            this._syncAfterLogin = false;
          }
        }
      });
  },

  saveWorkspace(options = {}) {
    const payload = buildWorkspacePayload(this.data);

    workspaceStore.saveWorkspace(this.data.ownerOpenid, this.data.schoolYear, this.data.activeClassId, payload);

    if (!options.silent) {
      wx.showToast({ title: '已保存', icon: 'success' });
    }

    if (this.data.cloudReady && this.data.ownerOpenid) {
      this.scheduleCloudSync(payload);
    }
  },

  scheduleCloudSync(payload) {
    this._pendingSyncPayload = {
      schoolYear: this.data.schoolYear,
      classId: this.data.activeClassId,
      className: this.data.activeClassName,
      ownerOpenid: this.data.ownerOpenid,
      payload
    };
    this.setData({ syncState: '等待同步 CloudBase' });

    if (this._cloudSyncTimer) {
      clearTimeout(this._cloudSyncTimer);
    }

    this._cloudSyncTimer = setTimeout(() => {
      this._cloudSyncTimer = null;
      const pendingPayload = this._pendingSyncPayload;
      this._pendingSyncPayload = null;
      this.syncWorkspace(pendingPayload);
    }, 700);
  },

  flushCloudSync() {
    if (!this._cloudSyncTimer || !this._pendingSyncPayload) return;
    clearTimeout(this._cloudSyncTimer);
    this._cloudSyncTimer = null;
    const pendingPayload = this._pendingSyncPayload;
    this._pendingSyncPayload = null;
    this.syncWorkspace(pendingPayload);
  },

  syncWorkspace(syncTarget) {
    if (!syncTarget || !syncTarget.payload) return;
    workspaceStore.syncWorkspace(
      syncTarget.ownerOpenid,
      syncTarget.schoolYear,
      syncTarget.classId,
      syncTarget.className,
      syncTarget.payload
    )
      .then(() => {
        if (
          syncTarget.schoolYear === this.data.schoolYear &&
          syncTarget.classId === this.data.activeClassId &&
          syncTarget.ownerOpenid === this.data.ownerOpenid
        ) {
          this.setData({ syncState: '已同步 CloudBase' });
        }
      })
      .catch((error) => {
        console.error('CloudBase syncWorkspace failed:', error);
        if (
          syncTarget.schoolYear === this.data.schoolYear &&
          syncTarget.classId === this.data.activeClassId &&
          syncTarget.ownerOpenid === this.data.ownerOpenid
        ) {
          this.setData({ syncState: 'CloudBase 同步失败，已保存在本地' });
        }
      });
  },

  refreshVisibleTimetable() {
    this.setData({
      visibleTimetable: getVisibleTimetable(this.data.timetable)
    });
  },

  buildDutyRows(duties = this.data.duties) {
    return buildDutyRows(duties, this.data.dutyDays);
  },

  buildSeatGridColumns(seats = this.data.seats) {
    return buildSeatGridColumns(seats);
  },

  buildAttendanceView(
    students = this.data.students,
    attendanceRecords = this.data.attendanceRecords,
    attendanceDate = this.data.attendanceDate
  ) {
    const visibleAttendance = buildAttendanceRows(students, attendanceRecords, attendanceDate);
    return {
      visibleAttendance,
      attendanceSummary: buildAttendanceSummary(visibleAttendance)
    };
  },

  refreshAttendanceView(
    students = this.data.students,
    attendanceRecords = this.data.attendanceRecords,
    attendanceDate = this.data.attendanceDate
  ) {
    this.setData(this.buildAttendanceView(students, attendanceRecords, attendanceDate));
  },

  refreshStudentSearchIndex(students = this.data.students) {
    this._studentSearchIndex = buildStudentSearchIndex(students);
  },

  onStudentSearchInput(event) {
    const query = event.detail.value;
    this.setData({ studentSearchQuery: query });
    this.runStudentSearch(query);
  },

  clearStudentSearch() {
    this.clearStudentSearchTimer();

    this.setData({
      studentSearchQuery: '',
      studentSearchResults: []
    });
  },

  clearStudentSearchTimer() {
    if (this._studentSearchTimer) {
      clearTimeout(this._studentSearchTimer);
      this._studentSearchTimer = null;
    }
  },

  runStudentSearch(query, options = {}) {
    const keyword = normalizeSearchText(query);
    this._studentSearchSeq = (this._studentSearchSeq || 0) + 1;
    const seq = this._studentSearchSeq;

    this.clearStudentSearchTimer();

    if (!keyword) {
      this.setData({ studentSearchResults: [] });
      return;
    }

    const applySearch = () => {
      if (seq !== this._studentSearchSeq) return;
      const results = searchStudentIndex(this._studentSearchIndex || [], keyword);
      this.setData({ studentSearchResults: results });
    };

    if (options.immediate) {
      applySearch();
      return;
    }

    this._studentSearchTimer = setTimeout(() => {
      this._studentSearchTimer = null;
      applySearch();
    }, 90);
  },

  loadTeacherProfile() {
    const teacherProfile = workspaceStore.loadTeacherProfile(this.data.ownerOpenid);
    if (teacherProfile) {
      this.setData({ teacherProfile });
    }
    return teacherProfile || null;
  },

  onTeacherAvatarTap() {
    if (!this.data.isLoggedIn) {
      this.login();
      return;
    }

    this.openTeacherProfileModal();
  },

  openTeacherProfileModal() {
    this.setData({
      teacherProfileModalVisible: true,
      teacherProfileForm: {
        nickName: this.data.teacherProfile.nickName || '',
        avatarUrl: this.data.teacherProfile.avatarUrl || ''
      }
    });
  },

  onTeacherNameInput(event) {
    this.setData({
      'teacherProfileForm.nickName': event.detail.value
    });
  },

  onTeacherAvatarChoose(event) {
    const avatarUrl = event.detail.avatarUrl;
    if (!avatarUrl) return;

    wx.saveFile({
      tempFilePath: avatarUrl,
      success: (res) => {
        this.setData({
          'teacherProfileForm.avatarUrl': res.savedFilePath
        });
      },
      fail: () => {
        this.setData({
          'teacherProfileForm.avatarUrl': avatarUrl
        });
      }
    });
  },

  saveTeacherProfile() {
    const form = this.data.teacherProfileForm;
    const teacherProfile = {
      nickName: String(form.nickName || '').trim() || '老师',
      avatarUrl: form.avatarUrl || ''
    };

    workspaceStore.saveTeacherProfile(this.data.ownerOpenid, teacherProfile);
    this.setData({
      teacherProfile,
      teacherProfileModalVisible: false
    });
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  login() {
    if (!this.data.cloudReady) {
      wx.showToast({ title: '请先启用 CloudBase', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '登录中' });
    auth.login()
      .then((session) => {
        wx.hideLoading();
        app.globalData.openid = session.openid;
        app.globalData.loggedIn = true;
        this.flushCloudSync();
        this._syncAfterLogin = true;
        this.setData({
          ownerOpenid: session.openid,
          isLoggedIn: true,
          loginState: '已登录',
          syncState: syncStateText(this.data.cloudReady, session.openid)
        }, () => {
          const teacherProfile = this.loadTeacherProfile();
          this.loadSchoolYear(this.data.schoolYear, {
            ownerOpenid: session.openid,
            isLoggedIn: true,
            loginState: '已登录',
            syncState: syncStateText(this.data.cloudReady, session.openid)
          });
          if (!teacherProfile || (!teacherProfile.nickName && !teacherProfile.avatarUrl)) {
            this.openTeacherProfileModal();
          }
        });
        wx.showToast({ title: '登录成功', icon: 'success' });
      })
      .catch((error) => {
        wx.hideLoading();
        console.error('login failed:', error);
        wx.showToast({ title: '登录失败，请检查云函数', icon: 'none' });
      });
  },

  onYearChange(event) {
    const schoolYear = this.data.years[event.detail.value];
    if (!schoolYear) return;
    this.flushCloudSync();
    this.loadSchoolYear(schoolYear, {
      syncState: syncStateText(this.data.cloudReady, this.data.ownerOpenid)
    });
  },

  onYearTap(event) {
    const schoolYear = event.currentTarget.dataset.year;
    if (!schoolYear || schoolYear === this.data.schoolYear) {
      return;
    }

    this.flushCloudSync();
    this.loadSchoolYear(schoolYear, {
      syncState: syncStateText(this.data.cloudReady, this.data.ownerOpenid)
    });
  },

  onClassTap(event) {
    const classId = event.currentTarget.dataset.id;
    if (!classId || classId === this.data.activeClassId) {
      return;
    }

    const activeClass = this.data.classes.find((item) => item.id === classId);
    if (!activeClass) return;

    this.flushCloudSync();
    workspaceStore.saveActiveClassId(this.data.ownerOpenid, this.data.schoolYear, classId);
    this.setData({
      activeClassId: classId,
      activeClassName: activeClass.name,
      studentSearchQuery: '',
      studentSearchResults: [],
      syncState: syncStateText(this.data.cloudReady, this.data.ownerOpenid)
    }, () => this.loadWorkspace());
  },

  openClassModal(event) {
    const classId = event.currentTarget.dataset.id || '';
    const classItem = this.data.classes.find((item) => item.id === classId);

    this.setData({
      classModalVisible: true,
      editingId: classItem ? classItem.id : '',
      classForm: {
        name: classItem ? classItem.name : ''
      }
    });
  },

  onClassNameInput(event) {
    this.setData({
      'classForm.name': event.detail.value
    });
  },

  saveClass() {
    const name = String(this.data.classForm.name || '').trim();
    if (!name) {
      wx.showToast({ title: '请填写班级名称', icon: 'none' });
      return;
    }

    if (this.data.classes.some((item) => item.name === name && item.id !== this.data.editingId)) {
      wx.showToast({ title: '班级名称已存在', icon: 'none' });
      return;
    }

    const classId = this.data.editingId || `class-${Date.now()}`;
    const exists = this.data.classes.some((item) => item.id === classId);
    const classes = exists
      ? this.data.classes.map((item) => (item.id === classId ? { ...item, name } : item))
      : [...this.data.classes, { id: classId, name }];

    workspaceStore.saveClasses(this.data.ownerOpenid, this.data.schoolYear, classes);
    workspaceStore.saveActiveClassId(this.data.ownerOpenid, this.data.schoolYear, classId);
    this.flushCloudSync();

    this.setData({
      classes,
      activeClassId: classId,
      activeClassName: name,
      classModalVisible: false,
      editingId: '',
      classForm: {},
      studentSearchQuery: '',
      studentSearchResults: [],
      syncState: syncStateText(this.data.cloudReady, this.data.ownerOpenid)
    }, () => this.loadWorkspace());
  },

  deleteClass() {
    const deletingClassId = this.data.editingId;
    if (!deletingClassId) return;
    if (this.data.classes.length <= 1) {
      wx.showToast({ title: '至少保留一个班级', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '删除班级',
      content: '只会从当前学年的班级列表移除，不会清空本地历史数据。',
      confirmText: '删除',
      confirmColor: '#dc2626',
      success: (res) => {
        if (!res.confirm) return;

        const classes = this.data.classes.filter((item) => item.id !== deletingClassId);
        const activeClass = classes[0];
        workspaceStore.saveClasses(this.data.ownerOpenid, this.data.schoolYear, classes);
        workspaceStore.saveActiveClassId(this.data.ownerOpenid, this.data.schoolYear, activeClass.id);
        this.flushCloudSync();

        this.setData({
          classes,
          activeClassId: activeClass.id,
          activeClassName: activeClass.name,
          classModalVisible: false,
          editingId: '',
          classForm: {},
          studentSearchQuery: '',
          studentSearchResults: [],
          syncState: syncStateText(this.data.cloudReady, this.data.ownerOpenid)
        }, () => this.loadWorkspace());
      }
    });
  },

  onNavTap(event) {
    const key = event.currentTarget.dataset.key;
    const item = this.data.navGroups
      .flatMap((group) => group.items)
      .find((navItem) => navItem.key === key);

    this.setData({
      activeKey: key,
      activeTitle: item ? item.label : '首页'
    }, () => {
      if (key === 'seats') {
        this.updateSeatStageWidth();
      } else if (key === 'attendance') {
        this.refreshAttendanceView();
      }
    });
  },

  updateSeatStageWidth() {
    const queryWidth = () => {
      wx.createSelectorQuery()
        .in(this)
        .select('.seat-scroll')
        .boundingClientRect((rect) => {
          if (rect && rect.width) {
            this.setData({ seatStageWidth: Math.floor(rect.width) });
          }
        })
        .exec();
    };

    if (wx.nextTick) {
      wx.nextTick(queryWidth);
      return;
    }

    queryWidth();
  },

  refreshSummary() {
    const total = this.data.students.length;
    const boys = this.data.students.filter((student) => student.gender === '男').length;
    const girls = this.data.students.filter((student) => student.gender === '女').length;
    const doneTodos = this.data.todos.filter((todo) => todo.done).length;
    const todoRate = this.data.todos.length
      ? Math.round((doneTodos / this.data.todos.length) * 100)
      : 0;

    this.setData({
      summaryCards: [
        { icon: '👩‍🏫', value: `${total}`, label: '全班人数' },
        { icon: '👦', value: `${boys}`, label: '男生' },
        { icon: '👧', value: `${girls}`, label: '女生' },
        { icon: '✅', value: `${todoRate}%`, label: '待办完成' }
      ]
    });
  },

  closeModal() {
    this.setData({
      cellModalVisible: false,
      periodModalVisible: false,
      teacherProfileModalVisible: false,
      classModalVisible: false,
      seatWizardVisible: false,
      seatModalVisible: false,
      dutyModalVisible: false,
      committeeModalVisible: false,
      studentModalVisible: false,
      todoModalVisible: false,
      rosterImportVisible: false
    });
  },

  noop() {
  }
};

Page(Object.assign(
  {},
  pageCore,
  timetableHandlers,
  seatHandlers,
  attendanceHandlers,
  classManagementHandlers,
  homeSchoolHandlers
));
