import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Search, AlertCircle, List, ShoppingCart, Compass, Bot } from 'lucide-react';
import Header from '@/components/Header';
import GroceryInput from '@/components/GroceryInput';
import FileUploader from '@/components/FileUploader';
import ResultsDisplay from '@/components/ResultsDisplay';
import DealExplorer from '@/components/DealExplorer';
import ShoppingList from '@/components/ShoppingList';
import { analyzeGroceryAds } from '@/services/geminiService';
import { AnalysisResult, UploadedFile, GroceryMatch } from '@/types';
import { logger } from '@/utils/logger';

const App: React.FC = () => {
  const [groceryList, setGroceryList] = useState<string>("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Shopping List State
  const [savedDeals, setSavedDeals] = useState<GroceryMatch[]>([]);
  const [activeTab, setActiveTab] = useState<'results' | 'explorer' | 'list'>('results');

  const handleFilesSelected = (newFiles: File[]) => {
    // Only accept PDFs and Images
    const validFiles = newFiles.filter(f =>
      f.type === 'application/pdf' || f.type.startsWith('image/')
    );

    if (validFiles.length !== newFiles.length) {
      alert("Only PDF and image files (PNG, JPG, etc.) are supported.");
    }

    const newUploadedFiles = validFiles.map(file => ({
      id: uuidv4(),
      file,
    }));

    setFiles(prev => [...prev, ...newUploadedFiles]);
  };

  const handleRemoveFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleAnalyze = async () => {
    if (!groceryList.trim()) {
      setError("Please enter your grocery list.");
      return;
    }
    if (files.length === 0) {
      setError("Please upload at least one weekly ad file.");
      return;
    }

    setLoadingStatus("Initializing Agents...");
    setError(null);
    setResult(null);
    setActiveTab('results');

    try {
      const plainFiles = files.map(f => f.file);
      const data = await analyzeGroceryAds(
        groceryList,
        plainFiles,
        (status) => setLoadingStatus(status)
      );
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred while analyzing the ads.");
    } finally {
      setLoadingStatus(null);
    }
  };

  const addToShoppingList = (match: GroceryMatch) => {
    setSavedDeals(prev => {
      // Prevent duplicates based on ID
      if (prev.some(item => item.id === match.id)) {
        return prev;
      }
      return [...prev, match];
    });
  };

  const removeFromShoppingList = (id: string) => {
    setSavedDeals(prev => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 text-red-700 animate-fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left Column: Inputs */}
          <div className="lg:col-span-5 space-y-6">
            <section className="h-[400px]">
              <GroceryInput
                value={groceryList}
                onChange={setGroceryList}
                disabled={!!loadingStatus}
              />
            </section>

            <section>
              <FileUploader
                files={files}
                onFilesSelected={handleFilesSelected}
                onRemoveFile={handleRemoveFile}
                disabled={!!loadingStatus}
              />
            </section>

            <button
              onClick={handleAnalyze}
              disabled={!!loadingStatus || !groceryList.trim() || files.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl shadow-sm hover:shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
            >
              {loadingStatus ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                <>
                  <Search className="w-6 h-6" />
                  <span>Find Deals</span>
                </>
              )}
            </button>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-slate-800 font-medium">
                <Bot className="w-4 h-4 text-emerald-600" />
                Multi-Agent Workflow
              </div>
              <div className="space-y-2">
                <div className={`flex items-center gap-2 text-xs ${loadingStatus && loadingStatus.includes('Agent 1') ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${loadingStatus && loadingStatus.includes('Agent 1') ? 'bg-emerald-500 animate-pulse' : 'bg-slate-200'}`} />
                  Agent 1: Vision Extractor
                </div>
                <div className={`flex items-center gap-2 text-xs ${loadingStatus && loadingStatus.includes('Agent 2') ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${loadingStatus && loadingStatus.includes('Agent 2') ? 'bg-emerald-500 animate-pulse' : 'bg-slate-200'}`} />
                  Agent 2: Inventory Librarian
                </div>
                <div className={`flex items-center gap-2 text-xs ${loadingStatus && loadingStatus.includes('Agent 3') ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${loadingStatus && loadingStatus.includes('Agent 3') ? 'bg-emerald-500 animate-pulse' : 'bg-slate-200'}`} />
                  Agent 3: List Interpreter
                </div>
                <div className={`flex items-center gap-2 text-xs ${loadingStatus && loadingStatus.includes('Agent 4') ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${loadingStatus && loadingStatus.includes('Agent 4') ? 'bg-emerald-500 animate-pulse' : 'bg-slate-200'}`} />
                  Agent 4: Deal Matcher
                </div>
              </div>
            </div>

            {/* Download Log Button */}
            {result && (
              <button
                onClick={() => logger.downloadLogs()}
                className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors duration-200 border border-slate-300 flex items-center justify-center gap-2 text-sm font-semibold"
              >
                <Bot className="w-4 h-4" />
                Download Pipeline Log
              </button>
            )}
          </div>

          {/* Right Column: Results & Shopping List */}
          <div className="lg:col-span-7">
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[700px] flex flex-col">

              {/* Tabs */}
              <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => setActiveTab('results')}
                  className={`flex-1 py-4 px-2 text-sm font-bold flex items-center justify-center gap-2 transition-colors min-w-[120px] ${activeTab === 'results'
                    ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/30'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <List className="w-4 h-4" />
                  List Matches
                  {result && (
                    <span className="bg-slate-200 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full">
                      {result.matches.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('explorer')}
                  className={`flex-1 py-4 px-2 text-sm font-bold flex items-center justify-center gap-2 transition-colors min-w-[120px] ${activeTab === 'explorer'
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/30'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <Compass className="w-4 h-4" />
                  Deal Explorer
                </button>
                <button
                  onClick={() => setActiveTab('list')}
                  className={`flex-1 py-4 px-2 text-sm font-bold flex items-center justify-center gap-2 transition-colors min-w-[120px] ${activeTab === 'list'
                    ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/30'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  My List
                  {savedDeals.length > 0 && (
                    <span className="bg-emerald-100 text-emerald-600 text-[10px] px-1.5 py-0.5 rounded-full">
                      {savedDeals.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Content */}
              <div className="p-6 flex-grow bg-slate-50/50">
                {activeTab === 'results' && (
                  loadingStatus ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                      <div className="relative mb-4">
                        <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Bot className="w-6 h-6 text-emerald-600 animate-pulse" />
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-slate-800">{loadingStatus}</h3>
                      <p className="text-slate-500 text-sm mt-2">Gemini 2.5 is coordinating multiple agents.</p>
                    </div>
                  ) : (
                    <ResultsDisplay
                      result={result}
                      isLoading={false}
                      savedDeals={savedDeals}
                      onAddToShoppingList={addToShoppingList}
                    />
                  )
                )}

                {activeTab === 'explorer' && (
                  loadingStatus ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center animate-pulse mb-4">
                        <Compass className="w-8 h-8 text-slate-300" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800">Updating Inventory...</h3>
                    </div>
                  ) : (
                    <DealExplorer
                      categories={result?.categorizedDeals || []}
                      isLoading={false}
                      savedDeals={savedDeals}
                      onAddToShoppingList={addToShoppingList}
                    />
                  )
                )}

                {activeTab === 'list' && (
                  <ShoppingList
                    savedDeals={savedDeals}
                    onRemove={removeFromShoppingList}
                  />
                )}
              </div>
            </section>
          </div>

        </div >
      </main >
    </div >
  );
};

export default App;