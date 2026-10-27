import { ParkingApp } from '@/components/parking-app';

export default function HomePage() {
  return <ParkingApp signedInUserId="Local browser user" onExit={() => undefined} />;
}