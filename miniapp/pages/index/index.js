const { BASE_URL } = require('../../utils/api');
const app = getApp();

const MODE_PRESETS = {
  couple: { size: 48, colorCount: 14 },
  pet: { size: 56, colorCount: 16 },
  portrait: { size: 40, colorCount: 12 }
};

const ENTRY_TYPE_CONFIG = {
  universal: {
    defaultMode: 'portrait',
    modeSectionTitle: '选择图稿预设',
    parameterSectionTitle: '图稿参数',
    fieldTip: '先用通用生成快速出稿，再根据效果决定是否继续调整。',
    generateButtonLabel: '生成拼豆图稿',
    modes: [
      { key: 'portrait', label: '标准头像', hint: '适合大多数头像、自拍和纪念照' },
      { key: 'pet', label: '宠物主体', hint: '更适合猫狗等毛绒主体' },
      { key: 'couple', label: '双人合照', hint: '更适合并排站位、双人主体清晰的照片' }
    ]
  },
  gift: {
    defaultMode: 'couple',
    modeSectionTitle: '选择推荐预设',
    parameterSectionTitle: '推荐参数',
    fieldTip: '推荐预设已经做过一轮收敛，适合直接快速出图。',
    generateButtonLabel: '生成拼豆图稿',
    modes: [
      { key: 'couple', label: '双人头像', hint: '更适合纪念照和头像型图稿' },
      { key: 'pet', label: '宠物纪念', hint: '优先保留宠物毛色层次和面部特征' },
      { key: 'portrait', label: '卡通人像', hint: '颜色更轻、上手更快' }
    ]
  }
};

const RESULT_VIEW_TABS = [
  { key: 'preview', label: '效果图' },
  { key: 'pattern', label: '制作图纸' }
];

function withActive(items, activeKey) {
  return items.map((item) => ({
    ...item,
    active: item.key === activeKey
  }));
}

function getActiveResultUrl(result, view) {
  if (!result) return '';
  if (view === 'pattern') {
    return result.display_pattern_url || result.pattern_url || '';
  }
  return result.display_preview_url || result.preview_url || '';
}

