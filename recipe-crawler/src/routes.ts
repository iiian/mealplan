import { createPlaywrightRouter } from 'crawlee';
import { mfetch } from './auth.js';
import { v4 as uuid } from 'uuid';
export const router = createPlaywrightRouter();

router.addDefaultHandler(async ({ enqueueLinks, log }) => {
    log.info(`enqueueing new URLs`);
    await enqueueLinks({
        globs: ['https://www.hellofresh.com/recipes/**'],
        label: 'detail',
    });

    await enqueueLinks({
        globs: ['https://hfresh.info/us-en?page=**'],
        label: 'default',
    })
});

const ALL_FOODS: any[] = (await (await mfetch('/foods?page=1&perPage=999999999999', { method: 'GET' })).json() as any).items as any[];
router.addHandler('detail', async ({ request, page, log }) => {
    const result = await mfetch('/recipes/create-url', {
        method: 'POST',
        body: JSON.stringify({ includeTags: true, url: request.loadedUrl }),
    });
    if (result.status > 299) {
        console.error('problem creating from url');
        return
    }
    const recipe_slug = await result.json() as string;

    const recipe_result = await mfetch('/recipes/' + recipe_slug, { method: 'GET' });
    if (recipe_result.status > 299) {
        console.error('problem fetching created recipe');
        return
    }
    const recipe = await recipe_result.json() as any;
    const ingredients = [...recipe.recipeIngredient];

    const nlp_result = await mfetch('/parser/ingredients', {
        method: 'POST',
        body: JSON.stringify({
            parser: 'nlp',
            ingredients: ingredients.map(i => i.note)
        }),
    });
    if (nlp_result.status > 299) {
        console.error('problem with nlp');
        return
    }
    const structured_ingredients = await nlp_result.json() as any[];
    const new_unit_ids = new Set<string>();
    const new_units = [];
    const new_food_ids = new Set<string>();
    const new_foods = [];
    for (let i = 0; i < ingredients.length; i++) {
        const new_ingr = structured_ingredients[i];
        let { unit, food, note, display } = new_ingr.ingredient;
        food.name = (food.name.replace('unit', '').replace('box', '') as string).trim();
        if (unit?.name.length === 0) {
            unit = null;
        }

        if (unit && unit.id === null && !new_unit_ids.has(unit.name)) {
            new_unit_ids.add(unit.name);
            new_units.push(unit);
        }
        if (food && food.id === null && !new_food_ids.has(food.name)) {
            const existing_food = ALL_FOODS.find(sf => sf.name === food.name);
            if (!!existing_food) {
                food = existing_food;
            } else {
                food.id = uuid();
                new_food_ids.add(food.name);
                new_foods.push(food);
                ALL_FOODS.push(food);
            }
        }

        recipe.recipeIngredient[i] = {
            ...recipe.recipeIngredient[i],
            unit, food, note, display,
            isFood: true,
        };
    }

    for (const food of new_foods) {
        const result = await mfetch('/foods', {
            method: 'POST',
            body: JSON.stringify(food),
            });
            if (result.status > 299) {
                console.log('problem creating new ingredient ' + food.name);
                console.log(result.statusText);
                console.log(await result.json());
            return
        }
    }

    for (const unit of new_units) {
        unit.id = uuid();
        const result = await mfetch('/units', {
            method: 'POST',
            body: JSON.stringify(unit),
        });
        if (result.status > 299) {
            console.log('problem creating new unit ' + unit.name);
            return
        }
    }

    recipe.settings.disableAmount = false;
    const updated_recipe_result = await mfetch('/recipes/' + recipe_slug, {
        method: 'PUT',
        body: JSON.stringify(recipe),
    });
    if (updated_recipe_result.status > 299) {
        console.log('problem updating recipe ' + recipe_slug);
        console.log(updated_recipe_result.statusText);
        console.log(await updated_recipe_result.json());
        return
    }

    const title = await page.title();
    log.info(`${result.statusText}: ${title}`, { url: request.loadedUrl });
});
