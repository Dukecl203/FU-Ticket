import { badWords } from "./badWords";

export function normalizeVietnamese(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function containsBadWords(text) {
  const norm = normalizeVietnamese(text);

  return badWords.some((word) => {
    const normWord = normalizeVietnamese(word);
    const regex = new RegExp(`\\b${normWord.replace(/\s+/g, "\\s*")}\\b`, "i");
    return regex.test(norm);
  });
}
