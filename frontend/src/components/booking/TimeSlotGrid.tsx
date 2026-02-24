import { Box, Button, SimpleGrid, Text, VStack } from '@chakra-ui/react';
import type { SlotOption } from '../../lib/booking-slots';

interface TimeSlotGridProps {
  label: string;
  slots: SlotOption[];
  selectedTime: string;
  onSelect: (time: string) => void;
  emptyMessage: string;
}

export function TimeSlotGrid({
  label,
  slots,
  selectedTime,
  onSelect,
  emptyMessage,
}: TimeSlotGridProps) {
  return (
    <VStack align="stretch" gap="3">
      <Text fontWeight="medium" color="gray.700">
        {label}
      </Text>

      {slots.length === 0 ? (
        <Box
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="lg"
          bg="gray.50"
          px="4"
          py="3"
        >
          <Text fontSize="sm" color="gray.600">
            {emptyMessage}
          </Text>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 2, sm: 3 }} gap="3">
          {slots.map((slot) => {
            const isSelected = selectedTime === slot.time;
            return (
              <Button
                key={slot.time}
                type="button"
                onClick={() => onSelect(slot.time)}
                disabled={slot.disabled}
                aria-pressed={isSelected}
                aria-label={
                  slot.reason
                    ? `${slot.label}, unavailable: ${slot.reason}`
                    : `${slot.label}${isSelected ? ', selected' : ''}`
                }
                variant="outline"
                h="11"
                borderRadius="lg"
                borderColor={
                  isSelected ? '#4F46E5' : slot.isOccupied ? 'orange.300' : 'gray.200'
                }
                bg={isSelected ? '#EEF2FF' : slot.disabled ? 'gray.50' : 'white'}
                color={isSelected ? '#4338CA' : slot.disabled ? 'gray.400' : 'gray.800'}
                fontWeight={isSelected ? 'semibold' : 'medium'}
                _hover={
                  slot.disabled
                    ? {}
                    : {
                        borderColor: '#4F46E5',
                        color: '#4338CA',
                      }
                }
              >
                {slot.label}
              </Button>
            );
          })}
        </SimpleGrid>
      )}
    </VStack>
  );
}
