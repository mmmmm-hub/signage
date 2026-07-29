const fs = require('fs');
const src = fs.readFileSync('../vivibus/src/data/timetable.ts', 'utf8');

// Extract STOPS_ORDERED array literal
const stopsMatch = src.match(/export const STOPS_ORDERED = (\[[\s\S]*?\]);/);
const stopsOrdered = eval(stopsMatch[1]);

// Extract STANDARD_TRIPS_RAW array literal
const stdMatch = src.match(/const STANDARD_TRIPS_RAW: Trip\[\] = (\[[\s\S]*?\n\]);/);
const standardTrips = eval(stdMatch[1]);

// Extract HOLIDAY_ONLY_TRIPS array literal
const holMatch = src.match(/const HOLIDAY_ONLY_TRIPS: Trip\[\] = (\[[\s\S]*?\n\]);/);
const holidayTrips = eval(holMatch[1]);

const trips = standardTrips.map(t => t.schoolHolidayBehavior ? t : {...t, schoolHolidayBehavior: 'suspended'}).concat(holidayTrips);

console.log('stops:', stopsOrdered.length, 'trips:', trips.length);

fs.writeFileSync('timetable-data.js', 
`// vivibus timetable data — derived from ../vivibus/src/data/timetable.ts
window.VIVIBUS_STOPS_ORDERED = ${JSON.stringify(stopsOrdered, null, 2)};
window.VIVIBUS_TRIPS = ${JSON.stringify(trips, null, 2)};
`);
