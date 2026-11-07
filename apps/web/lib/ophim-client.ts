export interface Pagination {
  totalItems: number;
  totalItemsPerPage: number;
  currentPage: number;
  totalPages: number;
}

export interface ListMovie {
  _id: string;
  name: string;
  slug: string;
  origin_name: string;
  thumb_url: string;
  poster_url: string;
  year: number;
  quality?: string;
  lang?: string;
  episode_current?: string;
  time?: string;
  content?: string;
  view: number;
  rating?: number | string;
  isHot?: boolean;
  category?: Category[];
  country?: Country[];
  tmdb?: {
    id?: number | string;
    type?: "movie" | "tv" | string;
  };
}

export interface DetailMovie extends ListMovie {
  content: string;
  type: "series" | "single" | "hoathinh" | "tvshows";
  status: "completed" | "ongoing" | "trailer";
  is_copyright: boolean;
  sub_docquyen: boolean;
  chieurap: boolean;
  trailer_url: string;
  time: string;
  episode_current: string;
  episode_total: string;
  quality: string;
  lang: string;
  notify: string;
  showtimes: string;
  view: number;
  actor: string[];
  director: string[];
  category: Category[];
  country: Country[];
  tmdb?: {
    id?: number | string;
    type?: "movie" | "tv" | string;
    vote_average?: number | string;
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Country {
  id: string;
  name: string;
  slug: string;
}

export interface Episode {
  server_name: string;
  server_data: ServerData[];
}

export interface ServerData {
  name: string;
  slug: string;
  filename: string;
  link_embed: string;
  link_m3u8: string;
}

export interface LatestMoviesResponse {
  status: boolean;
  items: ListMovie[];
  pathImage: string;
  pagination: Pagination;
}

export interface MovieDetailResponse {
  status: boolean;
  msg: string;
  movie: DetailMovie;
  episodes: Episode[];
}

const PRIMARY_API_BASE = "https://phimapi.com";
const BACKUP_API_BASE = "https://ophim.cc";
const DEFAULT_CDN_IMAGE = "https://phimimg.com";

type ApiMovieItem = Partial<Omit<ListMovie, "year" | "view">> & {
  _id?: string;
  id?: string;
  name?: string;
  slug?: string;
  origin_name?: string;
  poster_url?: string;
  thumb_url?: string;
  year?: number | string;
  view?: number;
  quality?: string;
  lang?: string;
  episode_current?: string;
  time?: string;
  tmdb?: {
    id?: number | string;
    type?: "movie" | "tv" | string;
    vote_average?: number | string;
  };
  imdb?: {
    vote_average?: number | string;
  };
  category?: Category[];
  country?: Country[];
};

interface OPhimListApiResponse {
  status?: boolean | string;
  msg?: string;
  message?: string;
  items?: ApiMovieItem[];
  pathImage?: string;
  pagination?: Pagination;
}

interface V1ListApiResponse {
  status?: boolean | string;
  msg?: string;
  message?: string;
  data?: {
    APP_DOMAIN_CDN_IMAGE?: string;
    items?: ApiMovieItem[];
    params?: {
      cdnData?: string;
      pagination?: Pagination;
    };
  };
}

const emptyPagination = (): Pagination => ({
  totalItems: 0,
  totalItemsPerPage: 24,
  currentPage: 1,
  totalPages: 1,
});

const failedListResponse = (): LatestMoviesResponse => ({
  status: false,
  items: [],
  pathImage: DEFAULT_CDN_IMAGE,
  pagination: emptyPagination(),
});

export const formatImageUrl = (
  rawUrl?: string,
  cdnBase: string = DEFAULT_CDN_IMAGE,
): string => {
  if (!rawUrl || typeof rawUrl !== "string" || rawUrl.trim() === "") {
    return "https://placehold.co/300x450?text=No+Image";
  }

  const trimmed = rawUrl.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const base = (cdnBase || DEFAULT_CDN_IMAGE).replace(/\/+$/, "");
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
};

const normalizeSlug = (input: string): string => {
  const map: Record<string, string> = {
    "tình cảm": "tinh-cam",
    "hành động": "hanh-dong",
    "cổ trang": "co-trang",
    "hài hước": "hai-huoc",
    "kinh dị": "kinh-di",
    "tâm lý": "tam-ly",
    "hình sự": "hinh-su",
    "chiến tranh": "chien-tranh",
    "thể thao": "the-thao",
    "võ thuật": "vo-thuat",
    "viễn tưởng": "vien-tuong",
    "phiêu lưu": "phieu-luu",
    "khoa học": "khoa-hoc",
    "âm nhạc": "am-nhac",
    "thần thoại": "than-thoai",
    "tài liệu": "tai-lieu",
    "gia đình": "gia-dinh",
    "chính kịch": "chinh-kich",
    "bí ẩn": "bi-an",
    "học đường": "hoc-duong",
    "kinh điển": "kinh-dien",
    "hoạt hình": "hoat-hinh",
    "chiếu rạp": "chieu-rap",
  };

  const lower = input.toLowerCase().trim();
  return map[lower] || lower;
};

const cleanAndFilterMovies = (
  items: ApiMovieItem[],
  cdnBase: string = DEFAULT_CDN_IMAGE,
  isHomeFeed: boolean = false,
): ListMovie[] => {
  if (!Array.isArray(items)) return [];

  const seenId = new Set<string>();
  const cleanItems: ListMovie[] = [];

  for (const item of items) {
    const id = item._id || item.id || item.slug;
    const slug = item.slug;
    const name = item.name;

    if (!name || !slug || !id) continue;
    if (seenId.has(id) || seenId.has(slug)) continue;

    const itemYear =
      parseInt(`${item.year || ""}`, 10) || new Date().getFullYear();

    const rawPoster = item.poster_url || item.thumb_url || "";
    const rawThumb = item.thumb_url || item.poster_url || "";

    if (!rawPoster && !rawThumb) continue;

    seenId.add(id);
    seenId.add(slug);

    const verticalPoster = formatImageUrl(rawPoster, cdnBase);
    const horizontalBackdrop = formatImageUrl(rawThumb, cdnBase);

    const ratingVal =
      item.tmdb?.vote_average ||
      item.imdb?.vote_average ||
      (Math.random() * 1.5 + 8.0).toFixed(1);

    cleanItems.push({
      _id: id,
      name,
      slug,
      origin_name: item.origin_name || name,
      poster_url: verticalPoster,
      thumb_url: horizontalBackdrop,
      year: itemYear,
      view: item.view || Math.floor(Math.random() * 60000) + 15000,
      rating: ratingVal,
      quality: item.quality || "HD",
      lang: item.lang || "Vietsub",
      episode_current: item.episode_current || "Full",
      time: item.time,
      category: item.category,
      country: item.country,
      tmdb: item.tmdb?.id
        ? { id: item.tmdb.id, type: item.tmdb.type }
        : undefined,
      isHot: isHomeFeed || Boolean(item.tmdb || item.imdb),
    });
  }

  return cleanItems;
};

async function fetchWithFallback<T>(path: string): Promise<T | null> {
  const urls = [`${PRIMARY_API_BASE}${path}`, `${BACKUP_API_BASE}${path}`];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        next: { revalidate: 1800 },
        headers: {
          Accept: "application/json",
          "User-Agent": "PhimLau/1.0",
        },
      });

