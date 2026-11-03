import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

const renderer = require('react-test-renderer');
const { create, act } = renderer;
const h = React.createElement;

describe('Milestone 3 Challenger 2: ErrorBoundary Fault Resilience & Recovery', () => {
  // Helper to extract plain text from ReactTestInstance tree
  const extractText = (node: any): string => {
    if (node === null || node === undefined) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (node.props && node.props.children !== undefined) return extractText(node.props.children);
    if (Array.isArray(node.children)) return node.children.map(extractText).join('');
    return '';
  };

  const getByTestId = (instance: any, testID: string) => {
    const nodes = instance.findAll((node: any) => node.props && node.props.testID === testID);
    if (nodes.length === 0) {
      throw new Error(`Component with testID="${testID}" not found.`);
    }
    return nodes[0];
  };

  // Component that can be configured to throw an intentional error during render
  const BuggyChild = ({ shouldCrash, errorMessage }: { shouldCrash: boolean; errorMessage?: string }) => {
    if (shouldCrash) {
      throw new Error(errorMessage || 'Intentional child render failure');
    }
    return h(View, { testID: 'healthy-child' }, h(Text, null, 'Healthy Child Operating Normally'));
  };

  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Suppress console.error in tests to avoid noisy output from intentional errors
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('1. Normal rendering: renders child component cleanly without errors', () => {
    let root: any;
    act(() => {
      root = create(
        h(
          ErrorBoundary,
          null,
          h(BuggyChild, { shouldCrash: false })
        )
      );
    });

    const healthyNode = getByTestId(root.root, 'healthy-child');
    expect(healthyNode).toBeDefined();
    expect(extractText(healthyNode)).toContain('Healthy Child Operating Normally');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test('2. Intentional child render crash: catches error, prevents process crash, renders fallback UI', () => {
    let root: any;
    const intentionalError = 'FATAL_CRASH: Intentional stress test render error';

    // Verify act/render does not throw and crash the node process
    expect(() => {
      act(() => {
        root = create(
          h(
            ErrorBoundary,
            null,
            h(BuggyChild, { shouldCrash: true, errorMessage: intentionalError })
          )
        );
      });
    }).not.toThrow();

    // Verify ErrorBoundary caught the error in componentDidCatch
    expect(consoleErrorSpy).toHaveBeenCalled();

    // Verify fallback UI structure
    const fallbackContainer = getByTestId(root.root, 'error-boundary-fallback');
    expect(fallbackContainer).toBeDefined();

    const fallbackContent = extractText(fallbackContainer);
    expect(fallbackContent).toContain('Something went wrong');
    expect(fallbackContent).toContain(intentionalError);
    expect(fallbackContent).toContain('Your data is safely stored in local device storage.');

    // Verify reset button existence and label
    const resetButton = getByTestId(root.root, 'error-boundary-reset-button');
    expect(resetButton).toBeDefined();
    expect(extractText(resetButton)).toContain('Restart / Reload UI');
  });

  test('3. Working reset button: triggers onReset callback and restores healthy child on recovery', () => {
    const onResetMock = jest.fn();

    // Wrapper component simulating an application controller that repairs state on reset
    const StatefulWrapper = () => {
      const [crash, setCrash] = useState(true);

      const handleReset = () => {
        onResetMock();
        setCrash(false); // Repair state upon reset
      };

      return h(
        ErrorBoundary,
        { onReset: handleReset },
        h(BuggyChild, {
          shouldCrash: crash,
          errorMessage: 'Initial crash before reset',
        })
      );
    };

    let root: any;
    act(() => {
      root = create(h(StatefulWrapper, null));
    });

    // Verify initial crashed state
    const fallbackBefore = getByTestId(root.root, 'error-boundary-fallback');
    expect(fallbackBefore).toBeDefined();
    expect(extractText(fallbackBefore)).toContain('Initial crash before reset');

    // Press the reset button
    const resetButton = getByTestId(root.root, 'error-boundary-reset-button');
    act(() => {
      resetButton.props.onPress();
    });

    // Verify onReset callback was called
    expect(onResetMock).toHaveBeenCalledTimes(1);

    // Verify ErrorBoundary recovered and rendered healthy child
    const healthyChild = getByTestId(root.root, 'healthy-child');
    expect(healthyChild).toBeDefined();
    expect(extractText(healthyChild)).toContain('Healthy Child Operating Normally');

    // Verify fallback UI is no longer present
    const fallbackAfter = root.root.findAll((node: any) => node.props && node.props.testID === 'error-boundary-fallback');
    expect(fallbackAfter.length).toBe(0);
  });

  test('4. Custom fallback prop: renders custom fallback node when provided', () => {
    let root: any;
    const customFallback = h(
      View,
      { testID: 'custom-fallback-container' },
      h(Text, null, 'Custom Emergency UI')
    );

    act(() => {
      root = create(
        h(
          ErrorBoundary,
          { fallback: customFallback },
          h(BuggyChild, { shouldCrash: true, errorMessage: 'Crash with custom fallback' })
        )
      );
    });

    const customNode = getByTestId(root.root, 'custom-fallback-container');
    expect(customNode).toBeDefined();
    expect(extractText(customNode)).toContain('Custom Emergency UI');

    // Default fallback should not be rendered
    const defaultFallback = root.root.findAll((node: any) => node.props && node.props.testID === 'error-boundary-fallback');
    expect(defaultFallback.length).toBe(0);
  });

  test('5. Multi-cycle crash resilience: withstands repeated failure and reset cycles without crashing process', () => {
    let shouldCrash = true;
    let root: any;

    const TestHarness = () => {
      return h(
        ErrorBoundary,
        {
          onReset: () => {
            shouldCrash = false;
          },
        },
        h(BuggyChild, { shouldCrash, errorMessage: 'Cycle test crash' })
      );
    };

    // Cycle 1: Crash
    act(() => {
      root = create(h(TestHarness, null));
    });
    expect(getByTestId(root.root, 'error-boundary-fallback')).toBeDefined();

    // Cycle 1: Reset & Recover
    act(() => {
      getByTestId(root.root, 'error-boundary-reset-button').props.onPress();
      root.update(h(TestHarness, null));
    });
    expect(getByTestId(root.root, 'healthy-child')).toBeDefined();

    // Cycle 2: Crash again
    shouldCrash = true;
    act(() => {
      root.update(h(TestHarness, null));
    });
    expect(getByTestId(root.root, 'error-boundary-fallback')).toBeDefined();

    // Cycle 2: Reset & Recover again
    act(() => {
      getByTestId(root.root, 'error-boundary-reset-button').props.onPress();
      root.update(h(TestHarness, null));
    });
    expect(getByTestId(root.root, 'healthy-child')).toBeDefined();
  });
});
