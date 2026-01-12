'use client';

/**
 * TERRA Home Page
 */

import { ConnectButton } from '@/components/ConnectButton';
import { useAccount } from 'wagmi';
import Link from 'next/link';

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <nav className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-terra-600">TERRA</span>
              <span className="ml-2 text-sm text-gray-500">on Mantle</span>
            </div>
            <div className="flex items-center space-x-4">
              {isConnected && (
                <Link
                  href="/dashboard"
                  className="text-gray-600 hover:text-terra-600 font-medium"
                >
                  Dashboard
                </Link>
              )}
              <ConnectButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="text-gray-900 dark:text-white">Tokenized</span>
            <br />
            <span className="text-terra-600">Real-World Assets</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-3xl mx-auto">
            Invest in fractional ownership of real estate, invoices, and equipment.
            Powered by Mantle blockchain for low-cost, secure transactions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!isConnected ? (
              <ConnectButton />
            ) : (
              <>
                <Link href="/dashboard" className="btn-primary text-lg px-8 py-3">
                  Go to Dashboard
                </Link>
                <Link href="/assets" className="btn-secondary text-lg px-8 py-3">
                  Browse Assets
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Choose TERRA?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card p-6">
              <div className="w-12 h-12 bg-terra-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-terra-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure & Transparent</h3>
              <p className="text-gray-600 dark:text-gray-400">
                All assets are verified through AI-powered KYC and registered on Mantle blockchain.
                Full audit trail and immutable ownership records.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card p-6">
              <div className="w-12 h-12 bg-mantle-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-mantle-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Low Fees on Mantle</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Mantle's L2 technology means transaction fees are a fraction of mainnet.
                More of your investment goes to actual assets.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Investor Protection</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Objective default triggers, recovery auctions, and Loss Claim NFTs ensure
                fair treatment even in worst-case scenarios.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-terra-600">$10M+</div>
              <div className="text-gray-600 mt-2">Assets Tokenized</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-terra-600">500+</div>
              <div className="text-gray-600 mt-2">Active Investors</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-terra-600">99.9%</div>
              <div className="text-gray-600 mt-2">Uptime</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-terra-600">12%</div>
              <div className="text-gray-600 mt-2">Avg. APY</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Connect Wallet', desc: 'Connect your MetaMask or compatible wallet' },
              { step: '2', title: 'Complete KYC', desc: 'Verify your identity with our AI-powered system' },
              { step: '3', title: 'Browse Assets', desc: 'Explore verified real-world assets to invest in' },
              { step: '4', title: 'Invest & Earn', desc: 'Purchase tokens and receive regular returns' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-terra-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <span className="text-xl font-bold text-terra-600">TERRA</span>
              <span className="ml-2 text-sm text-gray-500">© 2024</span>
            </div>
            <div className="flex space-x-6 text-gray-600">
              <a href="#" className="hover:text-terra-600">Terms</a>
              <a href="#" className="hover:text-terra-600">Privacy</a>
              <a href="#" className="hover:text-terra-600">Docs</a>
              <a href="https://twitter.com" className="hover:text-terra-600">Twitter</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
