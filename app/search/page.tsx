"use client"

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";

// Dummy search function - replace with API call or static JSON import for production!
async function searchScriptures(query: string) {
  if (!query) return [];
  // Example: Replace this with a fetch to your API or load data from a static file.
  // This example returns mock data.
  const mockResults = [
    {
      scriptureName: "Bhagavad Gita",
      sectionTitle: "Chapter 2",
      verseNumber: 47,
      slug: "bhagavad-gita",
      type: "verse",
      text: "karmaṇy-evādhikāras te mā phaleṣhu kadāchana",
      author: null,
    },
    {
      scriptureName: "Ramanuja Commentary",
      sectionTitle: "Chapter 2",
      verseNumber: 47,
      slug: "bhagavad-gita",
      type: "commentary",
      text: "You have a right to perform your prescribed duties...",
      author: "Ramanuja",
    },
  ];
  // To simulate search, filter by query (case-insensitive)
  const q = query.toLowerCase();
  return mockResults.filter(
    res =>
      res.text.toLowerCase().includes(q) ||
      (res.author && res.author.toLowerCase().includes(q)) ||
      (res.scriptureName && res.scriptureName.toLowerCase().includes(q))
  );
}

function highlight(text: string, query: string) {
  if (!query) return text;
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "ig");
  return text.split(re).map((part, i) =>
    re.test(part) ? (
      <mark key={i} className="bg-yellow-200 text-black rounded px-1">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = (searchParams.get("q") ?? "").trim();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Perform search when query changes
  useEffect(() => {
    let ignore = false;
    async function doSearch() {
      if (!searchQuery.trim()) {
        setResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      const data = await searchScriptures(searchQuery.trim());
      if (!ignore) {
        setResults(data);
        setSearching(false);
      }
    }
    doSearch();
    return () => {
      ignore = true;
    };
  }, [searchQuery]);

  // Update search query and URL on submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    router.push(`/search${trimmed ? `?q=${encodeURIComponent(trimmed)}` : ""}`);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 min-h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-8 sm:mb-12 text-left sm:text-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3 sm:mb-4 text-primary">
          Search Scriptures
        </h1>
        <form onSubmit={handleSearch} className="max-w-lg mx-auto mb-4">
          <Input
            ref={inputRef}
            type="search"
            placeholder="Type to search scriptures..."
            className="w-full pl-9 pr-4"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoFocus
          />
        </form>
        <p className="text-base sm:text-lg text-muted-foreground">
          {searchQuery.trim()
            ? searching
              ? "Searching..."
              : results.length
                ? `Found ${results.length} result${results.length > 1 ? "s" : ""}.`
                : "No results found."
            : "Type a query in the search bar to explore scriptures."}
        </p>
      </div>
      <div className="flex-1 space-y-6">
        {results.map((res, i) => (
          <div
            key={i}
            className="border rounded-lg shadow-sm p-4 bg-background flex flex-col gap-2"
          >
            <Link
              href={`/scripture/${res.slug}#verse-${res.verseNumber}`}
              className="text-lg font-semibold text-primary hover:underline"
            >
              {res.scriptureName} {res.sectionTitle ? `- ${res.sectionTitle}` : ""} (Verse {res.verseNumber})
            </Link>
            <div className="text-base">
              {res.type === "verse" ? (
                <span>{highlight(res.text, searchQuery.trim())}</span>
              ) : (
                <div>
                  <span className="block text-sm text-muted-foreground">
                    Commentary by {res.author || "Unknown"}
                  </span>
                  <span>{highlight(res.text, searchQuery.trim())}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}