      if (res.ok) {
        return (await res.json()) as T;
      }
    } catch {
      // try backup
    }
  }

  return null;
}

export const getLatestMovies = async (
  page: number = 1,
): Promise<LatestMoviesResponse> => {
  try {
    const data = await fetchWithFallback<OPhimListApiResponse>(
      `/danh-sach/phim-moi-cap-nhat?page=${page}`,
    );

    if (!data) return failedListResponse();

    const items = data.items || [];
    const cdn = data.pathImage || DEFAULT_CDN_IMAGE;

    return {
      status: true,
      items: cleanAndFilterMovies(items, cdn, true),
      pathImage: cdn,
      pagination: data.pagination || emptyPagination(),
    };
  } catch (error) {
    console.error("Error fetching latest movies:", error);
    return failedListResponse();
  }
};

export const getMoviesByType = async (
  type: string,
  page: number = 1,
  isHome: boolean = false,
): Promise<LatestMoviesResponse> => {
  try {
    const normalizedType = normalizeSlug(type);
    const resolvedType =
      normalizedType === "chieu-rap" ? "phim-le" : normalizedType;

    const data = await fetchWithFallback<V1ListApiResponse>(
      `/v1/api/danh-sach/${resolvedType}?page=${page}`,
    );

    if (!data || !data.data) return failedListResponse();

    const items = data.data.items || [];
    const cdn =
      data.data.APP_DOMAIN_CDN_IMAGE ||
      data.data.params?.cdnData ||
      DEFAULT_CDN_IMAGE;

    return {
      status: true,
      items: cleanAndFilterMovies(items, cdn, isHome),
      pathImage: cdn,
      pagination: data.data.params?.pagination || emptyPagination(),
    };
  } catch (error) {
    console.error(`Error fetching type [${type}]:`, error);
    return failedListResponse();
  }
};

