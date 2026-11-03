# Test Infrastructure & Strategy Specification

## 1. Test Philosophy & Architecture

The test suite for the Standalone Offline-First Calorie Tracking Mobile Application is built on the following foundational tenets:

1. **Requirement-Driven & Opaque-Box**:
   All test cases are derived strictly from the product requirements and acceptance criteria documented in `ORIGINAL_REQUEST.md` and the interface contracts in `PROJECT.md`. Tests treat system components as opaque boxes with well-defined inputs and expected outputs, preventing coupling to ephemeral internal implementation details.

2. **Zero-Host, Headless Testability**:
   The application is designed to operate completely standalone without requiring a physical phone, emulator, or connected Metro bundler during testing. Automated test suites execute in a headless Node.js environment via Jest in single-digit seconds, enabling rapid iteration and CI pipeline integration.

3. **Deterministic Integer Mathematics**:
   Calorie math utilizes rounded integer units (`Math.round(portion * caloriesPerUnit)`), preventing IEEE-754 floating-point drift (e.g. `0.1 + 0.2 = 0.30000000000000004`) from contaminating daily totals or remaining calorie budgets.

4. **Progressive Testability & Clean Isolation**:
   Tests are layered into 4 discrete tiers. Each test is completely isolated, initializing its own fresh memory adapter (`InMemoryStorageAdapter`), ensuring zero cross-test state leakage or ordering dependencies.

---

## 2. Test Tier Inventory & Feature Mapping

| Tier | Focus | File Path | Test Count | Scope & Invariants Covered |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1** | Feature Coverage | `tests/e2e/tier1_feature_coverage.test.ts` | 36 | >=5 test cases per feature for calorie calculation, storage persistence, starter food catalog, food logging, daily sum, daily calorie target and remaining balance. |
| **Tier 2** | Boundary & Corner Cases | `tests/e2e/tier2_boundary_corner.test.ts` | 30 | >=5 test cases per category for zero portions, fractional/decimal portions, negative guards, large calorie numbers, boundary limits. |
| **Tier 3** | Cross-Feature Combinations | `tests/e2e/tier3_cross_feature.test.ts` | 8 | Pairwise and multi-step lifecycle flows: log multiple foods -> edit portion -> recalculate remaining balance -> delete item -> switch dates -> denormalized snapshot integrity. |
| **Tier 4** | Real-World Application Scenarios | `tests/e2e/tier4_real_world_scenarios.test.ts` | 8 | Realistic user journeys: caloric deficit (cutting), caloric surplus (bulking), exact maintenance (0 balance), 7-day longitudinal tracking, misentry correction, batch meal prep, and intermittent fasting. |
| **Total** | **Full E2E Suite** | `tests/e2e/*.test.ts` | **82** | **100% requirements and acceptance criteria verified.** |

---

## 3. Directory Layout

```
calorie_app/
├── tests/
│   ├── e2e/
│   │   ├── mockStorage.ts                  # Contract reference engine & in-memory storage adapter
│   │   ├── tier1_feature_coverage.test.ts  # Tier 1 Feature Coverage (36 tests)
│   │   ├── tier2_boundary_corner.test.ts   # Tier 2 Boundary & Corner Cases (30 tests)
│   │   ├── tier3_cross_feature.test.ts     # Tier 3 Cross-Feature Combinations (8 tests)
│   │   └── tier4_real_world_scenarios.test.ts # Tier 4 Real-World Application Scenarios (8 tests)
│   ├── calorieMath.test.ts                 # Unit tests for calculation engine
│   ├── storageService.test.ts              # Unit tests for persistence adapter
│   └── setup.ts                            # Global Jest setup
├── TEST_INFRA.md                           # This infrastructure specification
└── TEST_READY.md                           # Test readiness and verification checklist
```

---

## 4. Test Runner Configuration (`jest.config.js`)

The test suite runs via Jest with TypeScript transpilation (`ts-jest` or `babel-jest`):

```javascript
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  setupFilesAfterEnv: ['./tests/setup.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: [
    '**/tests/**/*.test.(ts|tsx|js|jsx)',
  ],
  testEnvironment: 'node',
};
```

---

## 5. Coverage Thresholds & Quality Gates

| Metric | Target Minimum | Rationale |
| :--- | :--- | :--- |
| **Requirements Coverage** | 100% | Every requirement in `ORIGINAL_REQUEST.md` (R1, R2, Acceptance Criteria) has at least 5 verification cases. |
| **Pure Math Line Coverage** | 100% | Zero floating-point leaks or unhandled edge cases permitted in `calorieMath.ts`. |
| **Storage Persistence Branch Coverage** | >= 90% | All CRUD operations, corrupted data fallbacks, and date isolation paths tested. |
| **Execution Speed** | < 5,000 ms | Total suite execution across 82 test cases runs in under 5 seconds. |

---

## 6. Execution Command

Run the entire automated test suite:
```bash
npm test
```

Run E2E test suite specifically:
```bash
npm test -- tests/e2e
```
