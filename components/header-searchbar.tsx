import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useState } from "react"

export function HeaderSearchbar() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  return (
    <form
      className="flex items-center gap-2 w-full max-w-lg mx-auto"
      onSubmit={e => {
        e.preventDefault()
        router.push("/search")
      }}
    >
      <div className="relative w-full">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search scriptures..."
          className="w-full pl-9 pr-4"
          value={query}
          onFocus={() => router.push("/search")}
          onChange={e => setQuery(e.target.value)}
        />
      </div>
    </form>
  )
}