/** Lấy danh sách phim thuyết minh mới cập nhật từ bộ lọc ngôn ngữ PhimAPI. */
export const getMoviesByLanguage = async (
  language: "vietsub" | "thuyet-minh" | "long-tieng",
  page: number = 1,
): Promise<LatestMoviesResponse> => {
  try {
    const response = await fetch(
      `${PRIMARY_API_BASE}/v1/api/danh-sach?page=${page}&sort_field=modified.time&sort_type=desc&sort_lang=${language}`,
      {
        next: { revalidate: 1800 },
        headers: { Accept: "application/json", "User-Agent": "PhimLau/1.0" },
      },
    );
    if (!response.ok) return failedListResponse();

    const data = (await response.json()) as V1ListApiResponse;
    if (!data.data) return failedListResponse();

    const cdn =
      data.data.APP_DOMAIN_CDN_IMAGE ||
      data.data.params?.cdnData ||
      DEFAULT_CDN_IMAGE;

    return {
      status: true,
      items: cleanAndFilterMovies(data.data.items || [], cdn),
      pathImage: cdn,
      pagination: data.data.params?.pagination || emptyPagination(),
    };
  } catch (error) {
    console.error(`Error fetching movies by language [${language}]:`, error);
    return failedListResponse();
  }
};

const normalizeCountryIdentifier = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const belongsToCountry = (movie: ListMovie, requestedCountry: string): boolean => {
  if (!Array.isArray(movie.country) || movie.country.length === 0) return false;

  const expected = normalizeCountryIdentifier(requestedCountry);
  return movie.country.some((country) => {
    const slug = country.slug ? normalizeCountryIdentifier(country.slug) : "";
    const name = country.name ? normalizeCountryIdentifier(country.name) : "";
    return slug === expected || name === expected;
  });
};

const COUNTRY_ISO_CODES: Record<string, string> = {
  "han-quoc": "KR", "nhat-ban": "JP", "trung-quoc": "CN",
  "au-my": "US", "thai-lan": "TH", "hong-kong": "HK",
  "viet-nam": "VN", "dai-loan": "TW", "an-do": "IN",
  "anh": "GB", "phap": "FR", "canada": "CA", "duc": "DE",
  "tay-ban-nha": "ES", "tho-nhi-ky": "TR", "ha-lan": "NL",
  "indonesia": "ID", "nga": "RU", "mexico": "MX", "ba-lan": "PL",
  "uc": "AU", "thuy-dien": "SE", "malaysia": "MY", "brazil": "BR",
  "philippines": "PH", "bo-dao-nha": "PT", "y": "IT", "dan-mach": "DK",
  "uae": "AE", "na-uy": "NO", "thuy-si": "CH", "nam-phi": "ZA",
  "ukraine": "UA", "a-rap-xe-ut": "SA", "new-zealand": "NZ",
  "ireland": "IE", "singapore": "SG", "belgium": "BE",
  "argentina": "AR", "colombia": "CO", "chile": "CL",
  "israel": "IL", "iran": "IR", "pakistan": "PK",
};

