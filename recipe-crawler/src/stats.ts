import { mfetch } from './auth.js';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { addDays } from 'date-fns';

type NutritionRaw = {
  calories: string,
  fatContent: string,
  proteinContent: string,
  carbohydrateContent: string,
  fiberContent: string,
  sodiumContent: string,
  sugarContent: string
};

type Nutrition = {
  calories: number,
  fatContent: number,
  proteinContent: number,
  carbohydrateContent: number,
  fiberContent: number,
  sodiumContent: number,
  sugarContent: number
};

function toNutrition(n: NutritionRaw): Nutrition {
  return {
    calories: parseInt(n.calories) ?? -1,
    carbohydrateContent: parseInt(n.carbohydrateContent) ?? -1,
    fatContent: parseInt(n.fatContent) ?? -1,
    fiberContent: parseInt(n.fiberContent) ?? -1,
    proteinContent: parseInt(n.proteinContent) ?? -1,
    sodiumContent: parseInt(n.sodiumContent) ?? -1,
    sugarContent: parseInt(n.sugarContent) ?? -1,
  }
}

function create(): Nutrition {
  return {
    calories: 0,
    carbohydrateContent: 0,
    fatContent: 0,
    fiberContent: 0,
    proteinContent: 0,
    sodiumContent: 0,
    sugarContent: 0,
  };
}

type RecipeRaw = { nutrition: NutritionRaw };

const FILE_PATH = './recipes.json';
let all_recipes: any[] = [];
if (existsSync(FILE_PATH)) {
  all_recipes = JSON.parse(readFileSync(FILE_PATH).toString()) as Nutrition[];
} else {
  // 1. grab recipes
  const all_recipes_response = await mfetch('/recipes', { method: 'GET' });
  const { items: all_recipe_slugs } = await all_recipes_response.json() as { items: { slug: string }[] };
  
  // 2. if those recipes don't have nutrition information, grab that as well
  for (const { slug } of all_recipe_slugs) {
    const recipe_response = await mfetch(`/recipes/${slug}`, { method: 'GET' });
    const recipe = await recipe_response.json() as RecipeRaw; 
    all_recipes.push(recipe);
  }

  writeFileSync(FILE_PATH, JSON.stringify(all_recipes, null, 4));
}

// spec:
/**
 * - 1 week wide meal plan
 * - 2 cooked meals a day. breakfast will be overnight oats & eggs.
 * - schedule: when to cook
 * - grocery list: what to buy
 */

const mealplan = [];
for (let i = 0; i < 7; i++) {
  const date = addDays(new Date(), i);
  const dt = date.toISOString().slice(0, 10);
  const today = [];
  
  let ri = Math.floor(Math.random() * all_recipes.length);
  let recipe = all_recipes[ri];
  today.push(recipe);
  let result = await mfetch('/groups/mealplans', {
    method: 'POST',
    body: JSON.stringify({
      date: dt,
      entryType: 'lunch',
      title: 'Lunch',
      text: 'gotta eat lunch',
      recipeId: recipe.id,
    })
  });
  if (result.status > 299) {
    console.error('problem creating lunch');
    console.error(result.statusText);
    console.error(await result.json());
  }
  
  ri = Math.floor(Math.random() * all_recipes.length);
  recipe = all_recipes[ri];
  today.push(recipe);
  result = await mfetch('/groups/mealplans', {
    method: 'POST',
    body: JSON.stringify({
      date: dt,
      entryType: 'dinner',
      title: 'Dinner',
      text: 'and then to the gym!',
      recipeId: recipe.id,
    })
  });
  if (result.status > 299) {
    console.error('problem creating lunch');
    console.error(result.statusText);
    console.error(await result.json());
  }
}



// These are going to be long term goals.
let protein_goal = 229;
let carb_goal = 303;
let fat_goal = 68;
let cal_goal = 2677;
let sugar_limit = 71;


/*

  Protein
    229 grams/day
  Range: 81 - 229
  Carbs
  Includes Sugar
    303 grams/day
  Range: 286 - 483
  Fat
  Includes Saturated Fat
    68 grams/day
  Range: 61 - 106
  Sugar
    <71 grams/day
  Saturated Fat
    <30 grams/day
  Food Energy
    2,677 Calories/day
  or 11,208 kJ/day

*/

function printNutritionalContent() {
  // 3. grab a library that will compute/display various statistics, or write that code yourself.
  const averages: Nutrition = create();
  for (const { nutrition: nut } of all_recipes) {
    averages.calories += nut.calories;
    averages.carbohydrateContent += nut.carbohydrateContent;
    averages.fatContent += nut.fatContent;
    averages.fiberContent += nut.fiberContent;
    averages.proteinContent += nut.proteinContent;
    averages.sodiumContent += nut.sodiumContent;
    averages.sugarContent += nut.sugarContent;
  }

  averages.calories /= all_recipes.length;
  averages.carbohydrateContent /= all_recipes.length;
  averages.fatContent /= all_recipes.length;
  averages.fiberContent /= all_recipes.length;
  averages.proteinContent /= all_recipes.length;
  averages.sodiumContent /= all_recipes.length;
  averages.sugarContent /= all_recipes.length;

  console.log('average meal density', averages);
  const three_sq = create();
  three_sq.calories = 3 * averages.calories;
  three_sq.carbohydrateContent = 3 * averages.carbohydrateContent;
  three_sq.fatContent = 3 * averages.fatContent;
  three_sq.proteinContent = 3 * averages.proteinContent;
  three_sq.sodiumContent = 3 * averages.sodiumContent;
  three_sq.sugarContent = 3 * averages.sugarContent;
  console.log('3 square meal density', three_sq);
}