export const dailyFacts = [
  'A group of flamingos is called a flamboyance. Science occasionally has excellent branding.',
  'Bananas are berries, but strawberries are not botanical berries. The fruit aisle is full of plot twists.',
  'Octopuses have three hearts. Two stop beating when the animal swims, which is a dramatic commitment to efficiency.',
  'Honey can remain edible for an extremely long time when sealed properly. Bees are tiny food-preservation engineers.',
  'A day on Venus is longer than a Venusian year. The planet is not in a hurry to do anything.',
  'Lightning can heat the air around it to temperatures hotter than the surface of the Sun, briefly and with excellent theatrics.',
  'Sharks are older than trees in Earth’s fossil record. They arrived early and have been judging the forest ever since.',
  'Your bones are living tissue that constantly remodels itself. You are carrying a very patient construction project.',
  'Some tardigrades can survive extreme conditions that would be fatal to most life. They are microscopic specialists in refusing to leave.',
  'The smell after rain has a name: petrichor. Even weather gets to have a signature scent.',
  'A teaspoon of neutron-star material would weigh billions of tons on Earth. Please do not put it in your tea.',
  'Sound travels faster through water than air because the particles are packed more closely together. Fish get the premium audio plan.',
];

export function dailyFact(dateText) {
  const numericDate = Date.parse(`${dateText}T00:00:00Z`);
  const day = Number.isFinite(numericDate) ? Math.floor(numericDate / 86_400_000) : 0;
  return dailyFacts[((day % dailyFacts.length) + dailyFacts.length) % dailyFacts.length];
}
