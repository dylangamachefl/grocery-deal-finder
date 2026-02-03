import React from 'react';
import { ShoppingBag, Sparkles } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-100 p-2 rounded-lg">
            <ShoppingBag className="w-6 h-6 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            Grocery Deal Hunter <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 hidden sm:inline-block">Powered by Gemma 3</span>
          </h1>
        </div>
        <div className="flex items-center text-sm text-slate-500">
          <Sparkles className="w-4 h-4 mr-1 text-amber-400" />
          <span>Save money on every trip</span>
        </div>
      </div>
    </header>
  );
};

export default Header;