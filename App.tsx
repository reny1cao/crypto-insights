import React from 'react';
import { Dashboard } from './components/Dashboard';


const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-cod-gray text-gray-300 font-sans">
      <header className="border-b border-shark">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center">
              <span className="font-serif text-2xl font-bold text-white tracking-wide">Crypto Insights AI</span>
            </div>
          </div>
        </nav>
      </header>

      <main>
        <Dashboard />
      </main>

      <footer className="text-center p-6 text-gray-600 text-xs border-t border-shark mt-8">
        <p>Powered by a multi-agent team using Google Gemini. Content is for informational purposes only.</p>
      </footer>
    </div>
  );
};

export default App;