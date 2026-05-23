import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AntigravityGPGPU from "./components/AntigravityGPGPU";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Open Points Assistant",
  description: "Maximize household savings effortlessly.",
  icons: {
    icon: "https://openloans.com.au/wp-content/uploads/2023/07/WhatsApp-Image-2023-07-18-at-04.09.14.jpeg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col relative">
        {/* Background GPU effect sits beneath everything and never intercepts input */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <AntigravityGPGPU />
        </div>

        {/* Content container with elevated stacking context */}
        <div className="relative z-10 flex-1">{children}</div>
      </body>
    </html>
  );
}
