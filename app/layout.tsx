import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ScreenScape - Free Movies & Series API | Stream Movies Online | Movie Database API",
  description: "ScreenScape provides free APIs for movies, TV series, and anime streaming. Access comprehensive movie database, episode links, video streaming APIs, and download links. Perfect for developers building movie apps, streaming platforms, and entertainment websites.",
  keywords: [
    "free movie API",
    "streaming API",
    "movie database API",
    "TV series API",
    "anime API",
    "video streaming",
    "movie download API",
    "episode API",
    "entertainment API",
    "media API",
    "movies online",
    "series streaming",
    "movie metadata",
    "IMDb alternative",
    "streaming platform",
    "video links API",
    "movie information API",
    "developer API",
    "REST API movies",
    "JSON movie data"
  ].join(", "),
  authors: [{ name: "ScreenScape Team" }],
  creator: "ScreenScape",
  publisher: "ScreenScape",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://totu.me'), // Replace with your actual domain
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "ScreenScape - Free Movies & Series API Platform",
    description: "Access free APIs for movies, TV series, and anime. Get streaming links, metadata, and episode information for your applications.",
    url: "https://totu.me", // Replace with your actual domain
    siteName: "ScreenScape",
    type: "website",
    locale: "en_US",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: "entertainment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geist.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <div className="flex min-h-screen flex-col">
              <div className="flex-1">{children}</div>
            </div>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
                