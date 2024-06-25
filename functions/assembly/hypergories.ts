/* Helper functions for Scattergories game
 */
export function getRandomLetter(): string {
  /* following string created by openai asking
    create a string containing all letters of the alphabet at least once and  in which each letter appears with the probability of a letter being the first letter of an English word.
    */

  const alpha =
    "TTTTTTTTTTTTTTTTAAAAAAAABBBBBCCCCDDDEFFFGGHHHHHHHIIIIIIJKLMNNNOOPPPPQRSSSSSSSUUVWXYZ";
  const index = <i32>Math.floor(Math.random() * alpha.length);

  return alpha.at(index);
}

export function getRandomCategories(): string[] {
  const categories = [
    "A thing to do in summer",
    "Flower",
    "Fruit",
    "Vegetable",
    "Occupation",
    "Sports",
    "Found in a kitchen",
    "Animal",
    "Drink",
    "Mode of transportation",
    "Clothing",
    "Found in a classroom",
    "Furniture",
    "Hobby",
    "A dessert",
    "A types of dance",
    "Bird",
    "Found in an office",
    "Found in bathroom",
    "Insect",
    "Types of fish",
    "A thing in the living room",
    "Found in a garage",
    "Cake",
    "A thing you wear",
    "Found at the beach",
    "In the sky",
    "Tree",
    "In a garden",
    "Found in a hospital",
    "Jewelry",
    "Found in a park",
    "Mammal",
    "Seen in a zoo",
    "A type of berry",
  ];
  const list: string[] = [];
  for (let i = 0; i < 5; i++) {
    const index = <i32>Math.floor(Math.random() * categories.length);
    list.push(categories[index]);
    categories.splice(index, 1);
  }
  return list;
}
