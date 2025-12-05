import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Search, AlertCircle, List, ShoppingCart } from 'lucide-react';
import Header from './components/Header';
import GroceryInput from './components/GroceryInput';
import FileUploader from './components/FileUploader';
import ResultsDisplay from './components/ResultsDisplay';
import ShoppingList from './components/ShoppingList';
import { analyzeGroceryAds } from './services/geminiService';
import { AnalysisResult, UploadedFile, GroceryMatch } from './types';

const App: React.FC = () => {
  const [groceryList, setGroceryList] = useState<string>("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Shopping List State
  const [savedDeals, setSavedDeals] = useState<GroceryMatch[]>([]);
  const [activeTab, setActiveTab] = useState<'results' | 'list'>('results');

  const handleFilesSelected = (newFiles: File[]) => {
    // Only accept PDFs
    const pdfFiles = newFiles.filter(f => f.type === 'application/pdf');
    if (pdfFiles.length !== newFiles.length) {
      alert("Only PDF files are supported.");
    }
    
    const newUploadedFiles = pdfFiles.map(file => ({
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
      setError("Please upload at least one weekly ad PDF.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setActiveTab('results'); // Switch back to results when searching

    try {
      const plainFiles = files.map(f => f.file);
      const data = await analyzeGroceryAds(groceryList, plainFiles);
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred while analyzing the ads.");
    } finally {
      setIsLoading(false);
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
                 disabled={isLoading}
               />
            </section>
            
            <section className="h-[300px]">
              <FileUploader 
                files={files} 
                onFilesSelected={handleFilesSelected} 
                onRemoveFile={handleRemoveFile}
                disabled={isLoading}
              />
            </section>

            <button
              onClick={handleAnalyze}
              disabled={isLoading || !groceryList.trim() || files.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl shadow-sm hover:shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
            >
              <Search className="w-6 h-6" />
              {isLoading ? 'Analyzing Deals...' : 'Find Deals'}
            </button>
            
            <p className="text-center text-xs text-slate-400 mt-2">
              Gemini 2.5 Flash will analyze your PDFs securely.
            </p>
          </div>

          {/* Right Column: Results & Shopping List */}
          <div className="lg:col-span-7">
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[700px] flex flex-col">
              
              {/* Tabs */}
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setActiveTab('results')}
                  className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                    activeTab === 'results' 
                      ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/30' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <List className="w-4 h-4" />
                  Deal Results
                  {result && (
                    <span className="bg-slate-200 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full">
                        {result.matches.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('list')}
                  className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                    activeTab === 'list' 
                      ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/30' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  My Shopping List
                  {savedDeals.length > 0 && (
                    <span className="bg-emerald-100 text-emerald-600 text-[10px] px-1.5 py-0.5 rounded-full">
                        {savedDeals.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Content */}
              <div className="p-6 flex-grow">
                {activeTab === 'results' ? (
                  <ResultsDisplay 
                    result={result} 
                    isLoading={isLoading} 
                    savedDeals={savedDeals}
                    onAddToShoppingList={addToShoppingList}
                  />
                ) : (
                  <ShoppingList 
                    savedDeals={savedDeals} 
                    onRemove={removeFromShoppingList} 
                  />
                )}
              </div>
            </section>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;