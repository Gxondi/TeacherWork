const DEFAULT_CLASS_ID = 'class-default';
const DEFAULT_CLASS_NAME = '默认班级';

function legacyStorageKey(schoolYear) {
  return `teacher-workbench:${schoolYear}`;
}

function storageKey(schoolYear, classId = DEFAULT_CLASS_ID) {
  return `teacher-workbench:${schoolYear}:${classId}`;
}

function classListKey(schoolYear) {
  return `teacher-workbench-classes:${schoolYear}`;
}

function activeClassKey(schoolYear) {
  return `teacher-workbench-active-class:${schoolYear}`;
}

function defaultClasses() {
  return [{ id: DEFAULT_CLASS_ID, name: DEFAULT_CLASS_NAME }];
}

function normalizeClasses(classes) {
  if (!Array.isArray(classes) || !classes.length) {
    return defaultClasses();
  }

  return classes
    .filter((item) => item && item.id)
    .map((item) => ({
      id: item.id,
      name: String(item.name || '').trim() || DEFAULT_CLASS_NAME
    }));
}

function loadClasses(schoolYear) {
  const classes = normalizeClasses(wx.getStorageSync(classListKey(schoolYear)));
  if (!classes.length) return defaultClasses();
  return classes;
}

function saveClasses(schoolYear, classes) {
  wx.setStorageSync(classListKey(schoolYear), normalizeClasses(classes));
}

function loadActiveClassId(schoolYear, classes = loadClasses(schoolYear)) {
  const cached = wx.getStorageSync(activeClassKey(schoolYear));
  return classes.some((item) => item.id === cached) ? cached : classes[0].id;
}

function saveActiveClassId(schoolYear, classId) {
  wx.setStorageSync(activeClassKey(schoolYear), classId);
}

function loadWorkspace(schoolYear, classId = DEFAULT_CLASS_ID) {
  const workspace = wx.getStorageSync(storageKey(schoolYear, classId));
  if (workspace) return workspace;
  if (classId === DEFAULT_CLASS_ID) {
    return wx.getStorageSync(legacyStorageKey(schoolYear));
  }
  return null;
}

function saveWorkspace(schoolYear, classId, payload) {
  wx.setStorageSync(storageKey(schoolYear, classId), payload);
}

function loadTeacherProfile() {
  return wx.getStorageSync('teacher-profile');
}

function saveTeacherProfile(profile) {
  wx.setStorageSync('teacher-profile', profile);
}

function syncWorkspace(schoolYear, classId, className, payload) {
  const db = wx.cloud.database();
  const collection = db.collection('teacher_workspaces');

  return collection.where({ schoolYear, classId }).get()
    .then((res) => {
      if (res.data && res.data.length) {
        return collection.doc(res.data[0]._id).update({
          data: {
            className,
            payload,
            updatedAt: db.serverDate()
          }
        });
      }

      return collection.add({
        data: {
          schoolYear,
          classId,
          className,
          payload,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      });
    });
}

module.exports = {
  DEFAULT_CLASS_ID,
  DEFAULT_CLASS_NAME,
  loadActiveClassId,
  loadClasses,
  loadTeacherProfile,
  loadWorkspace,
  saveActiveClassId,
  saveClasses,
  saveTeacherProfile,
  saveWorkspace,
  syncWorkspace
};
