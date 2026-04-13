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
import { apiRequest } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type {
  RoomUtilisationReport,
  RoomUtilisationRow,
} from '../types/RoomUtilisationReport';
import type {
  RoomNoShowReport,
  RoomNoShowRow,
} from '../types/RoomNoShowReport';

type ReportType = 'rooms' | 'no-shows';
type SortDirection = 'asc' | 'desc';
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
  | 'checkedInMinutes'
  | 'noShowRatePct';

const REPORT_CONFIG = {
  rooms: {
    title: 'Room Utilisation Report',
    description:
      'Track actual room usage from check-ins, bookings, and released reservations.',
    endpoint: '/reports/rooms',
    errorMessage: 'Failed to load room report.',
    defaultSortKey: 'utilisationPct' as const,
  },
  'no-shows': {
    title: 'Room No-Show Report',
    description:
      'Track released reservations by room to identify no-show hotspots.',
    endpoint: '/reports/no-shows',
    errorMessage: 'Failed to load no-show report.',
    defaultSortKey: 'noShowRatePct' as const,
  },
} as const;

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

function getStatusLabel(
  room: Pick<RoomUtilisationRow | RoomNoShowRow, 'isActive' | 'isAvailable'>,
) {
  if (!room.isActive) return 'Deactivated';
  if (!room.isAvailable) return 'Maintenance';
  return 'Available';
}

function getStatusStyles(
  room: Pick<RoomUtilisationRow | RoomNoShowRow, 'isActive' | 'isAvailable'>,
) {
  if (!room.isActive) return { bg: 'red.50', color: 'red.700' };
  if (!room.isAvailable) return { bg: 'orange.50', color: 'orange.700' };
  return { bg: 'green.50', color: 'green.700' };
}

function getUtilisationRiskStyles(value: number) {
  if (value < 10) return { color: 'red.600', fontWeight: 'semibold' as const };
  if (value < 25)
    return { color: 'orange.600', fontWeight: 'semibold' as const };
  return { color: 'green.600', fontWeight: 'medium' as const };
}

function getNoShowRiskStyles(value: number) {
  if (value >= 40) return { color: 'red.600', fontWeight: 'semibold' as const };
  if (value >= 20)
    return { color: 'orange.600', fontWeight: 'semibold' as const };
  return { color: 'green.600', fontWeight: 'medium' as const };
}

function getRoomSortValue(room: RoomUtilisationRow, sortKey: SortKey) {
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
      return room.utilisationPct;
  }
}

function getNoShowSortValue(room: RoomNoShowRow, sortKey: SortKey) {
  switch (sortKey) {
    case 'name':
      return room.name;
    case 'location':
      return room.location ?? '';
    case 'capacity':
      return room.capacity;
    case 'status':
      return getStatusLabel(room);
    case 'bookingCount':
      return room.bookingCount;
    case 'releasedCount':
      return room.releasedCount;
    case 'noShowRatePct':
      return room.noShowRatePct;
    default:
      return room.noShowRatePct;
  }
}

function sortRows<T extends RoomUtilisationRow | RoomNoShowRow>(
  rows: T[],
  getSortValue: (row: T, sortKey: SortKey) => string | number,
  sortKey: SortKey,
  sortDirection: SortDirection,
) {
  return [...rows].sort((a, b) => {
    const left = getSortValue(a, sortKey);
    const right = getSortValue(b, sortKey);

    if (typeof left === 'string' && typeof right === 'string') {
      const comparison = left.localeCompare(right);
      return sortDirection === 'asc' ? comparison : -comparison;
    }

    const comparison = Number(left) - Number(right);
    return sortDirection === 'asc' ? comparison : -comparison;
  });
}

