import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MetaMaskProvider } from "../hooks/metamask/useMetaMaskProvider";
import { MetaMaskEthersSignerProvider } from "../hooks/metamask/useMetaMaskEthersSigner";
import { InMemoryStorageProvider } from "../hooks/useInMemoryStorage";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Encrypted Number Guessing Game",
  description: "A privacy-preserving number guessing game using FHEVM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <MetaMaskProvider>
          <MetaMaskEthersSignerProvider
            initialMockChains={{ 31337: "http://localhost:8545" }}
          >
            <InMemoryStorageProvider>
              {children}
            </InMemoryStorageProvider>
          </MetaMaskEthersSignerProvider>
        </MetaMaskProvider>
      </body>
    </html>
  );
}

