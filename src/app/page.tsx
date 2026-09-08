import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
// import Product from '@/components/landing/Product';
// import Solutions from '@/components/landing/Solutions';
// import Pricing from '@/components/landing/Pricing';
// import Footer from '@/components/landing/Footer';

export default function RootPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <Hero />

      {/* More landing-page sections will go here */}
    </main>
  );
}