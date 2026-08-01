const app = getApp();

const { todayText } = require('../../utils/date');
const {
  COLORS,
  PERIODS,
  getVisibleTimetable
} = require('../../utils/timetable');
const {
  buildWorkspacePayload,
  defaultWorkspace,
  normalizeWorkspace
} = require('../../models/workspace');
const workspaceStore = require('../../services/workspaceStore');

const timetableHandlers = require('./handlers/timetable');
const seatHandlers = require('./handlers/seats');
const classManagementHandlers = require('./handlers/classManagement');
const homeSchoolHandlers = require('./handlers/homeSchool');
const { IMPORT_FIELDS, defaultMapping } = require('../../utils/importRoster');

const YEARS = ['2026-2027', '2025-2026', '2024-2025', '2023-2024', '2022-2023', '2021-2022', '2020-2021'];

function buildImportFields() {
  const mapping = defaultMapping();
  return IMPORT_FIELDS.map((field) => ({
    ...field,
    value: mapping[field.key] || ''
  }));
}

const navGroups = [
  {
    title: '班级管理',
    items: [
      { key: 'dashboard', label: '首页', icon: '🏠' },
      { key: 'seats', label: '座位表', icon: '💺' },
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
  return {
    today: todayText(),
    years: YEARS,
    schoolYear: YEARS[0],
    cloudReady: false,
    syncState: '本地体验',
    teacherProfile: null,
    summaryCards: [],
    navGroups,
    activeKey: 'dashboard',
    activeTitle: '首页',
    colors: COLORS,
    periodLabels: PERIODS,
    selectedSeatIds: [],
    sourceSeatIds: [],
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
    editingId: '',
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
    committeeForm: {},
    studentForm: {},
    todoForm: {},
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
    duties: [],
    committee: [],
    students: [],
    todos: []
  };
}

const pageCore = {
  data: initialData(),

  onLoad() {
    this.setData({
      cloudReady: !!app.globalData.cloudReady,
      syncState: app.globalData.cloudReady ? 'CloudBase 已启用' : '本地体验'
    });
    this.loadWorkspace();
    this.loadTeacherProfile();
  },

  onShow() {
    this.startReminderTimer();
  },

  onHide() {
    this.stopReminderTimer();
  },

  onUnload() {
    this.stopReminderTimer();
  },

  loadWorkspace() {
    const cached = workspaceStore.loadWorkspace(this.data.schoolYear);
    const workspace = normalizeWorkspace(cached || defaultWorkspace());
    this.setData({
      ...workspace,
      visibleTimetable: getVisibleTimetable(workspace.timetable)
    }, () => this.refreshSummary());
  },

  saveWorkspace(options = {}) {
    const payload = buildWorkspacePayload(this.data);

    workspaceStore.saveWorkspace(this.data.schoolYear, payload);

    if (!options.silent) {
      wx.showToast({ title: '已保存', icon: 'success' });
    }

    if (this.data.cloudReady) {
      this.syncWorkspace(payload);
    }
  },

  syncWorkspace(payload) {
    workspaceStore.syncWorkspace(this.data.schoolYear, payload)
      .then(() => {
        this.setData({ syncState: '已同步 CloudBase' });
      })
      .catch(() => {
        this.setData({ syncState: 'CloudBase 同步失败，已保存在本地' });
      });
  },

  refreshVisibleTimetable() {
    this.setData({
      visibleTimetable: getVisibleTimetable(this.data.timetable)
    });
  },

  loadTeacherProfile() {
    const teacherProfile = workspaceStore.loadTeacherProfile();
    if (teacherProfile) {
      this.setData({ teacherProfile });
    }
  },

  login() {
    wx.getUserProfile({
      desc: '用于显示教师身份并保存个人工作台',
      success: (res) => {
        const teacherProfile = {
          nickName: res.userInfo.nickName,
          avatarUrl: res.userInfo.avatarUrl
        };
        workspaceStore.saveTeacherProfile(teacherProfile);
        this.setData({ teacherProfile });
        wx.showToast({ title: '登录成功', icon: 'success' });
      },
      fail: () => {
        wx.showToast({ title: '已取消登录', icon: 'none' });
      }
    });
  },

  onYearChange(event) {
    const schoolYear = this.data.years[event.detail.value];
    this.setData({
      schoolYear,
      syncState: this.data.cloudReady ? 'CloudBase 已启用' : '本地体验'
    }, () => this.loadWorkspace());
  },

  onYearTap(event) {
    const schoolYear = event.currentTarget.dataset.year;
    if (!schoolYear || schoolYear === this.data.schoolYear) {
      return;
    }

    this.setData({
      schoolYear,
      syncState: this.data.cloudReady ? 'CloudBase 已启用' : '本地体验'
    }, () => this.loadWorkspace());
  },

  onNavTap(event) {
    const key = event.currentTarget.dataset.key;
    const item = this.data.navGroups
      .flatMap((group) => group.items)
      .find((navItem) => navItem.key === key);

    this.setData({
      activeKey: key,
      activeTitle: item ? item.label : '首页'
    });
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
  classManagementHandlers,
  homeSchoolHandlers
));
