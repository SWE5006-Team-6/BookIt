import { Test, TestingModule } from '@nestjs/testing';
import { RoomsController } from '../../../src/rooms/rooms.controller';
import { RoomsService } from '../../../src/rooms/rooms.service';
import { SupabaseAuthGuard } from '../../../src/auth/guards/supabase-auth.guard';

describe('RoomsController', () => {
  let controller: RoomsController;
  let roomsService: RoomsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomsController],
      providers: [
        {
          provide: RoomsService,
          useValue: {
            createRoom: jest.fn(),
            searchAvailableRooms: jest.fn(),
            getRooms: jest.fn(),
            getRoomById: jest.fn(),
            updateRoom: jest.fn(),
            deleteRoom: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RoomsController>(RoomsController);
    roomsService = module.get<RoomsService>(RoomsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should delegate create', async () => {
    (roomsService.createRoom as jest.Mock).mockResolvedValue({ id: 'room-1' });
    const dto = { name: 'Room A', capacity: 4 };
    const user = { id: 'user-1' } as any;

    await controller.create(dto as any, user);

    expect(roomsService.createRoom).toHaveBeenCalledWith(dto, 'user-1');
  });

  it('should delegate search', async () => {
    (roomsService.searchAvailableRooms as jest.Mock).mockResolvedValue([]);
    const dto = { date: '2026-02-10', time: '10:00', capacity: 2 };

    await controller.search(dto as any);

    expect(roomsService.searchAvailableRooms).toHaveBeenCalledWith(dto);
  });

  it('should delegate findAll', async () => {
    (roomsService.getRooms as jest.Mock).mockResolvedValue([]);

    await controller.findAll();

    expect(roomsService.getRooms).toHaveBeenCalled();
  });

  it('should delegate findOne', async () => {
    (roomsService.getRoomById as jest.Mock).mockResolvedValue({ id: 'room-1' });

    await controller.findOne('room-1');

    expect(roomsService.getRoomById).toHaveBeenCalledWith('room-1');
  });

  it('should delegate update', async () => {
    (roomsService.updateRoom as jest.Mock).mockResolvedValue({ id: 'room-1' });
    const dto = { name: 'Room B' };
    const user = { id: 'user-2' } as any;

    await controller.update('room-1', dto as any, user);

    expect(roomsService.updateRoom).toHaveBeenCalledWith('room-1', dto, 'user-2');
  });

  it('should delegate remove', async () => {
    (roomsService.deleteRoom as jest.Mock).mockResolvedValue({ id: 'room-1' });
    const user = { id: 'user-3' } as any;

    await controller.remove('room-1', user);

    expect(roomsService.deleteRoom).toHaveBeenCalledWith('room-1', 'user-3');
  });
});
