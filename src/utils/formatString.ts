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
