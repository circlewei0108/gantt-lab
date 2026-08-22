import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "隱私權政策｜gantt!lab", description: "gantt!lab 的本機資料處理說明。" };

export default function PrivacyPage() {
  return <main className="legal-page"><nav><Link href="/">← 返回 gantt!lab</Link></nav><article><span className="legal-kicker">PRIVACY</span><h1>隱私權政策</h1><p className="legal-date">最後更新：2026 年 8 月 22 日</p>
    <section><h2>1. 適用範圍</h2><p>本政策說明 gantt!lab 如何處理你在建立、匯出及分享甘特圖時所涉及的資料。</p></section>
    <section><h2>2. 本機儲存</h2><p>專案名稱、任務、日期、負責人、進度及樣式會儲存在你目前瀏覽器的 Local Storage。這些資料不會由 gantt!lab 上傳至網站伺服器。清除瀏覽器資料、使用無痕模式或更換裝置可能導致資料無法取回。</p></section>
    <section><h2>3. 分享連結</h2><p>當你產生分享連結時，專案內容會編碼在網址中。任何取得連結的人都能讀取及建立可編輯副本，因此請勿在專案名稱、任務或負責人欄位填入不適合公開分享的敏感資料。</p></section>
    <section><h2>4. 分享與出售</h2><p>gantt!lab 不販售個人資料，也不將專案內容用於廣告或交付第三方。</p></section>
    <section><h2>5. 移除資料</h2><p>你可以刪除個別專案，或透過清除瀏覽器網站資料移除保存在目前裝置上的全部內容。</p></section>
    <section><h2>7. 聯絡方式</h2><p>若對本政策或資料處理有疑問，請透過 <a href="https://github.com/circlewei0108/gantt-lab/issues" target="_blank" rel="noreferrer">gantt!lab GitHub Issues</a> 聯絡網站管理者。</p></section>
  </article></main>;
}
