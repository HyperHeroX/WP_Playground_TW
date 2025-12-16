/**
 * WP Playground TW - Blueprint 產生器
 * Application JavaScript
 */

const BASE_PLAYGROUND_URL = 'https://playground.wordpress.net/';
const STORAGE_KEY = 'wp_playground_blueprint_v1';

// State to track if the user has manually modified the blueprint
let isManualMode = false;
let manualBlueprint = null;

/**
 * 將 UTF-8 字串轉換為 Base64
 */
function utf8ToBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
}

/**
 * 取得當前選擇的外掛來源
 */
function getPluginSource() {
    return document.querySelector('.plugin-source-tab.active').dataset.source;
}

/**
 * 產生 Blueprint JSON
 */
/**
 * 產生 Blueprint JSON
 */
function generateBlueprint() {
    // If in manual mode, return the manual blueprint content if valid
    if (isManualMode && manualBlueprint) {
        try {
            return typeof manualBlueprint === 'string' ? JSON.parse(manualBlueprint) : manualBlueprint;
        } catch (e) {
            console.error('Invalid manual blueprint JSON', e);
        }
    }

    const php = document.getElementById('phpVersion').value;
    const wp = document.getElementById('wpVersion').value;
    const enableDebug = document.getElementById('enableDebug').checked;
    const enableNetworking = document.getElementById('enableNetworking').checked;
    const language = document.getElementById('siteLanguage').value;
    const setTimezone = document.getElementById('setTimezone').checked;
    const autoLogin = document.getElementById('autoLogin').checked;

    let landingPage = document.getElementById('landingPage').value;
    if (landingPage === 'custom') {
        landingPage = document.getElementById('customLanding').value || '/wp-admin/';
    }

    const pluginSource = getPluginSource();
    const pluginSlug = document.getElementById('pluginSlug').value.trim();
    const githubRepo = document.getElementById('githubRepo').value.trim();
    const githubRef = document.getElementById('githubRef').value.trim() || 'HEAD';
    const proxyUrl = document.getElementById('proxyUrl').value.trim();

    const blueprint = {
        landingPage: landingPage,
        preferredVersions: {
            php: php,
            wp: wp
        },
        features: {
            networking: enableNetworking
        },
        steps: []
    };

    if (autoLogin) {
        blueprint.steps.push({ step: 'login', username: 'admin', password: 'password' });
    }

    if (language && language !== 'en_US') {
        blueprint.steps.push({ step: 'setSiteLanguage', language: language });
    }

    if (setTimezone) {
        blueprint.steps.push({
            step: 'runPHP',
            code: `<?php
require_once 'wp-load.php';
update_option('timezone_string', 'Asia/Taipei');
update_option('gmt_offset', 8);
?>`
        });
    }

    if (enableDebug) {
        const debugConsts = { WP_DEBUG: true };

        if (document.getElementById('enableDebugLog').checked) {
            debugConsts.WP_DEBUG_LOG = true;
        }
        if (document.getElementById('enableDebugDisplay').checked) {
            debugConsts.WP_DEBUG_DISPLAY = true;
        }
        if (document.getElementById('enableScriptDebug').checked) {
            debugConsts.SCRIPT_DEBUG = true;
        }
        if (document.getElementById('enableSaveQueries').checked) {
            debugConsts.SAVEQUERIES = true;
        }

        blueprint.steps.push({
            step: 'defineWpConfigConsts',
            consts: debugConsts
        });
    }

    if (pluginSource === 'wporg' && pluginSlug) {
        blueprint.steps.push({
            step: 'installPlugin',
            pluginData: {
                resource: 'wordpress.org/plugins',
                slug: pluginSlug
            }
        });
    } else if (pluginSource === 'github' && githubRepo) {
        const repoUrl = githubRepo.startsWith('https://')
            ? githubRepo
            : `https://github.com/${githubRepo}`;

        // For git:directory, path is the relative path INSIDE the repo
        // If the user provided a directory name, we assume they might mean a subdir in the repo?
        // Or if the previous logic was trying to set the destination, that was wrong.
        // For now, let's default to '.' (root of repo) as that matches the working blueprint.
        // If we want to support subdirectories in monorepos, we could use pluginDirName for that,
        // but the label '外掛目錄名稱' suggests destination. 
        // Let's assume '.' for now to fix the reported issue.

        // 使用 refs/heads/main 格式，更穩定
        const effectiveRef = githubRef === 'HEAD' || githubRef === ''
            ? 'refs/heads/main'
            : (githubRef.startsWith('refs/') ? githubRef : `refs/heads/${githubRef}`);

        blueprint.steps.push({
            step: 'installPlugin',
            pluginData: {
                resource: 'git:directory',
                url: repoUrl,
                ref: effectiveRef,
                path: '.'
            }
        });
    } else if (pluginSource === 'proxy' && proxyUrl) {
        const repoName = extractRepoName(proxyUrl);
        blueprint.steps.push({
            step: 'installPlugin',
            pluginData: {
                resource: 'url',
                url: proxyUrl
            }
        });
        if (repoName) {
            blueprint.steps.push({
                step: 'mv',
                fromPath: `/wordpress/wp-content/plugins/${repoName}-main`,
                toPath: `/wordpress/wp-content/plugins/${repoName}`
            });
            blueprint.steps.push({
                step: 'activatePlugin',
                pluginPath: repoName
            });
        }
    }

    return blueprint;
}

