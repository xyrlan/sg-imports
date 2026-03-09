import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { Toast } from "@heroui/react";
import "./globals.css";
import { getLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ThemeToggle } from "@/components/theme-toggle";
import { ReactAriaLocaleProvider } from "@/components/providers/react-aria-locale-provider";
import { THEME_COOKIE_NAME } from "@/lib/theme";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Soulglobal",
  description: "Plataforma de importação simplificada para o seu negócio",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const theme = themeCookie === 'light' || themeCookie === 'dark' ? themeCookie : 'dark';

  const fontVariableClasses = `${inter.variable} ${jetbrainsMono.variable}`;

  return (
    <html lang={locale} data-theme={theme} className={`${theme} ${fontVariableClasses}`}>
      <body className="font-sans antialiased bg-background text-foreground">
        <NextIntlClientProvider>
          <ReactAriaLocaleProvider locale={locale}>
            <NuqsAdapter>
              <div className="fixed bottom-4 right-4 z-50">
                <ThemeToggle initialTheme={theme} fontVariableClass={fontVariableClasses} />
              </div>
              {children}
              <Toast.Provider placement="top end" />
            </NuqsAdapter>
          </ReactAriaLocaleProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
