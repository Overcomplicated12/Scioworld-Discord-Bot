export const omMessages = [
  '💧 Drip. The Frog of Wisdom has scheduled one tiny imaginary water drop and will now return to its paperwork.',
  '💧 A single ceremonial drip has arrived. It contains no water, only excellent comedic timing.',
  'The Frog of Wisdom has hidden one of your socks and refuses to reveal which one.',
  'A tiny committee of frogs has scheduled a meeting about your snack choices.',
  'Om has been challenged to explain a joke using only science facts.',
  'The ScioVirtual mailbox contains one extremely polite reminder to drink water.',
  'A mysterious sticker has appeared. Its back says: “You are doing adequately.”',
  'The Frog of Wisdom requests a three-second dramatic pause before your next decision.',
  'Om has been assigned the honorary title “Assistant to the Assistant of Adventure.”',
  'A small imaginary goose has reviewed your plans and requests more snacks.',
  'The universe would like you to know that someone, somewhere, is proud of your weird idea.',
  'The ScioVirtual archives report that this message was delivered by a very determined turtle.',
];

export const waterDropMessages = [
  '💧 Drip. The Frog of Wisdom has scheduled one tiny imaginary water drop and will now return to its paperwork.',
  '💧 A single ceremonial drip has arrived. It contains no water, only excellent comedic timing.',
  '💧 The next drop has been delayed by a very small frog crossing. Thank you for your patience.',
];
export const omModes = [
  { id: 'water-drop', label: 'Water-drop gag' },
  { id: 'frog-riddles', label: 'Frog riddles' },
  { id: 'science', label: 'Tiny science questions' },
  { id: 'philosophy', label: 'Philosophical nonsense' },
];

export function randomOmMessage() { return omMessages[Math.floor(Math.random() * omMessages.length)]; }
export function randomWaterDropMessage() { return waterDropMessages[Math.floor(Math.random() * waterDropMessages.length)]; }
export function randomOmMessageForMode(mode) {
  if (mode === 'water-drop') return randomWaterDropMessage();
  if (mode === 'frog-riddles') return '🐸 Frog riddle: What has a long tongue, excellent timing, and absolutely no idea where it left its map?';
  if (mode === 'science') return '🔬 Tiny science question: What scientific discovery would make your day 5% easier?';
  if (mode === 'philosophy') return '🧠 The Frog asks: If a snack is shared with no one, was it ever truly a snack?';
  return randomOmMessage();
}
