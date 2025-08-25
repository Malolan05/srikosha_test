import fs from "fs";
import path from "path";
import Link from "next/link";

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
  // Search in original_text and iast_text
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
  // Search in commentaries
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
  // Simple highlight for the query (case-insensitive)
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

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const query = (searchParams.q || "").trim().toLowerCase();
  let results: any[] = [];
  if (query) {
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
            results.push({
              ...match,
              scriptureName,
              slug,
              sectionTitle: section.title,
            });
          }
        }
      }
    }
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 min-h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-8 sm:mb-12 text-left sm:text-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3 sm:mb-4 text-primary">
          {query ? <>Search Results for &ldquo;{query}&rdquo;</> : "Search Scriptures"}
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground">
          {query
            ? results.length
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
                <span>{highlight(res.text, query)}</span>
              ) : (
                <div>
                  <span className="block text-sm text-muted-foreground">
                    Commentary by {res.author || "Unknown"}
                  </span>
                  <span>{highlight(res.text, query)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}