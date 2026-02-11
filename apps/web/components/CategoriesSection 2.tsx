"use client";

import { useMemo, useState } from "react";
import type { Category, CategoryWord, Difficulty } from "../src/types";
import { slugify } from "../src/utils/game";

type CategoriesSectionProps = {
  categories: Category[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onAddCustom: (category: Category) => void;
  disabled?: boolean;
};

function inferDifficulty(word: string): Difficulty {
  const compactLength = word.replace(/\s+/g, "").length;
  if (compactLength <= 6) return "easy";
  if (compactLength <= 11) return "medium";
  return "hard";
}

function toCustomWord(word: string): CategoryWord {
  return {
    word,
    difficulty: inferDifficulty(word)
  };
}

export default function CategoriesSection({
  categories,
  selectedIds,
  onToggle,
  onAddCustom,
  disabled
}: CategoriesSectionProps) {
  const [search, setSearch] = useState("");
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [name, setName] = useState("");
  const [words, setWords] = useState("");

  const parsedWords = useMemo(() => {
    return words
      .split(/[,\n]+/)
      .map((word) => word.trim())
      .filter(Boolean);
  }, [words]);

  const canAdd = name.trim().length > 0 && parsedWords.length >= 5;

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter((category) => category.name.toLowerCase().includes(term));
  }, [categories, search]);

  const selectedCategories = useMemo(
    () => categories.filter((category) => selectedIds.includes(category.id)),
    [categories, selectedIds]
  );

  const handleAdd = () => {
    if (!canAdd) return;
    const uniqueWords = Array.from(new Set(parsedWords));
    const baseId = slugify(name);
    const id = `${baseId || "categoria"}-${Date.now().toString(36)}`;
    onAddCustom({
      id,
      name: name.trim(),
      words: uniqueWords.map(toCustomWord),
      custom: true
    });
    setName("");
    setWords("");
    setShowCustomForm(false);
  };

  return (
    <div className="grid gap-4 rounded-3xl border border-white/10 bg-surface/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg">Categorías</h3>
          <p className="text-xs text-muted">Seleccionadas: {selectedIds.length}</p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setShowCustomForm((value) => !value)}
          disabled={disabled}
          aria-expanded={showCustomForm}
        >
          Agregar categoría personalizada
        </button>
      </div>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar categoría"
        className="input"
        disabled={disabled}
        aria-label="Buscar categoría"
      />

      {selectedCategories.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedCategories.map((category) => (
            <span key={category.id} className="chip border-accent/30 bg-accent/10 text-ink">
              {category.name}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted">Activa al menos una categoría para preparar la partida.</p>
      )}

      <div className="max-h-64 space-y-2 overflow-auto pr-1">
        {filteredCategories.map((category) => {
          const active = selectedIds.includes(category.id);
          return (
            <button
              type="button"
              key={category.id}
              onClick={() => onToggle(category.id)}
              disabled={disabled}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                active
                  ? "border-accent/50 bg-accent/10 text-ink"
                  : "border-white/10 bg-white/5 text-muted hover:border-white/20"
              }`}
            >
              <span className="font-medium">
                {category.name}
                {category.custom ? " · Personalizada" : ""}
              </span>
              <span className="text-xs">{active ? "Seleccionada" : `${category.words.length} palabras`}</span>
            </button>
          );
        })}
      </div>

      {showCustomForm ? (
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-surface/60 p-4">
          <p className="text-xs text-muted">Mínimo 5 palabras. Separa con comas o saltos de línea.</p>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre de la categoría"
            className="input"
            disabled={disabled}
          />
          <textarea
            value={words}
            onChange={(event) => setWords(event.target.value)}
            placeholder="Palabras: gato, perro, conejo..."
            className="input min-h-[110px] resize-none"
            disabled={disabled}
          />
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{parsedWords.length} palabras detectadas</span>
            <button type="button" className="btn-primary" onClick={handleAdd} disabled={disabled || !canAdd}>
              Guardar categoría
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
