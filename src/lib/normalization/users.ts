const normalizeName = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

export const resolveUserName = (name: string, aliases: string[]): string => {
  const normalizedName = normalizeName(name);
  const aliasMatch = aliases.find((alias) => normalizeName(alias) === normalizedName);
  return aliasMatch ?? name.trim();
};

export { normalizeName };
