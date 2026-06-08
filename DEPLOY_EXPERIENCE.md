# 拼豆礼物工坊体验版部署说明

这份说明只针对“体验版”目标：

- 你自己可以稳定在手机上打开
- 少量朋友可以体验
- 先不追求正式上架和长期公网产品化

## 1. 后端部署（推荐 Render）

当前项目已经准备好最小部署骨架：

- `requirements.txt`
- `backend.app:app`
- `render.yaml`

如果你使用 Render：

1. 把当前项目推到 GitHub
2. 在 Render 新建 `Blueprint` 或 `Web Service`
3. 选择仓库后，Render 会读取 `render.yaml`
4. 部署完成后，你会拿到一个 HTTPS 地址，例如：

   `https://bead-gift-workshop-api.onrender.com`

## 2. 小程序接口地址修改

把 `miniapp/utils/api.js` 里的 `BASE_URL` 改成你的公网地址，例如：

```js
const BASE_URL = 'https://bead-gift-workshop-api.onrender.com';
```

## 3. 微信小程序后台配置

登录微信小程序后台，在“开发管理/开发设置”里把上面的域名加入：

- `request 合法域名`

注意：

- 必须是 HTTPS
- 不能带路径，只填域名本身

## 4. 上传体验版

在微信开发者工具里：

1. 编译确认无误
2. 上传
3. 生成体验版
4. 把朋友加为体验成员后测试

## 5. 当前版本的边界

这版适合体验，不适合重度正式使用，原因是：

- 生成图片仍存在后端临时目录
- 不保留历史记录
- 不做用户体系
- 不做长期文件存储

但对“作品展示 + 少量朋友体验”已经够用了。
