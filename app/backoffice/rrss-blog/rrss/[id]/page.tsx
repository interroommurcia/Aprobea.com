import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import RrssEditor from "./RrssEditor";

export default async function RrssDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  let post = null;
  if (id !== "nuevo") {
    const { data } = await supabase.from("rrss_posts").select("*").eq("id", id).single();
    if (!data) notFound();
    post = data;
  }

  return <RrssEditor post={post} />;
}
