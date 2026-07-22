const LATIN_TO_ACCENT_CLASS: Record<string, string> = {
  a: "aàáảãạăằắẳẵặâầấẩẫậ",
  e: "eèéẻẽẹêềếểễệ",
  i: "iìíỉĩị",
  o: "oòóỏõọôồốổỗộơờớởỡợ",
  u: "uùúủũụưừứửữự",
  y: "yỳýỷỹỵ",
  d: "dđ",
};

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeVietnamese = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

const tokenizeSearchQuery = (keyword: string): string[] =>
  Array.from(
    new Set(
      keyword
        .trim()
        .split(/\s+/)
        .map((token) => normalizeVietnamese(token))
        .filter(Boolean),
    ),
  );

const charToAccentClass = (char: string): string => {
  const lower = char.toLowerCase();
  const variants = LATIN_TO_ACCENT_CLASS[lower];

  if (variants) {
    const upper = variants
      .split("")
      .map((variant) => variant.toUpperCase())
      .join("");
    return `[${variants}${upper}]`;
  }

  if (/[a-z0-9]/i.test(char)) {
    return `[${lower}${char.toUpperCase()}]`;
  }

  return escapeRegex(char);
};

const buildAccentInsensitivePattern = (token: string): string =>
  token
    .split("")
    .map((char) => charToAccentClass(char))
    .join("");

export const buildMangaSearchFilter = (
  keyword: string,
): Record<string, unknown> => {
  const tokens = tokenizeSearchQuery(keyword);
  if (!tokens.length) {
    return {};
  }

  const tokenFilters = tokens.map((token) => {
    const slugPattern = escapeRegex(token);
    const textPattern = buildAccentInsensitivePattern(token);

    return {
      $or: [
        { slug: { $regex: slugPattern, $options: "i" } },
        { name: { $regex: textPattern, $options: "i" } },
        { originNames: { $regex: textPattern, $options: "i" } },
      ],
    };
  });

  return tokenFilters.length === 1 ? tokenFilters[0] : { $and: tokenFilters };
};
