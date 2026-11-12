import { MovieListingScreen } from "@/components/movie-listing-screen";

export default async function ListingPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  return <MovieListingScreen type={type} />;
}
