const app = getApp();

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

Page({
  data: {
    sourcePath: '',
    cropSize: 320,
    cropSizePx: 320,
    imageLoaded: false,
    imageWidth: 0,
    imageHeight: 0,
    displayWidth: 0,
    displayHeight: 0,
    imageLeft: 0,
    imageTop: 0,
    offsetX: 0,
    offsetY: 0,
    scaleStep: 100,
    minScaleStep: 100,
    maxScaleStep: 300,
    loading: false
  },

  onLoad(query) {
    const sourcePath = decodeURIComponent(query.src || '');
    const { windowWidth } = wx.getSystemInfoSync();
    const cropSize = Math.min(windowWidth - 48, 340);
    this.setData({
      sourcePath,
      cropSize,
      cropSizePx: cropSize
    });
    if (sourcePath) {
      this.loadImage(sourcePath, cropSize);
    }
  },

  loadImage(sourcePath, cropSize) {
    wx.getImageInfo({
      src: sourcePath,
      success: (info) => {
        const baseScale = Math.max(cropSize / info.width, cropSize / info.height);
        const displayWidth = info.width * baseScale;
        const displayHeight = info.height * baseScale;
        this.setData({
          imageLoaded: true,
          imageWidth: info.width,
          imageHeight: info.height,
          displayWidth,
          displayHeight,
          offsetX: 0,
          offsetY: 0,
          imageLeft: (cropSize - displayWidth) / 2,
          imageTop: (cropSize - displayHeight) / 2,
          scaleStep: 100
        });
      },
      fail: () => {
        wx.showToast({ title: '图片读取失败', icon: 'none' });
      }
    });
  },

  handleScaleChange(e) {
    const nextScaleStep = Number(e.detail.value);
    const ratio = nextScaleStep / 100;
    const cropSize = this.data.cropSizePx;
    const baseScale = Math.max(cropSize / this.data.imageWidth, cropSize / this.data.imageHeight);
    const displayWidth = this.data.imageWidth * baseScale * ratio;
    const displayHeight = this.data.imageHeight * baseScale * ratio;
    const { offsetX, offsetY } = this.getClampedOffsets(displayWidth, displayHeight, this.data.offsetX, this.data.offsetY);
    this.setData({
      scaleStep: nextScaleStep,
      displayWidth,
      displayHeight,
      offsetX,
      offsetY,
      imageLeft: (cropSize - displayWidth) / 2 + offsetX,
      imageTop: (cropSize - displayHeight) / 2 + offsetY
    });
  },

  getClampedOffsets(displayWidth, displayHeight, offsetX, offsetY) {
    const cropSize = this.data.cropSizePx;
    const maxOffsetX = Math.max(0, (displayWidth - cropSize) / 2);
    const maxOffsetY = Math.max(0, (displayHeight - cropSize) / 2);
    return {
      offsetX: clamp(offsetX, -maxOffsetX, maxOffsetX),
      offsetY: clamp(offsetY, -maxOffsetY, maxOffsetY)
    };
  },

  handleTouchStart(e) {
    const touch = e.touches && e.touches[0];
    if (!touch) return;
    this.dragStart = {
      x: touch.clientX,
      y: touch.clientY,
      offsetX: this.data.offsetX,
      offsetY: this.data.offsetY
    };
  },

  handleTouchMove(e) {
    if (!this.dragStart) return;
    const touch = e.touches && e.touches[0];
    if (!touch) return;
    const deltaX = touch.clientX - this.dragStart.x;
    const deltaY = touch.clientY - this.dragStart.y;
    const nextOffsetX = this.dragStart.offsetX + deltaX;
    const nextOffsetY = this.dragStart.offsetY + deltaY;
    const { offsetX, offsetY } = this.getClampedOffsets(
      this.data.displayWidth,
      this.data.displayHeight,
      nextOffsetX,
      nextOffsetY
    );
    this.setData({
      offsetX,
      offsetY,
      imageLeft: (this.data.cropSizePx - this.data.displayWidth) / 2 + offsetX,
      imageTop: (this.data.cropSizePx - this.data.displayHeight) / 2 + offsetY
    });
  },

  handleTouchEnd() {
    this.dragStart = null;
  },

  handleCancel() {
    wx.navigateBack();
  },

  confirmCrop() {
    if (!this.data.imageLoaded || !this.data.sourcePath) {
      wx.showToast({ title: '请先选择图片', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    const cropSize = this.data.cropSizePx;
    const imageLeft = (cropSize - this.data.displayWidth) / 2 + this.data.offsetX;
    const imageTop = (cropSize - this.data.displayHeight) / 2 + this.data.offsetY;
    const sx = (-imageLeft / this.data.displayWidth) * this.data.imageWidth;
    const sy = (-imageTop / this.data.displayHeight) * this.data.imageHeight;
    const sw = (cropSize / this.data.displayWidth) * this.data.imageWidth;
    const sh = (cropSize / this.data.displayHeight) * this.data.imageHeight;

    const ctx = wx.createCanvasContext('cropCanvas', this);
    const outputSize = 720;
    ctx.drawImage(this.data.sourcePath, sx, sy, sw, sh, 0, 0, outputSize, outputSize);
    ctx.draw(false, () => {
      wx.canvasToTempFilePath(
        {
          canvasId: 'cropCanvas',
          x: 0,
          y: 0,
          width: outputSize,
          height: outputSize,
          destWidth: outputSize,
          destHeight: outputSize,
          fileType: 'png',
          success: (res) => {
            app.globalData.croppedImagePayload = {
              path: res.tempFilePath
            };
            this.setData({ loading: false });
            wx.navigateBack();
          },
          fail: () => {
            this.setData({ loading: false });
            wx.showToast({ title: '裁剪失败，请再试一次', icon: 'none' });
          }
        },
        this
      );
    });
  }
});