export function AdminReportsPage() {
  const { token } = useAuth();
  const currentMonth = getDefaultMonth();
  const [reportType, setReportType] = useState<ReportType>('rooms');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [searchTerm, setSearchTerm] = useState('');
  const [roomReport, setRoomReport] = useState<RoomUtilisationReport | null>(null);
  const [noShowReport, setNoShowReport] = useState<RoomNoShowReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>(
    REPORT_CONFIG.rooms.defaultSortKey,
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    setSearchTerm('');
    setSortKey(REPORT_CONFIG[reportType].defaultSortKey);
    setSortDirection('desc');
  }, [reportType]);

  useEffect(() => {
    const loadReport = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (reportType === 'rooms') {
          const data = await apiRequest<RoomUtilisationReport>(
            `${REPORT_CONFIG.rooms.endpoint}?month=${selectedMonth}`,
            { token: token ?? undefined },
          );
          setRoomReport(data);
        } else {
          const data = await apiRequest<RoomNoShowReport>(
            `${REPORT_CONFIG['no-shows'].endpoint}?month=${selectedMonth}`,
            { token: token ?? undefined },
          );
          setNoShowReport(data);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : REPORT_CONFIG[reportType].errorMessage,
        );
        if (reportType === 'rooms') {
          setRoomReport(null);
        } else {
          setNoShowReport(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadReport();
  }, [reportType, selectedMonth, token]);

  const activeReport = reportType === 'rooms' ? roomReport : noShowReport;

  const sortedRows = useMemo(() => {
    if (!activeReport) {
      return [];
    }

    if (reportType === 'rooms') {
      return sortRows(
        activeReport.rooms as RoomUtilisationRow[],
        getRoomSortValue,
        sortKey,
        sortDirection,
      );
    }

    return sortRows(
      activeReport.rooms as RoomNoShowRow[],
      getNoShowSortValue,
      sortKey,
      sortDirection,
    );
  }, [activeReport, reportType, sortDirection, sortKey]);

  const visibleRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return sortedRows;
    }

    return sortedRows.filter((room) => room.name.toLowerCase().includes(query));
  }, [searchTerm, sortedRows]);

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
      <HStack justify="space-between" align="start" flexWrap="wrap" gap="4">
        <VStack align="start" gap="1" flex="1" minW="0">
          <Heading size="lg" color="gray.800">
            {REPORT_CONFIG[reportType].title}
          </Heading>
          <Text color="gray.600">
            {REPORT_CONFIG[reportType].description}
          </Text>
        </VStack>
        <HStack
          gap="3"
          flexWrap={{ base: 'wrap', lg: 'nowrap' }}
          align="center"
          flexShrink={0}
        >
          <HStack
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="lg"
            p="1"
          >
            <Button
              size="sm"
              variant={reportType === 'rooms' ? 'solid' : 'ghost'}
              colorPalette="blue"
              onClick={() => setReportType('rooms')}
            >
              Room Utilisation
            </Button>
            <Button
              size="sm"
              variant={reportType === 'no-shows' ? 'solid' : 'ghost'}
              colorPalette="blue"
              onClick={() => setReportType('no-shows')}
            >
              No-Show
            </Button>
          </HStack>
          <Input
            type="month"
            aria-label="Report month"
            value={selectedMonth}
            max={currentMonth}
            onChange={(event) =>
              setSelectedMonth(clampMonth(event.target.value, currentMonth))
            }
            w={{ base: '100%', lg: '180px' }}
            bg="white"
            borderColor="gray.200"
          />
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
      ) : !activeReport ? null : (
        <>
          {reportType === 'rooms' ? (
            <Box
              display="grid"
              gridTemplateColumns={{ base: '1fr', md: 'repeat(5, 1fr)' }}
              gap="4"
            >
              <Box bg="white" p="5" borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="semibold" color="#4F46E5">Overall Utilisation</Text>
                <Heading size="lg" color="gray.800" mt="2">
                  {formatPercentage(roomReport?.summary.overallUtilisationPct ?? 0)}
                </Heading>
                <Text fontSize="sm" color="gray.500" mt="1">
                  Share of available room time actually used
                </Text>
              </Box>
              <Box bg="white" p="5" borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="semibold" color="gray.700">Bookings</Text>
                <Heading size="lg" color="gray.800" mt="2">
                  {roomReport?.summary.totalBookingCount ?? 0}
                </Heading>
                <Text fontSize="sm" color="gray.500" mt="1">
                  Total reservations in {roomReport?.period.month}, excluding cancellations
                </Text>
              </Box>
              <Box bg="white" p="5" borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="semibold" color="green.600">Checked-ins</Text>
                <Heading size="lg" color="gray.800" mt="2">
                  {roomReport?.summary.totalCheckedInCount ?? 0}
                </Heading>
                <Text fontSize="sm" color="gray.500" mt="1">
                  Reservations that were actually used
                </Text>
              </Box>
              <Box bg="white" p="5" borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="semibold" color="orange.600">Released</Text>
                <Heading size="lg" color="gray.800" mt="2">
                  {roomReport?.summary.totalReleasedCount ?? 0}
                </Heading>
                <Text fontSize="sm" color="gray.500" mt="1">
                  Reservations released without room usage
                </Text>
              </Box>
              <Box bg="white" p="5" borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="semibold" color="gray.700">Rooms</Text>
                <Heading size="lg" color="gray.800" mt="2">
                  {roomReport?.summary.totalRooms ?? 0}
                </Heading>
                <Text fontSize="sm" color="gray.500" mt="1">
                  {roomReport?.summary.activeRooms ?? 0} currently active
                </Text>
              </Box>
            </Box>
          ) : (
            <Box
              display="grid"
              gridTemplateColumns={{ base: '1fr', md: 'repeat(5, 1fr)' }}
              gap="4"
            >
              <Box bg="white" p="5" borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="semibold" color="#4F46E5">Overall No-Show Rate</Text>
                <Heading size="lg" color="gray.800" mt="2">
                  {formatPercentage(noShowReport?.summary.overallNoShowRatePct ?? 0)}
                </Heading>
                <Text fontSize="sm" color="gray.500" mt="1">
                  Share of non-cancelled bookings that were released
                </Text>
              </Box>
              <Box bg="white" p="5" borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="semibold" color="gray.700">Bookings</Text>
                <Heading size="lg" color="gray.800" mt="2">
                  {noShowReport?.summary.totalBookingCount ?? 0}
                </Heading>
                <Text fontSize="sm" color="gray.500" mt="1">
                  Total non-cancelled reservations in {noShowReport?.period.month}
                </Text>
              </Box>
              <Box bg="white" p="5" borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="semibold" color="orange.600">No-Shows</Text>
                <Heading size="lg" color="gray.800" mt="2">
                  {noShowReport?.summary.totalReleasedCount ?? 0}
                </Heading>
                <Text fontSize="sm" color="gray.500" mt="1">
                  Released reservations treated as no-shows
                </Text>
              </Box>
              <Box bg="white" p="5" borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="semibold" color="red.600">Rooms Impacted</Text>
                <Heading size="lg" color="gray.800" mt="2">
                  {noShowReport?.summary.roomsWithNoShows ?? 0}
                </Heading>
                <Text fontSize="sm" color="gray.500" mt="1">
                  Rooms with at least one no-show
                </Text>
              </Box>
              <Box bg="white" p="5" borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="semibold" color="gray.700">Rooms</Text>
                <Heading size="lg" color="gray.800" mt="2">
                  {noShowReport?.summary.totalRooms ?? 0}
                </Heading>
                <Text fontSize="sm" color="gray.500" mt="1">
                  {noShowReport?.summary.activeRooms ?? 0} currently active
                </Text>
              </Box>
            </Box>
          )}

          <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200" overflow="hidden">
            <Box px="6" py="4" borderBottomWidth="1px" borderColor="gray.100">
              <Stack
                direction={{ base: 'column', md: 'row' }}
                gap="3"
                justify="space-between"
                align={{ base: 'stretch', md: 'center' }}
              >
                <Text fontWeight="semibold" color="gray.700">
                  {reportType === 'rooms'
                    ? `Individual room summary for ${roomReport?.period.month}`
                    : `Room no-show summary for ${noShowReport?.period.month}`}
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

            {activeReport.rooms.length === 0 ? (
              <Box p="8" textAlign="center">
                <Text color="gray.500">No rooms available for reporting.</Text>
              </Box>
            ) : visibleRows.length === 0 ? (
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
                      {reportType === 'rooms' ? (
                        <>
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
                        </>
                      ) : (
                        <>
                          <Table.ColumnHeader>
                            {renderSortableHeader('Bookings', 'bookingCount')}
                          </Table.ColumnHeader>
                          <Table.ColumnHeader>
                            {renderSortableHeader('No-Shows', 'releasedCount')}
                          </Table.ColumnHeader>
                          <Table.ColumnHeader>
                            {renderSortableHeader(
                              'No-Show Rate',
                              'noShowRatePct',
                              'Share of non-cancelled bookings for the room that were released as no-shows.',
                            )}
                          </Table.ColumnHeader>
                        </>
                      )}
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {reportType === 'rooms'
                      ? (visibleRows as RoomUtilisationRow[]).map((room) => {
                          const statusStyles = getStatusStyles(room);
                          const utilisationStyles = getUtilisationRiskStyles(
                            room.utilisationPct,
                          );
                          const releaseStyles = getNoShowRiskStyles(
                            room.releaseRatePct,
                          );

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
                        })
                      : (visibleRows as RoomNoShowRow[]).map((room) => {
                          const statusStyles = getStatusStyles(room);
                          const noShowStyles = getNoShowRiskStyles(
                            room.noShowRatePct,
                          );

                          return (
                            <Table.Row key={room.roomId}>
                              <Table.Cell>
                                <Text fontWeight="semibold" color="gray.800">{room.name}</Text>
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
                              <Table.Cell>{room.bookingCount}</Table.Cell>
                              <Table.Cell>{room.releasedCount}</Table.Cell>
                              <Table.Cell>
                                <Text color={noShowStyles.color} fontWeight={noShowStyles.fontWeight}>
                                  {formatPercentage(room.noShowRatePct)}
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
