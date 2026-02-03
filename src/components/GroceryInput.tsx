import React from 'react';
import { ListPlus } from 'lucide-react';

interface GroceryInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

const GroceryInput: React.FC<GroceryInputProps> = ({ value, onChange, disabled }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <ListPlus className="w-5 h-5 text-emerald-600" />
        <h2 className="text-lg font-semibold text-slate-800">Your Shopping List</h2>
      </div>
      <p className="text-sm text-slate-500 mb-3">
        Enter the items you need this week (e.g., "eggs, milk, chicken breast, strawberries").
      </p>
      <textarea
        className="flex-1 w-full p-4 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none text-slate-700 placeholder-slate-400 focus:outline-none text-base"
        placeholder="- Milk&#10;- Bread&#10;- Bananas&#10;- Coffee"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
};

export default GroceryInput;