import type { Metadata } from "next";
import "./globals.css"; // Ensure this matches your CSS path

export const metadata: Metadata = {
  title: "Medxverse - HMO Portal",
};

export default function HMOLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}