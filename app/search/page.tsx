"use client"

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";

interface ScriptureMetadata {
  slug: string;
  scripture_name: string;
  category: string;
  author: string;
  language: string;
  script: string;
  total_verses: number;
}

interface Verse {
  original_text: string;
  iast_text: string;
  english_translation: string;
  commentaries: Record<string, string>;
}

interface Section {
  title: string;
  verses?: Verse[];
  sections?: Section[];
}

interface Scripture {
  metadata: ScriptureMetadata;
  content: {
    sections: Section[];
  };
}

type SearchResult = {
  scriptureName: string;
  sectionTitle: string;
  verseNumber: number;
  slug: string;
  type: "verse" | "commentary";
  text: string;
  author: string | null;
};

// Fetch and search real scriptures
async function searchScriptures(query: string): Promise<SearchResult[]> {
  if (!query) return [];
  // Fetch all scriptures from your API
  const resp = await fetch("/api/scriptures");
  if (!resp.ok) return [];
  const scriptures: Scripture[] = await resp.json();

  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  for (const scripture of scriptures) {
    const { metadata, content } = scripture;
    const scriptureName = metadata?.scripture_name || "";
    // Recursively search all sections and verses
    function searchSections(sections: Section[], sectionTitle: string) {
      for (const section of sections) {
        const title = section.title || sectionTitle || "";
        if (section.verses) {
          section.verses.forEach((verse, idx) => {
            // Search original text, IAST text, translation
            const match =
              (verse.original_text && verse.original_text.toLowerCase().includes(q)) ||
              (verse.iast_text && verse.iast_text.toLowerCase().includes(q)) ||
              (verse.english_translation && verse.english_translation.toLowerCase().includes(q));
            if (match) {
              results.push({
                scriptureName,
                sectionTitle: title,
                verseNumber: idx + 1,
                slug: metadata.slug,
                type: "verse",
                text: verse.english_translation || verse.original_text || verse.iast_text,
                author: null,
              });
            }
            // Search all commentaries
            if (verse.commentaries) {
              Object.entries(verse.commentaries).forEach(([author, text]) => {
                if (text && text.toLowerCase().includes(q)) {
                  results.push({
                    scriptureName,
                    sectionTitle: title,
                    verseNumber: idx + 1,
                    slug: metadata.slug,
                    type: "commentary",
                    text,
                    author,
                  });
                }
              });
            }
          });
        }
        // Nested sections
        if (section.sections) {
          searchSections(section.sections, title);
        }
      }
    }
    if (content?.sections) {
      searchSections(content.sections, "");
    }
  }
  return results;
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
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Perform real search when query changes
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

  // Sync input value with URL param if changed outside (e.g. via header search)
  useEffect(() => {
    const paramQuery = (searchParams.get("q") ?? "").trim();
    if (paramQuery !== searchQuery) {
      setSearchQuery(paramQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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