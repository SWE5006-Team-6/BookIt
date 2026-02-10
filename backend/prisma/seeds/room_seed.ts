import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Starting room seed...');

    // Fetch the existing admin user
    const admin = await prisma.user.findUnique({
        where: { email: 'admin@ncs.com.sg' },
    });

    if (!admin) {
        throw new Error(
            'Admin user not found! Please create admin@ncs.com.sg in Supabase Dashboard first.'
        );
    }

    console.log(`Found admin user: ${admin.displayName} (${admin.id})`);
    console.log('Creating rooms...');

    const rooms = await prisma.room.createMany({
        data: [
            // ─── Executive & Large Conference Rooms ────────────────────────────
            {
                name: 'Executive Board Room',
                capacity: 20,
                location: 'Floor 10 - Executive Suite',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Main Conference Room',
                capacity: 16,
                location: 'Floor 5 - West Wing',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Presentation Hall',
                capacity: 30,
                location: 'Floor 1 - Lobby Area',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Town Hall Auditorium',
                capacity: 50,
                location: 'Floor 1 - East Wing',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },

            // ─── Medium Conference Rooms ───────────────────────────────────────
            {
                name: 'Innovation Lab',
                capacity: 12,
                location: 'Floor 4 - Innovation Center',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Collaboration Space Alpha',
                capacity: 10,
                location: 'Floor 3 - North Wing',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Collaboration Space Beta',
                capacity: 10,
                location: 'Floor 3 - South Wing',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Training Room A',
                capacity: 15,
                location: 'Floor 2 - Learning Center',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Training Room B',
                capacity: 15,
                location: 'Floor 2 - Learning Center',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Workshop Space',
                capacity: 12,
                location: 'Floor 4 - Creative Zone',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },

            // ─── Small Meeting Rooms ───────────────────────────────────────────
            {
                name: 'Meeting Room 301',
                capacity: 6,
                location: 'Floor 3 - East Wing',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Meeting Room 302',
                capacity: 6,
                location: 'Floor 3 - East Wing',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Meeting Room 303',
                capacity: 6,
                location: 'Floor 3 - West Wing',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Meeting Room 401',
                capacity: 8,
                location: 'Floor 4 - East Wing',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Meeting Room 402',
                capacity: 8,
                location: 'Floor 4 - West Wing',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Meeting Room 501',
                capacity: 8,
                location: 'Floor 5 - North Wing',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Meeting Room 502',
                capacity: 8,
                location: 'Floor 5 - South Wing',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },

            // ─── Huddle Spaces ─────────────────────────────────────────────────
            {
                name: 'Huddle Space 1A',
                capacity: 4,
                location: 'Floor 1 - Near Cafeteria',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Huddle Space 1B',
                capacity: 4,
                location: 'Floor 1 - Near Entrance',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Huddle Space 2A',
                capacity: 4,
                location: 'Floor 2 - East Corner',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Huddle Space 2B',
                capacity: 4,
                location: 'Floor 2 - West Corner',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Huddle Space 3A',
                capacity: 4,
                location: 'Floor 3 - Central Area',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Huddle Space 3B',
                capacity: 4,
                location: 'Floor 3 - Near Kitchen',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Huddle Space 4A',
                capacity: 4,
                location: 'Floor 4 - North Corner',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Huddle Space 4B',
                capacity: 4,
                location: 'Floor 4 - South Corner',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },

            // ─── Phone Booths ──────────────────────────────────────────────────
            {
                name: 'Phone Booth 1',
                capacity: 1,
                location: 'Floor 1 - Quiet Zone',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Phone Booth 2',
                capacity: 1,
                location: 'Floor 2 - Quiet Zone',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Phone Booth 3',
                capacity: 1,
                location: 'Floor 3 - Quiet Zone',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Phone Booth 4',
                capacity: 1,
                location: 'Floor 4 - Quiet Zone',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Phone Booth 5',
                capacity: 1,
                location: 'Floor 5 - Quiet Zone',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },

            // ─── Specialized Rooms ─────────────────────────────────────────────
            {
                name: 'Interview Room A',
                capacity: 4,
                location: 'Floor 6 - HR Department',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Interview Room B',
                capacity: 4,
                location: 'Floor 6 - HR Department',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Interview Room C',
                capacity: 4,
                location: 'Floor 6 - HR Department',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Focus Room',
                capacity: 2,
                location: 'Floor 4 - Quiet Area',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Brainstorm Studio',
                capacity: 8,
                location: 'Floor 5 - Creative Zone',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Client Lounge',
                capacity: 6,
                location: 'Floor 1 - Reception Area',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Video Recording Studio',
                capacity: 5,
                location: 'Floor 4 - Media Center',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Podcast Room',
                capacity: 3,
                location: 'Floor 4 - Media Center',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },

            // ─── Department Specific Rooms ─────────────────────────────────────
            {
                name: 'Engineering War Room',
                capacity: 10,
                location: 'Floor 7 - Engineering Wing',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Design Studio',
                capacity: 8,
                location: 'Floor 5 - Design Department',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Sales Briefing Room',
                capacity: 12,
                location: 'Floor 3 - Sales Floor',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Product Strategy Room',
                capacity: 10,
                location: 'Floor 6 - Product Department',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
            {
                name: 'Marketing Creative Lab',
                capacity: 8,
                location: 'Floor 5 - Marketing Wing',
                createdBy: admin.displayName?.toString() || 'admin',
                updatedBy: admin.displayName?.toString() || 'admin',
            },
        ],
        skipDuplicates: true,
    });

    console.log(`Created ${rooms.count} rooms`);
    console.log('Seed completed successfully!');

    // Show summary
    const totalRooms = await prisma.room.count();
    console.log(`\nDatabase Summary:`);
    console.log(`Total Rooms: ${totalRooms}`);
}

main()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });