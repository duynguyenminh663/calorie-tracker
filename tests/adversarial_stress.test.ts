import {
  calculateDailyTotal,
  calculateItemCalories,
  calculateMealBreakdown,
  calculateProgressPercentage,
  calculateRemainingBalance,
  validatePortionInput,
} from '../src/utils/calorieMath';
import { CalorieRepository } from '../src/services/storageService';
import { MemoryStorageAdapter } from '../src/services/storageAdapter';
import { IStorageAdapter, LoggedEntry } from '../src/types';

/**
 * Custom Storage Adapter with randomized async latency jitter (0-15ms)
 * to stress-test AsyncMutex concurrency under realistic asynchronous disk I/O.
 */
class JitterStorageAdapter implements IStorageAdapter {
  private store = new Map<string, string>();

  private delay() {
    return new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 15)));
  }

  async getItem<T>(key: string): Promise<T | null> {
    await this.delay();
    const raw = this.store.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    await this.delay();
    this.store.set(key, JSON.stringify(value));
  }

  async removeItem(key: string): Promise<void> {
    await this.delay();
    this.store.delete(key);
  }

  async getAllKeys(): Promise<readonly string[]> {
    await this.delay();
    return Array.from(this.store.keys());
  }

  async clear(): Promise<void> {
    await this.delay();
    this.store.clear();
  }
}

