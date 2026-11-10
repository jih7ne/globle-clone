import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the title and the five distance bands', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Getting Warmer' })).toBeDefined();
    expect(screen.getByRole('list', { name: 'Distance bands' }).children).toHaveLength(5);
  });
});
