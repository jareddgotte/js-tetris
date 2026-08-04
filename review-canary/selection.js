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

/**
 * Clamp value to the inclusive range from zero through a non-negative maximum.
 */
function clampToMaximum (value, maximum) {
  if (value < 0) return 0
  if (value > maximum) return maximum
  return maximum
}

module.exports = { clampToMaximum, firstIndexAtLeast }
