'use strict';

const crypto = require('crypto');

/**
 * Sattolo-Shuffle: erzeugt eine zufällige Permutation, die garantiert
 * EINEN einzigen Zyklus bildet und keinen Fixpunkt hat
 * (niemand zieht sich also selbst).
 */
function sattolo(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i); // 0..i-1 (bewusst i, nicht i+1)
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Lost Teilnehmer aus. Gibt Paare { giverId, receiverId } zurück,
 * wobei giverId !== receiverId für alle gilt.
 * @param {string[]} ids
 */
function drawAssignments(ids) {
  if (ids.length < 3) {
    throw new Error('Mindestens 3 Teilnehmer:innen nötig.');
  }
  const indices = ids.map((_, i) => i);
  const shuffled = sattolo(indices);
  // shuffled[i] ist der Index des Beschenkten für Geber i; nie gleich i.
  return ids.map((giverId, i) => ({
    giverId,
    receiverId: ids[shuffled[i]],
  }));
}

module.exports = { drawAssignments, sattolo };
