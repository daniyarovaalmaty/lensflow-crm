import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUsbScanner } from '@/hooks/useUsbScanner';

describe('useUsbScanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call onScan when rapid keystrokes followed by Enter (barcode pattern)', () => {
    const onScan = vi.fn();
    renderHook(() => useUsbScanner(onScan));

    // Simulate rapid barcode scan: "1234" + Enter
    const chars = '1234';
    for (const char of chars) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
    }
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(onScan).toHaveBeenCalledWith('1234');
  });

  it('should NOT call onScan for short input (< 4 chars)', () => {
    const onScan = vi.fn();
    renderHook(() => useUsbScanner(onScan));

    // Type only 3 chars
    for (const char of '123') {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
    }
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(onScan).not.toHaveBeenCalled();
  });

  it('should NOT call onScan when disabled', () => {
    const onScan = vi.fn();
    renderHook(() => useUsbScanner(onScan, false));

    for (const char of '1234567890') {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
    }
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(onScan).not.toHaveBeenCalled();
  });

  it('should clear buffer after 250ms timeout (slow typing = not a scanner)', () => {
    const onScan = vi.fn();
    renderHook(() => useUsbScanner(onScan));

    // Type first chars
    for (const char of '12') {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
    }

    // Wait > 250ms (buffer should clear)
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Type more and Enter
    for (const char of '34') {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
    }
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    // Only '34' was in buffer (< 4 chars), so no scan
    expect(onScan).not.toHaveBeenCalled();
  });

  it('should handle a real DataMatrix barcode', () => {
    const onScan = vi.fn();
    renderHook(() => useUsbScanner(onScan));

    const barcode = '010454748051601117271031212SPY0049';
    for (const char of barcode) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
    }
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(onScan).toHaveBeenCalledWith(barcode);
  });

  it('should ignore meta keys', () => {
    const onScan = vi.fn();
    renderHook(() => useUsbScanner(onScan));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true, ctrlKey: true }));
    for (const char of '1234') {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
    }
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    // Ctrl+A was ignored, only '1234' scanned
    expect(onScan).toHaveBeenCalledWith('1234');
  });

  it('should handle consecutive scans', () => {
    const onScan = vi.fn();
    renderHook(() => useUsbScanner(onScan));

    // First scan
    for (const char of 'BARCODE1') {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
    }
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    // Second scan immediately after
    for (const char of 'BARCODE2') {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
    }
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(onScan).toHaveBeenCalledTimes(2);
    expect(onScan).toHaveBeenNthCalledWith(1, 'BARCODE1');
    expect(onScan).toHaveBeenNthCalledWith(2, 'BARCODE2');
  });
});
