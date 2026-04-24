import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
  sidebarCollapsed?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-[100dvh] bg-bg-base">
      <Navbar />
      <main
        className="ml-[240px] min-h-[100dvh] flex flex-col transition-all duration-300"
        style={{ marginLeft: 240 }}
      >
        <div className="flex-1 p-6">
          <div className="max-w-[1440px] mx-auto">
            {children}
          </div>
        </div>
        <Footer />
      </main>
    </div>
  );
};

export default Layout;
