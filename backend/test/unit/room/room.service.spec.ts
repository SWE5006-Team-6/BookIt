import { Test, TestingModule } from '@nestjs/testing';
import { RoomService } from '../../../src/room/room.service';
import { RoomRepository } from '../../../src/room/room.repository';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('RoomService', () => {
  let service: RoomService;
  let repository: RoomRepository;

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

  const mockRoomRepository = {
    findAll: jest.fn().mockResolvedValue([mockRoom]),
    findById: jest.fn().mockResolvedValue(mockRoom),
    findByName: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(mockRoom),
    update: jest.fn().mockResolvedValue(mockRoom),
    delete: jest.fn().mockResolvedValue(mockRoom),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomService,
        {
          provide: RoomRepository,
          useValue: mockRoomRepository,
        },
      ],
    }).compile();

    service = module.get<RoomService>(RoomService);
    repository = module.get<RoomRepository>(RoomRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of rooms', async () => {
      const result = await service.findAll();
      expect(result).toEqual([mockRoom]);
      expect(repository.findAll).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a room when found', async () => {
      const result = await service.findById('1');
      expect(result).toEqual(mockRoom);
      expect(repository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when room not found', async () => {
      mockRoomRepository.findById.mockResolvedValueOnce(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const createDto = {
      name: 'Conference Room A',
      capacity: 10,
      location: 'Floor 1',
    };

    it('should create a new room', async () => {
      const result = await service.create(createDto, 'user-1');
      expect(result).toEqual(mockRoom);
      expect(repository.findByName).toHaveBeenCalledWith('Conference Room A');
      expect(repository.create).toHaveBeenCalledWith({
        name: createDto.name,
        capacity: createDto.capacity,
        location: createDto.location,
        createdBy: 'user-1',
        updatedBy: 'user-1',
      });
    });

    it('should throw BadRequestException when room name exists', async () => {
      mockRoomRepository.findByName.mockResolvedValueOnce(mockRoom);
      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    const updateDto = { capacity: 15 };

    it('should update a room', async () => {
      const result = await service.update('1', updateDto, 'user-1');
      expect(result).toEqual(mockRoom);
      expect(repository.findById).toHaveBeenCalledWith('1');
      expect(repository.update).toHaveBeenCalledWith('1', {
        ...updateDto,
        updatedBy: 'user-1',
      });
    });

    it('should throw NotFoundException when room not found', async () => {
      mockRoomRepository.findById.mockResolvedValueOnce(null);
      await expect(
        service.update('nonexistent', updateDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a room (soft delete)', async () => {
      const result = await service.delete('1', 'user-1');
      expect(result).toEqual(mockRoom);
      expect(repository.findById).toHaveBeenCalledWith('1');
      expect(repository.delete).toHaveBeenCalledWith('1', 'user-1');
    });

    it('should throw NotFoundException when room not found', async () => {
      mockRoomRepository.findById.mockResolvedValueOnce(null);
      await expect(service.delete('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
