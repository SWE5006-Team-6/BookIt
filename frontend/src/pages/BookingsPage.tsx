import {
	Box,
	Button,
	Container,
	Flex,
	Heading,
	Icon,
	Text,
	VStack,
	Badge,
	HStack,
	Stack,
	Separator,
	IconButton,
} from '@chakra-ui/react';
import {
	FiCalendar,
	FiClock,
	FiMapPin,
	FiTrash2,
	FiExternalLink,
	FiCheckCircle,
	FiAlertCircle
} from 'react-icons/fi';

// Mock data based on your Booking + Room Schema
const MOCK_BOOKINGS : any[] = [
	{
		id: 'b1',
		title: 'Product Sprint Planning',
		startAt: new Date('2026-02-12T10:00:00'),
		endAt: new Date('2026-02-12T11:30:00'),
		status: 'CONFIRMED',
		room: { id: '1', name: 'Grand Boardroom', capacity: 20, location: 'Penthouse', isActive: true }
	},
	{
		id: 'b2',
		title: '1:1 with Design Lead',
		startAt: new Date('2026-02-15T14:00:00'),
		endAt: new Date('2026-02-15T14:30:00'),
		status: 'CONFIRMED',
		room: { name: 'Zen Garden Pod', location: 'Lobby' }
	}
];

const BookingRow = ({ booking } : { booking: any }) => {
	const isPast = new Date(booking.startAt) < new Date();

	return (
		<Box
			p="5"
			bg="bg.panel"
			borderRadius="xl"
			borderWidth="1px"
			borderColor="border.subtle"
			transition="border-color 0.2s"
			_hover={{ borderColor: "blue.500" }}
		>
			<Stack direction={{ base: 'column', md: 'row' }} justify="space-between" align={{ md: 'center' }} gap="6">
				<HStack gap="4" flex="1">
					<Box
						bg={isPast ? "gray.100" : "#cccaffa1"}
						p="3"
						borderRadius="lg"
						color={isPast ? "gray.500" : "#4f46e5"}
					>
						<FiCalendar size="24px" />
					</Box>
					<VStack align="start" gap="0">
						<Heading size="sm">{booking.title}</Heading>
						<HStack color="fg.muted" gap="4">
							<HStack gap="1">
								<Icon as={FiMapPin} size="xs" />
								<Text fontSize="xs">{booking.room.name} • {booking.room.location}</Text>
							</HStack>
						</HStack>
					</VStack>
				</HStack>

				<Stack direction={{ base: 'row', md: 'row' }} gap={{ base: '4', md: '12' }} align="center">
					<VStack align={{ base: 'start', md: 'center' }} gap="0">
						<HStack gap="1">
							<Icon as={FiClock} size="xs" color="#4f46e5" />
							<Text fontWeight="bold" fontSize="sm">
								{booking.startAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
							</Text>
						</HStack>
						<Text fontSize="xs" color="fg.muted">
							{booking.startAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
						</Text>
					</VStack>

					<Badge
						colorPalette={booking.status === 'CONFIRMED' ? 'green' : 'red'}
						variant="subtle"
					>
						{booking.status}
					</Badge>

					<HStack gap="2">
						<IconButton
							aria-label="View Details"
							variant="ghost"
							size="sm"
							colorPalette="gray"
						>
							<FiExternalLink />
						</IconButton>
						<IconButton
							aria-label="Cancel Booking"
							variant="ghost"
							size="sm"
							colorPalette="red"
						>
							<FiTrash2 />
						</IconButton>
					</HStack>
				</Stack>
			</Stack>
		</Box>
	);
};

export default function BookingsPage() {
	return (
		<Box minH="100vh" bg="bg.canvas" py="12">
			<Container maxW="5xl">
				<Flex justify="space-between" align="center" mb="10">
					<VStack align="start" gap="1">
						<Heading size="2xl">My Bookings</Heading>
						<HStack color="fg.muted">
							<Icon as={FiCheckCircle} color="green.500" />
							<Text fontSize="md">You have 2 upcoming reservations</Text>
						</HStack>
					</VStack>
					<Button backgroundColor="#4f46e5" size="md">
						New Booking
					</Button>
				</Flex>

				<VStack gap="4" align="stretch">
					<Text fontWeight="bold" color="fg.muted" fontSize="sm" textTransform="uppercase" letterSpacing="widest">
						Upcoming
					</Text>
					{MOCK_BOOKINGS.map(booking => (
						<BookingRow key={booking.id} booking={booking} />
					))}

					<Separator my="6" />

					<Text fontWeight="bold" color="fg.muted" fontSize="sm" textTransform="uppercase" letterSpacing="widest">
						Past Reservations
					</Text>
					<Flex
						p="10"
						bg="bg.panel"
						borderRadius="xl"
						borderWidth="1px"
						borderStyle="dashed"
						justify="center"
						align="center"
					>
						<VStack gap="2">
							<Icon as={FiAlertCircle} color="gray.400" size="md" />
							<Text color="fg.subtle">No past bookings found in the last 30 days.</Text>
						</VStack>
					</Flex>
				</VStack>
			</Container>
		</Box>
	);
}