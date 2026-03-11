import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Heading,
  HStack,
  Icon,
  Input,
  Spinner,
  Stack,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { useNavigate } from 'react-router';
import { apiRequest } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type {
  RoomUtilisationReport,
  RoomUtilisationRow,
} from '../types/RoomUtilisationReport';

type SortKey =
  | 'name'
  | 'location'
  | 'capacity'
  | 'status'
  | 'utilisationPct'
  | 'bookingCount'
  | 'checkedInCount'
  | 'releasedCount'
  | 'releaseRatePct'
  | 'checkedInMinutes';

type SortDirection = 'asc' | 'desc';

function getDefaultMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';

  return `${year}-${month}`;
}

function clampMonth(value: string, maxMonth: string) {
  if (!value) {
    return maxMonth;
  }

  return value > maxMonth ? maxMonth : value;
}

function formatPercentage(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatHours(minutes: number) {
  return `${(minutes / 60).toFixed(1)}h`;
}

function getStatusLabel(room: Pick<RoomUtilisationRow, 'isActive' | 'isAvailable'>) {
  if (!room.isActive) return 'Deactivated';
  if (!room.isAvailable) return 'Maintenance';
  return 'Available';
}

function getStatusStyles(room: Pick<RoomUtilisationRow, 'isActive' | 'isAvailable'>) {
  if (!room.isActive) return { bg: 'red.50', color: 'red.700' };
  if (!room.isAvailable) return { bg: 'orange.50', color: 'orange.700' };
  return { bg: 'green.50', color: 'green.700' };
}

function getRiskStyles(value: number, isReleaseMetric = false) {
  if (isReleaseMetric) {
    if (value >= 40) return { color: 'red.600', fontWeight: 'semibold' as const };
    if (value >= 20) return { color: 'orange.600', fontWeight: 'semibold' as const };
    return { color: 'green.600', fontWeight: 'medium' as const };
  }

  if (value < 10) return { color: 'red.600', fontWeight: 'semibold' as const };
  if (value < 25) return { color: 'orange.600', fontWeight: 'semibold' as const };
  return { color: 'green.600', fontWeight: 'medium' as const };
}

function getSortValue(room: RoomUtilisationRow, sortKey: SortKey) {
  switch (sortKey) {
    case 'name':
      return room.name;
    case 'location':
      return room.location ?? '';
    case 'capacity':
      return room.capacity;
    case 'status':
      return getStatusLabel(room);
    case 'utilisationPct':
      return room.utilisationPct;
    case 'bookingCount':
      return room.bookingCount;
    case 'checkedInCount':
      return room.checkedInCount;
    case 'releasedCount':
      return room.releasedCount;
    case 'releaseRatePct':
      return room.releaseRatePct;
    case 'checkedInMinutes':
      return room.checkedInMinutes;
    default:
      return '';
  }
}

export function AdminReportsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const currentMonth = getDefaultMonth();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [searchTerm, setSearchTerm] = useState('');
  const [report, setReport] = useState<RoomUtilisationReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('utilisationPct');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    const loadReport = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await apiRequest<RoomUtilisationReport>(
          `/reports/rooms?month=${selectedMonth}`,
          { token: token ?? undefined },
        );
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load room report.');
        setReport(null);
      } finally {
        setIsLoading(false);
      }
    };

    void loadReport();
  }, [selectedMonth, token]);

  const sortedRooms = useMemo(() => {
    if (!report) {
      return [];
    }

    return [...report.rooms].sort((a, b) => {
      const left = getSortValue(a, sortKey);
      const right = getSortValue(b, sortKey);

      if (typeof left === 'string' && typeof right === 'string') {
        const comparison = left.localeCompare(right);
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      const comparison = Number(left) - Number(right);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [report, sortDirection, sortKey]);

  const visibleRooms = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return sortedRooms;
    }

    return sortedRooms.filter((room) =>
      room.name.toLowerCase().includes(query),
    );
  }, [searchTerm, sortedRooms]);

  const applySort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === 'name' ? 'asc' : 'desc');
  };

  const renderSortableHeader = (
    label: string,
    key: SortKey,
    helpText?: string,
  ) => {
    const isActive = sortKey === key;
    const SortIcon = isActive
      ? sortDirection === 'asc'
        ? FiChevronUp
        : FiChevronDown
      : FiChevronDown;

    return (
      <HStack gap="1" align="center">
        <Button
          variant="ghost"
          size="sm"
          px="1"
          height="auto"
          minW="auto"
          fontWeight="semibold"
          color={isActive ? 'gray.900' : 'gray.700'}
          onClick={() => applySort(key)}
          title={helpText}
        >
          {label}
          <Icon as={SortIcon} boxSize="3.5" ml="1" opacity={isActive ? 1 : 0.45} />
        </Button>
      </HStack>
    );
  };

  return (
    <Stack gap="6">
      <HStack justify="space-between" align="center" flexWrap="wrap">
        <VStack align="start" gap="1">
          <Heading size="lg" color="gray.800">Room Utilisation Report</Heading>
          <Text color="gray.600">
            Track actual room usage from check-ins, bookings, and released reservations.
          </Text>
        </VStack>
        <HStack gap="3">
          <Input
            type="month"
            aria-label="Report month"
            value={selectedMonth}
            max={currentMonth}
            onChange={(event) =>
              setSelectedMonth(clampMonth(event.target.value, currentMonth))
            }
            maxW="180px"
            bg="white"
            borderColor="gray.200"
          />
          <Button
            variant="outline"
            colorPalette="blue"
            onClick={() => navigate('/admin/rooms')}
          >
            Room Management
          </Button>
        </HStack>
      </HStack>

      {isLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minH="40vh">
          <Spinner size="xl" color="#4F46E5" />
        </Box>
      ) : error ? (
        <Box
          p="4"
          borderRadius="lg"
          borderWidth="1px"
          bg="red.50"
          borderColor="red.200"
          color="red.800"
        >
          <Text fontWeight="medium">{error}</Text>
        </Box>
      ) : !report ? null : (
        <>
          <Box
            display="grid"
            gridTemplateColumns={{ base: '1fr', md: 'repeat(5, 1fr)' }}
            gap="4"
          >
            <Box bg="white" p="5" borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor="gray.200">
              <Text fontSize="sm" fontWeight="semibold" color="#4F46E5">Overall Utilisation</Text>
              <Heading size="lg" color="gray.800" mt="2">
                {formatPercentage(report.summary.overallUtilisationPct)}
              </Heading>
              <Text fontSize="sm" color="gray.500" mt="1">
                Share of available room time actually used
              </Text>
            </Box>
            <Box bg="white" p="5" borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor="gray.200">
              <Text fontSize="sm" fontWeight="semibold" color="gray.700">Bookings</Text>
              <Heading size="lg" color="gray.800" mt="2">{report.summary.totalBookingCount}</Heading>
              <Text fontSize="sm" color="gray.500" mt="1">
                Total reservations in {report.period.month}, excluding cancellations
              </Text>
            </Box>
            <Box bg="white" p="5" borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor="gray.200">
              <Text fontSize="sm" fontWeight="semibold" color="green.600">Checked-ins</Text>
              <Heading size="lg" color="gray.800" mt="2">{report.summary.totalCheckedInCount}</Heading>
              <Text fontSize="sm" color="gray.500" mt="1">
                Reservations that were actually used
              </Text>
            </Box>
            <Box bg="white" p="5" borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor="gray.200">
              <Text fontSize="sm" fontWeight="semibold" color="orange.600">Released</Text>
              <Heading size="lg" color="gray.800" mt="2">{report.summary.totalReleasedCount}</Heading>
              <Text fontSize="sm" color="gray.500" mt="1">
                Reservations released without room usage
              </Text>
            </Box>
            <Box bg="white" p="5" borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor="gray.200">
              <Text fontSize="sm" fontWeight="semibold" color="gray.700">Rooms</Text>
              <Heading size="lg" color="gray.800" mt="2">{report.summary.totalRooms}</Heading>
              <Text fontSize="sm" color="gray.500" mt="1">
                {report.summary.activeRooms} currently active
              </Text>
            </Box>
          </Box>

          <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200" overflow="hidden">
            <Box px="6" py="4" borderBottomWidth="1px" borderColor="gray.100">
              <Stack
                direction={{ base: 'column', md: 'row' }}
                gap="3"
                justify="space-between"
                align={{ base: 'stretch', md: 'center' }}
              >
                <Text fontWeight="semibold" color="gray.700">
                  Individual room summary for {report.period.month}
                </Text>
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search room name"
                  aria-label="Search room name"
                  maxW={{ base: '100%', md: '260px' }}
                  bg="white"
                  borderColor="gray.200"
                />
              </Stack>
            </Box>

            {report.rooms.length === 0 ? (
              <Box p="8" textAlign="center">
                <Text color="gray.500">No rooms available for reporting.</Text>
              </Box>
            ) : visibleRooms.length === 0 ? (
              <Box p="8" textAlign="center">
                <Text color="gray.500">
                  No rooms match "{searchTerm.trim()}".
                </Text>
              </Box>
            ) : (
              <Box overflowX="auto">
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>
                        {renderSortableHeader('Room', 'name')}
                      </Table.ColumnHeader>
                      <Table.ColumnHeader>
                        {renderSortableHeader('Location', 'location')}
                      </Table.ColumnHeader>
                      <Table.ColumnHeader>
                        {renderSortableHeader('Seats', 'capacity')}
                      </Table.ColumnHeader>
                      <Table.ColumnHeader>
                        {renderSortableHeader('Room Status', 'status')}
                      </Table.ColumnHeader>
                      <Table.ColumnHeader>
                        {renderSortableHeader(
                          'Utilisation',
                          'utilisationPct',
                          'Percentage of available room time that was actually used through check-ins.',
                        )}
                      </Table.ColumnHeader>
                      <Table.ColumnHeader>
                        {renderSortableHeader('Bookings', 'bookingCount')}
                      </Table.ColumnHeader>
                      <Table.ColumnHeader>
                        {renderSortableHeader('Used', 'checkedInCount')}
                      </Table.ColumnHeader>
                      <Table.ColumnHeader>
                        {renderSortableHeader(
                          'Released',
                          'releasedCount',
                          'Bookings that were released after reservation and did not result in room usage.',
                        )}
                      </Table.ColumnHeader>
                      <Table.ColumnHeader>
                        {renderSortableHeader(
                          'Release Rate',
                          'releaseRatePct',
                          'Share of bookings for the room that ended up released.',
                        )}
                      </Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {visibleRooms.map((room) => {
                      const statusStyles = getStatusStyles(room);
                      const utilisationStyles = getRiskStyles(room.utilisationPct);
                      const releaseStyles = getRiskStyles(room.releaseRatePct, true);

                      return (
                        <Table.Row key={room.roomId}>
                          <Table.Cell>
                            <VStack align="start" gap="0">
                              <Text fontWeight="semibold" color="gray.800">{room.name}</Text>
                              <Text fontSize="xs" color="gray.500">
                                {formatHours(room.checkedInMinutes)} checked-in usage
                              </Text>
                            </VStack>
                          </Table.Cell>
                          <Table.Cell>{room.location ?? '-'}</Table.Cell>
                          <Table.Cell>{room.capacity}</Table.Cell>
                          <Table.Cell>
                            <Box
                              px="2"
                              py="0.5"
                              borderRadius="full"
                              display="inline-block"
                              bg={statusStyles.bg}
                              color={statusStyles.color}
                              fontSize="xs"
                              fontWeight="medium"
                            >
                              {getStatusLabel(room)}
                            </Box>
                          </Table.Cell>
                          <Table.Cell>
                            <Text color={utilisationStyles.color} fontWeight={utilisationStyles.fontWeight}>
                              {formatPercentage(room.utilisationPct)}
                            </Text>
                          </Table.Cell>
                          <Table.Cell>{room.bookingCount}</Table.Cell>
                          <Table.Cell>{room.checkedInCount}</Table.Cell>
                          <Table.Cell>{room.releasedCount}</Table.Cell>
                          <Table.Cell>
                            <Text color={releaseStyles.color} fontWeight={releaseStyles.fontWeight}>
                              {formatPercentage(room.releaseRatePct)}
                            </Text>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Root>
              </Box>
            )}
          </Box>
        </>
      )}
    </Stack>
  );
}
