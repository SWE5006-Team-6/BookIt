export default interface Room {
  name: string;
  id: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  capacity: number;
  location: string | null;
  createdBy: string;
  isAvailable: boolean;
  reason: string | null;
  updatedBy: string;
}