/**
 * 從 GitHub Proxy URL 提取 Repository 名稱
 */
function extractRepoName(proxyUrl) {
    const match = proxyUrl.match(/repo=([^&/]+\/)?([^&/]+)/);
    return match ? match[2] : null;
}

/**
 * 更新 Blueprint 預覽
 */
function updateBlueprintPreview() {
    let blueprint;
    let jsonStr;

    if (isManualMode && manualBlueprint) {
        // In manual mode, show the manual content
        // Verify if it's valid JSON
        try {
            blueprint = typeof manualBlueprint === 'string' ? JSON.parse(manualBlueprint) : manualBlueprint;
            jsonStr = typeof manualBlueprint === 'string' ? manualBlueprint : JSON.stringify(blueprint, null, 2);
        } catch (e) {
            // Invalid JSON, just use the string but don't update URL/iframe yet or handle error
            jsonStr = manualBlueprint;
            blueprint = null; // Mark as invalid for URL generation
        }
    } else {
        // Auto generation mode
        blueprint = generateBlueprint();
        jsonStr = JSON.stringify(blueprint, null, 2);
    }

    // Only update textarea if it's not the focused element (to avoid cursor jumping)
    // or if we are not in manual mode (syncing from form)
    const editor = document.getElementById('blueprintEditor');
    if (document.activeElement !== editor) {
        editor.value = jsonStr;
    }

    // Update toolbar state
    const btnReset = document.getElementById('btnResetBlueprint');
    if (isManualMode) {
        btnReset.style.display = 'inline-flex';
        document.querySelector('.status-badge').textContent = '✏️ 手動編輯';
        document.querySelector('.status-badge').className = 'status-badge warning';
    } else {
        btnReset.style.display = 'none';
        document.querySelector('.status-badge').textContent = '💡 即時預覽';
        document.querySelector('.status-badge').className = 'status-badge info';
    }

    if (blueprint) {
        const base64 = utf8ToBase64(JSON.stringify(blueprint));
        const url = `${BASE_PLAYGROUND_URL}#${base64}`;
        document.getElementById('playgroundUrl').value = url;

        // Save state to localStorage
        saveState();
    }
}

/**
 * 啟動 Playground
 */
function launchPlayground() {
    const blueprint = generateBlueprint();
    const jsonStr = JSON.stringify(blueprint);
    const base64 = utf8ToBase64(jsonStr);
    const url = `${BASE_PLAYGROUND_URL}#${base64}`;

    const placeholder = document.getElementById('previewPlaceholder');
    const iframe = document.getElementById('wpFrame');
    const btnLaunch = document.getElementById('btnLaunch');
    const btnRestart = document.getElementById('btnRestart');

    placeholder.innerHTML = `
        <div class="loader"></div>
        <div>
            <h3 style="margin-bottom: 8px;">正在建置環境...</h3>
            <p>下載 WordPress 與設定環境中，請稍候</p>
        </div>
    `;
    placeholder.classList.remove('hidden');
    iframe.style.display = 'none';

    iframe.src = url;

    iframe.onload = () => {
        setTimeout(() => {
            placeholder.classList.add('hidden');
            iframe.style.display = 'block';
            btnLaunch.style.display = 'none';
            btnRestart.style.display = 'block';
        }, 2000);
    };

    document.querySelector('[data-tab="preview"]').click();
}

