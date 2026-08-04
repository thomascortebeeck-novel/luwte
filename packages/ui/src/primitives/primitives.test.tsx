import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';
import { Card } from './Card';
import { HumanText } from './HumanText';
import { Screen } from './Screen';

describe('Screen', () => {
  it('renders its title as the page heading', () => {
    render(<Screen title="Vandaag">inhoud</Screen>);
    expect(screen.getByRole('heading', { level: 1, name: 'Vandaag' })).toBeInTheDocument();
  });

  it('renders without a title, because most screens have one job and say it once', () => {
    render(<Screen>inhoud</Screen>);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText('inhoud')).toBeInTheDocument();
  });

  it('places the action in a footer so it sits in the lower third', () => {
    render(
      <Screen action={<Button>Bewaren</Button>}>
        <p>inhoud</p>
      </Screen>,
    );
    const footer = screen.getByRole('contentinfo');
    expect(footer).toContainElement(screen.getByRole('button', { name: 'Bewaren' }));
  });
});

describe('Button', () => {
  it('is a real button and defaults to type button', () => {
    render(<Button>Bewaren</Button>);
    expect(screen.getByRole('button', { name: 'Bewaren' })).toHaveAttribute('type', 'button');
  });

  it('can be a submit button when asked', () => {
    render(<Button type="submit">Bewaren</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('marks the primary and quiet variants apart', () => {
    const { rerender } = render(<Button variant="primary">Bewaren</Button>);
    expect(screen.getByRole('button').className).toContain('primary');
    rerender(<Button variant="quiet">Terug</Button>);
    expect(screen.getByRole('button').className).toContain('quiet');
  });
});

describe('Card', () => {
  it('renders as a section by default and takes another element when asked', () => {
    const { rerender } = render(<Card>inhoud</Card>);
    expect(screen.getByText('inhoud').tagName).toBe('SECTION');
    rerender(<Card as="li">inhoud</Card>);
    expect(screen.getByText('inhoud').tagName).toBe('LI');
  });
});

describe('HumanText', () => {
  it('is the only way the serif enters the app', () => {
    // BRAND 3.4 — everything the app says is sans, everything a person wrote is serif.
    render(<HumanText>ik heb vandaag gewandeld</HumanText>);
    expect(screen.getByText('ik heb vandaag gewandeld').className).toContain('human');
  });
});
