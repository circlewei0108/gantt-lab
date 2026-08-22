import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "隱私權政策｜gantt!lab", description: "gantt!lab 的資料處理與 Google Drive 授權說明。" };

export default function PrivacyPage() {
  return <main className="legal-page"><nav><Link href="/">← 返回 gantt!lab</Link></nav><article><span className="legal-kicker">PRIVACY</span><h1>隱私權政策</h1><p className="legal-date">最後更新：2026 年 8 月 22 日</p>
    <section><h2>1. 適用範圍</h2><p>本政策說明 gantt!lab 如何處理你在建立甘特圖、使用本機儲存及選擇連結 Google Drive 時所涉及的資料。</p></section>
    <section><h2>2. 本機儲存</h2><p>未連結 Google Drive 時，專案名稱、任務、日期、負責人、進度及樣式會儲存在你目前瀏覽器的 Local Storage。這些資料不會由 gantt!lab 上傳至網站伺服器。清除瀏覽器資料、使用無痕模式或更換裝置可能導致資料無法取回。</p></section>
    <section><h2>3. Google Drive 授權</h2><p>只有在你主動選擇連結 Google Drive 並完成 Google 授權後，gantt!lab 才會取得暫時性的存取權杖。我們使用 <code>drive.file</code> 權限，僅能建立及管理由 gantt!lab 建立或開啟的備份檔案，無法任意瀏覽你其他的 Google Drive 檔案。</p></section>
    <section><h2>4. 使用的資料</h2><p>Google Drive 備份內容可能包括你的專案名稱、任務名稱、負責人、日期、進度與自訂樣式。OAuth 存取權杖只在目前瀏覽階段使用，不會寫入本機專案資料或提供給第三方。</p></section>
    <section><h2>5. 分享與出售</h2><p>gantt!lab 不販售個人資料，也不將專案內容用於廣告。Google 服務本身的資料處理另受 Google 隱私權政策與服務條款規範。</p></section>
    <section><h2>6. 移除與撤銷</h2><p>你可以在 Google 帳戶的第三方應用程式存取設定中撤銷 gantt!lab 的授權，也可以直接刪除 Google Drive 中的備份檔案；本機資料則可透過清除瀏覽器網站資料移除。</p></section>
    <section><h2>7. 聯絡方式</h2><p>若對本政策或資料處理有疑問，請透過 <a href="https://github.com/circlewei0108/gantt-lab/issues" target="_blank" rel="noreferrer">gantt!lab GitHub Issues</a> 聯絡網站管理者。</p></section>
  </article></main>;
}
