import { NextRequest, NextResponse } from "next/server";
import { getKnowledgeDocument, loadKnowledgeSources, searchKnowledge } from "@/lib/knowledge-index";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const documentId = searchParams.get("documentId");
  const query = searchParams.get("q") ?? "";

  if (documentId) {
    const document = await getKnowledgeDocument(documentId);
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return NextResponse.json({
      document: {
        id: document.id,
        title: document.title,
        relativePath: document.relativePath,
        content: document.content.slice(0, 12000),
        summary: document.summary,
      },
    });
  }

  if (query.trim()) {
    const results = await searchKnowledge(query);
    return NextResponse.json({ query, results });
  }

  const sources = await loadKnowledgeSources();
  return NextResponse.json({
    catalog: sources.map((source) => ({
      id: source.id,
      title: source.title,
      relativePath: source.relativePath,
      summary: source.summary,
    })),
  });
}