/**
 * 重新啟動 Playground
 */
function restartPlayground() {
    const iframe = document.getElementById('wpFrame');
    const btnLaunch = document.getElementById('btnLaunch');
    const btnRestart = document.getElementById('btnRestart');

    iframe.src = '';
    iframe.style.display = 'none';

    document.getElementById('previewPlaceholder').innerHTML = `
        <div class="preview-icon">🎮</div>
        <div>
            <h3 style="margin-bottom: 8px;">準備就緒</h3>
            <p>設定完成後，點擊「啟動 Playground」開始</p>
        </div>
    `;
    document.getElementById('previewPlaceholder').classList.remove('hidden');

    btnRestart.style.display = 'none';
    btnLaunch.style.display = 'block';

    setTimeout(launchPlayground, 100);
}

/**
 * 顯示 Blueprint JSON 頁籤
 */
function showBlueprintTab() {
    document.querySelector('[data-tab="blueprint"]').click();
}

/**
 * 複製文字到剪貼簿（帶錯誤處理與降級方案）
 * @param {string} text - 要複製的文字
 * @returns {Promise<boolean>} - 是否成功複製
 */
async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.warn('Clipboard API 失敗，嘗試降級方案:', err);
        }
    }

    // 降級方案：使用 execCommand
    try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const success = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (!success) {
            throw new Error('execCommand copy 失敗');
        }
        return true;
    } catch (err) {
        console.error('複製到剪貼簿失敗:', err);
        return false;
    }
}

/**
 * 顯示複製成功的視覺回饋
 * @param {HTMLElement} btn - 按鈕元素
 * @param {HTMLElement} icon - 圖示元素
 * @param {string} originalIcon - 原始圖示文字
 */
function showCopyFeedback(btn, icon, originalIcon) {
    btn.classList.add('copied');
    icon.textContent = '✅';
    setTimeout(() => {
        btn.classList.remove('copied');
        icon.textContent = originalIcon;
    }, 2000);
}

/**
 * 複製 Blueprint JSON
 */
async function copyBlueprint() {
    const blueprint = generateBlueprint();
    const jsonStr = JSON.stringify(blueprint, null, 2);

    const success = await copyToClipboard(jsonStr);
    const btn = document.querySelector('.toolbar-btn');
    const icon = document.getElementById('copyIcon');

    if (success) {
        showCopyFeedback(btn, icon, '📋');
    } else {
        alert('無法複製到剪貼簿，請手動選取並複製');
    }
}

/**
 * 複製 Playground URL
 */
async function copyPlaygroundUrl() {
    const url = document.getElementById('playgroundUrl').value;
    const success = await copyToClipboard(url);

    if (success) {
        alert('URL 已複製到剪貼簿！');
    } else {
        alert('無法複製到剪貼簿，請手動選取並複製');
    }
}

/**
 * Reset blueprint to auto-generated state
 */
function resetBlueprint() {
    if (confirm('確定要重置所有手動修改並恢復為表單設定嗎？')) {
        isManualMode = false;
        manualBlueprint = null;

        // Force update UI logic
        const btnReset = document.getElementById('btnResetBlueprint');
        btnReset.style.display = 'none';
        document.querySelector('.status-badge').textContent = '💡 即時預覽';
        document.querySelector('.status-badge').className = 'status-badge info';

        updateBlueprintPreview();
    }
}

/**
 * Save current state to LocalStorage
 */
function saveState() {
    const state = {
        isManualMode,
        manualBlueprint: isManualMode ? manualBlueprint : null,
        // Optionally save form state here too if needed, but for now just blueprint
        timestamp: new Date().getTime()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Restore state from LocalStorage
 */
function restoreState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const state = JSON.parse(saved);
            if (state.isManualMode && state.manualBlueprint) {
                if (confirm('發現上次未儲存的 Blueprint 修改，是否還原？')) {
                    isManualMode = true;
                    manualBlueprint = state.manualBlueprint;
                    // Trigger update immediately
                    updateBlueprintPreview();
                } else {
                    // User chose not to restore, clear storage
                    localStorage.removeItem(STORAGE_KEY);
                }
            }
        } catch (e) {
            console.error('Failed to restore state', e);
        }
    }
}

