import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from '@/context/AuthContext';
import GlobalChatListener from '@/components/GlobalChatListener';
import './globals.css';

export const metadata: Metadata = {
  title: 'PixelForge — Image Processing Service',
  description: 'Upload, transform, and manage your images with ease',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <AuthProvider>
          {children}

          {/* react-hot-toast — for existing UI toasts (upload, delete, etc.) */}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1f2937',
                color: '#f9fafb',
                border: '1px solid #374151',
                borderRadius: '12px',
                fontSize: '14px',
              },
              success: {
                iconTheme: { primary: '#7c3aed', secondary: '#fff' },
              },
            }}
          />

          {/* react-toastify — for chat notifications (bottom-right) */}
          <ToastContainer
            position="bottom-right"
            newestOnTop
            closeButton
            draggable
            pauseOnHover
            theme="dark"
            limit={4}
          />

          {/* Global socket listener — plays sound + shows toast on any page */}
          <GlobalChatListener />
        </AuthProvider>
      </body>
    </html>
  );
}