describe('Empirical Challenger: Adversarial Stress Test Suite', () => {
  // =========================================================================
  // SECTION 1: Calorie Math Adversarial Stress Tests
  // =========================================================================
  describe('Adversarial Stress: calculateItemCalories', () => {
    test('Extreme floating point values: subnormal, huge, and boundaries', () => {
      // Subnormal number
      expect(calculateItemCalories(Number.MIN_VALUE, 100)).toBe(0);
      expect(calculateItemCalories(100, Number.MIN_VALUE)).toBe(0);

      // Epsilon
      expect(calculateItemCalories(Number.EPSILON, 100)).toBe(0);

      // Huge safe integers within MAX_SAFE_INTEGER
      const maxPortion = 1000;
      const maxCalPerUnit = 10000;
      expect(calculateItemCalories(maxPortion, maxCalPerUnit)).toBe(10000000);
      expect(Number.isSafeInteger(calculateItemCalories(maxPortion, maxCalPerUnit))).toBe(true);

      // Explicit Infinity inputs are guarded and return 0
      expect(calculateItemCalories(Infinity, 100)).toBe(0);
      expect(calculateItemCalories(100, Infinity)).toBe(0);
      expect(calculateItemCalories(-Infinity, 100)).toBe(0);
      expect(calculateItemCalories(100, -Infinity)).toBe(0);
    });

    test('Negative and zero edge cases including negative zero (-0)', () => {
      expect(calculateItemCalories(-0, 100)).toBe(0);
      expect(calculateItemCalories(100, -0)).toBe(0);
      expect(calculateItemCalories(-0, -0)).toBe(0);
      expect(calculateItemCalories(-1e-15, 100)).toBe(0);
      expect(calculateItemCalories(100, -1e-15)).toBe(0);
      expect(calculateItemCalories(0, 100)).toBe(0);
      expect(calculateItemCalories(100, 0)).toBe(0);
    });

    test('Non-numeric types and malformed inputs (defensive robustness)', () => {
      expect(calculateItemCalories(null as any, 100)).toBe(0);
      expect(calculateItemCalories(undefined as any, 100)).toBe(0);
      expect(calculateItemCalories('1' as any, 100)).toBe(0);
      expect(calculateItemCalories(1, '100' as any)).toBe(0);
      expect(calculateItemCalories([] as any, 100)).toBe(0);
      expect(calculateItemCalories({} as any, 100)).toBe(0);
      expect(calculateItemCalories(true as any, 100)).toBe(0);
      expect(calculateItemCalories(false as any, 100)).toBe(0);
      expect(calculateItemCalories(NaN, 100)).toBe(0);
      expect(calculateItemCalories(100, NaN)).toBe(0);
    });

    test('Half-way rounding precision on standard culinary portions', () => {
      // 0.5 servings of 95 kcal = 47.5 -> 48
      expect(calculateItemCalories(0.5, 95)).toBe(48);
      // 1.5 servings of 165 kcal = 247.5 -> 248
      expect(calculateItemCalories(1.5, 165)).toBe(248);
      // 2.5 servings of 72 kcal = 180
      expect(calculateItemCalories(2.5, 72)).toBe(180);
      // 0.25 servings of 205 kcal = 51.25 -> 51
      expect(calculateItemCalories(0.25, 205)).toBe(51);
      // 0.75 servings of 220 kcal = 165
      expect(calculateItemCalories(0.75, 220)).toBe(165);
    });

    test('Micro-portions (e.g. pinch of seasoning, drop of oil)', () => {
      expect(calculateItemCalories(0.001, 900)).toBe(1); // 0.9 -> 1
      expect(calculateItemCalories(0.0001, 900)).toBe(0); // 0.09 -> 0
      expect(calculateItemCalories(0.0005, 1000)).toBe(1); // 0.5 -> 1
      expect(calculateItemCalories(0.00049, 1000)).toBe(0); // 0.49 -> 0
    });

    test('Randomized Property Fuzzing: 5,000 iterations invariant test', () => {
      for (let i = 0; i < 5000; i++) {
        const portion = (Math.random() - 0.2) * 50; // Some negative, some positive
        const cal = (Math.random() - 0.2) * 2000;
        const res = calculateItemCalories(portion, cal);

        expect(typeof res).toBe('number');
        expect(Number.isNaN(res)).toBe(false);
        if (portion <= 0 || cal <= 0) {
          expect(res).toBe(0);
        } else {
          expect(res).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(res)).toBe(true);
        }
      }
    });
  });

  describe('Adversarial Stress: validatePortionInput', () => {
    test('Leading dot notation (.5, .25, .001)', () => {
      expect(validatePortionInput('.5')).toEqual({ isValid: true, parsedValue: 0.5 });
      expect(validatePortionInput('.25')).toEqual({ isValid: true, parsedValue: 0.25 });
      expect(validatePortionInput('  .75  ')).toEqual({ isValid: true, parsedValue: 0.75 });
      expect(validatePortionInput('.001')).toEqual({ isValid: true, parsedValue: 0.001 });
    });

    test('Trailing dot or malformed decimal representations', () => {
      expect(validatePortionInput('1.').isValid).toBe(false);
      expect(validatePortionInput('.').isValid).toBe(false);
      expect(validatePortionInput('..').isValid).toBe(false);
      expect(validatePortionInput('1..2').isValid).toBe(false);
      expect(validatePortionInput('1.2.3').isValid).toBe(false);
    });

    test('Scientific notation, signs, and radix formatting', () => {
      expect(validatePortionInput('1e2').isValid).toBe(false);
      expect(validatePortionInput('1e-2').isValid).toBe(false);
      expect(validatePortionInput('+1').isValid).toBe(false);
      expect(validatePortionInput('-1').isValid).toBe(false);
      expect(validatePortionInput('0x10').isValid).toBe(false);
      expect(validatePortionInput('0b10').isValid).toBe(false);
    });

    test('Whitespace, control characters, and Unicode numbers', () => {
      expect(validatePortionInput('\t1.5\n').isValid).toBe(true);
      expect(validatePortionInput('\r\n  2  \t').isValid).toBe(true);
      expect(validatePortionInput('１.５').isValid).toBe(false); // Full-width Unicode digits
      expect(validatePortionInput('½').isValid).toBe(false);
      expect(validatePortionInput('   ').isValid).toBe(false);
      expect(validatePortionInput('').isValid).toBe(false);
    });

    test('Zero, negative zero, and negative values', () => {
      expect(validatePortionInput(0).isValid).toBe(false);
      expect(validatePortionInput(-0).isValid).toBe(false);
      expect(validatePortionInput(-1).isValid).toBe(false);
      expect(validatePortionInput('0').isValid).toBe(false);
      expect(validatePortionInput('-0').isValid).toBe(false);
      expect(validatePortionInput('0.0').isValid).toBe(false);
      expect(validatePortionInput('-1.5').isValid).toBe(false);
    });

    test('Random string fuzzing: 1,000 arbitrary strings', () => {
      const chars = '0123456789.-+eE \t\nabcdef!@#$%^&*()';
      for (let i = 0; i < 1000; i++) {
        const len = Math.floor(Math.random() * 10);
        let str = '';
        for (let j = 0; j < len; j++) {
          str += chars[Math.floor(Math.random() * chars.length)];
        }
        const res = validatePortionInput(str);
        expect(typeof res.isValid).toBe('boolean');
        expect(typeof res.parsedValue).toBe('number');
        if (res.isValid) {
          expect(res.parsedValue).toBeGreaterThan(0);
          expect(Number.isFinite(res.parsedValue)).toBe(true);
          expect(res.error).toBeUndefined();
        } else {
          expect(res.parsedValue).toBe(0);
          expect(typeof res.error).toBe('string');
        }
      }
    });
  });

  describe('Adversarial Stress: calculateDailyTotal and calculateMealBreakdown', () => {
    test('Large dataset: 5,000 entries summed in under 100ms', () => {
      const largeList: LoggedEntry[] = Array.from({ length: 5000 }, (_, i) => ({
        id: `entry_${i}`,
        foodItemId: `food_${i % 10}`,
        foodName: `Food ${i}`,
        portion: 1,
        servingUnit: 'serving',
        calories: 100,
        dateString: '2026-11-03',
        mealType: (['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const)[i % 4],
        timestamp: 1000 + i,
      }));

      const start = Date.now();
      const total = calculateDailyTotal(largeList);
      const elapsed = Date.now() - start;

      expect(total).toBe(500000);
      expect(elapsed).toBeLessThan(100);

      const breakdown = calculateMealBreakdown(largeList);
      expect(breakdown.Breakfast + breakdown.Lunch + breakdown.Dinner + breakdown.Snack).toBe(500000);
      expect(breakdown.Breakfast).toBe(1250 * 100);
    });

    test('Entries with malformed, nullish, or noisy objects in array', () => {
      const noisyEntries = [
        { calories: 250 },
        null as any,
        undefined as any,
        { calories: '100' as any }, // string calorie in object -> should be skipped
        { calories: 0 },
        { calories: -50 }, // negative calorie
        { calories: NaN },
        { calories: 150 },
        {} as any,
      ] as LoggedEntry[];

      // calculateDailyTotal guards against non-number and NaN
      const total = calculateDailyTotal(noisyEntries);
      // 250 + 0 + (-50) + 150 = 350
      expect(total).toBe(350);
    });
  });

  describe('Adversarial Stress: calculateRemainingBalance & calculateProgressPercentage', () => {
    test('Extreme targets and balances', () => {
      expect(calculateRemainingBalance(100000, 25000)).toBe(75000);
      expect(calculateRemainingBalance(2000, 100000)).toBe(-98000);
      expect(calculateRemainingBalance(0, 0)).toBe(0);
      expect(calculateRemainingBalance(NaN, 500)).toBe(-500);
      expect(calculateRemainingBalance(2000, NaN)).toBe(2000);
    });

    test('Progress percentage limits, negative consumed, and zero targets', () => {
      expect(calculateProgressPercentage(0, 2000)).toBe(0);
      expect(calculateProgressPercentage(2000, 2000)).toBe(100);
      expect(calculateProgressPercentage(20000, 2000)).toBe(999); // Capped at 999
      expect(calculateProgressPercentage(500, 0)).toBe(0); // Target <= 0
      expect(calculateProgressPercentage(500, -100)).toBe(0); // Target < 0
    });
  });

  // =========================================================================
  // SECTION 2: Storage Service & Repository Concurrency Stress Tests
  // =========================================================================
  describe('Adversarial Stress: Storage Concurrency & Integrity', () => {
    let adapter: MemoryStorageAdapter;
    let repo: CalorieRepository;

    beforeEach(() => {
      adapter = new MemoryStorageAdapter();
      repo = new CalorieRepository(adapter);
    });

    test('Stress Concurrency: 100 concurrent addLoggedEntry via Promise.all', async () => {
      const date = '2026-11-03';
      const promises = Array.from({ length: 100 }, (_, i) =>
        repo.addLoggedEntry({
          foodItemId: `food_${i}`,
          foodName: `Food ${i}`,
          servingUnit: 'serving',
          portion: 1.0,
          calories: 10,
          dateString: date,
          mealType: 'Snack',
        })
      );

      const created = await Promise.all(promises);
      expect(created).toHaveLength(100);

      // Check all IDs are unique
      const idSet = new Set(created.map((c) => c.id));
      expect(idSet.size).toBe(100);

      // Verify stored entries count and total
      const stored = await repo.getLoggedEntries(date);
      expect(stored).toHaveLength(100);

      const summary = await repo.getDailySummary(date);
      expect(summary.totalCalories).toBe(1000);
    });

    test('Stress Concurrency: 50 concurrent writes distributed across 5 different dates', async () => {
      const dates = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'];
      const tasks = Array.from({ length: 50 }, (_, i) => {
        const targetDate = dates[i % dates.length];
        return repo.addLoggedEntry({
          foodItemId: `food_${i}`,
          foodName: `Food ${i}`,
          servingUnit: '1 unit',
          portion: 1,
          calories: 50,
          dateString: targetDate,
          mealType: 'Lunch',
        });
      });

      await Promise.all(tasks);

      // Each date must have exactly 10 entries and 500 total calories
      for (const d of dates) {
        const entries = await repo.getLoggedEntries(d);
        expect(entries).toHaveLength(10);
        const summary = await repo.getDailySummary(d);
        expect(summary.totalCalories).toBe(500);
      }
    });

    test('Stress Concurrency: Concurrent deletions on overlapping IDs', async () => {
      const date = '2026-11-03';
      const e1 = await repo.addLoggedEntry({
        foodItemId: 'item_1',
        foodName: 'Item 1',
        servingUnit: '1 unit',
        portion: 1,
        calories: 100,
        dateString: date,
        mealType: 'Breakfast',
      });
      const e2 = await repo.addLoggedEntry({
        foodItemId: 'item_2',
        foodName: 'Item 2',
        servingUnit: '1 unit',
        portion: 1,
        calories: 200,
        dateString: date,
        mealType: 'Breakfast',
      });

      // Concurrently attempt to delete e1 multiple times
      const deleteResults = await Promise.all([
        repo.deleteLoggedEntry(e1.id),
        repo.deleteLoggedEntry(e1.id),
        repo.deleteLoggedEntry(e1.id),
        repo.deleteLoggedEntry(e2.id),
      ]);

      // Exactly one deletion of e1 should succeed (true), the others return false
      const e1Deletes = deleteResults.slice(0, 3).filter((res) => res === true);
      const e1Fails = deleteResults.slice(0, 3).filter((res) => res === false);
      expect(e1Deletes).toHaveLength(1);
      expect(e1Fails).toHaveLength(2);

      // e2 deletion should succeed
      expect(deleteResults[3]).toBe(true);

      const remaining = await repo.getLoggedEntries(date);
      expect(remaining).toHaveLength(0);
    });

    test('Stress Concurrency: Mixed interleaved CRUD operations via Promise.all', async () => {
      const date = '2026-11-03';
      // Pre-populate 5 items
      const initial = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          repo.addLoggedEntry({
            foodItemId: `pre_${i}`,
            foodName: `Pre ${i}`,
            servingUnit: '1 unit',
            portion: 1,
            calories: 100,
            dateString: date,
            mealType: 'Dinner',
          })
        )
      );

      // Concurrently:
      // - Add 5 new items
      // - Update 2 existing items
      // - Delete 2 existing items
      // - Read catalog
      // - Read summary
      const mixedOps: Promise<any>[] = [
        ...Array.from({ length: 5 }, (_, i) =>
          repo.addLoggedEntry({
            foodItemId: `mixed_${i}`,
            foodName: `Mixed ${i}`,
            servingUnit: '1 unit',
            portion: 1,
            calories: 50,
            dateString: date,
            mealType: 'Snack',
          })
        ),
        repo.updateLoggedEntry(initial[0].id, { calories: 300, portion: 3 }),
        repo.updateLoggedEntry(initial[1].id, { calories: 250, portion: 2.5 }),
        repo.deleteLoggedEntry(initial[2].id),
        repo.deleteLoggedEntry(initial[3].id),
        repo.getFoodCatalog(),
        repo.getDailySummary(date),
      ];

      const results = await Promise.all(mixedOps);
      expect(results).toHaveLength(11);

      // Verify final state:
      const finalEntries = await repo.getLoggedEntries(date);
      expect(finalEntries).toHaveLength(8);

      const finalSummary = await repo.getDailySummary(date);
      expect(finalSummary.totalCalories).toBe(900);
      expect(finalSummary.entries).toHaveLength(8);
    });

    test('Stress Concurrency: Custom food concurrent creation and deletion', async () => {
      const creations = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          repo.saveCustomFood({
            name: `Custom Meal ${i}`,
            servingUnit: '1 plate',
            caloriesPerUnit: 300 + i * 10,
            category: 'Proteins',
          })
        )
      );

      expect(creations).toHaveLength(20);
      let catalog = await repo.getFoodCatalog();
      expect(catalog).toHaveLength(36 + 20);

      // Concurrently delete half of them
      const deletes = creations.slice(0, 10).map((c) => repo.deleteCustomFood(c.id));
      const deleteOutcomes = await Promise.all(deletes);
      expect(deleteOutcomes.every((o) => o === true)).toBe(true);

      catalog = await repo.getFoodCatalog();
      expect(catalog).toHaveLength(36 + 10);
    });

    test('Rapid sequential operations: 50 sequential writes maintain consistency', async () => {
      const date = '2026-11-03';
      for (let i = 0; i < 50; i++) {
        await repo.addLoggedEntry({
          foodItemId: `seq_${i}`,
          foodName: `Sequential Food ${i}`,
          servingUnit: '1 unit',
          portion: 1,
          calories: 10,
          dateString: date,
          mealType: 'Breakfast',
        });
      }

      const entries = await repo.getLoggedEntries(date);
      expect(entries).toHaveLength(50);
      const total = (await repo.getDailySummary(date)).totalCalories;
      expect(total).toBe(500);
    });

    test('Adversarial I/O Jitter: 30 concurrent operations against JitterStorageAdapter (0-15ms delay)', async () => {
      const jitterAdapter = new JitterStorageAdapter();
      const jitterRepo = new CalorieRepository(jitterAdapter);
      const date = '2026-11-03';

      const writes = Array.from({ length: 30 }, (_, i) =>
        jitterRepo.addLoggedEntry({
          foodItemId: `jitter_${i}`,
          foodName: `Jitter Food ${i}`,
          servingUnit: '1 portion',
          portion: 1.0,
          calories: 25,
          dateString: date,
          mealType: 'Dinner',
        })
      );

      const added = await Promise.all(writes);
      expect(added).toHaveLength(30);

      const stored = await jitterRepo.getLoggedEntries(date);
      expect(stored).toHaveLength(30);

      const summary = await jitterRepo.getDailySummary(date);
      expect(summary.totalCalories).toBe(750); // 30 * 25 kcal
    });
  });
});