type TmdbCountryDetails = {
  origin_country?: string[];
  production_countries?: Array<{ iso_3166_1?: string }>;
};

async function matchesTmdbCountry(
  movie: ListMovie,
  requestedCountry: string,
): Promise<boolean | null> {
  const tmdbId = String(movie.tmdb?.id ?? "").trim();
  const tmdbType = movie.tmdb?.type === "tv" ? "tv" : movie.tmdb?.type === "movie" ? "movie" : "";
  const expectedIso = COUNTRY_ISO_CODES[requestedCountry];

  if (!tmdbId || !/^\d+$/.test(tmdbId) || !tmdbType || !expectedIso) {
    return null;
  }

  const accessToken = process.env.TMDB_API_READ_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;
  if (!accessToken && !apiKey) return null;

  const url = new URL(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}`);
  url.searchParams.set("language", "en-US");
  if (!accessToken && apiKey) url.searchParams.set("api_key", apiKey);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      next: { revalidate: 86400 },
    });
    if (!response.ok) return null;

    const details = (await response.json()) as TmdbCountryDetails;
    const countryCodes = tmdbType === "tv"
      ? details.origin_country || []
      : (details.production_countries || [])
          .map((country) => country.iso_3166_1 || "")
          .filter(Boolean);

    return countryCodes.length > 0 ? countryCodes.includes(expectedIso) : null;
  } catch {
    return null;
  }
};

async function filterMoviesByVerifiedCountry(
  movies: ListMovie[],
  requestedCountry: string,
): Promise<ListMovie[]> {
  const expectedIso = COUNTRY_ISO_CODES[requestedCountry];
  if (!expectedIso) return movies.filter((movie) => belongsToCountry(movie, requestedCountry));

  // Verify TMDB-tagged entries in small batches to avoid flooding the API.
  const output: ListMovie[] = [];
  for (let index = 0; index < movies.length; index += 8) {
    const batch = movies.slice(index, index + 8);
    const verified = await Promise.all(
      batch.map(async (movie) => ({
        movie,
        tmdbMatch: await matchesTmdbCountry(movie, requestedCountry),
      })),
    );

    for (const entry of verified) {
      if (entry.tmdbMatch === false) continue;
      if (entry.tmdbMatch === true || belongsToCountry(entry.movie, requestedCountry)) {
        output.push(entry.movie);
      }
    }
  }
  return output;
}

export const getMoviesByCountry = async (
  country: string,
  page: number = 1,
  isHome: boolean = false,
): Promise<LatestMoviesResponse> => {
  try {
    const normCountry = normalizeSlug(country);
    const data = await fetchWithFallback<V1ListApiResponse>(
      `/v1/api/quoc-gia/${normCountry}?page=${page}`,
    );

    if (!data || !data.data) return failedListResponse();

    const items = data.data.items || [];
    const cdn =
      data.data.APP_DOMAIN_CDN_IMAGE ||
      data.data.params?.cdnData ||
      DEFAULT_CDN_IMAGE;

    return {
      status: true,
      items: await filterMoviesByVerifiedCountry(
        cleanAndFilterMovies(items, cdn, isHome),
        normCountry,
      ),
      pathImage: cdn,
      pagination: data.data.params?.pagination || emptyPagination(),
    };
  } catch (error) {
    console.error(`Error fetching country [${country}]:`, error);
    return failedListResponse();
  }
};

export const getMoviesByCategory = async (
  category: string,
  page: number = 1,
  isHome: boolean = false,
): Promise<LatestMoviesResponse> => {
  try {
    const normCat = normalizeSlug(category);

    if (normCat === "chieu-rap") {
      return getMoviesByType("phim-le", page, isHome);
    }

    const data = await fetchWithFallback<V1ListApiResponse>(
      `/v1/api/the-loai/${normCat}?page=${page}`,
    );

    if (!data || !data.data) return failedListResponse();

    const items = data.data.items || [];
    const cdn =
      data.data.APP_DOMAIN_CDN_IMAGE ||
      data.data.params?.cdnData ||
      DEFAULT_CDN_IMAGE;

    return {
      status: true,
      items: cleanAndFilterMovies(items, cdn, isHome),
      pathImage: cdn,
      pagination: data.data.params?.pagination || emptyPagination(),
    };
  } catch (error) {
    console.error(`Error fetching category [${category}]:`, error);
    return failedListResponse();
  }
};

export const searchMovies = async (
  keyword: string,
  page: number = 1,
  limit: number = 24,
  isHome: boolean = false,
): Promise<LatestMoviesResponse> => {
  try {
    const cleanKeyword = keyword?.trim();
    if (!cleanKeyword) return failedListResponse();

    const data = await fetchWithFallback<V1ListApiResponse>(
      `/v1/api/tim-kiem?keyword=${encodeURIComponent(cleanKeyword)}&page=${page}&limit=${limit}`,
    );

    if (!data || !data.data) return failedListResponse();

    const items = data.data.items || [];
    const cdn =
      data.data.APP_DOMAIN_CDN_IMAGE ||
      data.data.params?.cdnData ||
      DEFAULT_CDN_IMAGE;

    return {
      status: true,
      items: cleanAndFilterMovies(items, cdn, isHome),
      pathImage: cdn,
      pagination: data.data.params?.pagination || emptyPagination(),
    };
  } catch (error) {
    console.error("Error searching movies:", error);
    return failedListResponse();
  }
};


/** Chuẩn hóa tên phim để đối chiếu kết quả tìm kiếm giữa các nguồn. */
function normalizeNguonCTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Tìm phim trên NguonC bằng tên/tên gốc và năm, không phụ thuộc slug của PhimAPI. */
async function findNguonCMovieSlug(movie: Pick<DetailMovie, "name" | "origin_name" | "year">): Promise<string | null> {
  const titles = Array.from(new Set(
    [movie.name, movie.origin_name]
      .map((title) => String(title || "").trim())
      .filter((title) => title.length >= 2),
  ));
  if (!titles.length) return null;

  type NguonCSearchItem = {
    name?: string;
    origin_name?: string;
    original_name?: string;
    slug?: string;
    year?: number | string;
  };
  type NguonCSearchResponse = {
    status?: string;
    items?: NguonCSearchItem[];
    data?: { items?: NguonCSearchItem[] };
  };

  const results = await Promise.all(titles.map(async (title) => {
    try {
      const url = `https://phim.nguonc.com/api/films/search?keyword=${encodeURIComponent(title)}&page=1`;
      const response = await fetch(url, {
        next: { revalidate: 1800 },
        headers: { Accept: "application/json", "User-Agent": "PhimLau/1.0" },
      });
      if (!response.ok) return [];
      const payload = await response.json() as NguonCSearchResponse;
      return payload.items || payload.data?.items || [];
    } catch {
      return [];
    }
  }));

  const expectedTitles = new Set(titles.map(normalizeNguonCTitle));
  const expectedYear = Number(movie.year) || 0;
  const candidates = new Map<string, { item: NguonCSearchItem; score: number }>();

  for (const item of results.flat()) {
    if (!item.slug) continue;
    // NguonC dùng original_name; một số phiên bản/nguồn có thể trả origin_name.
    const candidateTitles = [item.name, item.original_name, item.origin_name]
      .filter((value): value is string => Boolean(value))
      .map(normalizeNguonCTitle);
    if (!candidateTitles.some((title) => expectedTitles.has(title))) continue;

    const candidateYear = Number(item.year) || 0;
    if (expectedYear && candidateYear && candidateYear !== expectedYear) continue;

    const titleMatch = candidateTitles.some((title) => expectedTitles.has(title));
    const score = (titleMatch ? 10 : 0) + (
      expectedYear && candidateYear === expectedYear ? 5 : candidateYear === 0 ? 1 : 0
    );
    const previous = candidates.get(item.slug);
    if (!previous || score > previous.score) candidates.set(item.slug, { item, score });
  }

  return Array.from(candidates.entries())
    .sort((a, b) => b[1].score - a[1].score)[0]?.[0] || null;
}

