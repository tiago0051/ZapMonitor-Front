export function formatShortId(id: string) {
  return id.split("-")[0];
}

export function formatAcronym(name: string) {
  const nameSplited = name.split(" ");

  if (nameSplited.length > 1) {
    const lastName = nameSplited[nameSplited.length - 1];
    if (lastName) return `${nameSplited[0][0]}${lastName[0]}`;
  }

  return `${nameSplited[0][0]}`;
}

export function formatShortName(name: string) {
  const nameSplited = name.split(" ");
  if (nameSplited.length > 1) {
    const lastName = nameSplited[nameSplited.length - 1];
    if (lastName) return `${nameSplited[0]} ${lastName}`;
  }

  return name;
}

export const formatBoldText = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
};
