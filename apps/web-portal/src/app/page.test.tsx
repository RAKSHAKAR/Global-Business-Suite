import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import Home from './page';

describe('Web Portal Landing Page', () => {
  it('renders headline and calls to action correctly', () => {
    render(<Home />);
    expect(screen.getByText(/One Platform. Every Business./i)).toBeInTheDocument();
    expect(screen.getByText(/Partner Signup \(:3001\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Customer Signup \(:3002\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Six Core Pillars of GBS/i)).toBeInTheDocument();
    expect(screen.getByText(/Enterprise AI Engine/i)).toBeInTheDocument();
  });
});