/** Lấy các tập từ NguonC và gom thành một server dự phòng riêng. */
async function getNguonCEpisodes(movie: Pick<DetailMovie, "name" | "origin_name" | "year">): Promise<Episode[]> {
  try {
    const slug = await findNguonCMovieSlug(movie);
    if (!slug) return [];

    const response = await fetch(
      `https://phim.nguonc.com/api/film/${encodeURIComponent(slug)}`,
      {
        next: { revalidate: 1800 },
        headers: { Accept: "application/json", "User-Agent": "PhimLau/1.0" },
      },
    );
    if (!response.ok) return [];

    const payload = (await response.json()) as {
      status?: string;
      movie?: {
        category?: Array<{
          list?: Array<{ name?: string; slug?: string }>;
        }>;
        episodes?: Array<{
          items?: Array<{
            name?: string;
            slug?: string;
            embed?: string;
          }>;
        }>;
      };
    };
    if (payload.status !== "success" || !Array.isArray(payload.movie?.episodes)) {
      return [];
    }

    const isAdultCategory = (payload.movie.category || []).some((group) =>
      (group.list || []).some((category) =>
        /18\\s*\\+|phim\\s*18|người\\s*lớn|adult/i.test(
          `${category.name || ""} ${category.slug || ""}`,
        ),
      ),
    );
    if (isAdultCategory) return [];

    const serverData = payload.movie.episodes.flatMap((server) =>
      (server.items || [])
        .filter((episode) => Boolean(episode.embed))
        .map((episode) => ({
          name: episode.name || episode.slug || "Tập",
          slug: episode.slug || `tap-${episode.name || "unknown"}`,
          filename: episode.name || "",
          link_embed: episode.embed || "",
          link_m3u8: "",
        })),
    );

    const uniqueEpisodes = Array.from(
      new Map(serverData.map((episode) => [episode.slug, episode])).values(),
    );
    return uniqueEpisodes.length
      ? [{ server_name: "Dự phòng", server_data: uniqueEpisodes }]
      : [];
  } catch (error) {
    console.warn("Không tải được server dự phòng NguonC:", error);
    return [];
  }
}

