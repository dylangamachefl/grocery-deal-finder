import React from 'react';
import { Trash2, ShoppingCart, Store, Copy, Check, TrendingDown } from 'lucide-react';
import { GroceryMatch } from '../types';

interface ShoppingListProps {
  savedDeals: GroceryMatch[];
  onRemove: (id: string) => void;
}

const ShoppingList: React.FC<ShoppingListProps> = ({ savedDeals, onRemove }) => {
  const [copied, setCopied] = React.useState(false);

  // Helper to parse price strings
  const parsePrice = (str: string): number | null => {
    if (!str) return null;
    const clean = str.toLowerCase().replace(/,/g, '');
    
    // Handle "2 for $5" or "2/$5"
    const multi = clean.match(/(\d+)\s*(?:for|\/)\s*\$?([\d.]+)/);
    if (multi) {
      const qty = parseFloat(multi[1]);
      const cost = parseFloat(multi[2]);
      return qty > 0 ? cost / qty : 0;
    }
    
    // Handle "$2.99"
    const single = clean.match(/\$?([\d.]+)/);
    if (single) return parseFloat(single[1]);
    return null;
  };

  // Calculate total savings
  const totalSavings = React.useMemo(() => {
    let total = 0;
    savedDeals.forEach(deal => {
      if (!deal.originalPrice) return;

      const salePrice = parsePrice(deal.price);
      const originalPrice = parsePrice(deal.originalPrice);

      if (salePrice !== null && originalPrice !== null && originalPrice > salePrice) {
        total += (originalPrice - salePrice);
      }
    });
    return total;
  }, [savedDeals]);

  // Group by Store
  const groupedDeals = React.useMemo(() => {
    const groups: Record<string, GroceryMatch[]> = {};
    savedDeals.forEach(deal => {
      const store = deal.storeName || 'Unknown Store';
      if (!groups[store]) {
        groups[store] = [];
      }
      groups[store].push(deal);
    });
    return groups;
  }, [savedDeals]);

  const handleCopy = () => {
    let text = "My Shopping List:\n\n";
    if (totalSavings > 0) {
      text += `Potential Savings: $${totalSavings.toFixed(2)}\n\n`;
    }
    Object.keys(groupedDeals).forEach(store => {
      text += `--- ${store} ---\n`;
      groupedDeals[store].forEach(deal => {
        const name = deal.productName || deal.itemName;
        const qty = deal.quantity ? ` [${deal.quantity}]` : '';
        text += `- ${name}${qty}: ${deal.price} (${deal.dealDescription})\n`;
      });
      text += "\n";
    });
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (savedDeals.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
        <div className="bg-slate-100 p-4 rounded-full mb-4">
          <ShoppingCart className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-800">Your list is empty</h3>
        <p className="text-slate-500 mt-1">
          Add deals from the results tab to build your shopping list.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Savings Scoreboard */}
      {totalSavings > 0 && (
        <div className="bg-emerald-600 rounded-xl shadow-md p-6 text-white flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Potential Savings: ${totalSavings.toFixed(2)}</h2>
            <p className="text-emerald-100 text-sm opacity-90 mt-1">Estimated savings based on original prices</p>
          </div>
          <div className="bg-white/20 p-3 rounded-full">
            <TrendingDown className="w-8 h-8 text-white" />
          </div>
        </div>
      )}

      {/* Header Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800">Total Items: {savedDeals.length}</h3>
        </div>
        <button 
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors bg-slate-50 hover:bg-emerald-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-200"
        >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy List'}
        </button>
      </div>

      {/* List by Store */}
      {Object.keys(groupedDeals).map((store) => (
        <div key={store} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 p-3 flex items-center gap-2">
            <Store className="w-4 h-4 text-slate-500" />
            <h4 className="font-bold text-slate-700">{store}</h4>
          </div>
          <div className="divide-y divide-slate-100">
            {groupedDeals[store].map((deal) => {
              return (
                <div key={deal.id} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800">{deal.productName || deal.itemName}</span>
                        {deal.quantity && (
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {deal.quantity}
                          </span>
                        )}
                        <span className="text-emerald-600 font-bold text-sm bg-emerald-50 px-2 py-0.5 rounded">{deal.price}</span>
                        {deal.originalPrice && (
                            <span className="text-xs text-slate-400 line-through decoration-slate-400">
                                {deal.originalPrice}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{deal.dealDescription}</p>
                    {deal.validDates && (
                        <p className="text-xs text-slate-400 mt-1">Valid: {deal.validDates}</p>
                    )}
                  </div>
                  <button 
                    onClick={() => onRemove(deal.id)}
                    className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove from list"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ShoppingList;