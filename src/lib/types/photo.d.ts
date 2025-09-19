export interface PhotoProps {
  id: number;
  url?: string | undefined;
  name?: string | undefined;
  takenAt?: any;
  location: [number, number];
}