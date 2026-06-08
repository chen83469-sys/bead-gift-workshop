# 拼豆礼物工坊（微信小程序 MVP）

一个面向移动端的轻量小工具：上传头像、宠物或纪念照片，先做简单裁剪，再快速生成适合做礼物或分享的拼豆图稿，并输出颜色清单与制作建议。

## 这版已经完成什么

- 微信小程序工作台
- 通用生成 / 礼物推荐 双入口
- 轻量裁剪页：拖动 + 缩放后再生成
- 三种礼物模式：情侣头像、宠物纪念、卡通人像
- 支持更高颜色上限和自定义图稿尺寸
- 上传图片后调用后端生成拼豆图稿
- 返回：
  - 图稿预览
  - 预计豆子总数
  - 颜色清单
  - 礼物建议文案
  - 制作建议
  - 保存图稿到相册

## 目录说明

```text
bead-gift-workshop/
├─ backend/                  后端服务（图片处理 + 生成接口）
├─ miniapp/                  微信小程序代码
├─ requirements.txt          后端部署依赖
└─ README.md
```

## 运行方式

### 1. 启动后端

使用本地 Python 运行：

```powershell
$env:PYTHONPATH="C:\Users\zhi\Documents\Codex\2026-05-09\c-users-zhi-documents-codex-2026\.vendor\python"
& "C:\Users\zhi\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" backend\app.py
```

启动后默认地址（本地调试）：

- `http://127.0.0.1:5050`

### 2. 打开微信开发者工具

导入 `miniapp/` 目录即可。

如需本地联调，请把微信开发者工具里的域名校验放宽，或自行替换 `miniapp/utils/api.js` 中的服务地址。

## 体验版下一步怎么做

如果你已经完成了真机调试，下一步更推荐做 **体验版**，而不是立刻冲正式上线。

体验版的最小路线是：

1. 把后端部署到公网  
   - 这套后端已经可以直接按 Python Web 服务部署
   - 依赖在根目录 `requirements.txt`
   - 入口应用是 `backend.app:app`

2. 获取一个 HTTPS 的公网地址  
   - 例如托管平台自动分配的域名
   - 小程序后面会用它作为请求地址

3. 把 `miniapp/utils/api.js` 中的 `BASE_URL` 改成公网地址

4. 到微信小程序后台配置 `request` 合法域名

5. 上传体验版，让自己和少量朋友测试

### 部署时的运行参数

这版后端已经支持用环境变量控制启动方式：

- `HOST`：默认 `0.0.0.0`
- `PORT`：默认 `5050`
- `FLASK_DEBUG`：默认 `1`

如果平台支持命令配置，常见运行方式可以是：

```bash
gunicorn backend.app:app
```

如果你后面决定选具体平台（比如 Render / Railway / 云服务器），可以再按平台要求微调。

## 参考与说明

底层拼豆图稿生成能力参考了开源项目：

- [Clyde323/pixel-beads-generator](https://github.com/Clyde323/pixel-beads-generator)

本项目没有机械复刻原站，而是把能力收敛成一个更聚焦“定制礼物”场景的移动端 MVP。