Page({
  data: {
    entryType: 'universal',
    entryTypes: withActive(
      [
        {
          key: 'universal',
          label: '通用生成',
          hint: '适合把手机里的照片快速转成拼豆图稿'
        },
        {
          key: 'gift',
          label: '推荐预设',
          hint: '给你一组更收敛的默认参数，适合直接出稿'
        }
      ],
      'universal'
    ),
    mode: 'portrait',
    modes: withActive(ENTRY_TYPE_CONFIG.universal.modes, 'portrait'),
    modeSectionTitle: ENTRY_TYPE_CONFIG.universal.modeSectionTitle,
    parameterSectionTitle: ENTRY_TYPE_CONFIG.universal.parameterSectionTitle,
    fieldTip: ENTRY_TYPE_CONFIG.universal.fieldTip,
    generateButtonLabel: ENTRY_TYPE_CONFIG.universal.generateButtonLabel,
    loadingText: '正在生成图稿...',
    imagePath: '',
    hasImage: false,
    canGenerate: false,
    loading: false,
    result: null,
    resultView: 'preview',
    resultViewTabs: RESULT_VIEW_TABS,
    sizeOptions: [
      { value: 40, label: '40 x 40 · 小巧快速' },
      { value: 48, label: '48 x 48 · 平衡常用' },
      { value: 56, label: '56 x 56 · 细节更丰富' },
      { value: 64, label: '64 x 64 · 适合更大图稿' },
      { value: 'custom', label: '自定义尺寸' }
    ],
    colorOptions: [
      { value: 10, label: '10 色 · 更省豆' },
      { value: 12, label: '12 色 · 新手友好' },
      { value: 14, label: '14 色 · 平衡常用' },
      { value: 16, label: '16 色 · 细节更好' },
      { value: 20, label: '20 色 · 层次更丰富' },
      { value: 24, label: '24 色 · 适合细节图' },
      { value: 32, label: '32 色 · 尽量保留原图层次' },
      { value: 'custom', label: '自定义颜色数' }
    ],
    sizeIndex: 1,
    colorIndex: 2,
    customSize: '48',
    customColorCount: '14',
    showCustomSizeInput: false,
    showCustomColorInput: false
  },

  onLoad() {
    this.applyEntryType('universal');
  },

  onShow() {
    const payload = app.globalData.croppedImagePayload;
    if (!payload || !payload.path) return;

    app.globalData.croppedImagePayload = null;
    this.setData({
      imagePath: payload.path,
      hasImage: true,
      canGenerate: true,
      result: null,
      resultView: 'preview'
    });
  },

  chooseEntryType(e) {
    this.applyEntryType(e.currentTarget.dataset.entryType);
  },

  applyEntryType(entryType) {
    const config = ENTRY_TYPE_CONFIG[entryType] || ENTRY_TYPE_CONFIG.universal;
    this.setData({
      entryType,
      entryTypes: withActive(this.data.entryTypes, entryType),
      modes: withActive(config.modes, config.defaultMode),
      mode: config.defaultMode,
      modeSectionTitle: config.modeSectionTitle,
      parameterSectionTitle: config.parameterSectionTitle,
      fieldTip: config.fieldTip,
      generateButtonLabel: config.generateButtonLabel,
      result: null,
      resultView: 'preview'
    });
    this.applyPreset(config.defaultMode);
  },

  chooseMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({
      mode,
      modes: withActive(this.data.modes, mode),
      result: null
    });
    this.applyPreset(mode);
  },

  applyPreset(mode) {
    const preset = MODE_PRESETS[mode];
    const sizeIndex = this.data.sizeOptions.findIndex((item) => item.value === preset.size);
    const colorIndex = this.data.colorOptions.findIndex((item) => item.value === preset.colorCount);
    this.setData({
      sizeIndex: sizeIndex >= 0 ? sizeIndex : 0,
      colorIndex: colorIndex >= 0 ? colorIndex : 0,
      customSize: String(preset.size),
      customColorCount: String(preset.colorCount),
      showCustomSizeInput: false,
      showCustomColorInput: false
    });
  },

  changeSize(e) {
    const sizeIndex = Number(e.detail.value);
    const selected = this.data.sizeOptions[sizeIndex];
    this.setData({
      sizeIndex,
      showCustomSizeInput: selected && selected.value === 'custom',
      result: null
    });
  },

  changeColorCount(e) {
    const colorIndex = Number(e.detail.value);
    const selected = this.data.colorOptions[colorIndex];
    this.setData({
      colorIndex,
      showCustomColorInput: selected && selected.value === 'custom',
      result: null
    });
  },

  handleCustomSizeInput(e) {
    this.setData({
      customSize: e.detail.value,
      result: null
    });
  },

  handleCustomColorInput(e) {
    this.setData({
      customColorCount: e.detail.value,
      result: null
    });
  },

  resolveGenerateParams() {
    const sizeChoice = this.data.sizeOptions[this.data.sizeIndex].value;
    const colorChoice = this.data.colorOptions[this.data.colorIndex].value;
    const parsedSize =
      sizeChoice === 'custom' ? parseInt(this.data.customSize, 10) : Number(sizeChoice);
    const parsedColorCount =
      colorChoice === 'custom'
        ? parseInt(this.data.customColorCount, 10)
        : Number(colorChoice);

    if (!Number.isInteger(parsedSize) || parsedSize < 24 || parsedSize > 96) {
      wx.showToast({
        title: '图稿尺寸请填写 24~96 之间的整数',
        icon: 'none',
        duration: 2200
      });
      return null;
    }

    if (!Number.isInteger(parsedColorCount) || parsedColorCount < 6 || parsedColorCount > 48) {
      wx.showToast({
        title: '颜色数量请填写 6~48 之间的整数',
        icon: 'none',
        duration: 2200
      });
      return null;
    }

    return {
      size: parsedSize,
      colorCount: parsedColorCount
    };
  },

  pickImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file) return;
        wx.navigateTo({
          url: `/pages/crop/index?src=${encodeURIComponent(file.tempFilePath)}`
        });
      }
    });
  },

  generate() {
    if (!this.data.imagePath) {
      wx.showToast({ title: '请先选择一张图片', icon: 'none' });
      return;
    }

    const params = this.resolveGenerateParams();
    if (!params) return;

    this.setData({
      loading: true,
      result: null,
      resultView: 'preview'
    });

    wx.uploadFile({
      url: `${BASE_URL}/api/generate`,
      filePath: this.data.imagePath,
      name: 'image',
      formData: {
        mode: this.data.mode,
        size: String(params.size),
        max_colors: String(params.colorCount)
      },
      success: (res) => {
        try {
          const data = JSON.parse(res.data);
          if (data.error) {
            wx.showToast({ title: data.error, icon: 'none' });
            return;
          }

          const currentMode = this.data.modes.find((item) => item.key === this.data.mode);
          const nextResult = {
            ...data,
            display_mode_label: currentMode ? currentMode.label : data.mode_label,
            display_size_text: `${data.size} x ${data.size}`,
            display_preview_url: data.preview_url,
            display_pattern_url: data.pattern_url,
            preview_temp_file_path: '',
            pattern_temp_file_path: '',
            current_display_url: data.preview_url
          };

          this.setData({ result: nextResult });
          this.cacheResultImage(data.preview_url, 'preview');
          this.cacheResultImage(data.pattern_url, 'pattern');
        } catch (err) {
          wx.showToast({ title: '结果解析失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({
          title: '生成失败，请确认后端服务可访问',
          icon: 'none',
          duration: 2500
        });
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  },

  cacheResultImage(url, viewType) {
    if (!url) return;

    wx.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode !== 200 || !res.tempFilePath) return;

        const nextData = {};
        if (viewType === 'preview') {
          nextData['result.display_preview_url'] = res.tempFilePath;
          nextData['result.preview_temp_file_path'] = res.tempFilePath;
        } else {
          nextData['result.display_pattern_url'] = res.tempFilePath;
          nextData['result.pattern_temp_file_path'] = res.tempFilePath;
        }

        if (this.data.resultView === viewType) {
          nextData['result.current_display_url'] = res.tempFilePath;
        }
        this.setData(nextData);
      }
    });
  },

  switchResultView(e) {
    const view = e.currentTarget.dataset.view;
    if (!this.data.result) return;

    this.setData({
      resultView: view,
      'result.current_display_url': getActiveResultUrl(this.data.result, view)
    });
  },

  saveCurrentResult() {
    const { result, resultView } = this.data;
    if (!result) {
      wx.showToast({ title: '还没有可保存的图稿', icon: 'none' });
      return;
    }

    const tempPath =
      resultView === 'pattern' ? result.pattern_temp_file_path : result.preview_temp_file_path;
    const remoteUrl = resultView === 'pattern' ? result.pattern_url : result.preview_url;

    if (!tempPath && !remoteUrl) {
      wx.showToast({ title: '还没有可保存的图稿', icon: 'none' });
      return;
    }

    if (tempPath) {
      this.saveImageToAlbum(tempPath);
      return;
    }

    wx.showLoading({ title: '正在保存' });
    wx.getImageInfo({
      src: remoteUrl,
      success: (info) => {
        wx.hideLoading();
        this.saveImageToAlbum(info.path);
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '图稿获取失败', icon: 'none' });
      }
    });
  },

  saveImageToAlbum(filePath) {
    wx.saveImageToPhotosAlbum({
      filePath,
      success: () => {
        wx.showToast({ title: '已保存到相册', icon: 'success' });
      },
      fail: (err) => {
        if (
          err &&
          err.errMsg &&
          (err.errMsg.includes('auth deny') || err.errMsg.includes('authorize'))
        ) {
          wx.showModal({
            title: '需要相册权限',
            content: '请允许保存到相册，之后就可以把图稿直接保存下来。',
            confirmText: '去设置',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.openSetting({});
              }
            }
          });
          return;
        }
        wx.showToast({ title: '保存失败，请稍后再试', icon: 'none' });
      }
    });
  }
});
