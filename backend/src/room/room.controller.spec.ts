import { Test, TestingModule } from '@nestjs/testing';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

describe('RoomController', () => {
  let controller: RoomController;
  let service: RoomService;

  const mockRoom = {
    id: '1',
    name: 'Conference Room A',
    capacity: 10,
    location: 'Floor 1',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1',
    updatedBy: 'user-1',
  };

  const mockRoomService = {
    findAll: jest.fn().mockResolvedValue([mockRoom]),
    findById: jest.fn().mockResolvedValue(mockRoom),
    create: jest.fn().mockResolvedValue(mockRoom),
    update: jest.fn().mockResolvedValue(mockRoom),
    delete: jest.fn().mockResolvedValue(mockRoom),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomController],
      providers: [
        {
          provide: RoomService,
          useValue: mockRoomService,
        },
      ],
    }).compile();

    controller = module.get<RoomController>(RoomController);
    service = module.get<RoomService>(RoomService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of rooms', async () => {
      const result = await controller.findAll();
      expect(result).toEqual([mockRoom]);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a room by id', async () => {
      const result = await controller.findById('1');
      expect(result).toEqual(mockRoom);
      expect(service.findById).toHaveBeenCalledWith('1');
    });
  });

  describe('create', () => {
    const createDto: CreateRoomDto = {
      name: 'Conference Room A',
      capacity: 10,
      location: 'Floor 1',
    };

    it('should create a new room', async () => {
      const result = await controller.create(createDto, 'user-1');
      expect(result).toEqual(mockRoom);
      expect(service.create).toHaveBeenCalledWith(createDto, 'user-1');
    });
  });

  describe('update', () => {
    const updateDto: UpdateRoomDto = {
      capacity: 15,
    };

    it('should update a room', async () => {
      const result = await controller.update('1', updateDto, 'user-1');
      expect(result).toEqual(mockRoom);
      expect(service.update).toHaveBeenCalledWith('1', updateDto, 'user-1');
    });
  });

  describe('delete', () => {
    it('should delete a room', async () => {
      const result = await controller.delete('1', 'user-1');
      expect(result).toEqual(mockRoom);
      expect(service.delete).toHaveBeenCalledWith('1', 'user-1');
    });
  });
});
