import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import PricingPage from './pricing/page';
import FeaturesPage from './features/page';
import SolutionsPage from './solutions/page';
import AboutPage from './about/page';
import SecurityPage from './security/page';
import PortalsPage from './portals/page';
import ContactPage from './contact/page';

describe('Web Portal Routes Test Suite', () => {
  it('renders Pricing Page with GBS subscription tiers & registration links', () => {
    render(<PricingPage />);
    expect(screen.getByText(/Transparent Pricing for Every Scale/i)).toBeInTheDocument();
    expect(screen.getByText(/Professional Partner/i)).toBeInTheDocument();
    expect(screen.getByText(/Start Partner Plan \(:3001\)/i)).toBeInTheDocument();
  });

  it('renders Features Page with 4 detailed pillar sections', () => {
    render(<FeaturesPage />);
    expect(screen.getByText(/Global Business Suite Capabilities/i)).toBeInTheDocument();
    expect(screen.getByText(/16 Enterprise AI Agents/i)).toBeInTheDocument();
    expect(screen.getByText(/Automated Review Replies/i)).toBeInTheDocument();
  });

  it('renders Solutions Page with persona breakdowns', () => {
    render(<SolutionsPage />);
    expect(screen.getByText(/Solutions by Role & Persona/i)).toBeInTheDocument();
    expect(screen.getByText(/For Enterprise Admins & Platform Owners/i)).toBeInTheDocument();
    expect(screen.getByText(/For Franchises, Agencies & Business Owners/i)).toBeInTheDocument();
  });

  it('renders About Page with architecture & tech stack', () => {
    render(<AboutPage />);
    expect(screen.getByText(/Architected for Enterprise Excellence/i)).toBeInTheDocument();
    expect(screen.getByText(/Strict Multi-Tenancy/i)).toBeInTheDocument();
  });

  it('renders Security Page with zero-trust isolation features', () => {
    render(<SecurityPage />);
    expect(screen.getByText(/Enterprise Multi-Tenant Security/i)).toBeInTheDocument();
    expect(screen.getByText(/Tenant Boundary Isolation/i)).toBeInTheDocument();
  });

  it('renders Portals Directory Hub with all 4 web portals & 3 mobile apps', () => {
    render(<PortalsPage />);
    expect(screen.getByText(/GBS Portals & Applications Hub/i)).toBeInTheDocument();
    expect(screen.getByText(/Platform Admin Portal/i)).toBeInTheDocument();
    expect(screen.getByText(/Agency Partner Portal/i)).toBeInTheDocument();
    expect(screen.getByText(/Customer Service Portal/i)).toBeInTheDocument();
    expect(screen.getByText(/Admin Mobile Web/i)).toBeInTheDocument();
  });

  it('renders Contact Sales & Demo Form', () => {
    render(<ContactPage />);
    expect(screen.getByText(/Contact Sales & Support/i)).toBeInTheDocument();
    expect(screen.getByText(/Submit Demo Request/i)).toBeInTheDocument();
  });
});
