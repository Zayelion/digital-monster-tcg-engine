/**
 * Shuffles an array in place, once.
 */
export function shuffle(array: any[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)),
      temp = array[i];

    array[i] = array[j];
    array[j] = temp;
  }
}

/**
 * Shuffles an array in place, multiple times.
 */
export function deepShuffle(array: any[]): void {
  for (var i = 0; i < array.length; i++) {
    shuffle(array);
  }
}