/**
 * 解析 URL 參數並套用設定
 */
function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);

    if (params.has('plugin')) {
        const plugin = params.get('plugin');
        if (plugin.includes('github-proxy.com')) {
            document.querySelector('[data-source="proxy"]').click();
            document.getElementById('proxyUrl').value = plugin;
        } else if (plugin.includes('github.com')) {
            document.querySelector('[data-source="github"]').click();
            const match = plugin.match(/github\.com\/([^/]+\/[^/]+)/);
            if (match) document.getElementById('githubRepo').value = match[1];
        } else {
            document.getElementById('pluginSlug').value = plugin;
        }
    }

    if (params.has('github')) {
        document.querySelector('[data-source="github"]').click();
        document.getElementById('githubRepo').value = params.get('github');
    }

    if (params.has('php')) {
        document.getElementById('phpVersion').value = params.get('php');
    }

    if (params.has('wp')) {
        document.getElementById('wpVersion').value = params.get('wp');
    }

    if (params.has('landing')) {
        const landing = params.get('landing');
        const select = document.getElementById('landingPage');
        const exists = Array.from(select.options).some(opt => opt.value === landing);
        if (exists) {
            select.value = landing;
        } else {
            select.value = 'custom';
            document.getElementById('customLandingGroup').style.display = 'block';
            document.getElementById('customLanding').value = landing;
        }
    }

    if (params.has('debug') && params.get('debug') === 'true') {
        document.getElementById('enableDebug').checked = true;
        document.getElementById('debugOptions').style.display = 'block';
        document.querySelector('.debug-toggle').classList.add('active');
        document.getElementById('debugBanner').classList.add('visible');
    }

    if (params.has('autostart') && params.get('autostart') === 'true') {
        setTimeout(launchPlayground, 500);
    }
}

/**
 * 初始化事件監聽器
 */
function initEventListeners() {
    // Tab 切換
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
            if (btn.dataset.tab === 'blueprint') {
                updateBlueprintPreview();
            }
        });
    });

    // 外掛來源切換
    document.querySelectorAll('.plugin-source-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.plugin-source-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.plugin-input-group').forEach(g => g.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`plugin-${tab.dataset.source}`).classList.add('active');
            updateBlueprintPreview();
        });
    });

    // Landing Page 變更
    document.getElementById('landingPage').addEventListener('change', (e) => {
        document.getElementById('customLandingGroup').style.display =
            e.target.value === 'custom' ? 'block' : 'none';
        document.getElementById('loginHint').style.display =
            e.target.value === '/' ? 'block' : 'none';
        updateBlueprintPreview();
    });

    // Debug 模式切換
    document.getElementById('enableDebug').addEventListener('change', (e) => {
        const debugOptions = document.getElementById('debugOptions');
        const debugToggle = document.querySelector('.debug-toggle');
        const debugBanner = document.getElementById('debugBanner');

        if (e.target.checked) {
            debugOptions.style.display = 'block';
            debugToggle.classList.add('active');
            debugBanner.classList.add('visible');
        } else {
            debugOptions.style.display = 'none';
            debugToggle.classList.remove('active');
            debugBanner.classList.remove('visible');
        }
        updateBlueprintPreview();
    });

    // 表單元素變更監聽
    document.querySelectorAll('select, input').forEach(el => {
        el.addEventListener('change', updateBlueprintPreview);
        el.addEventListener('input', updateBlueprintPreview);
    });

    // Blueprint Editor Event Listener
    const editor = document.getElementById('blueprintEditor');
    editor.addEventListener('input', (e) => {
        isManualMode = true;
        manualBlueprint = e.target.value;
        updateBlueprintPreview();
    });
}

// 初始化應用程式
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    parseUrlParams();
    restoreState(); // Check for saved state
    updateBlueprintPreview();
});

