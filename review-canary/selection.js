/*
 * Return the first entry for which accepts(entry) is true.
 * Return undefined when no entry is accepted.
 */
function firstAccepted(entries, accepts) {
  for (var index = 0; index < entries.length; index += 1) {
    if (!accepts(entries[index])) {
      return entries[index];
    }
  }

  return undefined;
}
