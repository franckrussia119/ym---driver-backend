import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyOptionLabel?: string;
  searchPlaceholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  dark?: boolean;
}

// Combobox recherchable : au lieu d'un <select> natif où il faut faire
// défiler toute la liste pour trouver un chauffeur ou un camion, on tape
// pour filtrer instantanément. Utilisé partout où l'app propose de choisir
// un chauffeur ou un véhicule dans une liste.
export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Rechercher…',
  emptyOptionLabel,
  searchPlaceholder,
  required,
  disabled,
  className = '',
  dark = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter((o) => {
    if (!searchTerm) return true;
    const haystack = `${o.label} ${o.sublabel || ''}`.toLowerCase();
    return haystack.includes(searchTerm.toLowerCase());
  });

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleOpen = () => {
    if (disabled) return;
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {!isOpen ? (
        <button
          type="button"
          onClick={handleOpen}
          disabled={disabled}
          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left cursor-pointer transition-colors ${
            dark
              ? 'bg-slate-800 border border-slate-700 text-white hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed'
              : 'bg-white border border-slate-200 hover:border-slate-300 disabled:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400'
          }`}
        >
          <span className={`truncate text-sm ${selected ? (dark ? 'text-white font-medium' : 'text-slate-900 font-medium') : (dark ? 'text-slate-400' : 'text-slate-400')}`}>
            {selected ? selected.label : emptyOptionLabel || placeholder}
          </span>
          <ChevronDown className={`w-4 h-4 shrink-0 ${dark ? 'text-slate-400' : 'text-slate-400'}`} />
        </button>
      ) : (
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setIsOpen(false); setSearchTerm(''); }
              if (e.key === 'Enter' && filtered.length > 0) { e.preventDefault(); handleSelect(filtered[0].value); }
            }}
            placeholder={searchPlaceholder || `Rechercher${selected ? ` — actuellement: ${selected.label}` : ''}…`}
            className="w-full pl-9 pr-9 py-2 bg-white border border-blue-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => { setIsOpen(false); setSearchTerm(''); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {isOpen && (
        <div className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg py-1">
          {!required && (
            <button
              type="button"
              onClick={() => handleSelect('')}
              className="w-full text-left px-3 py-2 text-xs text-slate-400 italic hover:bg-slate-50 cursor-pointer flex items-center justify-between"
            >
              {emptyOptionLabel || '— Aucun —'}
              {!value && <Check className="w-3.5 h-3.5 text-blue-600" />}
            </button>
          )}
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-slate-400">Aucun résultat pour « {searchTerm} »</div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => handleSelect(o.value)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer flex items-center justify-between gap-2 ${
                  o.value === value ? 'bg-blue-50/70 font-semibold text-blue-900' : 'text-slate-800'
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate">{o.label}</span>
                  {o.sublabel && <span className="block text-[11px] text-slate-400 truncate">{o.sublabel}</span>}
                </span>
                {o.value === value && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