/** Lấy thêm luồng Thuyết minh từ OPhim v1 nếu API có cung cấp cho phim này. */
async function getOPhimNarrationEpisodes(slug: string): Promise<Episode[]> {
  try {
    const response = await fetch(
      `https://ophim1.com/v1/api/phim/${encodeURIComponent(slug)}`,
      {
        next: { revalidate: 1800 },
        headers: { Accept: "application/json", "User-Agent": "PhimLau/1.0" },
      },
    );
    if (!response.ok) return [];

    const payload = (await response.json()) as {
      movie?: { lang?: string };
      episodes?: Array<{ server_name?: string; server_data?: Partial<ServerData>[] }>;
      data?: {
        item?: {
          lang?: string;
          episodes?: Array<{ server_name?: string; server_data?: Partial<ServerData>[] }>;
        };
        episodes?: Array<{ server_name?: string; server_data?: Partial<ServerData>[] }>;
      };
    };

    const item = payload.data?.item;
    const movieLang = String(item?.lang || payload.movie?.lang || "").toLowerCase();
    const rawEpisodes = item?.episodes || payload.data?.episodes || payload.episodes || [];
    const narrationServers = rawEpisodes.filter((server) => {
      const serverName = String(server.server_name || "").toLowerCase();
      return /thuyết\s*minh|thuyet\s*minh|lồng\s*tiếng|long\s*tieng/.test(serverName) ||
        /thuyết\s*minh|thuyet\s*minh/.test(movieLang);
    });

    return narrationServers
      .map((server, index) => {
        const serverData = (server.server_data || [])
          .filter((episode) => episode.link_embed || episode.link_m3u8)
          .map((episode) => ({
            name: episode.name || "",
            slug: episode.slug || `tap-${episode.name || ""}`,
            filename: episode.filename || episode.name || "",
            link_embed: episode.link_embed || "",
            link_m3u8: episode.link_m3u8 || "",
          }));
        if (!serverData.length) return null;
        const sourceName = String(server.server_name || "").trim();
        return {
          server_name: sourceName
            ? `Thuyết minh · OPhim ${sourceName}`
            : `Thuyết minh · OPhim #${index + 1}`,
          server_data: serverData,
        } satisfies Episode;
      })
      .filter((server): server is Episode => server !== null);
  } catch (error) {
    console.warn("Không tải được server Thuyết minh OPhim:", error);
    return [];
  }
}

