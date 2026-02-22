// apps/web/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter, Special_Elite } from "next/font/google"; // NEW: Imported Special Elite for the stencil/classified look
import { SocketProvider } from "../context/SocketContext"; // Import the provider

const inter = Inter({ subsets: ["latin"] });
// NEW: Initialize the typewriter font as a CSS variable
const stencil = Special_Elite({ weight: "400", subsets: ["latin"], variable: "--font-stencil" }); 

export const metadata: Metadata = {
  title: "Operative",
  description: "Minimalist Spy Game",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* NEW: Appended the stencil font variable to the body */}
      <body className={`${inter.className} ${stencil.variable}`}> 
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
