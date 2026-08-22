const SESSION_KEY = 'teacher-workbench-session';

function loadSession() {
  return wx.getStorageSync(SESSION_KEY) || null;
}

function saveSession(session) {
  wx.setStorageSync(SESSION_KEY, session);
}

function clearSession() {
  wx.removeStorageSync(SESSION_KEY);
}

function login() {
  return wx.cloud.callFunction({ name: 'login' })
    .then((res) => {
      const result = res.result || {};
      if (!result.openid) {
        throw new Error('missing openid');
      }

      const session = {
        openid: result.openid,
        appid: result.appid || '',
        unionid: result.unionid || '',
        loggedAt: Date.now()
      };
      saveSession(session);
      return session;
    });
}

module.exports = {
  clearSession,
  loadSession,
  login,
  saveSession
};
