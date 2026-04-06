import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);

  const q = searchParams.get("q") || "";
  const source = searchParams.get("source") || "";
  const sort = searchParams.get("sort") || "created_at";
  const order = searchParams.get("order") === "asc" ? true : false;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const perPage = 50;
  const offset = (page - 1) * perPage;

  let query = supabase
    .from("contacts")
    .select("*", { count: "exact" })
    .order(sort, { ascending: order })
    .range(offset, offset + perPage - 1);

  if (q) {
    query = query.or(
      `email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%,city.ilike.%${q}%,state.ilike.%${q}%`
    );
  }

  if (source) {
    query = query.eq("source", source);
  }

  const { data: contacts, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get distinct sources for filter options
  const { data: sources } = await supabase
    .from("contacts")
    .select("source")
    .not("source", "is", null);
  const uniqueSources = [...new Set(sources?.map((s) => s.source).filter(Boolean))].sort();

  return NextResponse.json({
    contacts: contacts || [],
    total: count ?? 0,
    page,
    perPage,
    totalPages: Math.ceil((count ?? 0) / perPage),
    sources: uniqueSources,
  });
}

export async function DELETE(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();
  const { ids } = body as { ids: string[] };

  if (!ids?.length) {
    return NextResponse.json({ error: "Missing ids" }, { status: 400 });
  }

  const { error } = await supabase
    .from("contacts")
    .delete()
    .in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: ids.length });
}

export async function PATCH(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing contact id" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("contacts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
