import { render, screen } from '@testing-library/react';
import App from '../../src/ui/App';

test('앱이 렌더된다', () => {
  render(<App />);
  expect(screen.getByRole('navigation')).toBeInTheDocument();
});
