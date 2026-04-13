import type {Metadata} from 'next';
import './globals.css';
import { Noto_Serif, Plus_Jakarta_Sans } from "next/font/google";
import { cn } from "@/lib/utils";

const jakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans', weight: ['300', '400', '500', '600', '700'] });
const notoSerif = Noto_Serif({ subsets: ['latin'], variable: '--font-serif', weight: ['400', '700'], style: ['normal', 'italic'] });

export const metadata: Metadata = {
  title: 'inv-tienda | E-Commerce',
  description: 'Tienda en línea oficial',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="es" className={cn("font-sans", jakartaSans.variable, notoSerif.variable)} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
