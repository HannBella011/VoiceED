import '../styles/globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { LoadingProvider } from '@/components/shared/GlobalLoading';
import { ModalProvider } from '@/components/shared/GlobalModals';

export const metadata = {
  title: "VoiceED - Where Every Student's Voice Matters",
  description:
    'A student-driven platform that empowers learners to be heard, supported, and inspired.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
        />
      </head>
      <body className="blue-theme">
        <LoadingProvider>
          <AuthProvider>
            <ModalProvider>{children}</ModalProvider>
          </AuthProvider>
        </LoadingProvider>
      </body>
    </html>
  );
}
