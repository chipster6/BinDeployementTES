export type Bin = {
  id: string;
  serialNumber: string;
  type: "ROLL_OFF"|"FRONT_LOAD"|"REAR_LOAD";
  capacity: number;
  customerId: string;
  latitude: number;
  longitude: number;
  status: "ACTIVE"|"INACTIVE"|"MAINTENANCE";
};
