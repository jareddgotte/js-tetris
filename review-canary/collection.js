/*
 * Remove every entry for which shouldDrop(entry) is true.
 * Mutates entries in place and returns the number of entries removed.
 */
function dropMatching(entries, shouldDrop) {
  var removed = 0;

  for (var index = 0; index < entries.length; index += 1) {
    if (shouldDrop(entries[index])) {
      entries.splice(index, 1);
      removed += 1;
    }
  }

  return removed;
}
