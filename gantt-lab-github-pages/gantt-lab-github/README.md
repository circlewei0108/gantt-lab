# gantt!lab

可直接編輯、預覽並匯出 Excel、PNG 與 JPG 的繁體中文甘特圖工作台。

## 主要功能

- 建立與管理多個專案
- 同一瀏覽器內自動儲存，不強迫登入
- 拖曳調整任務順序
- 編輯任務名稱、負責人、開始日、結束日與進度
- 日、週、月、季時間軸與縮放
- 自訂 Bar 顏色與四種顯示樣式
- 預覽及匯出 Excel、PNG、JPG

## 本機啟動

請先安裝 Node.js 22，再於專案資料夾執行：

```bash
npm install
npm run dev
```

接著開啟 <http://localhost:3000>。

## 發布到 GitHub Pages

1. 在 GitHub 建立新的 Repository，建議命名為 `gantt-lab`。
2. 將這個資料夾內的所有檔案上傳至 Repository。
3. 進入 Repository 的 **Settings → Pages**。
4. 在 **Build and deployment → Source** 選擇 **GitHub Actions**。
5. 回到 **Actions** 頁籤，等待 `Deploy to GitHub Pages` 顯示綠色勾勾。

完成後網址會是：

```text
https://你的GitHub帳號.github.io/gantt-lab/
```

之後每次更新 GitHub 的 `main` 分支，GitHub Pages 都會自動重新發布。

## 儲存方式

目前專案資料儲存在瀏覽器的 Local Storage。同一裝置與瀏覽器重新開啟後仍會保留，但清除瀏覽器資料、使用無痕模式或更換裝置時不會同步。Google Drive 跨裝置同步介面已預留，正式啟用仍需設定 Google OAuth 與 Drive API。

## 自訂網址

GitHub Actions 會自動判斷 Repository 名稱，不需要手動設定。若未來改用其他平台或自訂網域，可設定：

```text
NEXT_PUBLIC_SITE_URL=https://你的網域
```
