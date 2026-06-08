# PythonAnywhere 体验版部署步骤

这份说明针对当前这个项目的“体验版”目标：

- 你自己可以在手机上长期打开
- 少量朋友可以体验
- 先不追求正式公开发布

## 准备条件

- 你已经有 PythonAnywhere 账号
- 代码已经在 GitHub 上
- 本地项目主链路已经跑通

## 1. 在 PythonAnywhere 拉代码

进入 `Consoles`，新建一个 `Bash` console，然后执行：

```bash
cd ~
git clone https://github.com/chen83469-sys/bead-gift-workshop.git
cd bead-gift-workshop
```

## 2. 创建虚拟环境并安装依赖

在同一个 Bash console 里执行：

```bash
python3.13 -m venv ~/.virtualenvs/bead-gift-workshop
source ~/.virtualenvs/bead-gift-workshop/bin/activate
pip install -r requirements.txt
```

如果 PythonAnywhere 上默认 Python 版本不是 3.13，也可以把第一行换成你账号里可用的 3.x 版本。

## 3. 新建 Web App

到 `Web` 页面：

1. 点 `Add a new web app`
2. 选择你的默认域名（`yourusername.pythonanywhere.com`）
3. 选择 `Manual configuration`
4. 选一个 Python 3.x 版本

## 4. 配置 virtualenv

在 `Web` 页面的 `Virtualenv` 一栏填：

```text
/home/YOUR_USERNAME/.virtualenvs/bead-gift-workshop
```

## 5. 配置 WSGI 文件

在 `Web` 页面点击 WSGI 文件链接，把内容替换成项目里的模板思路。

你可以直接参考仓库里的：

- `PYTHONANYWHERE_WSGI_TEMPLATE.py`

核心内容类似这样：

```python
import sys
from pathlib import Path

PROJECT_HOME = Path("/home/YOUR_USERNAME/bead-gift-workshop")

if str(PROJECT_HOME) not in sys.path:
    sys.path.insert(0, str(PROJECT_HOME))

from backend.app import app as application
```

把 `YOUR_USERNAME` 改成你的 PythonAnywhere 用户名。

## 6. Reload Web App

回到 `Web` 页面，点 `Reload`。

部署成功后，你应该可以访问：

```text
https://YOUR_USERNAME.pythonanywhere.com/health
```

如果返回：

```json
{"ok": true}
```

说明后端已经起来了。

## 7. 修改小程序接口地址

把 `miniapp/utils/api.js` 里的 `BASE_URL` 改成：

```js
const BASE_URL = 'https://YOUR_USERNAME.pythonanywhere.com';
```

## 8. 微信后台配置合法域名

登录微信小程序后台，在 `开发管理 / 开发设置` 里把下面域名加入：

- `request 合法域名`

也就是：

```text
https://YOUR_USERNAME.pythonanywhere.com
```

注意后台里通常填域名本身，不带接口路径。

## 9. 上传体验版

回到微信开发者工具：

1. 重新编译
2. 真机测试
3. 上传体验版
4. 把朋友加为体验成员后测试

## 当前版本边界

这版适合作品展示和少量体验，不适合重度长期使用，原因包括：

- 生成图稿文件仍是临时文件
- 不保留历史记录
- 不做用户账号和图库
- 免费版 PythonAnywhere 有资源限制

但对“自己用 + 给朋友试 + 面试展示”已经足够。
