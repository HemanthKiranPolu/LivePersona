import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LivePersona",
  description: "Join a LiveKit room and chat with the Tavus avatar agent.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
