import { useRef, useState, type ChangeEvent } from 'react';
import { format } from 'date-fns';
import { BatteryWarning, Camera, CarFront, CircleStop, Fuel, History, MapPin, Navigation, Pencil, Route, Save, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { mapParkingLocationId, type Movement, type ParkingLocation, type Vehicle } from '@/lib/parking-data';
import type { RoadTestRecord } from '@/lib/road-test-data';
import { VehicleFormFields, type VehicleFormData } from '@/components/vehicle-form-fields';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface VehicleOverviewDialogProps {
  vehicle?: Vehicle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: ParkingLocation[];
  roadTest?: RoadTestRecord;
  movements: Movement[];
  canEdit: boolean;
  canTransfer: boolean;
  canDelete: boolean;
  onUpdate: (vehicleId: string, changes: Partial<Vehicle>, auditAction: string) => void;
  onTransfer: (vehicleId: string, locationId: string) => void;
  onRequestRoadTest: (vehicle: Vehicle) => void;
  onDelete: (vehicleId: string) => void;
  onDeliver: (vehicleId: string) => void;
  onQuickContact: (vehicle: Vehicle, bay: string) => void;
}

const toFormData = (vehicle: Vehicle): VehicleFormData => ({
  plateNumber: vehicle.plateNumber, vin: vehicle.vin, brand: vehicle.brand, model: vehicle.model, color: vehicle.color, customerName: vehicle.customerName, driverOwner: vehicle.driverOwner, department: vehicle.department,
});

export function VehicleOverviewDialog({ vehicle, open, onOpenChange, locations, movements, roadTest, canEdit, canTransfer, canDelete, onUpdate, onTransfer, onDeliver, onDelete, onQuickContact, onRequestRoadTest }: VehicleOverviewDialogProps) {
  const [targetZone, setTargetZone] = useState('none');
  const [targetBay, setTargetBay] = useState('none');
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<VehicleFormData>();
  const photoRef = useRef<HTMLInputElement>(null);
  if (!vehicle) return null;
  const location = locations.find((item: ParkingLocation) => mapParkingLocationId(item.id) === mapParkingLocationId(vehicle.currentLocationId));
  const history = movements.filter((item: Movement) => item.vehicleId === vehicle.id);
  const lastMovement = history[0];
  const availableBays = locations.filter((item: ParkingLocation) => item.status === 'Available');
  const availableZones = Array.from(new Set(availableBays.map((item: ParkingLocation) => item.zone))).filter((zone: string) => zone);
  const zoneBays = availableBays.filter((item: ParkingLocation) => item.zone === targetZone);
  const updateGps = () => {
    if (!navigator.geolocation) return toast.error('Location services are unavailable on this device.');
    navigator.geolocation.getCurrentPosition(
      (position: GeolocationPosition) => {
        onUpdate(vehicle.id, { latitude: position.coords.latitude, longitude: position.coords.longitude, gpsUpdatedAt: new Date().toISOString(), geofenceStatus: 'Inside' }, 'GPS Update');
        toast.success('Current GPS location captured.');
      },
      () => toast.error('Location permission was denied.'),
      { enableHighAccuracy: true },
    );
  };
  const uploadPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onUpdate(vehicle.id, { photoUrls: [...vehicle.photoUrls, String(reader.result)] }, 'Photo Upload');
    reader.readAsDataURL(file);
    event.target.value = '';
  };
  const action = (status: Vehicle['operationalStatus'], label: string) => {
    onUpdate(vehicle.id, { operationalStatus: status, ...(label === 'Check-In' ? { checkInAt: new Date().toISOString() } : {}) }, label);
    toast.success(`${vehicle.plateNumber} updated: ${label}.`);
  };
  const toggleWarning = (warning: 'lowBatteryWarning' | 'noBrakeWarning' | 'noFuelWarning', label: string) => {
    const enabled = !vehicle[warning];
    onUpdate(vehicle.id, { [warning]: enabled }, `${label} ${enabled ? 'Enabled' : 'Cleared'}`);
    toast[enabled ? 'warning' : 'success'](`${label} ${enabled ? 'added to' : 'cleared from'} ${vehicle.plateNumber}.`);
  };
  const beginEdit = () => { setDraft(toFormData(vehicle)); setIsEditing(true); };
  const saveEdit = () => {
    if (!draft?.plateNumber.trim()) return toast.error('Registration number is required.');
    onUpdate(vehicle.id, { ...draft, plateNumber: draft.plateNumber.trim().toUpperCase() }, 'Edit');
    setIsEditing(false);
    toast.success('Vehicle details saved.');
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl"><DialogHeader><DialogTitle className="flex items-center gap-2"><CarFront /> {vehicle.plateNumber}</DialogTitle><DialogDescription>Complete vehicle profile, location, assignment, and movement record.</DialogDescription></DialogHeader>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-4"><div className="relative min-h-52 overflow-hidden rounded-2xl bg-muted">{vehicle.photoUrls[0] ? <img src={vehicle.photoUrls[0]} alt={`${vehicle.plateNumber} vehicle`} className="h-52 w-full object-cover" /> : <div className="grid h-52 place-items-center text-muted-foreground"><CarFront className="h-16 w-16" /></div>}<Badge className="absolute left-3 top-3">{vehicle.operationalStatus}</Badge></div><input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={uploadPhoto} /><Button variant="outline" className="w-full" onClick={() => photoRef.current?.click()}><Camera /> Capture or upload photo</Button>
        <Tabs defaultValue="profile"><TabsList className="w-full"><TabsTrigger value="profile">Profile</TabsTrigger><TabsTrigger value="history">Parking history</TabsTrigger><TabsTrigger value="gps">GPS map</TabsTrigger></TabsList>
          <TabsContent value="profile" className="space-y-4">{isEditing && draft ? <div className="rounded-2xl border bg-card p-4 text-card-foreground"><VehicleFormFields value={draft} onChange={setDraft} idPrefix="profile" /></div> : <div className="grid gap-3 sm:grid-cols-2">{[['Model', vehicle.model], ['Color', vehicle.color], ['VIN / Chassis', vehicle.vin], ['Assigned bay', location ? `${location.zone}-${location.bayNumber}` : 'Unassigned'], ['Assigned', vehicle.assignedDate ? format(new Date(vehicle.assignedDate), 'dd MMM yyyy, HH:mm') : '—'], ['Last movement', lastMovement ? `${lastMovement.movementType} · ${format(new Date(lastMovement.actionDateTime), 'dd MMM, HH:mm')}` : '—']].map(([label, value]: string[]) => <div key={label} className="rounded-lg bg-muted p-3"><p className="text-xs font-bold text-muted-foreground">{label}</p><p className="font-semibold text-foreground">{value || '—'}</p></div>)}</div>}</TabsContent>
          <TabsContent value="history" className="space-y-2">{history.map((item: Movement) => <div key={item.id} className="flex gap-3 border-b py-3"><History className="h-4 w-4" /><div><p className="font-semibold">{item.movementType}: {locationLabel(item.fromLocationId, locations)} → {locationLabel(item.toLocationId, locations)}</p><p className="text-sm text-muted-foreground">{format(new Date(item.actionDateTime), 'dd MMM yyyy, HH:mm')} · {item.performedBy}</p></div></div>)}</TabsContent>
          <TabsContent value="gps"><div className="relative h-64 overflow-hidden rounded-2xl bg-muted"><div className="absolute inset-0 [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:28px_28px]" /><div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary p-3 text-primary-foreground shadow-xl"><MapPin /></div><div className="absolute bottom-3 left-3 rounded-lg bg-popover p-3 text-sm text-popover-foreground shadow"><strong>{vehicle.latitude?.toFixed(5) ?? 'GPS pending'}, {vehicle.longitude?.toFixed(5) ?? '—'}</strong><p>{vehicle.distanceToBayMeters ?? '—'} m from assigned bay · {vehicle.geofenceStatus}</p></div></div><Button className="mt-3 w-full" onClick={updateGps}><Navigation /> Update current location</Button></TabsContent>
        </Tabs>
      </div>
      <aside className="space-y-3"><div className="rounded-xl border bg-card p-4 text-card-foreground"><p className="technical-label">Vehicle actions</p><div className="mt-3 grid gap-2">{roadTest && <div className="rounded-lg bg-secondary p-3 text-sm text-secondary-foreground"><div className="flex items-center justify-between gap-2"><strong>Road test request</strong><Badge variant={roadTest.status === 'In Road Test' ? 'secondary' : 'outline'}>{roadTest.status}</Badge></div><p className="mt-1">{roadTest.jobCardNumber} · {roadTest.purpose}</p><p className="mt-1">Assigned to {roadTest.assignedTo}</p></div>}<Button onClick={() => onRequestRoadTest(vehicle)}><Route /> Request road test</Button><Select value={targetZone} onValueChange={(zone: string) => { setTargetZone(zone); setTargetBay('none'); }}><SelectTrigger><SelectValue placeholder="Select destination zone" /></SelectTrigger><SelectContent><SelectItem value="none">Select destination zone</SelectItem>{availableZones.map((zone: string) => <SelectItem key={zone} value={zone}>{zone}</SelectItem>)}</SelectContent></Select><Select value={targetBay} onValueChange={setTargetBay} disabled={targetZone === 'none'}><SelectTrigger><SelectValue placeholder="Select bay number" /></SelectTrigger><SelectContent><SelectItem value="none">Select bay number</SelectItem>{zoneBays.filter((item: ParkingLocation) => item.id).map((item: ParkingLocation) => <SelectItem key={item.id} value={item.id}>{item.bayNumber}</SelectItem>)}</SelectContent></Select><Button disabled={!canTransfer || targetBay === 'none'} onClick={() => { onTransfer(vehicle.id, targetBay); setTargetZone('none'); setTargetBay('none'); }}><Upload /> Transfer / assign bay</Button><Button variant="secondary" onClick={() => { onQuickContact(vehicle, location ? `${location.zone}-${location.bayNumber}` : 'Unassigned'); onOpenChange(false); }}><Navigation /> Contact assigned user</Button><Button variant="outline" disabled={!canEdit} onClick={beginEdit}><Pencil /> Edit vehicle details</Button><Button variant="outline" onClick={() => action('Checked In', 'Check-In')}>Check-In vehicle</Button><Button variant="outline" onClick={() => { onDeliver(vehicle.id); onOpenChange(false); }}><CarFront /> Delivered</Button><Button variant={vehicle.lowBatteryWarning ? 'destructive' : 'outline'} onClick={() => toggleWarning('lowBatteryWarning', 'Low Battery Warning')}><BatteryWarning /> {vehicle.lowBatteryWarning ? 'Clear Low Battery Warning' : 'Low Battery Warning'}</Button><Button variant={vehicle.noBrakeWarning ? 'destructive' : 'outline'} onClick={() => toggleWarning('noBrakeWarning', 'No Brake Warning')}><CircleStop /> {vehicle.noBrakeWarning ? 'Clear No Brake Warning' : 'No Brake Warning'}</Button><Button variant={vehicle.noFuelWarning ? 'destructive' : 'outline'} onClick={() => toggleWarning('noFuelWarning', 'No Fuel Warning')}><Fuel /> {vehicle.noFuelWarning ? 'Clear No Fuel Warning' : 'No Fuel Warning'}</Button>{canDelete && <Button variant="destructive" onClick={() => { onDelete(vehicle.id); onOpenChange(false); }}><Trash2 /> Delete vehicle record</Button>}</div></div><div className="rounded-xl bg-secondary p-4 text-secondary-foreground"><p className="font-bold">Geofence monitoring</p><p className="mt-1 text-sm">Alerts {vehicle.geofenceAlertEnabled ? 'enabled' : 'disabled'} · Current position: {vehicle.geofenceStatus}</p></div></aside>
    </div>
    {isEditing && draft && <DialogFooter className="sticky -bottom-6 mt-1 border-t bg-background py-4"><Button variant="outline" onClick={() => { setIsEditing(false); setDraft(undefined); }}><X /> Cancel</Button><Button onClick={saveEdit}><Save /> Save changes</Button></DialogFooter>}
  </DialogContent></Dialog>;
}

function locationLabel(id: string | undefined, locations: ParkingLocation[]) {
  const item = locations.find((location: ParkingLocation) => mapParkingLocationId(location.id) === mapParkingLocationId(id));
  return item ? `${item.zone}-${item.bayNumber}` : 'Gate';
}
