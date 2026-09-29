const DEFAULT_CLASS_ID = 'class-default';
const DEFAULT_CLASS_NAME = '默认班级';
const GUEST_OWNER_ID = 'guest';

function ownerId(openid) {
  return openid || GUEST_OWNER_ID;
}

function legacyStorageKey(schoolYear) {
  return `teacher-workbench:${schoolYear}`;
}

function storageKey(openid, schoolYear, classId = DEFAULT_CLASS_ID) {
  return `teacher-workbench:${ownerId(openid)}:${schoolYear}:${classId}`;
}

function legacyClassStorageKey(schoolYear, classId = DEFAULT_CLASS_ID) {
  return `teacher-workbench:${schoolYear}:${classId}`;
}

function classListKey(openid, schoolYear) {
  return `teacher-workbench-classes:${ownerId(openid)}:${schoolYear}`;
}

function legacyClassListKey(schoolYear) {
  return `teacher-workbench-classes:${schoolYear}`;
}

function activeClassKey(openid, schoolYear) {
  return `teacher-workbench-active-class:${ownerId(openid)}:${schoolYear}`;
}

function legacyActiveClassKey(schoolYear) {
  return `teacher-workbench-active-class:${schoolYear}`;
}

function teacherProfileKey(openid) {
  return `teacher-profile:${ownerId(openid)}`;
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

function loadClasses(openid, schoolYear) {
  const classes = normalizeClasses(
    wx.getStorageSync(classListKey(openid, schoolYear)) ||
    wx.getStorageSync(legacyClassListKey(schoolYear))
  );
  if (!classes.length) return defaultClasses();
  return classes;
}

function saveClasses(openid, schoolYear, classes) {
  wx.setStorageSync(classListKey(openid, schoolYear), normalizeClasses(classes));
}

function loadActiveClassId(openid, schoolYear, classes = loadClasses(openid, schoolYear)) {
  const cached = wx.getStorageSync(activeClassKey(openid, schoolYear)) ||
    wx.getStorageSync(legacyActiveClassKey(schoolYear));
  return classes.some((item) => item.id === cached) ? cached : classes[0].id;
}

function saveActiveClassId(openid, schoolYear, classId) {
  wx.setStorageSync(activeClassKey(openid, schoolYear), classId);
}

function loadWorkspace(openid, schoolYear, classId = DEFAULT_CLASS_ID) {
  const workspace = wx.getStorageSync(storageKey(openid, schoolYear, classId));
  if (workspace) return workspace;

  const legacyClassWorkspace = wx.getStorageSync(legacyClassStorageKey(schoolYear, classId));
  if (legacyClassWorkspace) return legacyClassWorkspace;

  if (classId === DEFAULT_CLASS_ID) {
    return wx.getStorageSync(legacyStorageKey(schoolYear));
  }
  return null;
}

function saveWorkspace(openid, schoolYear, classId, payload) {
  wx.setStorageSync(storageKey(openid, schoolYear, classId), payload);
}

function loadTeacherProfile(openid) {
  return wx.getStorageSync(teacherProfileKey(openid)) || wx.getStorageSync('teacher-profile');
}

function saveTeacherProfile(openid, profile) {
  wx.setStorageSync(teacherProfileKey(openid), profile);
}

function payloadUpdatedAt(payload) {
  return payload && payload._updatedAt ? payload._updatedAt : Date.now();
}

function loadCloudWorkspaces(openid, schoolYear) {
  if (!openid) {
    return Promise.resolve([]);
  }

  const db = wx.cloud.database();
  return db.collection('teacher_workspaces')
    .where({ ownerOpenid: openid, schoolYear })
    .limit(100)
    .get()
    .then((res) => res.data || []);
}

function syncWorkspace(openid, schoolYear, classId, className, payload) {
  if (!openid) {
    return Promise.reject(new Error('missing openid'));
  }

  const db = wx.cloud.database();
  const collection = db.collection('teacher_workspaces');
  const clientUpdatedAt = payloadUpdatedAt(payload);

  return collection.where({ ownerOpenid: openid, schoolYear, classId }).get()
    .then((res) => {
      if (res.data && res.data.length) {
        return collection.doc(res.data[0]._id).update({
          data: {
            ownerOpenid: openid,
            className,
            payload,
            clientUpdatedAt,
            updatedAt: db.serverDate()
          }
        });
      }

      return collection.add({
        data: {
          ownerOpenid: openid,
          schoolYear,
          classId,
          className,
          payload,
          clientUpdatedAt,
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
  loadCloudWorkspaces,
  loadTeacherProfile,
  loadWorkspace,
  saveActiveClassId,
  saveClasses,
  saveTeacherProfile,
  saveWorkspace,
  syncWorkspace
};
