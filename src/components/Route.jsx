import Mapoffline from "./mapoffline.jsx";

export default function FlightRoutes({ alertZones = [] }) {
  return <Mapoffline alertZones={alertZones} />;
}
