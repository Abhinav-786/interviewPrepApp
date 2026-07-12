import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'InterviewPrep — LinkedIn Post Tracker',
  description: 'Collect LinkedIn posts, organize by topic, and export to CSV for interview preparation.',
  keywords: 'interview prep, LinkedIn, CSV export, study tracker',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
