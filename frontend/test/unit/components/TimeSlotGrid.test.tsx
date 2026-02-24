import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../helpers/render.tsx';
import { TimeSlotGrid } from '../../../src/components/booking/TimeSlotGrid.tsx';

describe('TimeSlotGrid', () => {
  it('renders empty message when no slots are provided', () => {
    renderWithProviders(
      <TimeSlotGrid
        label="Start Time"
        slots={[]}
        selectedTime=""
        onSelect={vi.fn()}
        emptyMessage="Select a date first."
      />,
    );

    expect(screen.getByText('Start Time')).toBeInTheDocument();
    expect(screen.getByText('Select a date first.')).toBeInTheDocument();
  });

  it('renders selected and disabled slot states', () => {
    renderWithProviders(
      <TimeSlotGrid
        label="Start Time"
        slots={[
          { time: '09:00', label: '09:00', disabled: false, isOccupied: false },
          {
            time: '09:30',
            label: '09:30',
            disabled: true,
            isOccupied: true,
            reason: 'Conflicts with existing booking',
          },
        ]}
        selectedTime="09:00"
        onSelect={vi.fn()}
        emptyMessage="Empty"
      />,
    );

    const selectedButton = screen.getByRole('button', { name: /09:00/i });
    const disabledButton = screen.getByRole('button', {
      name: /09:30, unavailable: Conflicts with existing booking/i,
    });

    expect(selectedButton).toHaveAttribute('aria-pressed', 'true');
    expect(disabledButton).toBeDisabled();
  });

  it('calls onSelect for enabled slots and ignores disabled slots', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    renderWithProviders(
      <TimeSlotGrid
        label="End Time"
        slots={[
          { time: '10:00', label: '10:00', disabled: false, isOccupied: false },
          { time: '10:30', label: '10:30', disabled: true, isOccupied: false, reason: 'Disabled' },
        ]}
        selectedTime=""
        onSelect={onSelect}
        emptyMessage="Empty"
      />,
    );

    await user.click(screen.getByRole('button', { name: /10:00/i }));
    await user.click(screen.getByRole('button', { name: /10:30, unavailable: Disabled/i }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('10:00');
  });
});
