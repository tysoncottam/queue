// YouTube video category ID → human name.
// Deprecated IDs omitted. Source: YouTube Data API v3 videoCategories.list.
export const CATEGORY_NAMES: Record<string, string> = {
  "1": "Film & Animation",
  "2": "Autos & Vehicles",
  "10": "Music",
  "15": "Pets & Animals",
  "17": "Sports",
  "19": "Travel & Events",
  "20": "Gaming",
  "22": "People & Blogs",
  "23": "Comedy",
  "24": "Entertainment",
  "25": "News & Politics",
  "26": "How-to & Style",
  "27": "Education",
  "28": "Science & Technology",
  "29": "Nonprofits & Activism",
};

export function categoryName(id: string | null | undefined): string {
  if (!id) return "Uncategorized";
  return CATEGORY_NAMES[id] ?? `Category ${id}`;
}
