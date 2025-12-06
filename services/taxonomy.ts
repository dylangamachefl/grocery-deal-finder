// The taxonomy definition as per Agent 2 instructions

export interface SubCategory {
  name: string;
  parent: string;
  embeddingText: string;
}

export const PARENT_CATEGORIES = [
  "Produce",
  "Meat & Seafood",
  "Deli & Bakery",
  "Dairy & Eggs",
  "Pantry & Dry Goods",
  "Snacks & Sweets",
  "Beverages",
  "Frozen Foods",
  "Household & Cleaning",
  "Personal Care & Health"
] as const;

// Map of subcategory name to its descriptive examples for better embedding
const SUB_CATEGORY_EXAMPLES: Record<string, string> = {
  // Produce
  "Fresh Fruit": "Apples, Bananas, Berries, Grapes, Oranges, Melons",
  "Fresh Vegetables": "Lettuce, Onions, Potatoes, Carrots, Broccoli, Tomatoes, Peppers",
  "Herbs & Aromatics": "Garlic, Fresh Basil, Ginger, Parsley, Cilantro, Mint",

  // Meat & Seafood
  "Poultry": "Chicken breast, Whole turkey, Chicken thighs, Ground turkey",
  "Beef & Pork": "Ground beef, Steaks, Bacon, Chops, Roast, Ham, Sausage",
  "Seafood": "Salmon, Shrimp, Fresh fish, Tuna, Crab, Lobster",
  "Plant-Based Meat": "Impossible Burger, Tofu, Beyond Meat, Tempeh",

  // Deli & Bakery
  "Deli Meat & Cheese": "Sliced Turkey, Provolone, Ham, Roast Beef, Salami",
  "Fresh Bakery": "Bagels, Muffins, store-baked Cookies, Bread, Rolls, Cakes, Donuts",
  "Prepared Meals": "Rotisserie Chicken, Sushi, Potato Salad, Coleslaw, Ready to eat meals",

  // Dairy & Eggs
  "Milk & Cream": "Whole milk, Almond milk, Coffee creamer, Soy milk, Oat milk, Half and half",
  "Cheese": "Blocks, Shredded, String cheese, Cheddar, Mozzarella, Parmesan",
  "Eggs & Butter": "Eggs, Butter, Margarine, Egg whites",
  "Yogurt": "Greek Yogurt, Yogurt Tubes, Yogurt Cups, Skyr, Kefir",

  // Pantry & Dry Goods
  "Pasta, Rice & Grains": "Spaghetti, Quinoa, Mac & Cheese boxes, Rice, Noodles, Oats",
  "Canned & Jarred": "Beans, Soup, Pasta Sauce, Pickles, Canned Vegetables, Canned Fruit",
  "Baking & Spices": "Flour, Sugar, Salt, Olive Oil, Vegetable Oil, Spices, Cake mix",
  "Breakfast & Cereal": "Cheerios, Oatmeal, Pancake mix, Granola, Cereal bars",
  "Condiments": "Ketchup, Mayo, Salad Dressing, Mustard, BBQ Sauce, Soy Sauce",

  // Snacks & Sweets
  "Salty Snacks": "Chips, Pretzels, Popcorn, Crackers, Tortilla Chips",
  "Sweet Snacks": "Cookies, Candy bars, Fruit snacks, Chocolate, Gummies",
  "Nuts & Dried Fruit": "Almonds, Raisins, Peanuts, Cashews, Dried Mango",

  // Beverages
  "Water & Seltzer": "Bottled water, LaCroix, Sparkling water, Mineral water",
  "Soda & Soft Drinks": "Coke, Pepsi, Energy drinks, Sprite, Dr Pepper, Gatorade",
  "Coffee & Tea": "Ground coffee, K-Cups, Tea bags, Iced Coffee, Loose leaf tea",
  "Alcohol": "Beer, Wine, Spirits, Hard Seltzer",

  // Frozen Foods
  "Frozen Meals & Pizza": "Frozen Pizza, Digiorno, Lean Cuisine, Frozen Dinners, Burritos",
  "Frozen Veggies & Fruit": "Frozen Peas, Frozen Corn, Smoothie mixes, Frozen Berries",
  "Ice Cream & Desserts": "Ice Cream Pints, Popsicles, Gelato, Sorbet, Frozen Yogurt",

  // Household & Cleaning
  "Paper Products": "Toilet paper, Paper towels, Napkins, Tissues, Paper plates",
  "Cleaning Supplies": "Dish soap, Laundry detergent, Sponges, Bleach, All purpose cleaner",
  "Pet Care": "Dog food, Cat litter, Cat food, Dog treats",

  // Personal Care & Health
  "Toiletries": "Shampoo, Toothpaste, Deodorant, Body wash, Soap, Razor",
  "Pharmacy": "Vitamins, Pain relief, First aid, Cough syrup, Supplements",
  "Baby": "Diapers, Wipes, Formula, Baby food"
};

export const TAXONOMY_TREE: Record<string, string[]> = {
  "Produce": [
    "Fresh Fruit",
    "Fresh Vegetables",
    "Herbs & Aromatics"
  ],
  "Meat & Seafood": [
    "Poultry",
    "Beef & Pork",
    "Seafood",
    "Plant-Based Meat"
  ],
  "Deli & Bakery": [
    "Deli Meat & Cheese",
    "Fresh Bakery",
    "Prepared Meals"
  ],
  "Dairy & Eggs": [
    "Milk & Cream",
    "Cheese",
    "Eggs & Butter",
    "Yogurt"
  ],
  "Pantry & Dry Goods": [
    "Pasta, Rice & Grains",
    "Canned & Jarred",
    "Baking & Spices",
    "Breakfast & Cereal",
    "Condiments"
  ],
  "Snacks & Sweets": [
    "Salty Snacks",
    "Sweet Snacks",
    "Nuts & Dried Fruit"
  ],
  "Beverages": [
    "Water & Seltzer",
    "Soda & Soft Drinks",
    "Coffee & Tea",
    "Alcohol"
  ],
  "Frozen Foods": [
    "Frozen Meals & Pizza",
    "Frozen Veggies & Fruit",
    "Ice Cream & Desserts"
  ],
  "Household & Cleaning": [
    "Paper Products",
    "Cleaning Supplies",
    "Pet Care"
  ],
  "Personal Care & Health": [
    "Toiletries",
    "Pharmacy",
    "Baby"
  ]
};

// Flat list of subcategories for embedding
export const SUB_CATEGORIES: SubCategory[] = [];
Object.entries(TAXONOMY_TREE).forEach(([parent, subs]) => {
  subs.forEach(sub => {
    // Construct embedding text: "Name: Example, Example"
    const examples = SUB_CATEGORY_EXAMPLES[sub] || "";
    const embeddingText = examples ? `${sub}: ${examples}` : sub;

    SUB_CATEGORIES.push({
      name: sub,
      parent,
      embeddingText
    });
  });
});
