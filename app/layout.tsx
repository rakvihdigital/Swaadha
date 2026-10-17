import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/auth-dialog';
import { CommerceProvider } from '@/components/commerce';
import { SiteShell } from '@/components/site-shell';
export const metadata: Metadata = {title:{default:'Swaadha — Taste That Feels Like Home',template:'%s | Swaadha'},description:'Authentic flavors and fresh ingredients from our family kitchen to yours. Homemade favorites, lovingly prepared in Bangalore.'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body><AuthProvider><CommerceProvider><SiteShell>{children}</SiteShell></CommerceProvider></AuthProvider></body></html>}
