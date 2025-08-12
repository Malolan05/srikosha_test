"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"

type Text = {
  id: string
  title: string
  category: string
  content: string
}

type OrganizedTexts = Record<string, Text[]>

export default function SearchPage() {
  const [organized, setOrganized] = useState<OrganizedTexts>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<Record<string, Text[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/scriptures")
      .then(res => res.json())
      .then((texts: Text[]) => {
        const byCategory: OrganizedTexts = {}
        texts.forEach(text => {
          byCategory[text.category] = byCategory[text.category] || []
          byCategory[text.category].push(text)
        })
        setOrganized(byCategory)
        setLoading(false)
      })
  }, [])

  function handleCheck(id: string, checked: boolean) {
    const next = new Set(selected)
    checked ? next.add(id) : next.delete(id)
    setSelected(next)
  }

  function handleSelectCategory(cat: string, checked: boolean) {
    const next = new Set(selected)
    for (const t of organized[cat]) checked ? next.add(t.id) : next.delete(t.id)
    setSelected(next)
  }

  function handleSelectAll(checked: boolean) {
    const next = new Set<string>()
    if (checked) Object.values(organized).flat().forEach(t => next.add(t.id))
    setSelected(next)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const res: Record<string, Text[]> = {}
    Object.entries(organized).forEach(([cat, texts]) => {
      texts.forEach(text => {
        if (selected.has(text.id) && text.content.toLowerCase().includes(search.toLowerCase())) {
          res[cat] = res[cat] || []
          res[cat].push(text)
        }
      })
    })
    setResults(res)
  }

  if (loading) return <div className="container py-12 text-center">Loading...</div>

  return (
    <div className="container mx-auto px-4 py-12">
      <Card>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSearch}>
            <Input
              type="text"
              placeholder="Search across selected texts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="text-lg"
            />
            <div className="flex gap-4 mt-2">
              <Button type="button" variant="outline" onClick={() => handleSelectAll(true)}>
                Select All
              </Button>
              <Button type="button" variant="outline" onClick={() => handleSelectAll(false)}>
                Deselect All
              </Button>
              <Button type="submit" className="ml-auto" disabled={!search || selected.size === 0}>
                Search
              </Button>
            </div>
          </form>
          <div className="mt-6">
            {Object.entries(organized).map(([category, texts]) => (
              <Card key={category} className="mb-6 bg-muted">
                <CardContent>
                  <div className="flex items-center mb-2">
                    <Checkbox
                      checked={texts.every(t => selected.has(t.id))}
                      onCheckedChange={checked => handleSelectCategory(category, !!checked)}
                      className="mr-2"
                    />
                    <span className="font-semibold text-primary">{category}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                      onClick={() => handleSelectCategory(category, true)}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSelectCategory(category, false)}
                    >
                      Deselect
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {texts.map(text => (
                      <div key={text.id} className="flex items-center gap-2 py-1">
                        <Checkbox
                          checked={selected.has(text.id)}
                          onCheckedChange={checked => handleCheck(text.id, !!checked)}
                        />
                        <span className="text-base">{text.title}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-8">
            {Object.keys(results).length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4">Results</h2>
                <div className="grid gap-4">
                  {Object.entries(results).map(([category, texts]) => (
                    <Card key={category} className="bg-background border-primary">
                      <CardContent>
                        <h3 className="font-semibold text-primary mb-2">{category}</h3>
                        {texts.map(text => (
                          <div key={text.id} className="p-2 border-b last:border-b-0">
                            <div className="font-bold">{text.title}</div>
                            <div className="text-muted-foreground text-sm whitespace-pre-line">
                              {text.content}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                  {Object.values(results).flat().length === 0 && (
                    <div className="text-muted-foreground">No results found.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}