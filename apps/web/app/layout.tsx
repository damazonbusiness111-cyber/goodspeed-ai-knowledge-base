import './globals.css';

export const metadata = {
  title: 'Knowledge Base',
  description: 'AI-powered personal knowledge base with RAG',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
