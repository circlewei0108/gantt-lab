import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "服務條款｜gantt!lab", description: "使用 gantt!lab 甘特圖工作台時適用的服務條款。" };

export default function TermsPage() {
  return <main className="legal-page"><nav><Link href="/">← 返回 gantt!lab</Link></nav><article><span className="legal-kicker">TERMS</span><h1>服務條款</h1><p className="legal-date">最後更新：2026 年 8 月 22 日</p>
    <section><h2>1. 接受條款</h2><p>使用 gantt!lab 即表示你同意本服務條款。若你不同意，請停止使用本網站及 Google Drive 連結功能。</p></section>
    <section><h2>2. 服務內容</h2><p>gantt!lab 提供甘特圖建立、任務排序、樣式調整、本機保存，以及 Excel、PNG、JPG 匯出功能。使用者也可自行授權 Google Drive，以備份及載入由本網站建立的專案資料。</p></section>
    <section><h2>3. 使用者責任</h2><p>你應確認輸入、保存及分享的內容具有合法使用權，且不得利用本服務處理違法、侵權、惡意或危害他人權益的內容。請自行保留重要專案的額外備份。</p></section>
    <section><h2>4. Google 服務</h2><p>Google Drive 功能由 Google 提供，必須由你自行登入並授權。Google 服務的可用性及帳戶管理另受 Google 的相關條款規範。</p></section>
    <section><h2>5. 服務可用性</h2><p>本服務可能因維護、網路、瀏覽器、第三方 API 或其他因素暫停或變更。我們會合理維護服務，但不保證所有功能永久不中斷或完全無錯誤。</p></section>
    <section><h2>6. 責任限制</h2><p>使用者應自行確認輸出結果與備份是否完整。對於瀏覽器資料清除、裝置故障、第三方服務異常或使用者操作所造成的資料遺失，gantt!lab 在法律允許範圍內不負間接或衍生損害責任。</p></section>
    <section><h2>7. 條款更新與聯絡</h2><p>本條款可能因功能或法規需求更新，更新日期會顯示於本頁。如有疑問，請透過 <a href="https://github.com/circlewei0108/gantt-lab/issues" target="_blank" rel="noreferrer">gantt!lab GitHub Issues</a> 聯絡網站管理者。</p></section>
  </article></main>;
}
