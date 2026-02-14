import type { Metadata } from "next";
import "./globals.css";
import OnboardingProvider from "@/components/OnboardingProvider";

export const metadata: Metadata = {
  title: "Prompt Builder PVP",
  description: "Конструктор золотых промптов для командного использования.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <OnboardingProvider>
          {children}
        </OnboardingProvider>
      </body>
    </html>
  );
}
