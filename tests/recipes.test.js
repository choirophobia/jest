const { recipesApi } = require('../helpers/recipesApi');

describe('Recipes API', () => {
  describe('Create', () => {
    it('creates a new recipe and echoes payload fields', async () => {
      const payload = {
        name: 'Test Recipe',
        ingredients: ['a', 'b'],
        instructions: ['step1'],
        prepTimeMinutes: 5,
        cookTimeMinutes: 10,
        servings: 2,
        difficulty: 'Easy',
        cuisine: 'Test',
        caloriesPerServing: 100,
        tags: ['Test'],
        userId: 1,
        mealType: ['Dinner'],
      };
      const res = await recipesApi.create(payload);

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('id');
      expect(typeof res.data.id).toBe('number');
      expect(res.data.name).toBe(payload.name);
      expect(res.data.ingredients).toEqual(payload.ingredients);
      expect(res.data.difficulty).toBe(payload.difficulty);
      expect(res.data.userId).toBe(payload.userId);
    });
  });

  describe('Read', () => {
    it('lists recipes with default pagination', async () => {
      const res = await recipesApi.list();

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.recipes)).toBe(true);
      expect(res.data).toHaveProperty('total');
      expect(res.data).toHaveProperty('limit');
      expect(res.data).toHaveProperty('skip');
      expect(res.data.limit).toBe(30);
      expect(res.data.recipes).toHaveLength(res.data.limit);
      expect(res.data.total).toBeGreaterThan(res.data.recipes.length);
      res.data.recipes.forEach((recipe) => {
        expect(typeof recipe.id).toBe('number');
        expect(typeof recipe.name).toBe('string');
        expect(Array.isArray(recipe.ingredients)).toBe(true);
        expect(Array.isArray(recipe.instructions)).toBe(true);
        expect(typeof recipe.difficulty).toBe('string');
      });
    });

    it('gets a single recipe by id', async () => {
      const res = await recipesApi.getById(1);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(typeof res.data.name).toBe('string');
      expect(typeof res.data.prepTimeMinutes).toBe('number');
      expect(typeof res.data.cookTimeMinutes).toBe('number');
      expect(typeof res.data.servings).toBe('number');
      expect(res.data.rating).toBeGreaterThanOrEqual(0);
      expect(res.data.rating).toBeLessThanOrEqual(5);
      expect(Array.isArray(res.data.tags)).toBe(true);
      expect(Array.isArray(res.data.mealType)).toBe(true);
    });

    it('searches recipes by query', async () => {
      const res = await recipesApi.search('pizza');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.recipes)).toBe(true);
      expect(res.data.recipes.length).toBeGreaterThan(0);
      res.data.recipes.forEach((recipe) => {
        expect(recipe.name.toLowerCase()).toEqual(expect.stringContaining('pizza'));
      });
    });

    it('gets the full list of recipe tags', async () => {
      const res = await recipesApi.tags();

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThan(0);
      expect(res.data).toEqual(expect.arrayContaining(['Pizza']));
    });

    it('gets recipes filtered by tag', async () => {
      const res = await recipesApi.byTag('Pizza');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.recipes)).toBe(true);
      expect(res.data.recipes.length).toBeGreaterThan(0);
      res.data.recipes.forEach((recipe) => {
        expect(recipe.tags).toEqual(expect.arrayContaining(['Pizza']));
      });
    });

    it('gets recipes filtered by meal type', async () => {
      const res = await recipesApi.byMealType('breakfast');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.recipes)).toBe(true);
      expect(res.data.recipes.length).toBeGreaterThan(0);
      res.data.recipes.forEach((recipe) => {
        expect(recipe.mealType).toEqual(expect.arrayContaining(['Breakfast']));
      });
    });
  });

  describe('Update', () => {
    it('updates a recipe with PUT and echoes new fields', async () => {
      const payload = { name: 'Updated Recipe Name' };
      const res = await recipesApi.update(1, payload);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data.name).toBe(payload.name);
      // Unmodified fields should still reflect the original seed recipe, confirming
      // the API merges the payload onto the existing record rather than replacing it.
      expect(res.data.cuisine).toBe('Italian');
      expect(Array.isArray(res.data.ingredients)).toBe(true);
    });
  });

  describe('Delete', () => {
    it('deletes a recipe and marks it as deleted', async () => {
      const res = await recipesApi.remove(1);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data.isDeleted).toBe(true);
      expect(res.data).toHaveProperty('deletedOn');
      expect(typeof res.data.deletedOn).toBe('string');
      expect(res.data.name).toBe('Classic Margherita Pizza');
    });
  });

  describe('negative cases', () => {
    it('returns 404 (or 429 if rate-limited) for an out-of-range recipe id', async () => {
      const res = await recipesApi.getById(999999);

      expect([404, 429]).toContain(res.status);
      expect(res.data).toHaveProperty('message');
    });

    it('returns 404 (or 429 if rate-limited) when updating a non-existent recipe', async () => {
      const res = await recipesApi.update(999999, { name: 'nope' });

      expect([404, 429]).toContain(res.status);
      expect(res.data).toHaveProperty('message');
    });

    it('returns 404 (or 429 if rate-limited) when deleting a non-existent recipe', async () => {
      const res = await recipesApi.remove(999999);

      expect([404, 429]).toContain(res.status);
      expect(res.data).toHaveProperty('message');
    });

    it('returns an empty list for an unknown tag', async () => {
      const res = await recipesApi.byTag('NoSuchTagXYZ');

      expect(res.status).toBe(200);
      expect(res.data.recipes).toEqual([]);
      expect(res.data.total).toBe(0);
    });
  });
});
