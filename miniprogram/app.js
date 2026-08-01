const CLOUD_ENV_ID = 'cloud1-d0gk8botp9bdf95a8';

App({
  globalData: {
    cloudReady: false,
    envId: CLOUD_ENV_ID
  },

  onLaunch() {
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
