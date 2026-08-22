const CLOUD_ENV_ID = 'cloud1-d0gk8botp9bdf95a8';
const auth = require('./services/auth');

App({
  globalData: {
    cloudReady: false,
    envId: CLOUD_ENV_ID,
    openid: '',
    loggedIn: false
  },

  onLaunch() {
    const session = auth.loadSession();
    if (session && session.openid) {
      this.globalData.openid = session.openid;
      this.globalData.loggedIn = true;
    }

    if (!wx.cloud || !CLOUD_ENV_ID) {
      return;
    }

    wx.cloud.init({
      env: CLOUD_ENV_ID,
      traceUser: true
    });

    this.globalData.cloudReady = true;
  }
});
