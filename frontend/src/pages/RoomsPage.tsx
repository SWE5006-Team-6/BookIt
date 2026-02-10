import { useState } from 'react';
import {
	Box,
	Button,
	Container,
	Flex,
	Heading,
	Icon,
	Input,
	Text,
	VStack,
	Badge,
	SimpleGrid,
	Group,
	Stack,
	HStack,
	Separator,
} from '@chakra-ui/react';
import { FiSearch, FiUsers, FiMapPin, FiClock, FiCheckCircle, FiInfo } from 'react-icons/fi';

// Mock data mapping to your Prisma Room Schema
const MOCK_ROOMS = [
	{ id: '1', name: 'Grand Boardroom', capacity: 20, location: 'Penthouse', isActive: true },
	{ id: '2', name: 'Focus Pod A', capacity: 1, location: 'Floor 2', isActive: true },
	{ id: '3', name: 'Creative Studio', capacity: 8, location: 'Floor 3', isActive: true },
];

const RoomCard = ({ room }) => {
	return (
		<Box
			bg="bg.panel"
			borderRadius="2xl"
			overflow="hidden"
			borderWidth="1px"
			transition="all 0.3s ease"
			_hover={{ shadow: 'xl', borderColor: 'blue.500', transform: 'scale(1.02)' }}
		>
			{/* Decorative Room Header */}
			<Box h="120px" bg="blue.600" p="6" position="relative">
				<Badge
					position="absolute"
					top="4"
					right="4"
					colorPalette="green"
					variant="solid"
					borderRadius="full"
				>
					Available Now
				</Badge>
				<Heading color="white" size="md" mt="8" truncate>
					{room.name}
				</Heading>
			</Box>

			<VStack p="6" align="start" gap="4">
				<HStack gap="6">
					<VStack align="start" gap="0">
						<Text fontSize="xs" color="fg.muted" fontWeight="bold" textTransform="uppercase">Capacity</Text>
						<HStack gap="1">
							<Icon as={FiUsers} size="sm" color="blue.500" />
							<Text fontWeight="medium">{room.capacity} Seats</Text>
						</HStack>
					</VStack>

					<Separator orientation="vertical" h="30px" />

					<VStack align="start" gap="0">
						<Text fontSize="xs" color="fg.muted" fontWeight="bold" textTransform="uppercase">Location</Text>
						<HStack gap="1">
							<Icon as={FiMapPin} size="sm" color="blue.500" />
							<Text fontWeight="medium">{room.location}</Text>
						</HStack>
					</VStack>
				</HStack>

				<Text fontSize="sm" color="fg.subtle">
					Equipped with high-speed Wi-Fi, 4K Monitor, and Video Conferencing tools.
				</Text>

				<Button width="full" colorPalette="blue" size="lg" mt="2">
					Check Schedule
				</Button>
			</VStack>
		</Box>
	);
};

export default function RoomsPage() {
	const [search, setSearch] = useState('');

	return (
		<Box minH="100vh" bg="bg.canvas">
			{/* Hero Header */}
			<Box bg="bg.panel" borderBottomWidth="1px" pt="16" pb="12">
				<Container maxW="6xl">
					<Heading size="3xl" mb="2" letterSpacing="tight">Find a Workspace</Heading>
					<Text fontSize="xl" color="fg.muted">Search available rooms by name, capacity, or floor.</Text>
				</Container>
			</Box>

			<Container maxW="6xl" mt="-10">
				{/* Advanced Search Bar */}
				<Stack
					direction={{ base: 'column', lg: 'row' }}
					bg="bg.panel"
					p="4"
					borderRadius="xl"
					shadow="lg"
					gap="4"
					align="center"
					borderWidth="1px"
				>
					<Group attached flex="2" width="full">
						<Box px="3" display="flex" alignItems="center">
							<FiSearch color="gray" />
						</Box>
						<Input
							placeholder="Search rooms..."
							type="unstyled"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</Group>

					<Separator orientation={{ base: 'horizontal', lg: 'vertical' }} h={{ base: '1px', lg: '40px' }} />

					<HStack flex="1" width="full">
						<Icon as={FiClock} color="blue.500" />
						<Input type="datetime-local unstyled" size="sm" />
					</HStack>

					<Button colorPalette="blue" px="8" width={{ base: 'full', lg: 'auto' }}>
						Find Available
					</Button>
				</Stack>

				{/* Results Stats */}
				<Flex justify="space-between" align="center" mt="12" mb="6">
					<HStack>
						<Icon as={FiCheckCircle} color="green.500" />
						<Text fontWeight="bold">{MOCK_ROOMS.length} Rooms Found</Text>
					</HStack>
					<Button variant="ghost" size="sm">
						<FiInfo /> Booking Policies
					</Button>
				</Flex>

				{/* Grid */}
				<SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="8" pb="20">
					{MOCK_ROOMS
						.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
						.map((room) => (
							<RoomCard key={room.id} room={room} />
						))}
				</SimpleGrid>
			</Container>
		</Box>
	);
}