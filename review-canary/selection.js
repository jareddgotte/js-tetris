'use strict'

/**
 * Return the index of the first value greater than or equal to minimum.
 * Return -1 when no value reaches the minimum.
 */
function firstIndexAtLeast (values, minimum) {
  for (let index = 0; index < values.length; index++) {
    if (values[index] >= minimum) return index
  }
  return -1
}

module.exports = { firstIndexAtLeast }
