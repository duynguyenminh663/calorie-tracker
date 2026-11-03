# TEST_READY: Requirement-Driven Opaque-Box E2E Test Suite

## Status: READY FOR EXECUTION
- **Author**: Verification & Test Agent (`teamwork_test_writer_e2e`)
- **Date**: 2026-11-03
- **Test Directory**: `tests/e2e/`
- **Total Test Cases**: 82 test cases across 4 systematic tiers

---

## 1. Test Runner Command

To run the complete automated test suite:
```bash
npm test
```

To run only the E2E verification tiers:
```bash
npm test -- tests/e2e
```

To run individual tiers:
```bash
npm test -- tests/e2e/tier1_feature_coverage.test.ts
npm test -- tests/e2e/tier2_boundary_corner.test.ts
npm test -- tests/e2e/tier3_cross_feature.test.ts
npm test -- tests/e2e/tier4_real_world_scenarios.test.ts
```

---

## 2. Test Suite Summary Table

| Tier | Suite Name | File | Tests | Target Features / Scope |
| :--- | :--- | :--- | :---: | :--- |
| **Tier 1** | Feature Coverage | `tier1_feature_coverage.test.ts` | 36 | >=5 tests each for: Calorie Calculation (6), Local Storage Persistence (6), Starter Food Catalog (6), Food Logging (6), Daily Sum (6), Target & Remaining Balance (6). |
| **Tier 2** | Boundary & Corner Cases | `tier2_boundary_corner.test.ts` | 30 | >=5 tests each for: Zero Portions & Zero Values (6), Fractional & Decimal Portions (6), Negative & Invalid Guards (6), Large Calorie Numbers (6), Boundary Limits & Storage Edge Cases (6). |
| **Tier 3** | Cross-Feature Combinations | `tier3_cross_feature.test.ts` | 8 | Pairwise & multi-step interaction flows: Log -> Edit -> Recalculate; Log -> Delete -> Recalculate; Cross-date state isolation; Custom food denormalized snapshot preservation; Goal modifications; Meal breakdown consistency; Rapid edits & oscillation invariance; Sequential deletion to empty log recovery. |
| **Tier 4** | Real-World Application Scenarios | `tier4_real_world_scenarios.test.ts` | 8 | Caloric Deficit Plan (Cutting, 1500 kcal); Caloric Surplus Plan (Bulking, 2800 kcal); Exact Maintenance (2000 kcal, 0 balance); 7-Day Weekly Longitudinal Simulation; Accidental Misentry & In-Place Correction; Multi-Day Batch Prep Workflow; Intermittent Fasting (16/8); High-Density Cheat Meal Handling. |
| **Total** | **All 4 Tiers** | `tests/e2e/*.test.ts` | **82** | **Full Requirement & Contract Validation** |

---

## 3. Feature & Acceptance Criteria Checklist

| Acceptance Criterion | Verification Source | Status |
| :--- | :--- | :---: |
| **Offline-first local storage persistence** | `tier1_feature_coverage.test.ts` (TC1.2.1-1.2.6), `mockStorage.ts` | ✅ READY |
| **Food logging with portion/serving units** | `tier1_feature_coverage.test.ts` (TC1.4.1-1.4.6), `tier3_cross_feature.test.ts` | ✅ READY |
| **Starter food catalog (36 curated items)** | `tier1_feature_coverage.test.ts` (TC1.3.1-1.3.6), `mockStorage.ts` | ✅ READY |
| **Cumulative daily calorie summation** | `tier1_feature_coverage.test.ts` (TC1.5.1-1.5.6), `tier2_boundary_corner.test.ts` | ✅ READY |
| **Configurable calorie target & remaining balance** | `tier1_feature_coverage.test.ts` (TC1.6.1-1.6.6), `tier3_cross_feature.test.ts` | ✅ READY |
| **Zero, fractional & decimal portion calculations** | `tier2_boundary_corner.test.ts` (TC2.1.1-2.2.6) | ✅ READY |
| **Negative value & invalid input guards** | `tier2_boundary_corner.test.ts` (TC2.3.1-2.3.6) | ✅ READY |
| **Extreme upper boundaries & large intake totals** | `tier2_boundary_corner.test.ts` (TC2.4.1-2.4.6) | ✅ READY |
| **Cross-date isolation & zero state pollution** | `tier3_cross_feature.test.ts` (TC3.3), `tier4_real_world_scenarios.test.ts` (TC4.4) | ✅ READY |
| **Denormalized snapshot data integrity on edit/delete** | `tier3_cross_feature.test.ts` (TC3.4) | ✅ READY |
| **Real-world comprehensive daily logs across meals** | `tier4_real_world_scenarios.test.ts` (TC4.1-4.8) | ✅ READY |
| **Single-command headless execution (`npm test`)** | `TEST_INFRA.md`, `tests/e2e/*.test.ts` | ✅ READY |

---

## 4. Instructions for Implementing Agents (Milestones M2, M3, M4)

1. Ensure implementation modules in `src/` satisfy the interface contracts documented in `PROJECT.md § Interface Contracts`:
   - `src/utils/calorieMath.ts`: `calculateItemCalories`, `calculateDailyTotal`, `calculateRemainingBalance`, `validatePortionInput`.
   - `src/services/storageService.ts`: `getFoodCatalog`, `saveCustomFood`, `getLoggedEntries`, `addLoggedEntry`, `updateLoggedEntry`, `deleteLoggedEntry`, `getDailyGoal`, `setDailyGoal`, `getDailySummary`.
   - `src/data/starterCatalog.ts`: `STARTER_FOOD_CATALOG` containing the 36 curated food items.
2. Execute `npm test` to verify that 100% of all 82 test cases across Tiers 1-4 pass cleanly.
