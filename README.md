# WP Playground TW

繁體中文 WordPress Playground 測試環境與 Blueprint 產生器

## 功能特色

- 🇹🇼 **繁體中文預設**：自動設定語系為 zh_TW，時區為 Asia/Taipei
- ⚡ **Blueprint 產生器**：視覺化介面產生 Blueprint JSON
- 🔌 **多種外掛安裝方式**：
  - WordPress.org 官方外掛
  - GitHub Repository（使用 git:directory 資源，官方推薦）
  - GitHub Proxy（即將停用）
- 🛠️ **開發者友善**：支援 WP_DEBUG 除錯模式
- 📋 **一鍵複製**：Blueprint JSON 與 Playground URL

## 快速開始

### 直接使用

訪問：`https://baiyuan.github.io/WP_Playground_TW/`

### URL 參數

支援以下 URL 參數快速啟動：

| 參數 | 說明 | 範例 |
|------|------|------|
| `plugin` | 安裝外掛 | `?plugin=gutenberg` |
| `github` | 從 GitHub 安裝 | `?github=user/repo` |
| `php` | PHP 版本 | `?php=8.2` |
| `wp` | WordPress 版本 | `?wp=6.4` |
| `landing` | 登入後頁面 | `?landing=/wp-admin/plugins.php` |
| `debug` | 啟用除錯 | `?debug=true` |
| `autostart` | 自動啟動 | `?autostart=true` |

### 範例 URL

```
# 安裝 WordPress.org 外掛
https://baiyuan.github.io/WP_Playground_TW/?plugin=gutenberg&autostart=true

# 從 GitHub 安裝外掛並啟用除錯
https://baiyuan.github.io/WP_Playground_TW/?github=baiyuan/tw-weather-alerts&debug=true&landing=/wp-admin/options-general.php?page=tw-weather-alerts&autostart=true

# 使用 GitHub Proxy（即將停用）
https://baiyuan.github.io/WP_Playground_TW/?plugin=https://github-proxy.com/proxy/?repo=baiyuan/tw-weather-alerts
```

## Blueprint 範例

### 測試 tw-weather-alerts 外掛

```json
{
  "landingPage": "/wp-admin/options-general.php?page=tw-weather-alerts",
  "preferredVersions": {
    "php": "8.0",
    "wp": "6.4"
  },
  "features": {
    "networking": true
  },
  "steps": [
    {
      "step": "login",
      "username": "admin",
      "password": "password"
    },
    {
      "step": "setSiteLanguage",
      "language": "zh_TW"
    },
    {
      "step": "runPHP",
      "code": "<?php\nrequire_once 'wp-load.php';\nupdate_option('timezone_string', 'Asia/Taipei');\nupdate_option('gmt_offset', 8);\n?>"
    },
    {
      "step": "defineWpConfigConsts",
      "consts": {
        "WP_DEBUG": true,
        "WP_DEBUG_LOG": true,
        "WP_DEBUG_DISPLAY": true
      }
    },
    {
      "step": "installPlugin",
      "pluginData": {
        "resource": "git:directory",
        "url": "https://github.com/baiyuan/tw-weather-alerts",
        "ref": "HEAD",
        "refType": "refname"
      }
    }
  ]
}
```

## 外掛安裝方式比較

| 方式 | 優點 | 缺點 | 狀態 |
|------|------|------|------|
| **WordPress.org** | 穩定、官方支援 | 只能安裝已發布外掛 | ✅ 推薦 |
| **git:directory** | 支援開發中外掛、PR 預覽 | 需要公開 Repository | ✅ 官方推薦 |
| **GitHub Proxy** | 支援 Release、特定 commit | 第三方服務，即將停用 | ⚠️ 即將停用 |

## GitHub Proxy URL 格式參考

> ⚠️ **注意**：GitHub Proxy 即將停用，建議改用 `git:directory` 資源

```
# 完整 Branch（預設 main/master）
https://github-proxy.com/proxy/?repo=user/repo

# 指定 Branch
https://github-proxy.com/proxy/?repo=user/repo&branch=develop

# 指定 Release
https://github-proxy.com/proxy/?repo=user/repo&release=v1.0.0

# Release Asset
https://github-proxy.com/proxy/?repo=user/repo&release=v1.0.0&asset=plugin.zip

# 部分目錄
https://github-proxy.com/proxy/?repo=user/repo&directory=src/plugin
```

## 本地開發

```bash
# Clone 專案
git clone https://github.com/baiyuan/WP_Playground_TW.git
cd WP_Playground_TW

# 使用任意 HTTP Server 開啟
npx serve .
# 或
python -m http.server 8080
```

## 參考資源

- [WordPress Playground 官方文件](https://wordpress.github.io/wordpress-playground/)
- [Blueprints 入門指南](https://wordpress.github.io/wordpress-playground/blueprints/getting-started)
- [Blueprints Gallery](https://github.com/WordPress/blueprints)
- [GitHub Proxy](https://github-proxy.com/)（即將停用）

## License

MIT License

---

## 版本紀錄

### v1.1.0 (2025-12-16)

- 🐛 修正 GitHub 外掛安裝時 `path` 參數錯誤導致安裝失敗的問題
- 🔧 移除不必要的 `refType` 欄位
- ✨ 優化 `ref` 預設值，改用 `refs/heads/main` 格式
- 📝 更新 UI 提示文字

### v1.0.0

- 🎉 初始版本
- Blueprint 視覺化產生器
- 支援 WordPress.org、GitHub、GitHub Proxy 三種外掛安裝方式
- 繁體中文預設語系與時區設定
- WP_DEBUG 除錯模式選項
