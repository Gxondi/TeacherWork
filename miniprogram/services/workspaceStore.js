function storageKey(schoolYear) {
  return `teacher-workbench:${schoolYear}`;
}

function loadWorkspace(schoolYear) {
  return wx.getStorageSync(storageKey(schoolYear));
}

function saveWorkspace(schoolYear, payload) {
  wx.setStorageSync(storageKey(schoolYear), payload);
}

function loadTeacherProfile() {
  return wx.getStorageSync('teacher-profile');
}

function saveTeacherProfile(profile) {
  wx.setStorageSync('teacher-profile', profile);
}

function syncWorkspace(schoolYear, payload) {
  const db = wx.cloud.database();
  const collection = db.collection('teacher_workspaces');

  return collection.where({ schoolYear }).get()
    .then((res) => {
      if (res.data && res.data.length) {
        return collection.doc(res.data[0]._id).update({
          data: {
            payload,
            updatedAt: db.serverDate()
          }
        });
      }

      return collection.add({
        data: {
          schoolYear,
          payload,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      });
    });
}

module.exports = {
  loadTeacherProfile,
  loadWorkspace,
  saveTeacherProfile,
  saveWorkspace,
  syncWorkspace
};
