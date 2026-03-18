import type { Metadata } from "next";
import { Lexend_Deca } from "next/font/google";
import "./globals.css";

const lexendDeca = Lexend_Deca({ subsets: ["latin"], variable: "--font-sans" });



 
export const metadata: Metadata = {
  title: "Scounts Dashboard",
  description: "Digital Tax Partner",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" >
<body className={`${lexendDeca.variable} font-sans antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}