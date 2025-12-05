import React, { useState, useMemo, useEffect } from 'react';
import { Tag, Store, CheckCircle, AlertTriangle, Filter, ChevronDown, ChevronUp, Package, Calendar, AlertCircle as AlertIcon, Plus, Check, Scale } from 'lucide-react';
import { AnalysisResult, GroceryMatch } from '../types';

interface ResultsDisplayProps {
  result: AnalysisResult | null;
  isLoading: boolean;
  savedDeals: GroceryMatch[];
  onAddToShoppingList: (match: GroceryMatch) => void;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, isLoading, savedDeals, onAddToShoppingList }) => {
  const [selectedStore, setSelectedStore] = useState<string>('All');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Reset filter and expansion when result changes
  useEffect(() => {
    setSelectedStore('All');
    setExpandedItems(new Set());
  }, [result]);

  // Reset expansion when filter changes
  useEffect(() => {
    setExpandedItems(new Set());
  }, [selectedStore]);

  const uniqueStores = useMemo(() => {
    if (!result) return [];
    const stores = new Set(result.matches.map(m => m.storeName));
    return Array.from(stores).sort();
  }, [result]);

  const filteredMatches = useMemo(() => {
    if (!result) return [];
    if (selectedStore === 'All') return result.matches;
    return result.matches.filter(m => m.storeName === selectedStore);
  }, [result, selectedStore]);

  const groupedMatches = useMemo(() => {
    const groups: Record<string, GroceryMatch[]> = {};
    filteredMatches.forEach(match => {
      // Group by the generic item name from the user's list
      if (!groups[match.itemName]) {
        groups[match.itemName] = [];
      }
      groups[match.itemName].push(match);
    });
    return groups;
  }, [filteredMatches]);

  const sortedItemNames = useMemo(() => {
    return Object.keys(groupedMatches).sort();
  }, [groupedMatches]);

  const toggleItem = (itemName: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };

  const isSaved = (match: GroceryMatch) => {
    return savedDeals.some(s => s.id === match.id);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Tag className="w-6 h-6 text-emerald-600 animate-pulse" />
          </div>
        </div>
        <h3 className="mt-6 text-lg font-semibold text-slate-800">Scanning Weekly Ads...</h3>
        <p className="text-slate-500 mt-2 max-w-sm">
          Gemini is reading your PDFs and finding matches for your list. This might take a few moments.
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center min-h-[200px]">
        <div className="bg-slate-100 p-4 rounded-full mb-4">
          <Tag className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-800">No results yet</h3>
        <p className="text-slate-500 mt-1">
          Upload ads and enter your list to see deals here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Card */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 p-6">
        <div className="flex items-start gap-4">
          <div className="bg-white p-2 rounded-lg shadow-sm">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Deal Summary</h3>
            <p className="text-slate-600 mt-1 leading-relaxed">
              {result.summary}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      {uniqueStores.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-sm text-slate-500 min-w-fit">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filter by Store:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedStore('All')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border ${
                selectedStore === 'All'
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-200'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-emerald-300'
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
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-emerald-300'
                }`}
              >
                {store}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Match List */}
      <div>
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            Found Deals <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full">{filteredMatches.length}</span>
            </h3>
            {selectedStore !== 'All' && (
                <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded">
                    Showing: {selectedStore}
                </span>
            )}
        </div>
        
        {sortedItemNames.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center text-yellow-800 flex flex-col items-center gap-3">
            <AlertTriangle className="w-8 h-8 opacity-50" />
            <p className="font-medium">No matches found for {selectedStore === 'All' ? 'your list' : selectedStore}.</p>
            {selectedStore !== 'All' && (
                <button 
                    onClick={() => setSelectedStore('All')}
                    className="text-sm font-semibold underline hover:text-yellow-900 mt-1"
                >
                    Clear filter
                </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedItemNames.map((itemName) => {
              const matches = groupedMatches[itemName];
              const isExpanded = expandedItems.has(itemName);

              return (
                <div key={itemName} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200">
                  <button 
                    onClick={() => toggleItem(itemName)}
                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors focus:outline-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold text-slate-800 text-lg">{itemName}</h4>
                        <span className="text-xs text-slate-500 font-medium">{matches.length} deal{matches.length !== 1 ? 's' : ''} found</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3 animate-fade-in">
                      {matches.map((match) => (
                        <MatchCard 
                          key={match.id} 
                          match={match} 
                          onAdd={() => onAddToShoppingList(match)}
                          isSaved={isSaved(match)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const MatchCard: React.FC<{ match: GroceryMatch; onAdd: () => void; isSaved: boolean }> = ({ match, onAdd, isSaved }) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex flex-col gap-4 border-l-4 border-l-emerald-500 group relative">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {/* Display actual product name, fall back to list item name if missing */}
            <h4 className="font-bold text-slate-800 text-base">{match.productName || match.itemName}</h4>
            {match.quantity && (
              <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                <Scale className="w-3 h-3" /> {match.quantity}
              </span>
            )}
            {match.isSale && (
              <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                Sale
              </span>
            )}
            {match.validDates && (
               <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                 <Calendar className="w-3 h-3" /> {match.validDates}
               </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Store className="w-3.5 h-3.5" />
            <span className="font-medium">{match.storeName}</span>
          </div>

          <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-2 rounded border border-slate-100">
            {match.dealDescription}
          </p>

          {match.itemLimit && (
             <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                <AlertIcon className="w-3.5 h-3.5" />
                <span>{match.itemLimit}</span>
             </div>
          )}
        </div>
        
        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-5 min-w-[100px]">
          <div className="text-right">
            <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-medium">Price</span>
            <div className="flex flex-col items-end">
                {match.originalPrice && (
                    <span className="text-xs text-slate-400 line-through decoration-slate-400">{match.originalPrice}</span>
                )}
                <span className="block text-lg font-bold text-emerald-600">{match.price}</span>
            </div>
          </div>
          
          <button 
            onClick={onAdd}
            disabled={isSaved}
            className={`mt-3 flex items-center justify-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all w-full sm:w-auto ${
              isSaved 
              ? 'bg-slate-100 text-slate-400 cursor-default'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-sm'
            }`}
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4" /> Added
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Add
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;