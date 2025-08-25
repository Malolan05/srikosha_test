import fs from "fs";
import path from "path";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";

// Utility to read all JSON files in data/scriptures/
function getScriptureFiles() {
  const dir = path.join(process.cwd(), "data", "scriptures");
  const files: string[] = [];
  function walk(current: string) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(path.join(current, entry.name));
      else if (entry.name.endsWith(".json")) files.push(path.join(current, entry.name));
    }
  }
  walk(dir);
  return files;
}

function searchInVerse(
  verse: any,
  query: string,
  scriptureSlug: string,
  sectionNumber: number,
  verseIdx: number
) {
  let results: any[] = [];
  const textFields = [
    verse.original_text,
    verse.iast_text,
    verse.transliteration,
    verse.translation,
  ].filter(Boolean);
  for (const field of textFields) {
    if (field && field.toLowerCase().includes(query)) {
      results.push({
        type: "verse",
        text: field,
        scriptureSlug,
        sectionNumber,
        verseNumber: verse.verse_number,
      });
      break;
    }
  }
  if (verse.commentaries) {
    for (const comm of verse.commentaries) {
      if (
        (comm.commentary && comm.commentary.toLowerCase().includes(query)) ||
        (comm.author && comm.author.toLowerCase().includes(query))
      ) {
        results.push({
          type: "commentary",
          text: comm.commentary,
          author: comm.author,
          scriptureSlug,
          sectionNumber,
          verseNumber: verse.verse_number,
        });
      }
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

export default function SearchPageWrapper({ searchParams }: { searchParams: { q?: string } }) {
  // This wrapper is for nextjs server/client compatibility
  return <ClientSearchPage initialQuery={searchParams.q ?? ""} />;
}

function ClientSearchPage({ initialQuery }: { initialQuery: string }) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus on input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch and search scriptures when query changes
  useEffect(() => {
    async function doSearch() {
      if (!searchQuery.trim()) {
        setResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      // The following search is synchronous (Node.js) for server-side, but for client-side demo, fake async:
      await new Promise(res => setTimeout(res, 50)); // simulate async
      const query = searchQuery.trim().toLowerCase();
      let newResults: any[] = [];
      try {
        const files = getScriptureFiles();
        for (const file of files) {
          let data;
          try {
            data = JSON.parse(fs.readFileSync(file, "utf8"));
          } catch (e) {
            continue;
          }
          const slug = data?.metadata?.slug;
          const scriptureName = data?.metadata?.scripture_name;
          const sections = data?.content?.sections || [];
          for (const section of sections) {
            const sectionNumber = section.number;
            for (const [i, verse] of (section.verses || []).entries()) {
              const found = searchInVerse(verse, query, slug, sectionNumber, i);
              for (const match of found) {
                newResults.push({
                  ...match,
                  scriptureName,
                  slug,
                  sectionTitle: section.title,
                });
              }
            }
          }
        }
      } catch (e) {
        // ignore
      }
      setResults(newResults);
      setSearching(false);
    }
    doSearch();
  }, [searchQuery]);

  // On submit, update URL query param
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
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