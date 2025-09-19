import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Backoffice - Sistema de Gestión de Stock",
  description: "Panel de control para gestión de stock, entradas, productos y alertas - La Traviata",
  keywords: ["stock", "gestión", "inventario", "backoffice", "productos", "alertas"],
  authors: [{ name: "La Traviata" }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}