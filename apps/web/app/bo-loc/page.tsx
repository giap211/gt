import { Suspense } from "react";
import { FilteredMovieScreen } from "@/components/filtered-movie-screen";
import type { MovieFilters } from "@/lib/ophim-client";

export default async function FilteredMoviesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const value = (key: string) => {
    const item = params[key];
    return Array.isArray(item) ? item[0] || "" : item || "";
  };
  const filters: MovieFilters = {
    type: value("type"),
    category: value("category"),
    country: value("country"),
    year: value("year"),
    sortField: value("sort_field") || "modified.time",
    sortType: value("sort_type") || "desc",
    sortLang: value("sort_lang"),
  };
  return <Suspense fallback={<main className="min-h-screen bg-[#0b0d14]"/>}><FilteredMovieScreen initialFilters={filters}/></Suspense>;
}
