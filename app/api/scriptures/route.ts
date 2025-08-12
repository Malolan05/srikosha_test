import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  // Path to your data directory
  const dir = path.join(process.cwd(), 'data', 'scriptures')
  // Get all .json files in /data/scriptures
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
  const allTexts = []
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
    if (Array.isArray(data.texts)) {
      allTexts.push(...data.texts)
    }
  }
  return NextResponse.json(allTexts)
}