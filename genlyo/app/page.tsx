// Dosya Yolu: genlyo/app/page.tsx

import { redirect } from 'next/navigation';

// 🚀 DOKÜMANTASYON: Siteye (ana dizine) ilk giren kişiyi anında /login sayfasına fırlatır.
export default function HomePage() {
  redirect('/login');
}