import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ArticuloEditor from "./ArticuloEditor";

export default async function ArticuloDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  let articulo = null;
  if (id !== "nuevo") {
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("id", id)
      .single();
    if (!data) notFound();
    articulo = data;
  }

  return <ArticuloEditor articulo={articulo} />;
}
