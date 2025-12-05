import React, { useState, useMemo } from 'react';
import { Compass, Filter, Check, Plus, Store, Scale, Calendar, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { DealCategory, GroceryMatch } from '../types';

interface DealExplorerProps {
  categories: DealCategory[];
  savedDeals: GroceryMatch[];
  onAddToShoppingList: (match: GroceryMatch) => void;
  isLoading: boolean;
}

const DealExplorer: React.FC<DealExplorerProps> = ({ categories, savedDeals, onAddToShoppingList, isLoading }) => {
  const [selectedStore, setSelectedStore] = useState<string>('All');
  
  // Initialized with empty Set to ensure categories are collapsed by default.
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  const uniqueStores = useMemo(() => {
    const stores = new Set<string>();
    categories.forEach(cat => {
      cat.items.forEach(item => stores.add(item.storeName));
    });
    return Array.from(stores).sort();
  }, [categories]);

  const filteredCategories = useMemo(() => {
    if (selectedStore === 'All') return categories;

    return categories.map(cat => ({
      ...cat,
      items: cat.items.filter(item => item.storeName === selectedStore)
    })).filter(cat => cat.items.length > 0);
  }, [categories, selectedStore]);

  const isSaved = (match: GroceryMatch) => {
    return savedDeals.some(s => s.id === match.id);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
        const newSet = new Set(prev);
        if (newSet.has(category)) {
            newSet.delete(category);
        } else {
            newSet.add(category);
        }
        return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center animate-pulse">
           <Compass className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="mt-6 text-lg font-semibold text-slate-800">Exploring Local Flyers...</h3>
        <p className="text-slate-500 mt-2 max-w-sm">
          Gathering all the best deals and organizing them by aisle for you.
        </p>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
        <div className="bg-slate-100 p-4 rounded-full mb-4">
          <Compass className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-800">No deals found</h3>
        <p className="text-slate-500 mt-1">
          Upload weekly ads to start exploring deals.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
       {/* Filter Section */}
       {uniqueStores.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-sm text-slate-500 min-w-fit">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filter by Store:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedStore('All')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border ${
                selectedStore === 'All'
                  ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-200'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-purple-300'
              }`}
            >
              All Stores
            </button>
            {uniqueStores.map((store) => (
              <button
                key={store}
                onClick={() => setSelectedStore(store)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border ${
                  selectedStore === store
                    ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-purple-300'
                }`}
              >
                {store}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {filteredCategories.map((cat) => {
          const isExpanded = expandedCategories.has(cat.category);
          return (
            <div key={cat.category} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <button 
                    onClick={() => toggleCategory(cat.category)}
                    className="w-full bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 hover:to-slate-50 border-b border-slate-100 p-4 flex items-center justify-between transition-all group"
                >
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        {cat.category}
                        <span className={`text-xs font-normal px-2 py-0.5 rounded-full transition-colors ${isExpanded ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-white border border-slate-200 text-slate-500'}`}>
                            {cat.items.length} items
                        </span>
                    </h3>
                    {isExpanded ? 
                        <ChevronUp className="w-5 h-5 text-purple-500" /> : 
                        <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                    }
                </button>
                
                {isExpanded && (
                    <div className="divide-y divide-slate-100 animate-fade-in">
                    {cat.items.map((deal) => (
                        <div key={deal.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-start justify-between">
                                <div className="flex flex-col">
                                    {deal.brand && (
                                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-0.5 bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                                            {deal.brand}
                                        </span>
                                    )}
                                    <h4 className="font-bold text-slate-800 text-base">{deal.productName || deal.itemName}</h4>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 mb-2">
                                        <Store className="w-3 h-3" />
                                        <span className="font-medium">{deal.storeName}</span>
                                        {deal.quantity && (
                                            <>
                                                <span className="text-slate-300">|</span>
                                                <span className="flex items-center gap-1 font-medium text-slate-700">
                                                    <Scale className="w-3 h-3" /> {deal.quantity}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right sm:hidden">
                                    <span className="block text-lg font-bold text-emerald-600">{deal.price}</span>
                                </div>
                            </div>
                            
                            <p className="text-sm text-slate-600 bg-slate-50/80 p-1.5 rounded border border-slate-100/50 inline-block">{deal.dealDescription}</p>
                            
                            <div className="flex items-center gap-3 mt-2">
                                {deal.validDates && (
                                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                        <Calendar className="w-3 h-3" /> {deal.validDates}
                                    </span>
                                )}
                                {deal.itemLimit && (
                                    <span className="flex items-center gap-1 text-[10px] text-amber-600">
                                        <AlertCircle className="w-3 h-3" /> {deal.itemLimit}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 min-w-[100px] border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-4">
                            <div className="text-right hidden sm:block">
                                {deal.originalPrice && (
                                    <span className="text-xs text-slate-400 line-through block">{deal.originalPrice}</span>
                                )}
                                <span className="block text-lg font-bold text-emerald-600">{deal.price}</span>
                            </div>
                            
                            <button
                                onClick={() => onAddToShoppingList(deal)}
                                disabled={isSaved(deal)}
                                className={`text-sm font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all w-full sm:w-auto justify-center ${
                                    isSaved(deal)
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 cursor-default'
                                    : 'bg-slate-900 text-white hover:bg-emerald-600 hover:shadow-md'
                                }`}
                            >
                                {isSaved(deal) ? (
                                    <>
                                        <Check className="w-3.5 h-3.5" /> Added
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-3.5 h-3.5" /> Add
                                    </>
                                )}
                            </button>
                        </div>
                        </div>
                    ))}
                    </div>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DealExplorer;