export const getMovieDetail = async (
  slug: string,
): Promise<MovieDetailResponse | null> => {
  try {
    if (!slug) return null;

    const data = await fetchWithFallback<{
      status: boolean | string;
      msg?: string;
      message?: string;
      movie: DetailMovie;
      episodes: Episode[];
    }>(`/phim/${encodeURIComponent(slug)}`);

    if (!data || !data.movie) return null;

    const movie = data.movie;
    movie.poster_url = formatImageUrl(movie.poster_url);
    movie.thumb_url = formatImageUrl(movie.thumb_url || movie.poster_url);

    const baseEpisodes = data.episodes || [];
    const [narrationEpisodes, nguoncEpisodes] = await Promise.all([
      getOPhimNarrationEpisodes(slug),
      getNguonCEpisodes(movie),
    ]);
    const existingEpisodeUrls = new Set(
      baseEpisodes.flatMap((server) =>
        (server.server_data || []).map((episode) => episode.link_m3u8 || episode.link_embed).filter(Boolean),
      ),
    );
    const uniqueNarrationEpisodes = narrationEpisodes
      .map((server) => ({
        ...server,
        server_data: server.server_data.filter(
          (episode) => !existingEpisodeUrls.has(episode.link_m3u8 || episode.link_embed),
        ),
      }))
      .filter((server) => server.server_data.length > 0);

    return {
      status: true,
      msg: data.msg || data.message || "done",
      movie,
      episodes: [...baseEpisodes, ...uniqueNarrationEpisodes, ...nguoncEpisodes],
    };
  } catch (error) {
    console.error(`Error fetching movie detail [${slug}]:`, error);
    return null;
  }
};

export const getMoviesFromKKPhim = async (
  type: "phim-le" | "phim-bo" | "hoat-hinh" | "tv-shows",
  page: number = 1,
  isHome: boolean = false,
): Promise<LatestMoviesResponse> => {
  return getMoviesByType(type, page, isHome);
};

export const getMoviesFromNguonC = async (
  type: "phim-le" | "phim-bo" | "hoat-hinh" | "tv-shows",
  page: number = 1,
  isHome: boolean = false,
): Promise<LatestMoviesResponse> => {
  return getMoviesByType(type, page, isHome);
};

export const getImageUrl = (pathImage: string, fileName: string): string => {
  return formatImageUrl(fileName, pathImage);
};