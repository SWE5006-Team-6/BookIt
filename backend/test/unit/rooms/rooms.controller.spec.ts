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
            updateRoomStatus: jest.fn(),
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
    const created = { id: 'room-1' };
    (roomsService.createRoom as jest.Mock).mockResolvedValue(created);
    const dto = { name: 'Room A', capacity: 4 };
    const user = { id: 'user-1' } as any;

    const result = await controller.create(dto as any, user);

    expect(roomsService.createRoom).toHaveBeenCalledWith(dto, 'user-1');
    expect(result).toBe(created);
  });

  it('should delegate search', async () => {
    const searchResult = [];
    (roomsService.searchAvailableRooms as jest.Mock).mockResolvedValue(searchResult);
    const dto = { date: '2026-02-10', time: '10:00', capacity: 2 };

    const result = await controller.search(dto as any);

    expect(roomsService.searchAvailableRooms).toHaveBeenCalledWith(dto);
    expect(result).toBe(searchResult);
  });

  it('should delegate findAll', async () => {
    const rooms = [{ id: 'room-1' }];
    (roomsService.getRooms as jest.Mock).mockResolvedValue(rooms);

    const result = await controller.findAll();

    expect(roomsService.getRooms).toHaveBeenCalled();
    expect(result).toBe(rooms);
  });

  it('should delegate findOne', async () => {
    const room = { id: 'room-1' };
    (roomsService.getRoomById as jest.Mock).mockResolvedValue(room);

    const result = await controller.findOne('room-1');

    expect(roomsService.getRoomById).toHaveBeenCalledWith('room-1');
    expect(result).toBe(room);
  });

  it('should delegate update', async () => {
    const updated = { id: 'room-1' };
    (roomsService.updateRoom as jest.Mock).mockResolvedValue(updated);
    const dto = { name: 'Room B' };
    const user = { id: 'user-2' } as any;

    const result = await controller.update('room-1', dto as any, user);

    expect(roomsService.updateRoom).toHaveBeenCalledWith('room-1', dto, 'user-2');
    expect(result).toBe(updated);
  });

  it('should delegate updateStatus', async () => {
    const statusUpdated = { id: 'room-1', isActive: false };
    (roomsService.updateRoomStatus as jest.Mock).mockResolvedValue(statusUpdated);
    const dto = { isActive: false };
    const user = { id: 'admin-1' } as any;

    const result = await controller.updateStatus('room-1', dto as any, user);

    expect(roomsService.updateRoomStatus).toHaveBeenCalledWith(
      'room-1',
      dto,
      'admin-1',
    );
    expect(result).toBe(statusUpdated);
  });

  it('should delegate remove', async () => {
    const removed = { id: 'room-1' };
    (roomsService.deleteRoom as jest.Mock).mockResolvedValue(removed);
    const user = { id: 'user-3' } as any;

    const result = await controller.remove('room-1', user);

    expect(roomsService.deleteRoom).toHaveBeenCalledWith('room-1', 'user-3');
    expect(result).toBe(removed);
  });

  it('should propagate service errors for updateStatus', async () => {
    const err = new Error('status update failed');
    (roomsService.updateRoomStatus as jest.Mock).mockRejectedValue(err);

    await expect(
      controller.updateStatus('room-1', { isActive: true } as any, { id: 'admin-1' } as any),
    ).rejects.toThrow('status update failed');
  });

  it('should propagate service errors for remove', async () => {
    const err = new Error('delete failed');
    (roomsService.deleteRoom as jest.Mock).mockRejectedValue(err);

    await expect(
      controller.remove('room-1', { id: 'admin-1' } as any),
    ).rejects.toThrow('delete failed');
  });
});
