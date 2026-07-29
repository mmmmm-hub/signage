// vivibus signage — timetable calculation logic
// Ported from ../vivibus/src/utils/busUtils.ts (no external deps)
(function (global) {
  'use strict';

  // 学休期（長期休業）— vivibus本体アプリと同じ既定値
  const DEFAULT_SCHOOL_HOLIDAYS = [
    { id: 'summer-2026', label: '夏季学休期', start: '2026-08-03', end: '2026-09-25' },
    { id: 'winter-2027', label: '冬季学休期', start: '2027-02-01', end: '2027-03-31' },
  ];

  function toMin(hhmm) {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  function pad(n) { return n.toString().padStart(2, '0'); }

  function dateStr(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function isWeekendDay(d) {
    const day = d.getDay();
    return day === 0 || day === 6;
  }

  function isSchoolHoliday(d, periods) {
    const dStr = dateStr(d);
    return periods.some(p => dStr >= p.start && dStr <= p.end);
  }

  function tripRunsOn(trip, d, periods) {
    const isHolidaySeason = isSchoolHoliday(d, periods);
    const behavior = trip.schoolHolidayBehavior || 'normal';

    if (isHolidaySeason && behavior === 'suspended') return false;
    if (!isHolidaySeason && behavior === 'holiday_only') return false;

    const hol = isWeekendDay(d);
    if (trip.serviceDay === 'everyday') return true;
    if (trip.serviceDay === 'weekday') return !hol;
    if (trip.serviceDay === 'holiday_only') return hol;
    return false;
  }

  function getTripTimes(trip, d, periods) {
    const isHolidaySeason = isSchoolHoliday(d, periods);
    if (isHolidaySeason && trip.schoolHolidayBehavior === 'custom_times' && trip.schoolHolidayTimes) {
      return trip.schoolHolidayTimes;
    }
    return trip.times;
  }

  function getViaLabel(via, direction) {
    if (via === 'direct') return '直通';
    if (via === 'airport') return '空港経由';
    if (via === 'osatsu') return direction === 'to_city' ? '長都行' : '長都発';
    return '';
  }

  function getDestinationLabel(trip) {
    if (trip.direction === 'to_univ') return '千歳科学技術大学';
    return trip.via === 'osatsu' ? '長都駅' : '千歳駅';
  }

  // 行き先(終点)の代表停留所ID。到着予定時刻を引くのに使う。
  function getDestinationStopId(trip) {
    if (trip.direction === 'to_univ') return 'univ_main';
    return trip.via === 'osatsu' ? 'osatsu_st' : 'chitose_st';
  }

  function getArrivalTime(trip, times) {
    const id = getDestinationStopId(trip);
    return (times || trip.times)[id] || null;
  }

  function getCompanyLabel(company) {
    if (company === 'hokuto') return '北都交通';
    if (company === 'sogo') return '千歳相互';
    if (company === 'wing') return 'ウィング';
    if (company === 'donan') return '道南交通';
    return '';
  }

  const ROUTE_LABEL = { s1: '系統1', s2: '系統2', s3: '系統3' };

  // Compute upcoming departures at a given stop.
  // directions: array subset of ['to_univ','to_city']
  // now: Date, limit: number of results, graceMin: keep showing a trip for N minutes after departure
  function computeUpcoming(trips, stopId, directions, now, opts) {
    opts = opts || {};
    const periods = opts.schoolHolidays || DEFAULT_SCHOOL_HOLIDAYS;
    const limit = opts.limit || 8;
    const graceMin = opts.graceMin != null ? opts.graceMin : 1;
    const nowMin = now.getHours() * 60 + now.getMinutes();

    const results = [];
    for (const trip of trips) {
      if (directions.indexOf(trip.direction) === -1) continue;
      if (!tripRunsOn(trip, now, periods)) continue;
      const times = getTripTimes(trip, now, periods);
      const t = times[stopId];
      if (!t) continue;
      const min = toMin(t);
      const diff = min - nowMin;
      if (diff < -graceMin) continue;
      results.push({
        trip,
        time: t,
        minutesUntil: diff,
        route: trip.route,
        routeLabel: ROUTE_LABEL[trip.route] || trip.route,
        via: trip.via,
        viaLabel: getViaLabel(trip.via, trip.direction),
        destination: getDestinationLabel(trip),
        arrivalTime: getArrivalTime(trip, times),
        company: trip.company,
        companyLabel: getCompanyLabel(trip.company),
        direction: trip.direction,
      });
    }
    results.sort((a, b) => toMin(a.time) - toMin(b.time));
    return results.slice(0, limit);
  }

  // この停留所に実際に停車する経由タイプ('direct'/'airport'/'osatsu')の集合。
  // 系統によって停車する停留所が異なるため、そのバス停が特定の経由でしか
  // 停車しない場合に注意書きを出すために使う。
  function getStopVias(trips, stopId, direction) {
    const set = new Set();
    for (const trip of trips) {
      if (direction && trip.direction !== direction) continue;
      if (trip.times[stopId]) set.add(trip.via);
    }
    return set;
  }

  global.VivibusLogic = {
    DEFAULT_SCHOOL_HOLIDAYS,
    toMin,
    isWeekendDay,
    isSchoolHoliday,
    tripRunsOn,
    getTripTimes,
    getViaLabel,
    getDestinationLabel,
    getDestinationStopId,
    getArrivalTime,
    getCompanyLabel,
    getStopVias,
    ROUTE_LABEL,
    computeUpcoming,
  };
})(window);
